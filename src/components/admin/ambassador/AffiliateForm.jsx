'use client';

/**
 * Add or edit an affiliate.
 *
 * One form for both, because the fields are the same and two forms drift. What
 * changes is what happens on save and what the panel says about it:
 *
 *   adding  — creates the record, mints their coupon code, and creates the login
 *             they will sign in with. An admin typing someone in IS the
 *             approval, so there is no pending step.
 *   editing — changes only what the shop knows about the person. The status, the
 *             coupon and the login are not fields here: status is the
 *             approve/suspend action and has side effects, and the coupon's
 *             terms belong on the coupon so what the shop pays is set in one
 *             place.
 *
 * Only name, phone and email are required. Everything else is what the public
 * application form collects, and an admin adding a bookseller has no reason to
 * know their batch or how many classmates they can reach.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  FiX, FiLoader, FiSave, FiUserPlus, FiAlertCircle, FiTag,
} from 'react-icons/fi';
import { createAffiliate, updateAffiliate, listColleges } from './ambassadorApi';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Intern'];
const REACH = ['<25', '25-50', '50-100', '100-200', '200-300', '300+'];

const BLANK = {
  fullName: '',
  nickname: '',
  phone: '',
  whatsapp: '',
  email: '',
  password: '',
  facebookUrl: '',
  instagramUrl: '',
  medicalCollege: '',
  medicalCollegeName: '',
  batch: '',
  academicYear: '',
  city: '',
  reach: '',
  adminNote: '',
};

const input =
  'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export default function AffiliateForm({ affiliate, onClose, onSaved }) {
  const editing = Boolean(affiliate?._id);
  const [form, setForm] = useState(BLANK);
  const [colleges, setColleges] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    listColleges().then(setColleges).catch(() => {
      /* the college box falls back to a free-typed name */
    });
  }, []);

  useEffect(() => {
    if (!affiliate) return setForm(BLANK);
    setForm({
      ...BLANK,
      ...Object.fromEntries(
        Object.keys(BLANK).map((k) => [k, affiliate[k] ?? ''])
      ),
      // Populated from the id, not the name, so the select lands on the right row.
      medicalCollege: affiliate.medicalCollege ? String(affiliate.medicalCollege) : '',
      // Never pre-filled: it is write-only, and only used when adding.
      password: '',
    });
  }, [affiliate]);

  /** What their code will look like, previewed as it is typed. */
  const codePreview = useMemo(() => {
    if (editing) return affiliate?.couponCode || '';
    const college = colleges.find((c) => String(c._id) === form.medicalCollege);
    const abbr = (college?.abbreviation || '').toUpperCase().replace(/[^A-Z]/g, '') || 'MVA';
    // The call-name wins when given — same rule as couponCode.ts on the server.
    const nick = form.nickname.toUpperCase().replace(/[^A-Z]/g, '');
    if (nick.length >= 2) return `${abbr}${nick.slice(0, 8)}20`;
    const words = form.fullName
      .toUpperCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Z]/g, ''))
      .filter(
        (w) => w.length >= 2 && !['MD', 'MOHAMMAD', 'MOHAMMED', 'MST', 'MRS', 'MR', 'DR', 'MISS'].includes(w)
      );
    if (!words.length) return '';
    const pick = words.reduce((best, w) => (w.length > best.length ? w : best), words[0]);
    return `${abbr}${pick.slice(0, 8)}20`;
  }, [editing, affiliate, colleges, form.medicalCollege, form.fullName, form.nickname]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) return setError('নাম দিন');
    if (!form.phone.trim()) return setError('ফোন নম্বর দিন');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('সঠিক ইমেইল দিন');

    setBusy(true);
    try {
      const college = colleges.find((c) => String(c._id) === form.medicalCollege);
      const body = {
        ...form,
        email: form.email.trim().toLowerCase(),
        medicalCollege: form.medicalCollege || undefined,
        medicalCollegeName: college?.name || form.medicalCollegeName.trim(),
      };
      // Write-only, and only when adding — an empty box on an edit must not
      // reset anyone's password.
      if (editing || !body.password) delete body.password;

      const saved = editing ? await updateAffiliate(affiliate._id, body) : await createAffiliate(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'সেভ করা যায়নি');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <form
        onSubmit={submit}
        className="h-full w-full max-w-xl overflow-y-auto bg-dash-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-dash-line bg-dash-card px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-dash-ink2">
              {editing ? <FiSave className="text-brand" /> : <FiUserPlus className="text-brand" />}
              {editing ? 'অ্যাফিলিয়েট সম্পাদনা' : 'নতুন অ্যাফিলিয়েট'}
            </h2>
            {editing && (
              <p className="font-mono text-xs text-dash-mute2">{affiliate.applicationId}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-dash-mute2 hover:bg-dash-soft">
            <FiX />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          {codePreview && (
            <p className="flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-dash-ink2">
              <FiTag className="shrink-0 text-brand" />
              <span>
                {editing ? 'কুপন কোড' : 'কুপন কোড হবে'}{' '}
                <strong className="font-mono tracking-wide">{codePreview}</strong>
                {editing && ' — কোড বদলানো যায় না, কারণ পুরোনো অর্ডার এতে বাঁধা'}
              </span>
            </p>
          )}

          <Group title="পরিচয়">
            <Field label="পুরো নাম" required>
              <input className={input} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            </Field>
            <Field
              label="ডাক নাম"
              help="কুপন কোড এটা দিয়েই তৈরি হবে। ফাঁকা রাখলে পুরো নাম থেকে বেছে নেওয়া হবে।"
            >
              <input
                className={input}
                value={form.nickname}
                onChange={(e) => set('nickname', e.target.value)}
                maxLength={20}
                placeholder="যেমন: Sakib"
              />
            </Field>
            <Two>
              <Field label="ফোন নম্বর" required>
                <input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="numeric" />
              </Field>
              <Field label="হোয়াটসঅ্যাপ">
                <input className={input} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} inputMode="numeric" />
              </Field>
            </Two>
            <Field label="ইমেইল" required help={editing ? 'এটাই তার লগইন আইডি।' : 'এটাই তার লগইন আইডি হবে।'}>
              <input className={input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            {!editing && (
              <Field
                label="পাসওয়ার্ড"
                help="ফাঁকা রাখলে তার ফোন নম্বরই প্রথম পাসওয়ার্ড হবে — সে পরে নিজে বদলে নিতে পারবে।"
              >
                <input className={input} type="text" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
              </Field>
            )}
          </Group>

          <Group title="কলেজ ও পড়াশোনা">
            <Field label="মেডিকেল কলেজ" help="তালিকায় না থাকলে ফাঁকা রাখুন — কোডে MVA বসবে।">
              <select
                className={input}
                value={form.medicalCollege}
                onChange={(e) => set('medicalCollege', e.target.value)}
              >
                <option value="">নির্বাচন করুন</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Two>
              <Field label="ব্যাচ">
                <input className={input} value={form.batch} onChange={(e) => set('batch', e.target.value)} placeholder="যেমন: KMC-33" />
              </Field>
              <Field label="বর্ষ">
                <select className={input} value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)}>
                  <option value="">—</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>
            </Two>
            <Field label="শহর">
              <input className={input} value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
          </Group>

          <Group title="যোগাযোগ ও রিচ">
            <Two>
              <Field label="ফেসবুক লিংক">
                <input className={input} value={form.facebookUrl} onChange={(e) => set('facebookUrl', e.target.value)} />
              </Field>
              <Field label="ইনস্টাগ্রাম">
                <input className={input} value={form.instagramUrl} onChange={(e) => set('instagramUrl', e.target.value)} />
              </Field>
            </Two>
            <Field label="কতজনের কাছে পৌঁছাতে পারে">
              <select className={input} value={form.reach} onChange={(e) => set('reach', e.target.value)}>
                <option value="">—</option>
                {REACH.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
          </Group>

          <Group title="অ্যাডমিন নোট">
            <textarea
              rows={3}
              className={input}
              value={form.adminNote}
              onChange={(e) => set('adminNote', e.target.value)}
              placeholder="শুধু আপনার টিম দেখবে।"
            />
          </Group>

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-2 border-t border-dash-line pt-4">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {busy ? <FiLoader className="animate-spin" /> : <FiSave />}
              {editing ? 'সংরক্ষণ করুন' : 'যোগ করুন — কোড ও লগইন তৈরি হবে'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-dash-line px-4 py-2.5 text-sm font-medium text-dash-mute hover:text-dash-ink3"
            >
              বাতিল
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const Group = ({ title, children }) => (
  <section>
    <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-dash-mute2">{title}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const Two = ({ children }) => <div className="grid gap-3 sm:grid-cols-2">{children}</div>;

const Field = ({ label, required, help, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium text-dash-ink3">
      {label} {required && <span className="text-rose-500">*</span>}
    </span>
    {help && <span className="mb-1.5 block text-[11px] text-dash-mute2">{help}</span>}
    {children}
  </label>
);

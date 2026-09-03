'use client';

/**
 * "I have the book — open it for me."
 *
 * The code under the scratch panel is the proof of purchase that actually
 * travels with the book, so this page turns it into access for whoever is
 * holding it. One person orders six copies to save on delivery, hands five to
 * classmates, and each of them opens their own here.
 *
 * ONE PAGE, TWO SITUATIONS
 *
 * Somebody already signed in only needs the code and their details. Somebody
 * who has never had an account needs one, and sending them away to register and
 * find their way back is where people give up — so the account is created from
 * this same form, and the code is redeemed on the way back.
 *
 * The details (name, college, roll) are asked for once, here. The shop wanted
 * them, and this is the only moment a reader has a reason to fill them in: the
 * book opens at the end of it.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuBookOpen, LuCircleCheck, LuLoaderCircle, LuTriangleAlert, LuTicket,
  LuUser, LuLogIn, LuArrowRight, LuQrCode,
} from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';
import { Container, cn } from '@/components/ui';
import API_BASE_URL from '@/config/api';
import { apiLogin, apiRegister, persistSession, getDeviceId, STORAGE_KEYS } from '@/components/auth/authClient';

const inputCls =
  'w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20';

const T = {
  bn: {
    eyebrow: 'বই চালু করুন',
    title: 'বইয়ের কোড দিয়ে সব উত্তর খুলুন',
    sub: 'আপনার বইয়ের ভেতরে যে লুকানো কোডটি আছে সেটি এখানে বসান। একবার চালু করলে এই অ্যাকাউন্টে সবসময় থাকবে।',
    codeLabel: 'বইয়ের কোড',
    codeHint: 'বইয়ের ভেতরের স্ক্র্যাচ অংশটি ঘষে কোডটি দেখুন। ছোট-বড় হরফ বা ড্যাশ নিয়ে চিন্তা করতে হবে না।',
    who: 'আপনার পরিচয়',
    name: 'পুরো নাম',
    college: 'মেডিকেল কলেজ',
    collegePick: 'নির্বাচন করুন',
    roll: 'ক্লাস রোল নম্বর',
    phone: 'হোয়াটসঅ্যাপ নম্বর',
    errPhone: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)',
    account: 'আপনার অ্যাকাউন্ট',
    haveAccount: 'অ্যাকাউন্ট আছে',
    newAccount: 'নতুন অ্যাকাউন্ট',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    signedInAs: 'সাইন ইন করা আছে',
    submit: 'বই চালু করুন',
    working: 'চালু হচ্ছে…',
    doneTitle: 'বই চালু হয়ে গেছে!',
    doneSub: 'এখন বইয়ের যেকোনো QR স্ক্যান করলেই উত্তর দেখতে পাবেন।',
    goRead: 'আমার বই দেখুন',
    required: 'আবশ্যক',
    optional: 'ঐচ্ছিক',
    errCode: 'বইয়ের কোডটি লিখুন',
    errName: 'আপনার নাম লিখুন',
    errRoll: 'ক্লাস রোল লিখুন',
    errEmail: 'সঠিক ইমেইল দিন',
    errPass: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে',
    network: 'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  },
  en: {
    eyebrow: 'Activate your book',
    title: 'Open every answer with your book code',
    sub: 'Enter the hidden code printed inside your copy. Once activated it stays on this account for good.',
    codeLabel: 'Book code',
    codeHint: 'Scratch the panel inside the book to reveal it. Upper or lower case and dashes make no difference.',
    who: 'About you',
    name: 'Full name',
    college: 'Medical college',
    collegePick: 'Select one',
    roll: 'Class roll number',
    phone: 'WhatsApp number',
    errPhone: 'Enter a valid mobile number (01XXXXXXXXX)',
    account: 'Your account',
    haveAccount: 'I have an account',
    newAccount: 'Create an account',
    email: 'Email',
    password: 'Password',
    signedInAs: 'Signed in as',
    submit: 'Activate the book',
    working: 'Activating…',
    doneTitle: 'Your book is open!',
    doneSub: 'Scan any QR code in the book and the answers will be there.',
    goRead: 'Go to my book',
    required: 'required',
    optional: 'optional',
    errCode: 'Enter the book code',
    errName: 'Enter your name',
    errRoll: 'Enter your class roll',
    errEmail: 'Enter a valid email',
    errPass: 'Password must be at least 6 characters',
    network: 'Something went wrong. Please try again.',
  },
};

export default function ActivateBook() {
  const { isBengali } = useLanguage();
  const S = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';
  const router = useRouter();

  const [me, setMe] = useState(null);        // the signed-in account, if any
  const [colleges, setColleges] = useState([]);
  const [mode, setMode] = useState('new');   // 'new' | 'login' — only when signed out
  const [form, setForm] = useState({
    code: '', fullName: '', medicalCollege: '', classRoll: '', phone: '',
    email: '', password: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  // Who is signed in, and the college list. Read from storage rather than
  // asking the server: this page must render for a visitor with no session at
  // all, and a failed /auth/me would otherwise flash an error at them.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      if (raw) {
        const u = JSON.parse(raw);
        setMe(u);
        setForm((f) => ({
          ...f,
          fullName: f.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          medicalCollege: f.medicalCollege || u.medicalCollege || '',
        }));
      }
    } catch {
      /* no session — the form asks for one */
    }
    fetch(`${API_BASE_URL}/medical-colleges`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.success && setColleges(j.data || []))
      .catch(() => {
        /* the college box becomes optional free text — see its note */
      });
  }, []);

  /** The code as it will be sent — shown back so a typo is visible before submit. */
  const tidyCode = useMemo(
    () => String(form.code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    [form.code]
  );

  const validate = () => {
    const e = {};
    if (tidyCode.length < 8) e.code = S.errCode;
    if (form.fullName.trim().length < 2) e.fullName = S.errName;
    if (!form.classRoll.trim()) e.classRoll = S.errRoll;
    if (!me) {
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = S.errEmail;
      if (mode === 'new') {
        if (form.password.length < 6) e.password = S.errPass;
        // Only on the create-an-account tab, where the field is shown.
        // Registration requires a WhatsApp number, and the shop settled on one
        // number per person rather than a separate phone (see the checkout
        // form). Checking it on the sign-in tab would fail against a field
        // that is not on screen — an error nobody could act on.
        if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\D/g, ''))) e.phone = S.errPhone;
      }
      if (mode === 'login' && !form.password) e.password = S.errPass;
    }
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    setBusy(true);
    try {
      // Sign in or sign up first when there is no session — a code has to land
      // on an account, and this is the last moment to have one.
      if (!me) {
        // Registering is two steps, not one: POST /auth/register answers with
        // the new user and a token at the TOP level of the response, not inside
        // `data` — so persistSession(result.data) would store a user and no
        // token, and the redeem call below would be rejected as unauthorised.
        // The register page has always signed in afterwards for this reason;
        // doing the same here keeps one story about how a session is made.
        if (mode === 'new') {
          const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
          const reg = await apiRegister({
            firstName: firstName || 'Reader',
            lastName: rest.join(' '),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            whatsappNumber: form.phone.trim(),
            medicalCollege: form.medicalCollege || undefined,
          });
          if (!reg.ok || !reg.success) {
            setServerError(reg.message || S.network);
            setBusy(false);
            return;
          }
        }

        const login = await apiLogin({
          identifier: form.email.trim().toLowerCase(),
          password: form.password,
          mode: 'email',
        });
        if (!login.ok || !login.success || !login.data) {
          setServerError(login.message || S.network);
          setBusy(false);
          return;
        }
        persistSession(login.data);
        setMe(login.data.user);
      }

      const token = localStorage.getItem(STORAGE_KEYS.token) || '';
      const res = await fetch(`${API_BASE_URL}/book-copies/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-device-id': getDeviceId(),
        },
        body: JSON.stringify({
          code: form.code,
          fullName: form.fullName.trim(),
          medicalCollege: form.medicalCollege || undefined,
          classRoll: form.classRoll.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || S.network);
      setDone(json);
    } catch (err) {
      setServerError(err.message || S.network);
    } finally {
      setBusy(false);
    }
  };

  // ── Done ────────────────────────────────────────────────────
  if (done) {
    return (
      <Container className="py-14">
        <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <LuCircleCheck className="text-3xl" />
          </span>
          <h1 className={cn('font-heading text-2xl font-bold text-foreground', bn)}>{S.doneTitle}</h1>
          <p className={cn('mt-2 text-sm text-muted-foreground', bn)}>{S.doneSub}</p>
          <p className="mt-4 rounded-xl bg-surface-soft px-4 py-3 font-mono text-sm font-bold tracking-wide text-foreground">
            {done.data?.code}
          </p>
          <Link
            href="/dashboard/user/my-book"
            className={cn(
              'mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-hover',
              bn
            )}
          >
            <LuBookOpen /> {S.goRead} <LuArrowRight />
          </Link>
        </div>
      </Container>
    );
  }

  // ── The form ────────────────────────────────────────────────
  return (
    <Container className="py-10 lg:py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-7 text-center">
          <span className={cn('inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-soft px-4 py-1.5 text-sm font-bold text-primary', bn)}>
            <LuQrCode /> {S.eyebrow}
          </span>
          <h1 className={cn('mt-3 font-display text-2xl font-extrabold leading-tight text-gradient-medical sm:text-3xl', bn)}>
            {S.title}
          </h1>
          <p className={cn('mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground', bn)}>
            {S.sub}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
          {/* The code — first, because it is why they are here */}
          <Field label={S.codeLabel} required S={S} bn={bn} invalid={errors.code} help={S.codeHint}>
            <input
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="MV-7K3P-9QXR-4M6T"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className={cn(inputCls, 'font-mono text-base tracking-wider')}
            />
            {errors.code && <ErrText bn={bn}>{errors.code}</ErrText>}
          </Field>

          <Section icon={LuUser} title={S.who} bn={bn}>
            <Field label={S.name} required S={S} bn={bn} invalid={errors.fullName}>
              <input className={inputCls} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
              {errors.fullName && <ErrText bn={bn}>{errors.fullName}</ErrText>}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={S.college} S={S} bn={bn}>
                <select className={inputCls} value={form.medicalCollege} onChange={(e) => set('medicalCollege', e.target.value)}>
                  <option value="">{S.collegePick}</option>
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={S.roll} required S={S} bn={bn} invalid={errors.classRoll}>
                <input className={inputCls} value={form.classRoll} onChange={(e) => set('classRoll', e.target.value)} />
                {errors.classRoll && <ErrText bn={bn}>{errors.classRoll}</ErrText>}
              </Field>
            </div>
          </Section>

          {/* The account the book will belong to */}
          <Section icon={LuLogIn} title={S.account} bn={bn}>
            {me ? (
              <p className={cn('flex items-center gap-2 rounded-xl bg-accent-soft/60 px-4 py-3 text-sm text-foreground', bn)}>
                <LuCircleCheck className="shrink-0 text-accent" />
                {S.signedInAs} <b className="font-mono">{me.email}</b>
              </p>
            ) : (
              <>
                <div className="mb-3 flex gap-1 rounded-xl bg-surface-soft p-1">
                  {[
                    { id: 'new', label: S.newAccount },
                    { id: 'login', label: S.haveAccount },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setMode(t.id); setErrors({}); setServerError(''); }}
                      className={cn(
                        'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        mode === t.id ? 'bg-card text-primary shadow-soft' : 'text-muted-foreground hover:text-foreground',
                        bn
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <Field label={S.email} required S={S} bn={bn} invalid={errors.email}>
                  <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                  {errors.email && <ErrText bn={bn}>{errors.email}</ErrText>}
                </Field>
                <Field label={S.password} required S={S} bn={bn} invalid={errors.password}>
                  <input
                    type="password"
                    className={inputCls}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
                  />
                  {errors.password && <ErrText bn={bn}>{errors.password}</ErrText>}
                </Field>
                {mode === 'new' && (
                  <Field label={S.phone} required S={S} bn={bn} invalid={errors.phone}>
                    <input
                      className={inputCls}
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                    {errors.phone && <ErrText bn={bn}>{errors.phone}</ErrText>}
                  </Field>
                )}
              </>
            )}
          </Section>

          {serverError && (
            <p className={cn('flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral', bn)}>
              <LuTriangleAlert className="mt-0.5 shrink-0" /> {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover disabled:opacity-60',
              bn
            )}
          >
            {busy ? <LuLoaderCircle className="animate-spin" /> : <LuTicket />}
            {busy ? S.working : S.submit}
          </button>
        </form>
      </div>
    </Container>
  );
}

// ── Pieces ──────────────────────────────────────────────────

function Section({ icon: Icon, title, bn, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-soft/50 p-4">
      <h2 className={cn('mb-3 flex items-center gap-2 text-sm font-bold text-foreground', bn)}>
        <Icon className="text-primary" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, help, invalid, S, bn, children }) {
  return (
    <div data-invalid={invalid ? 'true' : undefined}>
      <label className={cn('mb-1.5 block text-sm font-medium text-foreground', bn)}>
        {label}{' '}
        <span className={cn('text-xs font-normal', required ? 'text-coral' : 'text-muted-foreground')}>
          ({required ? S.required : S.optional})
        </span>
      </label>
      {help && <p className={cn('mb-2 text-xs text-muted-foreground', bn)}>{help}</p>}
      <div className={cn(invalid && '[&_input]:border-coral [&_select]:border-coral')}>{children}</div>
    </div>
  );
}

const ErrText = ({ bn, children }) => (
  <p className={cn('mt-1 text-xs text-coral', bn)}>{children}</p>
);

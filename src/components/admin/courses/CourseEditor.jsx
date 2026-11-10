'use client';

/**
 * Add / Edit a recorded course — laid out like the course page itself
 * (11 Nov 2026), so the shop fills it in the order a buyer reads it:
 *
 *   ১ Name, short description (the top) and overview (lower down) — each
 *     said once, never the same words twice (the shop, 11 Nov 2026)
 *   ২ Picture         → the video card
 *   ৩ Price           → the price card (the discount works itself out)
 *   ৪ What you get    → the list on the video and price cards
 *   ৫ Classes         → the curriculum (modules → YouTube classes)
 *   ৬ Publish
 *
 * A live preview on the right shows the top of the page as it is typed, and
 * the step list says what is still missing. Bengali and English side by side
 * (title/titleBn …); either may be left empty and the site shows the other.
 * Classes need the course saved first: on a new course, saving moves to its
 * edit page with step ৫ open.
 */
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiCheckCircle, FiExternalLink, FiEye, FiImage, FiLoader, FiPlay, FiPlus, FiSave, FiTrash2, FiUpload } from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import CurriculumEditor from './CurriculumEditor';
import { btnGhost, btnPrimary, call, input, priceOf, taka, token } from './courseAdmin';

const ICON_CHOICES = [
  { id: 'video', label: '🎬 ভিডিও' },
  { id: 'clock', label: '⏰ সময়' },
  { id: 'device', label: '📱 ডিভাইস' },
  { id: 'check', label: '✔️ অন্য' },
];

// A course saved before the two languages has one title, in either language;
// a course saved with no English has its Bengali copied into `title`.
const hasBangla = (t) => /[ঀ-৿]/.test(t || '');
const split = (en, bn) =>
  bn ? { bn, en: en && en !== bn ? en : '' } : hasBangla(en) ? { bn: en, en: '' } : { bn: '', en: en || '' };

const EMPTY = {
  titleBn: '', title: '', summaryBn: '', summary: '', detailsBn: '', details: '', fee: '', offerPrice: '', image: '', status: 'published',
  includes: [
    { icon: 'video', textBn: '', text: '' },
    { icon: 'clock', textBn: 'যেকোনো সময় দেখা যায়', text: 'Watch any time' },
    { icon: 'device', textBn: 'মোবাইল ও কম্পিউটারে', text: 'On mobile and computer' },
  ],
};

const toForm = (c) => {
  const t = split(c.title, c.titleBn);
  const d = split(c.details, c.detailsBn);
  const s = split(c.summary, c.summaryBn);
  return {
    titleBn: t.bn,
    title: t.en,
    summaryBn: s.bn,
    summary: s.en,
    detailsBn: d.bn,
    details: d.en,
    fee: c.fee && c.fee !== '0' ? String(c.fee) : '',
    offerPrice: c.offerPrice ? String(c.offerPrice) : '',
    image: c.image || '',
    status: c.status || 'published',
    includes: (c.courseIncludes || []).map((x) => ({ icon: x.icon || 'check', textBn: x.textBn || (hasBangla(x.text) ? x.text : ''), text: hasBangla(x.text) && !x.textBn ? '' : x.text || '' })),
  };
};

export default function CourseEditor({ courseId }) {
  const isEdit = !!courseId;
  const router = useRouter();
  const { showToast, toastNode } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slug, setSlug] = useState('');
  const [stats, setStats] = useState({ modules: 0, classes: 0, minutes: 0 });
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    call(`/courses/${courseId}`)
      .then((j) => {
        setForm(toForm(j.data || {}));
        setSlug(j.data?.slug || '');
      })
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  }, [isEdit, courseId, showToast]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setInclude = (i, patch) => setForm((f) => ({ ...f, includes: f.includes.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const onStats = useCallback((s) => setStats(s), []);

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('error', 'শুধু ছবি দেওয়া যাবে');
    if (file.size > 5 * 1024 * 1024) return showToast('error', 'ছবি ৫MB-এর কম হতে হবে');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API_BASE_URL}/upload/image`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.data?.url) throw new Error(data.message || 'ছবি আপলোড হয়নি');
      setForm((f) => ({ ...f, image: data.data.url }));
      showToast('success', 'ছবি বসেছে — সেভ করতে ভুলবেন না');
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.titleBn.trim() && !form.title.trim()) return showToast('error', 'কোর্সের নাম লিখুন (বাংলা বা English)');
    const fee = String(form.fee).replace(/[^\d]/g, '');
    const offer = String(form.offerPrice).replace(/[^\d]/g, '');
    if (offer && fee && Number(offer) >= Number(fee)) return showToast('error', 'অফার দাম আসল দামের চেয়ে কম হতে হবে');
    const body = {
      // `title` is required on the server: English, or the Bengali when there is none.
      title: form.title.trim() || form.titleBn.trim(),
      titleBn: form.titleBn.trim(),
      summary: form.summary.trim(),
      summaryBn: form.summaryBn.trim(),
      details: form.details.trim(),
      detailsBn: form.detailsBn.trim(),
      fee: fee || '0',
      offerPrice: offer || '',
      image: form.image.trim(),
      status: form.status,
      type: 'Recorded',
      lectures: stats.classes || undefined,
      courseIncludes: form.includes
        .map((x) => ({ icon: x.icon || 'check', text: x.text.trim(), textBn: x.textBn.trim() }))
        .filter((x) => x.text || x.textBn),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await call(`/courses/${courseId}`, 'PATCH', body);
        showToast('success', 'সেভ হয়েছে ✓');
      } else {
        const j = await call('/courses/create-course', 'POST', body);
        showToast('success', 'কোর্স তৈরি হয়েছে — এবার ৫ নম্বর ধাপে ক্লাসগুলো যোগ করুন');
        router.push(`/dashboard/admin/courses/${j.data._id}#step-classes`);
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 p-10 text-dash-mute2"><FiLoader className="animate-spin" /> লোড হচ্ছে…</div>;
  }

  const price = priceOf(form);
  const list = Number(String(form.fee).replace(/[^\d]/g, '')) || 0;
  const offPct = price > 0 && price < list ? Math.round(((list - price) / list) * 100) : 0;
  const name = form.titleBn || form.title;
  const steps = [
    { id: 'step-name', label: 'নাম ও বিবরণ', done: !!name && !!(form.summaryBn || form.summary) && !!(form.detailsBn || form.details) },
    { id: 'step-image', label: 'ছবি', done: !!form.image },
    { id: 'step-price', label: 'দাম', done: price > 0 || form.fee === '0' },
    { id: 'step-includes', label: 'কোর্সে যা পাবেন', done: form.includes.some((x) => x.text || x.textBn) },
    { id: 'step-classes', label: 'ক্লাসগুলো', done: stats.classes > 0 },
    { id: 'step-publish', label: 'প্রকাশ', done: isEdit && form.status === 'published' },
  ];
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-5">
      {toastNode}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/admin/courses" className="mb-1 inline-flex items-center gap-1 text-sm text-dash-mute2 hover:text-brand"><FiArrowLeft /> All Courses</Link>
          <h1 className="text-2xl font-bold text-dash-ink2">{isEdit ? 'কোর্স এডিট' : 'নতুন কোর্স'}</h1>
          <p className="text-sm text-dash-mute2">উপর থেকে নিচে ধাপগুলো পূরণ করুন — ডানে সাথে সাথে দেখাবে সাইটে কেমন লাগবে।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEdit && <Link href={`/dashboard/admin/courses/view?course=${courseId}`} className={btnGhost}><FiEye /> ছাত্রের মতো দেখুন</Link>}
          {isEdit && slug && form.status === 'published' && (
            <a href={`/courses/${slug}`} target="_blank" rel="noreferrer" className={btnGhost}><FiExternalLink /> সাইটে দেখুন</a>
          )}
          <button type="button" onClick={save} disabled={saving || uploading} className={btnPrimary}>
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />} {isEdit ? 'সেভ করুন' : 'সেভ করে পরের ধাপে'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {/* ১ Name & about */}
          <Step id="step-name" n="১" title="কোর্সের নাম ও বিবরণ" hint="তিনটা আলাদা জিনিস, প্রতিটা একবারই লিখুন — একই কথা দুই জায়গায় লেখার দরকার নেই।">
            <div className="space-y-5">
              <SubPart label="ক" title="কোর্সের নাম" where="পাতার একদম উপরে, বড় করে">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={form.titleBn} onChange={set('titleBn')} className={input} placeholder="বাংলা — যেমন: হিস্টো-এমব্রায়ো ভাইভা রেডি কোর্স" />
                  <input value={form.title} onChange={set('title')} className={input} placeholder="English — e.g. Histo-Embryo Viva Ready Course" />
                </div>
              </SubPart>
              <SubPart label="খ" title="ছোট বিবরণ" where="নামের ঠিক নিচে — ১–২ লাইন, এক নজরে কোর্সটা কী">
                <div className="grid gap-3 sm:grid-cols-2">
                  <textarea value={form.summaryBn} onChange={set('summaryBn')} rows={2} maxLength={400} className={input} placeholder="বাংলা — যেমন: মাত্র ৬ ঘণ্টায় হিস্টোলজি, এমব্রায়োলজি ও স্পেশাল ফিগার — ভাইভার জন্য পুরো রেডি।" />
                  <textarea value={form.summary} onChange={set('summary')} rows={2} maxLength={400} className={input} placeholder="English — one or two lines" />
                </div>
              </SubPart>
              <SubPart label="গ" title="কোর্স ওভারভিউ" where="নিচে &ldquo;কোর্স ওভারভিউ&rdquo; অংশে — বিস্তারিত যা বলতে চান">
                <div className="grid gap-3 sm:grid-cols-2">
                  <textarea value={form.detailsBn} onChange={set('detailsBn')} rows={7} className={input} placeholder="বাংলা — কোর্সটা কাদের জন্য, কেন দরকার, কী কী শেখানো হবে" />
                  <textarea value={form.details} onChange={set('details')} rows={7} className={input} placeholder="English" />
                </div>
              </SubPart>
            </div>
          </Step>

          {/* ২ Picture */}
          <Step id="step-image" n="২" title="কোর্সের ছবি" hint="ভিডিও কার্ডে আর কোর্সের তালিকায় দেখাবে। ১২৮০×৭২০ (চওড়া) ছবি সবচেয়ে ভালো।">
            <div className="grid gap-4 sm:grid-cols-[260px_1fr] sm:items-center">
              <button
                type="button"
                onClick={() => !uploading && fileRef.current?.click()}
                className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-dash-line bg-dash-soft text-dash-mute2 transition hover:border-brand"
              >
                {form.image ? (
                  <img src={form.image} alt="" className="h-full w-full object-cover" />
                ) : uploading ? (
                  <FiLoader className="animate-spin" size={22} />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-sm"><FiUpload size={22} /> ছবি বাছাই করুন</span>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              <div className="space-y-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={btnGhost}>
                  {uploading ? <FiLoader className="animate-spin" /> : <FiUpload />} {form.image ? 'অন্য ছবি দিন' : 'কম্পিউটার/মোবাইল থেকে ছবি দিন'}
                </button>
                <div className="flex items-center gap-2">
                  <FiImage className="shrink-0 text-dash-faint" />
                  <input value={form.image} onChange={set('image')} className={input} placeholder="অথবা ছবির লিংক পেস্ট করুন" />
                </div>
                {form.image && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, image: '' }))} className="text-xs font-semibold text-rose-600 hover:underline">ছবি সরান</button>
                )}
              </div>
            </div>
          </Step>

          {/* ৩ Price */}
          <Step id="step-price" n="৩" title="দাম" hint="অফার দাম দিলে আসল দামটা কেটে দেখাবে, আর কত % ছাড় সেটা নিজেই হিসাব হবে।">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="আসল দাম (৳)" hint="খালি বা ০ = ফ্রি কোর্স">
                <input value={form.fee} onChange={set('fee')} inputMode="numeric" className={input} placeholder="999" />
              </Field>
              <Field label="অফার দাম (৳)" hint="খালি = কোনো অফার নেই">
                <input value={form.offerPrice} onChange={set('offerPrice')} inputMode="numeric" className={input} placeholder="499" />
              </Field>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold text-emerald-700">ক্রেতা দেবে</p>
                <p className="text-2xl font-extrabold text-emerald-700">{price > 0 ? taka(price) : 'ফ্রি'}</p>
                {offPct > 0 && <p className="text-xs font-bold text-rose-600">{offPct}% ছাড়</p>}
              </div>
            </div>
          </Step>

          {/* ৪ What you get */}
          <Step id="step-includes" n="৪" title="কোর্সে যা পাবেন" hint="ওভারভিউয়ের নিচে একবারই টিক দিয়ে দেখাবে। ছোট ছোট লাইন — যেমন: ২০টি রেকর্ড করা ক্লাস, নোট PDF।">
            <div className="space-y-2">
              {form.includes.map((x, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_auto]">
                  <select value={x.icon} onChange={(e) => setInclude(i, { icon: e.target.value })} className={input}>
                    {ICON_CHOICES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <input value={x.textBn} onChange={(e) => setInclude(i, { textBn: e.target.value })} placeholder={i === 0 && stats.classes ? `${stats.classes}টি রেকর্ড করা ক্লাস` : 'বাংলা'} className={input} />
                  <input value={x.text} onChange={(e) => setInclude(i, { text: e.target.value })} placeholder={i === 0 && stats.classes ? `${stats.classes} recorded classes` : 'English'} className={input} />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, includes: f.includes.filter((_, k) => k !== i) }))} className={`${btnGhost} text-rose-600`} title="সরান"><FiTrash2 /></button>
                </div>
              ))}
              <button type="button" onClick={() => setForm((f) => ({ ...f, includes: [...f.includes, { icon: 'check', textBn: '', text: '' }] }))} className={btnGhost}>
                <FiPlus /> আরেকটা যোগ করুন
              </button>
            </div>
          </Step>

          {/* ৫ Classes */}
          <Step id="step-classes" n="৫" title="মডিউল ও ক্লাস" hint="আগে একটা মডিউল (অধ্যায়) বানান, তারপর তার ভেতরে ক্লাস — প্রতিটা ক্লাস একটা YouTube ভিডিও (Unlisted রাখা ভালো)।">
            {isEdit ? (
              <CurriculumEditor courseId={courseId} onStats={onStats} />
            ) : (
              <div className="rounded-xl border border-dashed border-dash-line bg-dash-soft/50 p-6 text-center">
                <p className="text-sm text-dash-mute2">ক্লাস যোগ করতে আগে উপরের অংশগুলো একবার সেভ করুন।</p>
                <button type="button" onClick={save} disabled={saving} className={`${btnPrimary} mt-3`}>
                  {saving ? <FiLoader className="animate-spin" /> : <FiSave />} সেভ করে ক্লাস যোগ করুন
                </button>
              </div>
            )}
          </Step>

          {/* ৬ Publish */}
          <Step id="step-publish" n="৬" title="প্রকাশ" hint="চালু করলে সাইটের কোর্স পাতায় দেখাবে। খসড়া রাখলে শুধু অ্যাডমিন দেখবে।">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { v: 'published', t: 'চালু', d: 'সাইটে দেখাবে, সবাই কিনতে পারবে' },
                { v: 'draft', t: 'খসড়া', d: 'সাইটে দেখাবে না — কাজ শেষ হলে চালু করুন' },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: o.v }))}
                  className={`rounded-xl border-2 p-4 text-left transition ${form.status === o.v ? 'border-brand bg-brand-soft/40' : 'border-dash-line hover:border-brand/40'}`}
                >
                  <p className="flex items-center gap-2 font-bold text-dash-ink2">{form.status === o.v && <FiCheckCircle className="text-brand" />} {o.t}</p>
                  <p className="text-xs text-dash-mute2">{o.d}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={save} disabled={saving || uploading} className={`${btnPrimary} mt-4 w-full py-3`}>
              {saving ? <FiLoader className="animate-spin" /> : <FiSave />} {isEdit ? 'সব সেভ করুন' : 'সেভ করে পরের ধাপে'}
            </button>
          </Step>
        </div>

        {/* Live preview + steps */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="overflow-hidden rounded-2xl bg-[#0b1220] p-4 text-white shadow-lg">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">সাইটে যেমন দেখাবে</p>
            <div className="relative aspect-video overflow-hidden rounded-xl bg-white/5">
              {form.image ? <img src={form.image} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-emerald-600 to-teal-800" />}
              <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"><FiPlay className="ml-0.5" /></span>
            </div>
            <p className="mt-3 text-lg font-extrabold leading-snug">{name || 'কোর্সের নাম'}</p>
            {(form.summaryBn || form.summary) && <p className="mt-1 line-clamp-3 text-xs text-white/60">{form.summaryBn || form.summary}</p>}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['মডিউল', stats.modules],
                ['ক্লাস', stats.classes],
                ['সময়', stats.minutes >= 60 ? `${Math.round((stats.minutes / 60) * 10) / 10} ঘ.` : `${stats.minutes} মি.`],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-white/5 py-2">
                  <p className="text-[10px] text-white/50">{l}</p>
                  <p className="text-sm font-bold">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-baseline gap-2 rounded-xl bg-white px-3 py-2.5 text-slate-900">
              <span className="text-xl font-extrabold">{price > 0 ? taka(price) : 'ফ্রি'}</span>
              {offPct > 0 && <span className="text-xs text-slate-500 line-through">{taka(list)}</span>}
              {offPct > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{offPct}% ছাড়</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-dash-line bg-dash-card p-4">
            <p className="mb-2 text-sm font-bold text-dash-ink2">ধাপগুলো</p>
            <ul className="space-y-1">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button type="button" onClick={() => go(s.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-dash-soft">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-dash-soft text-dash-mute2'}`}>
                      {s.done ? <FiCheck /> : i + 1}
                    </span>
                    <span className={s.done ? 'text-dash-ink3' : 'text-dash-mute2'}>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SubPart({ label, title, where, children }) {
  return (
    <div>
      <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-bold text-dash-ink2">{label}. {title}</span>
        <span className="text-xs text-dash-mute2">— {where}</span>
      </p>
      {children}
    </div>
  );
}

function Step({ id, n, title, hint, children }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-dash-line bg-dash-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{n}</span>
        <div>
          <h2 className="text-lg font-bold text-dash-ink2">{title}</h2>
          {hint && <p className="text-xs text-dash-mute2">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-dash-ink3">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dash-mute2">{hint}</span>}
    </label>
  );
}

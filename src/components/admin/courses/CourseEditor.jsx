'use client';

/**
 * Add / Edit a recorded course — the same parts, by the same names and in
 * the same order as the course page (11 Nov 2026, the shop's layout):
 *
 *   ১ হিরো (উপরের অংশ)   name, short description, picture, intro video
 *   ২ দাম                the price card
 *   ৩ কোর্স ওভারভিউ       the long description
 *   ৪ কোর্স কারিকুলাম     modules → classes (YouTube)
 *   ৫ কোর্সে যা পাবেন     list
 *   ৬ সুবিধা              list (empty = the site's standard list)
 *   ৭ কীভাবে কিনবেন       the same for every course — shown, not edited
 *   ৮ প্রশ্নোত্তর          list (empty = the site's standard questions)
 *   ৯ প্রকাশ
 *
 * Every part after the overview — and the hero's numbers and Contact
 * button — has a "পাতায় দেখাবে" switch (course.display); off by default
 * where the shop asked for less (DEFAULT_DISPLAY).
 *
 * Section names come from components/recorded/courseSections, which the
 * course page uses too. Each thing is written once — the short description
 * is the top, the overview the long text. Bengali and English side by side;
 * either may be left empty and the site shows the other. A live preview of
 * the top of the page sits on the right with a list of what is still
 * missing. Classes need the course saved first: saving a new course moves
 * to its edit page at the curriculum.
 */
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiCheckCircle, FiExternalLink, FiEye, FiFilm, FiImage, FiLoader, FiPlay, FiPlus, FiSave, FiTrash2, FiUpload, FiYoutube } from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import { COURSE_SECTIONS, DEFAULT_BENEFITS, DEFAULT_DISPLAY, DEFAULT_FAQ, HOW_TO_BUY, isVideoFile, isYouTube } from '@/components/recorded/courseSections';
import CurriculumEditor, { youtubeId } from './CurriculumEditor';
import { btnGhost, btnPrimary, call, input, priceOf, taka, token } from './courseAdmin';

const S = COURSE_SECTIONS.bn;
const SE = COURSE_SECTIONS.en;

// A course saved before the two languages has one title, in either language;
// a course saved with no English has its Bengali copied into `title`.
const hasBangla = (t) => /[ঀ-৿]/.test(t || '');
const split = (en, bn) =>
  bn ? { bn, en: en && en !== bn ? en : '' } : hasBangla(en) ? { bn: en, en: '' } : { bn: '', en: en || '' };
const pair = (x, en = 'text', bnKey = 'textBn') => {
  const s = split(x?.[en], x?.[bnKey]);
  return { bn: s.bn, en: s.en };
};

const EMPTY = {
  titleBn: '', title: '', summaryBn: '', summary: '', detailsBn: '', details: '',
  fee: '', offerPrice: '', image: '', promoVideo: '', status: 'published',
  includes: [{ bn: '', en: '' }],
  benefits: [],
  faqs: [],
  display: { ...DEFAULT_DISPLAY },
};

const toForm = (c) => {
  const t = split(c.title, c.titleBn);
  const d = split(c.details, c.detailsBn);
  const s = split(c.summary, c.summaryBn);
  return {
    titleBn: t.bn, title: t.en,
    summaryBn: s.bn, summary: s.en,
    detailsBn: d.bn, details: d.en,
    fee: c.fee && c.fee !== '0' ? String(c.fee) : '',
    offerPrice: c.offerPrice ? String(c.offerPrice) : '',
    // A video link once put in the picture's place goes to the video field.
    image: isYouTube(c.image) || isVideoFile(c.image) ? '' : c.image || '',
    promoVideo: c.promoVideo || (isYouTube(c.image) || isVideoFile(c.image) ? c.image : ''),
    display: { ...DEFAULT_DISPLAY, ...(c.display || {}) },
    status: c.status || 'published',
    includes: (c.courseIncludes || []).map((x) => pair(x)),
    benefits: (c.benefits || []).map((x) => pair(x)),
    faqs: (c.faqs || []).map((f) => ({ q: pair(f, 'q', 'qBn'), a: pair(f, 'a', 'aBn') })),
  };
};
// Out of the form: English falls back to the Bengali, empty rows dropped.
const outPairs = (rows) => rows.map((r) => ({ text: r.en.trim(), textBn: r.bn.trim() })).filter((r) => r.text || r.textBn);

export default function CourseEditor({ courseId }) {
  const isEdit = !!courseId;
  const router = useRouter();
  const { showToast, toastNode } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoRef = useRef(null);
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
  const setRow = (list, i, patch) => setForm((f) => ({ ...f, [list]: f[list].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const addRow = (list, row) => setForm((f) => ({ ...f, [list]: [...f[list], row] }));
  const dropRow = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, k) => k !== i) }));
  const onStats = useCallback((s) => setStats(s), []);
  const toggle = (k) => ({ checked: !!form.display[k], onChange: (v) => setForm((f) => ({ ...f, display: { ...f.display, [k]: v } })) });

  // An intro video file → the public uploads (book-content/upload-public, up to 200 MB).
  const uploadVideo = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) return showToast('error', 'শুধু ভিডিও ফাইল দেওয়া যাবে (mp4)');
    if (file.size > 200 * 1024 * 1024) return showToast('error', 'ভিডিও ২০০MB-এর কম হতে হবে — বড় ভিডিও YouTube-এ রেখে লিংক দিন');
    setVideoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE_URL}/book-content/upload-public`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.data?.fileUrl) throw new Error(data.message || 'ভিডিও আপলোড হয়নি');
      setForm((f) => ({ ...f, promoVideo: data.data.fileUrl }));
      showToast('success', 'ভিডিও বসেছে — সেভ করতে ভুলবেন না');
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setVideoUploading(false);
    }
  };

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
    if (form.promoVideo.trim() && !youtubeId(form.promoVideo) && !isVideoFile(form.promoVideo) && !/^https?:\/\//.test(form.promoVideo.trim())) {
      return showToast('error', 'ভিডিওর ঘরে YouTube লিংক বা ভিডিওর লিংক দিন, অথবা ভিডিও আপলোড করুন');
    }
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
      promoVideo: form.promoVideo.trim(),
      status: form.status,
      display: form.display,
      type: 'Recorded',
      lectures: stats.classes || undefined,
      courseIncludes: outPairs(form.includes).map((x) => ({ icon: 'check', ...x })),
      benefits: outPairs(form.benefits),
      faqs: form.faqs
        .map((f) => ({ q: f.q.en.trim(), qBn: f.q.bn.trim(), a: f.a.en.trim(), aBn: f.a.bn.trim() }))
        .filter((f) => (f.q || f.qBn) && (f.a || f.aBn)),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await call(`/courses/${courseId}`, 'PATCH', body);
        showToast('success', 'সেভ হয়েছে ✓');
      } else {
        const j = await call('/courses/create-course', 'POST', body);
        showToast('success', `কোর্স তৈরি হয়েছে — এবার "${S.curriculum}"-এ ক্লাসগুলো যোগ করুন`);
        router.push(`/dashboard/admin/courses/${j.data._id}#step-curriculum`);
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
  const promoId = youtubeId(form.promoVideo);
  const steps = [
    { id: 'step-hero', label: 'হিরো (নাম, ছোট বিবরণ, ছবি)', done: !!name && !!(form.summaryBn || form.summary) && !!form.image },
    { id: 'step-price', label: 'দাম', done: price > 0 || form.fee === '0' },
    { id: 'step-overview', label: S.overview, done: !!(form.detailsBn || form.details) },
    { id: 'step-curriculum', label: S.curriculum, done: stats.classes > 0, off: !form.display.curriculum },
    { id: 'step-includes', label: S.includes, done: form.includes.some((x) => x.bn || x.en), off: !form.display.includes },
    { id: 'step-benefits', label: S.benefits, done: true, off: !form.display.benefits },
    { id: 'step-how', label: S.how, done: true, off: !form.display.how },
    { id: 'step-faq', label: S.faq, done: true, off: !form.display.faq },
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
          <p className="text-sm text-dash-mute2">কোর্সের পাতা যে ক্রমে সাজানো, ঠিক সেই ক্রমে ধাপগুলো — উপর থেকে নিচে পূরণ করুন।</p>
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
          {/* ১ Hero */}
          <Step id="step-hero" n="১" title="হিরো (উপরের অংশ)" en="Hero" hint="কোর্সের পাতার একদম উপরের অংশ — বাঁয়ে নাম আর ছোট বিবরণ, ডানে ছবি/ভিডিও।">
            <div className="space-y-5">
              <SubPart label="ক" title="কোর্সের নাম" where="উপরে, বড় করে">
                <Pair
                  bn={form.titleBn} en={form.title}
                  onBn={set('titleBn')} onEn={set('title')}
                  phBn="যেমন: হিস্টো-এমব্রায়ো ভাইভা রেডি কোর্স" phEn="e.g. Histo-Embryo Viva Ready Course"
                />
              </SubPart>
              <SubPart label="খ" title="ছোট বিবরণ" where="নামের ঠিক নিচে — ১–২ লাইনে কোর্সটা কী">
                <Pair
                  area rows={2} max={400}
                  bn={form.summaryBn} en={form.summary}
                  onBn={set('summaryBn')} onEn={set('summary')}
                  phBn="যেমন: মাত্র ৬ ঘণ্টায় হিস্টোলজি, এমব্রায়োলজি ও স্পেশাল ফিগার — ভাইভার জন্য পুরো রেডি।" phEn="One or two lines"
                />
              </SubPart>
              <SubPart label="গ" title="ছবি" where="ডানে ভিডিওর জায়গায়, আর কোর্সের তালিকায় — চওড়া ছবি (১২৮০×৭২০) সবচেয়ে ভালো">
                <div className="grid gap-4 sm:grid-cols-[240px_1fr] sm:items-center">
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
                    {form.image && <button type="button" onClick={() => setForm((f) => ({ ...f, image: '' }))} className="text-xs font-semibold text-rose-600 hover:underline">ছবি সরান</button>}
                  </div>
                </div>
              </SubPart>
              <SubPart label="ঘ" title="ভিডিও" where="ডানের বড় ছবির উপর লাল ▶ চাপলে মাঝখানে বড় করে চলবে — সবাই দেখতে পারবে">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {promoId ? (
                      <img src={`https://i.ytimg.com/vi/${promoId}/mqdefault.jpg`} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                    ) : isVideoFile(form.promoVideo) ? (
                      <video src={`${form.promoVideo}#t=1`} muted preload="metadata" className="h-10 w-16 shrink-0 rounded bg-black object-cover" />
                    ) : (
                      <FiYoutube className="shrink-0 text-dash-faint" size={20} />
                    )}
                    <input value={form.promoVideo} onChange={set('promoVideo')} className={input} placeholder="YouTube লিংক, বা ভিডিওর লিংক (.mp4)" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => videoRef.current?.click()} disabled={videoUploading} className={btnGhost}>
                      {videoUploading ? <FiLoader className="animate-spin" /> : <FiFilm />} {videoUploading ? 'আপলোড হচ্ছে… একটু সময় লাগবে' : 'অথবা ভিডিও আপলোড করুন'}
                    </button>
                    <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => uploadVideo(e.target.files?.[0])} />
                    {form.promoVideo && <button type="button" onClick={() => setForm((f) => ({ ...f, promoVideo: '' }))} className="text-xs font-semibold text-rose-600 hover:underline">ভিডিও সরান</button>}
                    <span className="text-xs text-dash-mute2">খালি রাখলে ▶ চাপলে কারিকুলামে নিয়ে যাবে।</span>
                  </div>
                </div>
              </SubPart>
              <SubPart label="ঙ" title="উপরে কী কী দেখাবে" where="নাম আর ছোট বিবরণের নিচের বক্স, আর কেনার বাটনের পাশে">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['time', 'মোট সময়'],
                    ['modules', 'মডিউলের সংখ্যা'],
                    ['classes', 'ক্লাসের সংখ্যা'],
                    ['access', 'আজীবন অ্যাক্সেস'],
                    ['contact', '“যোগাযোগ করুন” বাটন'],
                  ].map(([k, label]) => (
                    <Check key={k} {...toggle(k)} label={label} />
                  ))}
                </div>
              </SubPart>
            </div>
          </Step>

          {/* ২ Price */}
          <Step id="step-price" n="২" title="দাম" en="Price" hint="ডানের দামের কার্ডে দেখাবে। অফার দাম দিলে আসল দাম কেটে দেখাবে, কত % ছাড় সেটা নিজেই হিসাব হবে।">
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

          {/* ৩ Overview */}
          <Step id="step-overview" n="৩" title={S.overview} en={SE.overview} hint="হিরোর নিচের প্রথম অংশ — কোর্সটা কাদের জন্য, কেন দরকার, কী কী শেখানো হবে। বিস্তারিত লিখুন।">
            <Pair area rows={8} bn={form.detailsBn} en={form.details} onBn={set('detailsBn')} onEn={set('details')} phBn="বাংলা — বিস্তারিত বিবরণ" phEn="English — the full description" />
          </Step>

          {/* ৪ Curriculum */}
          <Step id="step-curriculum" n="৪" title={S.curriculum} en={SE.curriculum} toggle={toggle('curriculum')} hint="সবচেয়ে জরুরি অংশ। আগে মডিউল (অধ্যায়) বানান, তারপর তার ভেতরে ক্লাস — প্রতিটা ক্লাস একটা YouTube ভিডিও (Unlisted রাখা ভালো)।">
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

          {/* ৫ What you get */}
          <Step id="step-includes" n="৫" title={S.includes} en={SE.includes} toggle={toggle('includes')} hint="কারিকুলামের নিচে, বাঁ দিকের বক্সে টিক দিয়ে দেখাবে। ছোট লাইন — যেমন: ২০টি রেকর্ড করা ক্লাস, নোট PDF।">
            <Rows
              rows={form.includes}
              onChange={(i, patch) => setRow('includes', i, patch)}
              onDrop={(i) => dropRow('includes', i)}
              onAdd={() => addRow('includes', { bn: '', en: '' })}
              phBn={stats.classes ? `যেমন: ${stats.classes}টি রেকর্ড করা ক্লাস` : 'যেমন: ২০টি রেকর্ড করা ক্লাস'}
              phEn="English"
            />
          </Step>

          {/* ৬ Benefits */}
          <Step id="step-benefits" n="৬" title={S.benefits} en={SE.benefits} toggle={toggle('benefits')} hint="কারিকুলামের নিচে, ডান দিকের বক্সে। খালি রাখলে নিচের সাধারণ তালিকাটা দেখাবে।">
            {form.benefits.length === 0 && (
              <div className="mb-3 rounded-xl bg-dash-soft/60 p-3 text-xs text-dash-mute2">
                <p className="mb-1 font-semibold">এখন দেখাচ্ছে (সাধারণ তালিকা):</p>
                <ul className="list-inside list-disc">{DEFAULT_BENEFITS.bn.map((t) => <li key={t}>{t}</li>)}</ul>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, benefits: DEFAULT_BENEFITS.bn.map((bn, i) => ({ bn, en: DEFAULT_BENEFITS.en[i] })) }))}
                  className="mt-2 font-semibold text-brand hover:underline"
                >
                  এটা নিয়ে নিজের মতো বদলান
                </button>
              </div>
            )}
            {form.benefits.length > 0 && (
              <Rows rows={form.benefits} onChange={(i, patch) => setRow('benefits', i, patch)} onDrop={(i) => dropRow('benefits', i)} onAdd={() => addRow('benefits', { bn: '', en: '' })} phBn="বাংলা" phEn="English" />
            )}
          </Step>

          {/* ৭ How to buy */}
          <Step id="step-how" n="৭" title={S.how} en={SE.how} toggle={toggle('how')} hint="সব কোর্সে একই — পেমেন্টের নিয়ম। এখানে কিছু লিখতে হবে না, পাতায় এভাবে দেখাবে:">
            <ol className="grid gap-2 sm:grid-cols-3">
              {HOW_TO_BUY.bn.map((t, i) => (
                <li key={t} className="flex items-start gap-2 rounded-xl bg-dash-soft/60 p-3 text-sm text-dash-ink3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">{i + 1}</span> {t}
                </li>
              ))}
            </ol>
          </Step>

          {/* ৮ FAQ */}
          <Step id="step-faq" n="৮" title={S.faq} en={SE.faq} toggle={toggle('faq')} hint="পাতার শেষে। খালি রাখলে নিচের সাধারণ প্রশ্নগুলো দেখাবে।">
            {form.faqs.length === 0 && (
              <div className="mb-3 rounded-xl bg-dash-soft/60 p-3 text-xs text-dash-mute2">
                <p className="mb-1 font-semibold">এখন দেখাচ্ছে (সাধারণ প্রশ্ন):</p>
                <ul className="list-inside list-disc">{DEFAULT_FAQ.bn.map(([q]) => <li key={q}>{q}</li>)}</ul>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, faqs: DEFAULT_FAQ.bn.map(([q, a], i) => ({ q: { bn: q, en: DEFAULT_FAQ.en[i][0] }, a: { bn: a, en: DEFAULT_FAQ.en[i][1] } })) }))}
                  className="mt-2 font-semibold text-brand hover:underline"
                >
                  এগুলো নিয়ে নিজের মতো বদলান
                </button>
              </div>
            )}
            <div className="space-y-3">
              {form.faqs.map((f, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-dash-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-dash-mute">প্রশ্ন {i + 1}</span>
                    <button type="button" onClick={() => dropRow('faqs', i)} className="text-xs font-semibold text-rose-600 hover:underline">মুছুন</button>
                  </div>
                  <Pair bn={f.q.bn} en={f.q.en} onBn={(e) => setRow('faqs', i, { q: { ...f.q, bn: e.target.value } })} onEn={(e) => setRow('faqs', i, { q: { ...f.q, en: e.target.value } })} phBn="প্রশ্ন (বাংলা)" phEn="Question (English)" />
                  <Pair area rows={2} bn={f.a.bn} en={f.a.en} onBn={(e) => setRow('faqs', i, { a: { ...f.a, bn: e.target.value } })} onEn={(e) => setRow('faqs', i, { a: { ...f.a, en: e.target.value } })} phBn="উত্তর (বাংলা)" phEn="Answer (English)" />
                </div>
              ))}
              <button type="button" onClick={() => addRow('faqs', { q: { bn: '', en: '' }, a: { bn: '', en: '' } })} className={btnGhost}><FiPlus /> প্রশ্ন যোগ করুন</button>
            </div>
          </Step>

          {/* ৯ Publish */}
          <Step id="step-publish" n="৯" title="প্রকাশ" en="Publish" hint="চালু করলে সাইটের কোর্স পাতায় দেখাবে। খসড়া রাখলে শুধু অ্যাডমিন দেখবে।">
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
          <div className="overflow-hidden rounded-2xl bg-[#070b14] p-4 text-white shadow-lg">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">হিরো — সাইটে যেমন দেখাবে</p>
            <p className="text-lg font-extrabold leading-snug">{name || 'কোর্সের নাম'}</p>
            <p className="mt-1 line-clamp-3 text-xs text-white/60">{form.summaryBn || form.summary || 'ছোট বিবরণ এখানে দেখাবে'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-center">
              {[
                ['time', 'মোট সময়', stats.minutes >= 60 ? `${Math.round((stats.minutes / 60) * 10) / 10} ঘণ্টা` : `${stats.minutes} মি.`],
                ['modules', 'মডিউল', stats.modules],
                ['classes', 'ক্লাস', stats.classes],
                ['access', 'অ্যাক্সেস', 'আজীবন'],
              ].filter(([k]) => form.display[k]).map(([, l, v]) => (
                <div key={l} className="min-w-[4.5rem] flex-1 rounded-md bg-white/5 px-2 py-1.5">
                  <p className="text-[9px] text-white/45">{l}</p>
                  <p className="text-xs font-bold">{v}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-white/5">
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : promoId ? (
                <img src={`https://i.ytimg.com/vi/${promoId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900" />
              )}
              <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"><FiPlay className="ml-0.5" /></span>
            </div>
            <div className={`mt-2 grid gap-1.5 text-center text-[11px] font-bold ${form.display.contact ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <span className="rounded-lg bg-emerald-500 py-2">এখনই কিনুন · {price > 0 ? taka(price) : 'ফ্রি'}</span>
              {form.display.contact && <span className="rounded-lg border border-white/15 py-2">যোগাযোগ করুন</span>}
            </div>
            <div className="mt-3 flex items-baseline gap-2 rounded-xl bg-white px-3 py-2.5 text-slate-900">
              <span className="text-xl font-extrabold">{price > 0 ? taka(price) : 'ফ্রি'}</span>
              {offPct > 0 && <span className="text-xs text-slate-500 line-through">{taka(list)}</span>}
              {offPct > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{offPct}% ছাড়</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-dash-line bg-dash-card p-4">
            <p className="mb-2 text-sm font-bold text-dash-ink2">ধাপগুলো (পাতার ক্রমে)</p>
            <ul className="space-y-0.5">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button type="button" onClick={() => go(s.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-dash-soft">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-dash-soft text-dash-mute2'}`}>
                      {s.done ? <FiCheck /> : i + 1}
                    </span>
                    <span className={s.done ? 'text-dash-ink3' : 'text-dash-mute2'}>{s.label}</span>
                    {s.off && <span className="ml-auto rounded bg-dash-soft px-1.5 text-[10px] font-semibold text-dash-faint">বন্ধ</span>}
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

function Pair({ bn, en, onBn, onEn, phBn, phEn, area, rows = 2, max }) {
  const El = area ? 'textarea' : 'input';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <El value={bn} onChange={onBn} rows={area ? rows : undefined} maxLength={max} className={input} placeholder={`বাংলা — ${phBn}`.replace('বাংলা — বাংলা', 'বাংলা')} />
      <El value={en} onChange={onEn} rows={area ? rows : undefined} maxLength={max} className={input} placeholder={phEn} />
    </div>
  );
}

function Rows({ rows, onChange, onDrop, onAdd, phBn, phEn }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input value={r.bn} onChange={(e) => onChange(i, { bn: e.target.value })} placeholder={phBn} className={input} />
          <input value={r.en} onChange={(e) => onChange(i, { en: e.target.value })} placeholder={phEn} className={input} />
          <button type="button" onClick={() => onDrop(i)} className={`${btnGhost} text-rose-600`} title="সরান"><FiTrash2 /></button>
        </div>
      ))}
      <button type="button" onClick={onAdd} className={btnGhost}><FiPlus /> আরেকটা যোগ করুন</button>
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

function Step({ id, n, title, en, hint, toggle, children }) {
  const off = toggle && !toggle.checked;
  return (
    <section id={id} className={`scroll-mt-20 rounded-2xl border bg-dash-card p-5 transition ${off ? 'border-dashed border-dash-line opacity-70' : 'border-dash-line'}`}>
      <div className={`flex items-start gap-3 ${off ? '' : 'mb-4'}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${off ? 'bg-dash-faint' : 'bg-brand'}`}>{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-dash-ink2">{title} {en && <span className="text-sm font-medium text-dash-faint">· {en}</span>}</h2>
          {hint && !off && <p className="text-xs text-dash-mute2">{hint}</p>}
          {off && <p className="text-xs text-dash-mute2">পাতায় দেখাবে না — চালু করতে ডানের সুইচ চাপুন।</p>}
        </div>
        {toggle && <Switch checked={toggle.checked} onChange={toggle.onChange} />}
      </div>
      {!off && children}
    </section>
  );
}

/** "পাতায় দেখাবে" on/off. */
function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 rounded-full px-1 text-xs font-semibold text-dash-mute"
    >
      <span className={checked ? 'text-emerald-700' : 'text-dash-faint'}>{checked ? 'পাতায় দেখাবে' : 'বন্ধ'}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-dash-line-strong'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function Check({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${checked ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-dash-line text-dash-mute2 hover:border-brand/40'}`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded ${checked ? 'bg-emerald-500 text-white' : 'border border-dash-line-strong'}`}>{checked && <FiCheck size={11} />}</span>
      {label}
    </button>
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

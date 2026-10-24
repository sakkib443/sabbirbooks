'use client';

/**
 * Add / Edit a recorded course (25 Oct 2026) — the simple version: name,
 * about, price, offer price, picture, live or draft. Once the course is saved
 * its modules and classes are added below it (ModuleLessonManager): each class
 * is a YouTube link (unlisted is best), and one can be marked free as a
 * preview. The old long form (CourseForm.jsx) is untouched for the old pages.
 *
 * Two languages, as the site's EN/বাং switch shows them: Bengali goes in
 * titleBn / detailsBn / textBn, English in title / details / text. Either may
 * be left empty — the site then shows the other one.
 */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEye, FiImage, FiLoader, FiSave, FiUpload } from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import ModuleLessonManager from '@/components/admin/course/ModuleLessonManager';
import { btnGhost, btnPrimary, call, input, priceOf, taka, token } from './courseAdmin';

const EMPTY = {
  titleBn: '', title: '', detailsBn: '', details: '', fee: '', offerPrice: '', image: '', status: 'published',
  includesBn: '', includes: '', icons: [],
};

const lines = (t) => t.split('\n').map((x) => x.trim());
// A course saved before the two languages has one title, in either language;
// a course saved with no English has its Bengali copied into `title`.
const hasBangla = (t) => /[\u0980-\u09FF]/.test(t || '');
const split = (en, bn) =>
  bn ? { bn, en: en && en !== bn ? en : '' } : hasBangla(en) ? { bn: en, en: '' } : { bn: '', en: en || '' };

const toForm = (c) => {
  const t = split(c.title, c.titleBn);
  const d = split(c.details, c.detailsBn);
  return {
    titleBn: t.bn,
    title: t.en,
    detailsBn: d.bn,
    details: d.en,
    fee: c.fee ? String(c.fee) : '',
    offerPrice: c.offerPrice ? String(c.offerPrice) : '',
    image: c.image || '',
    status: c.status || 'published',
    // trimEnd, not trim: line i of each list must stay line i.
    includesBn: (c.courseIncludes || []).map((x) => x.textBn || '').join('\n').trimEnd(),
    includes: (c.courseIncludes || []).map((x) => x.text || '').join('\n').trimEnd(),
    icons: (c.courseIncludes || []).map((x) => x.icon || 'check'),
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
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.titleBn.trim() && !form.title.trim()) return showToast('error', 'কোর্সের নাম লিখুন (বাংলা বা English)');
    const fee = String(form.fee).replace(/[^\d]/g, '');
    const offer = String(form.offerPrice).replace(/[^\d]/g, '');
    if (offer && fee && Number(offer) >= Number(fee)) return showToast('error', 'অফার দাম আসল দামের চেয়ে কম হতে হবে');
    // Line i of the Bengali list goes with line i of the English one.
    const bnLines = lines(form.includesBn);
    const enLines = lines(form.includes);
    const courseIncludes = Array.from({ length: Math.max(bnLines.length, enLines.length) }, (_, i) => ({
      icon: form.icons[i] || 'check',
      text: enLines[i] || '',
      textBn: bnLines[i] || '',
    })).filter((x) => x.text || x.textBn);
    const body = {
      // `title` is required on the server: English, or the Bengali when there is none.
      title: form.title.trim() || form.titleBn.trim(),
      titleBn: form.titleBn.trim(),
      details: form.details.trim(),
      detailsBn: form.detailsBn.trim(),
      fee: fee || '0',
      offerPrice: offer || '',
      image: form.image.trim(),
      status: form.status,
      type: 'Recorded',
      courseIncludes,
    };
    setSaving(true);
    try {
      if (isEdit) {
        await call(`/courses/${courseId}`, 'PATCH', body);
        showToast('success', 'সেভ হয়েছে');
      } else {
        const j = await call('/courses/create-course', 'POST', body);
        showToast('success', 'কোর্স তৈরি হয়েছে — এবার ক্লাসগুলো যোগ করুন');
        router.push(`/dashboard/admin/courses/${j.data._id}`);
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

  return (
    <div className="space-y-6">
      {toastNode}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/admin/courses" className="mb-1 inline-flex items-center gap-1 text-sm text-dash-mute2 hover:text-brand"><FiArrowLeft /> All Courses</Link>
          <h1 className="text-2xl font-bold text-dash-ink2">{isEdit ? 'কোর্স এডিট' : 'Add Course'}</h1>
        </div>
        {isEdit && (
          <div className="flex gap-2">
            <Link href={`/dashboard/admin/courses/view?course=${courseId}`} className={btnGhost}><FiEye /> View</Link>
            {form.status === 'published' && slug && <a href={`/courses/${slug}`} target="_blank" rel="noreferrer" className={btnGhost}>সাইটে দেখুন ↗</a>}
          </div>
        )}
      </div>

      <form onSubmit={save} className="grid gap-6 rounded-xl border border-dash-line bg-dash-card p-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <p className="rounded-lg bg-dash-soft px-3 py-2 text-xs text-dash-mute2">
            বাংলা আর English দুটোই লিখুন — সাইটের ভাষা বদলালে সেই ভাষারটা দেখাবে। একটা খালি থাকলে অন্যটা দেখাবে।
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="কোর্সের নাম (বাংলা) *">
              <input value={form.titleBn} onChange={set('titleBn')} className={input} placeholder="যেমন: অ্যানাটমি ভাইভা — রেকর্ডেড কোর্স" />
            </Field>
            <Field label="Course name (English)">
              <input value={form.title} onChange={set('title')} className={input} placeholder="e.g. Anatomy Viva — Recorded Course" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="কোর্স সম্পর্কে (বাংলা)" hint="কোর্সের পাতায় নামের নিচে দেখাবে">
              <textarea value={form.detailsBn} onChange={set('detailsBn')} rows={4} className={input} />
            </Field>
            <Field label="About the course (English)">
              <textarea value={form.details} onChange={set('details')} rows={4} className={input} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="দাম (৳)" hint="০ বা খালি = ফ্রি কোর্স">
              <input value={form.fee} onChange={set('fee')} inputMode="numeric" className={input} placeholder="999" />
            </Field>
            <Field label="অফার দাম (৳)" hint="খালি = অফার নেই">
              <input value={form.offerPrice} onChange={set('offerPrice')} inputMode="numeric" className={input} placeholder="499" />
            </Field>
          </div>
          <p className="text-sm text-dash-mute2">ক্রেতা দেবে: <b className="text-dash-ink2">{price > 0 ? taka(price) : 'ফ্রি'}</b></p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="কোর্সে যা থাকছে (বাংলা)" hint="প্রতি লাইনে একটা — যেমন: ২০টি রেকর্ড করা ক্লাস">
              <textarea value={form.includesBn} onChange={set('includesBn')} rows={3} className={input} />
            </Field>
            <Field label="What's included (English)" hint="Same order, one per line — e.g. 20 recorded classes">
              <textarea value={form.includes} onChange={set('includes')} rows={3} className={input} />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="ছবি" plain>
            <button
              type="button"
              onClick={() => !uploading && fileRef.current?.click()}
              className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-dash-line bg-dash-soft text-dash-mute2 hover:border-brand"
            >
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : uploading ? (
                <FiLoader className="animate-spin" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-sm"><FiUpload size={20} /> ছবি দিন</span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
            <div className="mt-2 flex items-center gap-2">
              <FiImage className="shrink-0 text-dash-faint" />
              <input value={form.image} onChange={set('image')} className={input} placeholder="অথবা ছবির লিংক" />
            </div>
          </Field>
          <Field label="অবস্থা">
            <select value={form.status} onChange={set('status')} className={input}>
              <option value="published">চালু — সাইটে দেখাবে</option>
              <option value="draft">খসড়া — সাইটে দেখাবে না</option>
            </select>
          </Field>
          <button type="submit" disabled={saving || uploading} className={`${btnPrimary} w-full`}>
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />} {isEdit ? 'সেভ করুন' : 'কোর্স তৈরি করুন'}
          </button>
          {!isEdit && <p className="text-xs text-dash-mute2">তৈরি হলে এই পাতাতেই মডিউল আর ক্লাস (YouTube লিংক) যোগ করতে পারবেন।</p>}
        </div>
      </form>

      {isEdit && (
        <div className="rounded-xl border border-dash-line bg-dash-card p-5">
          <h2 className="mb-1 text-lg font-bold text-dash-ink2">মডিউল ও ক্লাস</h2>
          <p className="mb-4 text-sm text-dash-mute2">
            প্রতিটা ক্লাসে YouTube ভিডিওর লিংক দিন (Unlisted রাখা ভালো)। কোনো ক্লাস &quot;Free&quot; করলে সেটা না কিনেও দেখা যাবে — প্রিভিউ।
          </p>
          <ModuleLessonManager courseId={courseId} />
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, plain, children }) {
  // plain: a block with several controls (the picture), so not one <label>.
  const Tag = plain ? 'div' : 'label';
  return (
    <Tag className="block">
      <span className="mb-1 block text-sm font-semibold text-dash-ink3">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dash-mute2">{hint}</span>}
    </Tag>
  );
}

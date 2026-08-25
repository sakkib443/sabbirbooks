'use client';

/**
 * Shared create/edit form for catalog books.
 * Simplified: only `title` is required — every other field is optional (the
 * backend auto-fills id/slug). Images are passed as URLs (same convention as the
 * blog editor). `secureFileUrl` is select:false on the server, so in edit mode it
 * comes back blank — an empty value means "keep the existing file" (omitted from
 * the PATCH payload).
 */

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSave, FiImage, FiType, FiUser, FiTag, FiAlignLeft,
  FiDollarSign, FiGlobe, FiBook, FiBox, FiLock, FiPlus, FiStar,
  FiFileText, FiClock, FiCalendar, FiPercent, FiVideo, FiUploadCloud,
  FiLoader, FiList, FiChevronUp, FiChevronDown, FiTrash2, FiZap,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import ImagePicker, { MultiImagePicker } from '@/components/shared/ImagePicker';
import PdfPicker from '@/components/shared/PdfPicker';
import { uploadMedia } from '@/components/shared/uploadMedia';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

// Common medical-book categories offered as suggestions (free text still allowed).
const CATEGORY_SUGGESTIONS = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 'Pathology',
  'Microbiology', 'Medicine', 'Surgery', 'Gynaecology', 'Paediatrics',
  'Community Medicine', 'Forensic Medicine', 'Admission', 'Guide', 'Other',
];

// Turn a title into a URL-friendly slug (keeps Bengali letters intact).
const slugify = (s) =>
  (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const EMPTY = {
  title: '', slug: '', author: '', category: '', description: '',
  coverImage: '', price: '', offerPrice: '',
  language: 'both', format: 'printed',
  stock: '', secureFileUrl: '',
  previewImages: [], previewPdfUrl: '',
  status: 'published', isFeatured: false,
  // Pre-order — the book can be bought before the print run exists.
  isPreOrder: false, preOrderDiscountPercent: 25, preOrderNote: '',
  expectedReleaseDate: '',
  // Landing-page content.
  promoVideoUrl: '', features: [],
};

// The server stores expectedReleaseDate as a Date and hands it back as a full
// ISO string; <input type="date"> only accepts YYYY-MM-DD and silently shows
// nothing for anything else, which reads as "the date was never saved".
const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const toFeatureRow = (f) => ({
  text: f?.text ?? '',
  weight: f?.weight ?? 1,
  highlight: !!f?.highlight,
});

const inputCls =
  'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none transition-all';
const Card = ({ children }) => (
  <div className="bg-dash-card rounded-xl border border-dash-line p-5 sm:p-6">{children}</div>
);
const Label = ({ icon: Icon, children }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-2.5">
    {Icon && <Icon className="text-brand" />} {children}
  </label>
);

export default function BookForm({ mode = 'create', bookId, initialValues }) {
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  const [form, setForm] = useState(() => {
    const seed = { ...EMPTY, ...(initialValues || {}) };
    // Normalised here as well as in the edit page's mapper, so this form is
    // still correct if it is ever handed a raw book document.
    return {
      ...seed,
      expectedReleaseDate: toDateInput(seed.expectedReleaseDate),
      features: Array.isArray(seed.features) ? seed.features.map(toFeatureRow) : [],
    };
  });
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [previewInput, setPreviewInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoPct, setVideoPct] = useState(0);
  const videoRef = useRef(null);

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'title' && !slugTouched) {
      setForm((p) => ({ ...p, title: value, slug: slugify(value) }));
      return;
    }
    set(name, type === 'checkbox' ? checked : value);
  };

  const addPreview = () => {
    const url = previewInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      showToast('error', 'Preview image must be a valid URL');
      return;
    }
    if (!form.previewImages.includes(url)) {
      set('previewImages', [...form.previewImages, url]);
    }
    setPreviewInput('');
  };
  const isUrl = (v) => /^https?:\/\/.+/i.test((v || '').trim());

  // ── Landing-page features ───────────────────────────────────────────────
  const addFeature = () =>
    setForm((p) => ({ ...p, features: [...p.features, { text: '', weight: 1, highlight: false }] }));

  const setFeature = (i, patch) =>
    setForm((p) => ({
      ...p,
      features: p.features.map((f, j) => (j === i ? { ...f, ...patch } : f)),
    }));

  const removeFeature = (i) =>
    setForm((p) => ({ ...p, features: p.features.filter((_, j) => j !== i) }));

  /** Move a feature one slot up/down — the reader sees them in this order. */
  const moveFeature = (from, to) =>
    setForm((p) => {
      const features = [...p.features];
      if (to < 0 || to >= features.length) return p;
      const [moved] = features.splice(from, 1);
      features.splice(to, 0, moved);
      return { ...p, features };
    });

  // Same public-upload path every other marketing asset on this form uses, so a
  // promo clip loads for a logged-out shopper instead of 401-ing behind the
  // access check the protected route applies.
  const handleVideoFile = async (file) => {
    if (!file) return;
    setVideoBusy(true);
    setVideoPct(0);
    try {
      const data = await uploadMedia(file, setVideoPct);
      set('promoVideoUrl', data.fileUrl);
      showToast('success', 'ভিডিও আপলোড হয়েছে');
    } catch (uploadErr) {
      showToast('error', uploadErr.message || 'আপলোড ব্যর্থ হয়েছে');
    } finally {
      setVideoBusy(false);
      setVideoPct(0);
    }
  };

  // Only `title` is required. URL fields are validated only when a value is given;
  // everything else is optional (blank = leave it out).
  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (form.coverImage.trim() && !isUrl(form.coverImage))
      e.coverImage = 'Cover image must be a valid URL';
    if (form.price !== '' && Number(form.price) < 0) e.price = 'Price must be 0 or more';
    if (form.offerPrice !== '' && Number(form.offerPrice) < 0)
      e.offerPrice = 'Offer price must be 0 or more';
    if (form.offerPrice !== '' && form.price !== '' && Number(form.offerPrice) >= Number(form.price))
      e.offerPrice = 'Offer price should be lower than price';
    if (form.secureFileUrl.trim() && !isUrl(form.secureFileUrl))
      e.secureFileUrl = 'Secure file must be a valid URL';
    if (form.previewPdfUrl.trim() && !isUrl(form.previewPdfUrl))
      e.previewPdfUrl = 'Preview PDF must be a valid URL';
    // Mirrors the server's zod range. Without it a 95 comes back as a bare
    // "Validation error" naming nothing the admin can act on.
    if (form.preOrderDiscountPercent !== '') {
      const pct = Number(form.preOrderDiscountPercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 90)
        e.preOrderDiscountPercent = 'Discount must be between 0 and 90';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Build the JSON payload. Only `title` is guaranteed; the backend auto-fills
  // id/slug. Plain-text fields are always sent (so they can be cleared on edit).
  const buildPayload = () => {
    const p = {
      title: form.title.trim(),
      author: form.author.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      coverImage: form.coverImage.trim(),
      price: form.price === '' ? 0 : Number(form.price) || 0,
      language: form.language,
      format: form.format,
      status: form.status,
      isFeatured: !!form.isFeatured,
      previewImages: form.previewImages,
    };
    // Auto-slug is handled server-side when blank; send it only when present.
    const slug = form.slug.trim();
    if (slug) p.slug = slug;
    if (form.offerPrice !== '') p.offerPrice = Number(form.offerPrice);
    if (form.previewPdfUrl.trim()) p.previewPdfUrl = form.previewPdfUrl.trim();

    // Pre-order + landing-page content. Sent unconditionally, including when
    // the toggle is OFF: omitting them on false would make the toggle one-way,
    // and an admin who turned a pre-order off would find it still on.
    p.isPreOrder = !!form.isPreOrder;
    p.preOrderDiscountPercent =
      form.preOrderDiscountPercent === '' ? 25 : Number(form.preOrderDiscountPercent) || 0;
    p.preOrderNote = form.preOrderNote.trim();
    // null rather than '': the field is a Date server-side, and null is what the
    // validation accepts as "clear it".
    p.expectedReleaseDate = form.expectedReleaseDate
      ? new Date(form.expectedReleaseDate).toISOString()
      : null;
    p.promoVideoUrl = form.promoVideoUrl.trim();
    // A row the admin added and never typed into is dropped rather than
    // rejected — the server requires non-empty text, and an abandoned blank row
    // is not worth blocking a save over.
    p.features = form.features
      .filter((f) => (f.text || '').trim())
      .map((f) => ({
        text: f.text.trim(),
        weight: Number(f.weight) || 1,
        highlight: !!f.highlight,
      }));

    if (form.format === 'printed') {
      p.stock = form.stock === '' ? 0 : Number(form.stock) || 0;
    } else if (form.secureFileUrl.trim()) {
      // digital: only send secureFileUrl when the admin actually provided one
      p.secureFileUrl = form.secureFileUrl.trim();
    }
    return p;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('error', 'Please fix the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      const url = mode === 'create' ? `${API}/books` : `${API}/books/${bookId}`;
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        // A zod failure answers with a bare "Validation error" and puts the
        // field that actually broke in errors[] — dropping it left the admin
        // with a red toast that named nothing to fix.
        const detail = json.errors?.[0];
        throw new Error(
          [json.message, detail && `${detail.field}: ${detail.message}`]
            .filter(Boolean)
            .join(' — ') || `Request failed (${res.status})`
        );
      }
      showToast('success', mode === 'create' ? 'Book created successfully' : 'Book updated successfully');
      setTimeout(() => router.push('/dashboard/admin/books'), 600);
    } catch (err) {
      showToast('error', err.message || 'Something went wrong');
      setSaving(false);
    }
  };

  const err = (k) => errors[k] && <p className="text-red-500 text-xs mt-1.5">{errors[k]}</p>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/admin/books"
            className="p-2 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors"
          >
            <FiArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dash-ink2">
              {mode === 'create' ? 'Add New Book' : 'Edit Book'}
            </h1>
            <p className="text-dash-mute text-sm">
              {mode === 'create'
                ? 'Add a new book to the store catalog'
                : 'Update this book’s catalog details'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
        >
          <FiSave />
          {saving ? 'Saving...' : mode === 'create' ? 'Create Book' : 'Save Changes'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Label icon={FiType}>Title *</Label>
            <input
              type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Guyton and Hall Textbook of Medical Physiology"
              className={`${inputCls} ${errors.title ? 'border-red-400' : 'border-dash-line'}`}
            />
            {err('title')}

            <div className="mt-4">
              <Label icon={FiGlobe}>Slug</Label>
              <input
                type="text" name="slug" value={form.slug}
                onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }}
                placeholder="guyton-and-hall-physiology"
                className={`${inputCls} font-mono text-sm ${errors.slug ? 'border-red-400' : 'border-dash-line'}`}
              />
              <p className="text-[11px] text-dash-mute2 mt-1">Auto-generated from the title; edit if needed. Must be unique.</p>
              {err('slug')}
            </div>

            <div className="mt-4">
              <Label icon={FiUser}>Author</Label>
              <input
                type="text" name="author" value={form.author} onChange={handleChange}
                placeholder="Author name"
                className={`${inputCls} ${errors.author ? 'border-red-400' : 'border-dash-line'}`}
              />
              {err('author')}
            </div>

            <div className="mt-4">
              <Label icon={FiAlignLeft}>Description</Label>
              <textarea
                name="description" value={form.description} onChange={handleChange}
                rows={6} placeholder="Describe the book, its contents and who it is for..."
                className={`${inputCls} resize-none ${errors.description ? 'border-red-400' : 'border-dash-line'}`}
              />
              {err('description')}
            </div>
          </Card>

          {/* Pricing */}
          <Card>
            <Label icon={FiDollarSign}>Pricing</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-dash-mute">Price (৳)</span>
                <input
                  type="number" name="price" min="0" value={form.price} onChange={handleChange}
                  placeholder="0"
                  className={`${inputCls} mt-1 ${errors.price ? 'border-red-400' : 'border-dash-line'}`}
                />
                {err('price')}
              </div>
              <div>
                <span className="text-xs font-medium text-dash-mute">Offer Price (৳)</span>
                <input
                  type="number" name="offerPrice" min="0" value={form.offerPrice} onChange={handleChange}
                  placeholder="Optional discounted price"
                  className={`${inputCls} mt-1 ${errors.offerPrice ? 'border-red-400' : 'border-dash-line'}`}
                />
                {err('offerPrice')}
              </div>
            </div>
          </Card>

          {/* Format & inventory */}
          <Card>
            <Label icon={FiBook}>Format & Availability</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-dash-mute">Format</span>
                <select
                  name="format" value={form.format} onChange={handleChange}
                  className={`${inputCls} mt-1 border-dash-line`}
                >
                  <option value="printed">Printed (physical)</option>
                  <option value="digital">Digital (PDF / e-book)</option>
                </select>
              </div>
              <div>
                <span className="text-xs font-medium text-dash-mute">Language</span>
                <select
                  name="language" value={form.language} onChange={handleChange}
                  className={`${inputCls} mt-1 border-dash-line`}
                >
                  <option value="both">Both (Bn + En)</option>
                  <option value="bn">Bengali</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {form.format === 'printed' ? (
              <div className="mt-4">
                <span className="text-xs font-medium text-dash-mute flex items-center gap-1.5">
                  <FiBox size={12} /> Stock (copies)
                </span>
                <input
                  type="number" name="stock" min="0" value={form.stock} onChange={handleChange}
                  placeholder="Number of copies in stock"
                  className={`${inputCls} mt-1 ${errors.stock ? 'border-red-400' : 'border-dash-line'}`}
                />
                {err('stock')}
              </div>
            ) : (
              <div className="mt-4">
                <span className="text-xs font-medium text-dash-mute flex items-center gap-1.5">
                  <FiLock size={12} /> Secure File URL
                </span>
                <input
                  type="text" name="secureFileUrl" value={form.secureFileUrl} onChange={handleChange}
                  placeholder="https://.../secure-book.pdf"
                  className={`${inputCls} mt-1 ${errors.secureFileUrl ? 'border-red-400' : 'border-dash-line'}`}
                />
                <p className="text-[11px] text-dash-mute2 mt-1">
                  {mode === 'edit'
                    ? 'Hidden for security — leave blank to keep the current file, or paste a new URL to replace it.'
                    : 'The purchasable file. Never shown on public pages.'}
                </p>
                {err('secureFileUrl')}
              </div>
            )}
          </Card>

          {/* Pre-order — bought before the print run exists */}
          <Card>
            <Label icon={FiClock}>Pre-order</Label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox" name="isPreOrder" checked={form.isPreOrder} onChange={handleChange}
                className="mt-0.5 w-5 h-5 rounded border-dash-line-strong text-brand focus:ring-brand"
              />
              <span>
                <span className="text-sm font-medium text-dash-ink3">Sell this book as a pre-order</span>
                <span className="block text-[11px] text-dash-mute2 mt-0.5">
                  Buyers can order before it is printed. Stock is not checked for a
                  pre-order, so a book with 0 copies still sells.
                </span>
              </span>
            </label>

            {form.isPreOrder && (
              <div className="mt-4 space-y-4 border-t border-dash-line pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-dash-mute flex items-center gap-1.5">
                      <FiPercent size={12} /> Pre-order discount (%)
                    </span>
                    <input
                      type="number" name="preOrderDiscountPercent" min="0" max="90"
                      value={form.preOrderDiscountPercent} onChange={handleChange}
                      placeholder="25"
                      className={`${inputCls} mt-1 ${errors.preOrderDiscountPercent ? 'border-red-400' : 'border-dash-line'}`}
                    />
                    <p className="text-[11px] text-dash-mute2 mt-1">
                      Taken off the price at checkout. The server applies it — the buyer
                      cannot change it.
                    </p>
                    {err('preOrderDiscountPercent')}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-dash-mute flex items-center gap-1.5">
                      <FiCalendar size={12} /> Expected release date
                    </span>
                    <input
                      type="date" name="expectedReleaseDate" value={form.expectedReleaseDate}
                      onChange={handleChange}
                      className={`${inputCls} mt-1 border-dash-line`}
                    />
                    <p className="text-[11px] text-dash-mute2 mt-1">
                      Shown on checkout and on the confirmation screen. Leave blank if you
                      do not want to promise a date yet.
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-dash-mute">Pre-order note</span>
                  <input
                    type="text" name="preOrderNote" value={form.preOrderNote} onChange={handleChange}
                    placeholder="১৫ সেপ্টেম্বর থেকে ডেলিভারি শুরু"
                    className={`${inputCls} mt-1 border-dash-line`}
                  />
                  <p className="text-[11px] text-dash-mute2 mt-1">
                    Your own words about delivery. Shown to the buyer instead of the
                    generic line.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Landing-page content */}
          <Card>
            <Label icon={FiVideo}>Promo Video (optional)</Label>
            <input
              type="text" name="promoVideoUrl" value={form.promoVideoUrl} onChange={handleChange}
              placeholder="https://www.youtube.com/watch?v=… অথবা আপলোড করুন"
              className={`${inputCls} border-dash-line text-sm`}
            />
            <p className="text-[11px] text-dash-mute2 mt-1">
              Paste a YouTube link, or upload a video file from this computer.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Hidden input behind a button, so this control matches the cover
                  and PDF pickers on the rest of the form. */}
              <input
                ref={videoRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => { handleVideoFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              <button
                type="button" disabled={videoBusy}
                onClick={() => videoRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-dash-soft2 rounded-lg text-dash-ink4 hover:bg-dash-soft3 transition-colors disabled:opacity-50"
              >
                {videoBusy ? <FiLoader className="animate-spin" /> : <FiUploadCloud />}
                {videoBusy ? `আপলোড হচ্ছে ${videoPct}%` : 'ভিডিও আপলোড করুন'}
              </button>
              {form.promoVideoUrl && !videoBusy && (
                <button
                  type="button" onClick={() => set('promoVideoUrl', '')}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-sm"
                >
                  <FiTrash2 /> সরান
                </button>
              )}
            </div>
          </Card>

          {/* Selling points, in the order the landing page shows them */}
          <Card>
            <Label icon={FiList}>Features (optional)</Label>
            <p className="text-[11px] text-dash-mute2 -mt-1.5 mb-3">
              Selling points for the book page. Weight decides how prominent a line is
              (higher = bigger, shown earlier); highlight paints it in the accent
              colour. Use the arrows to reorder.
            </p>

            {form.features.length === 0 && (
              <p className="text-sm text-dash-mute2 py-3 text-center border border-dashed border-dash-line rounded-lg">
                No features yet.
              </p>
            )}

            <div className="space-y-2.5">
              {form.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      type="button" title="উপরে সরান" disabled={i === 0}
                      onClick={() => moveFeature(i, i - 1)}
                      className="p-1 rounded text-dash-ink4 hover:bg-dash-soft disabled:opacity-30"
                    >
                      <FiChevronUp size={14} />
                    </button>
                    <button
                      type="button" title="নিচে সরান" disabled={i === form.features.length - 1}
                      onClick={() => moveFeature(i, i + 1)}
                      className="p-1 rounded text-dash-ink4 hover:bg-dash-soft disabled:opacity-30"
                    >
                      <FiChevronDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text" value={f.text}
                      onChange={(e) => setFeature(i, { text: e.target.value })}
                      placeholder="যেমন: ৫০০+ ছবি ও ডায়াগ্রাম"
                      className={`${inputCls} border-dash-line text-sm`}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-dash-mute">
                        Weight
                        <input
                          type="number" min="1" value={f.weight}
                          onChange={(e) => setFeature(i, { weight: e.target.value })}
                          className="w-20 px-2 py-1 border border-dash-line rounded-md text-sm outline-none focus:border-brand"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-dash-ink3 cursor-pointer">
                        <input
                          type="checkbox" checked={f.highlight}
                          onChange={(e) => setFeature(i, { highlight: e.target.checked })}
                          className="w-4 h-4 rounded border-dash-line-strong text-brand focus:ring-brand"
                        />
                        <FiZap size={12} className="text-brand" /> Highlight
                      </label>
                    </div>
                  </div>

                  <button
                    type="button" title="মুছে ফেলুন" onClick={() => removeFeature(i)}
                    className="p-2 mt-0.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button" onClick={addFeature}
              className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-dash-soft2 rounded-lg text-dash-ink4 hover:bg-dash-soft3 transition-colors text-sm font-medium"
            >
              <FiPlus /> Add feature
            </button>
          </Card>

          {/* Preview material */}
          <Card>
            <Label icon={FiFileText}>Preview Material (optional)</Label>
            <span className="text-xs font-medium text-dash-mute">Preview images</span>
            <div className="mt-1.5">
              <MultiImagePicker
                value={form.previewImages}
                onChange={(list) => set('previewImages', list)}
                onError={(msg) => showToast('error', msg)}
                label="নমুনা পাতার ছবি"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text" value={previewInput}
                onChange={(e) => setPreviewInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPreview())}
                placeholder="অথবা লিংক বসান: https://.../sample-page.jpg"
                className={`${inputCls} border-dash-line text-sm`}
              />
              <button
                type="button" onClick={addPreview}
                className="px-4 py-2.5 bg-dash-soft2 rounded-lg text-dash-ink4 hover:bg-dash-soft3 transition-colors shrink-0"
              >
                <FiPlus />
              </button>
            </div>
            <div className="mt-4">
              <span className="text-xs font-medium text-dash-mute">Preview PDF</span>
              <div className="mt-1.5">
                <PdfPicker
                  value={form.previewPdfUrl}
                  onChange={(url) => set('previewPdfUrl', url)}
                  onError={(msg) => showToast('error', msg)}
                  label="নমুনা পাতার PDF"
                />
              </div>
              <input
                type="text" name="previewPdfUrl" value={form.previewPdfUrl} onChange={handleChange}
                placeholder="অথবা লিংক বসান: https://.../preview.pdf"
                className={`${inputCls} mt-2 text-sm ${errors.previewPdfUrl ? 'border-red-400' : 'border-dash-line'}`}
              />
              {err('previewPdfUrl')}
            </div>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Card>
            <Label icon={FiImage}>Cover Image</Label>
            <ImagePicker
              value={form.coverImage}
              onChange={(url) => set('coverImage', url)}
              onError={(msg) => showToast('error', msg)}
              label="কভার"
              hint="সেরা ফল পেতে খাড়া (portrait) ছবি দিন — যেমন ৬০০×৮০০ পিক্সেল।"
            />
            {err('coverImage')}
          </Card>

          <Card>
            <Label icon={FiTag}>Category</Label>
            <input
              type="text" name="category" value={form.category} onChange={handleChange}
              list="book-categories" placeholder="e.g. Physiology"
              className={`${inputCls} ${errors.category ? 'border-red-400' : 'border-dash-line'}`}
            />
            <datalist id="book-categories">
              {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
            {err('category')}
          </Card>

          <Card>
            <Label icon={FiStar}>Publishing</Label>
            <span className="text-xs font-medium text-dash-mute">Status</span>
            <select
              name="status" value={form.status} onChange={handleChange}
              className={`${inputCls} mt-1 border-dash-line`}
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input
                type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange}
                className="w-5 h-5 rounded border-dash-line-strong text-brand focus:ring-brand"
              />
              <span className="text-sm font-medium text-dash-ink3">Featured book</span>
            </label>
          </Card>
        </div>
      </form>
      {toastNode}
    </div>
  );
}

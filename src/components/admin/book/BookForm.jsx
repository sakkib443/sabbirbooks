'use client';

/**
 * Shared create/edit form for catalog books.
 * Simplified: only `title` is required — every other field is optional (the
 * backend auto-fills id/slug). Images are passed as URLs (same convention as the
 * blog editor). `secureFileUrl` is select:false on the server, so in edit mode it
 * comes back blank — an empty value means "keep the existing file" (omitted from
 * the PATCH payload).
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSave, FiImage, FiType, FiUser, FiTag, FiAlignLeft,
  FiDollarSign, FiGlobe, FiBook, FiBox, FiLock, FiPlus, FiStar,
  FiFileText,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import ImagePicker, { MultiImagePicker } from '@/components/shared/ImagePicker';
import PdfPicker from '@/components/shared/PdfPicker';

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
};

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

  const [form, setForm] = useState({ ...EMPTY, ...(initialValues || {}) });
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [previewInput, setPreviewInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
        throw new Error(json.message || `Request failed (${res.status})`);
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

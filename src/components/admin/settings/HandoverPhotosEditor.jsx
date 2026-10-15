'use client';

/**
 * The landing page's slide photos — add, caption, reorder, remove.
 *
 * Edits `settings.handoverPhotos` in the Settings form; nothing is saved until
 * the page's own "Save Settings". An empty list means the site shows its
 * built-in photos, so the editor starts from those: what the admin sees here
 * is what the page is showing.
 */

import { useState } from 'react';
import { FiArrowDown, FiArrowUp, FiImage, FiLoader, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { DEFAULT_HANDOVER_PHOTOS } from '@/lib/handoverPhotos';
import { variantUrl, onVariantError } from '@/lib/mediaVariant';

const asRows = (list) =>
  (list?.length ? list : DEFAULT_HANDOVER_PHOTOS.map((p) => ({ url: p.src, bn: p.bn, en: p.en, pos: p.pos || '' }))).map(
    (p) => ({ url: p.url, bn: p.bn || '', en: p.en || '', pos: p.pos || '' })
  );

/** Where an uploaded or built-in photo can be previewed from in the admin. */
const previewSrc = (url) => {
  const path = String(url || '').replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, '');
  return path.startsWith('/uploads/') ? variantUrl(path, 'thumb') : path;
};

export default function HandoverPhotosEditor({ value, onChange, apiUrl, showToast }) {
  const rows = asRows(value);
  const usingDefaults = !value?.length;
  const [uploading, setUploading] = useState(false);

  const set = (next) => onChange(next);
  const patch = (i, p) => set(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const move = (from, to) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    set(next);
  };
  const remove = (i) => {
    if (rows.length === 1) return showToast?.('error', 'অন্তত একটা ছবি রাখতে হবে');
    set(rows.filter((_, j) => j !== i));
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch(`${apiUrl}/api/settings/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) return showToast?.('error', data.message || 'আপলোড হয়নি');
      // New photos go to the top: that is the one the shop is adding it for.
      set([{ url: data.data.url, bn: '', en: '', pos: '' }, ...rows]);
      showToast?.('success', 'ছবি যোগ হয়েছে — নিচে Save Settings চাপুন');
    } catch {
      showToast?.('error', 'আপলোড হয়নি');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-dash-card rounded-xl border border-dash-line p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <FiImage className="text-brand" />
          <h2 className="text-lg font-semibold text-dash-ink2">ল্যান্ডিং পেজের স্লাইড ছবি</h2>
        </div>
        <label
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-aqua text-white text-sm font-semibold cursor-pointer hover:bg-aqua-hover transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {uploading ? <FiLoader className="animate-spin" size={15} /> : <FiUploadCloud size={15} />}
          {uploading ? 'আপলোড হচ্ছে...' : 'নতুন ছবি'}
          <input type="file" accept="image/*" onChange={upload} className="hidden" disabled={uploading} />
        </label>
      </div>
      <p className="text-sm text-dash-mute mb-4">
        বই হাতে মানুষের ছবিগুলো — উপরেরটা সবার আগে দেখায়। তীর দিয়ে ক্রম বদলান। শেষে নিচের <b>Save Settings</b> চাপুন।
        {usingDefaults && <span className="block mt-1 text-[12px] text-dash-mute2">এখন সাইটের নিজস্ব ছবিগুলো দেখাচ্ছে।</span>}
      </p>

      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={`${r.url}-${i}`} className="flex gap-3 rounded-lg border border-dash-line p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc(r.url)}
              onError={onVariantError}
              alt=""
              className="h-24 w-[72px] shrink-0 rounded-md border border-dash-line object-cover"
              style={r.pos ? { objectPosition: r.pos } : undefined}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="text-xs font-semibold text-dash-mute">{i === 0 ? '১ নম্বর — সবার আগে' : `${i + 1} নম্বর`}</div>
              <input
                value={r.bn}
                onChange={(e) => patch(i, { bn: e.target.value })}
                placeholder="ছবির বর্ণনা (বাংলা)"
                className="w-full px-3 py-1.5 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
              />
              <input
                value={r.en}
                onChange={(e) => patch(i, { en: e.target.value })}
                placeholder="Description (English)"
                className="w-full px-3 py-1.5 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button type="button" title="উপরে" disabled={i === 0} onClick={() => move(i, i - 1)} className="p-1.5 rounded text-dash-ink4 hover:bg-dash-soft disabled:opacity-30">
                <FiArrowUp size={15} />
              </button>
              <button type="button" title="নিচে" disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} className="p-1.5 rounded text-dash-ink4 hover:bg-dash-soft disabled:opacity-30">
                <FiArrowDown size={15} />
              </button>
              <button type="button" title="মুছুন" onClick={() => remove(i)} className="p-1.5 rounded text-red-500 hover:bg-red-50">
                <FiTrash2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What the Settings form sends: the rows, cleaned. Undefined = leave as is. */
export function handoverPhotosForSave(list) {
  if (!Array.isArray(list)) return undefined;
  return list
    .filter((p) => p && String(p.url || '').trim())
    .map((p) => ({ url: String(p.url).trim(), bn: (p.bn || '').trim(), en: (p.en || '').trim(), pos: (p.pos || '').trim() }));
}

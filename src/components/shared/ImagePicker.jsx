'use client';

/**
 * Pick an image from the computer, drop one on it, or paste a URL.
 *
 * The book form used to accept a URL and nothing else, which meant every cover
 * had to be uploaded to some third-party image host first. The file is the
 * normal case now; the URL box stays for covers that already live somewhere.
 */

import { useRef, useState } from 'react';
import { FiImage, FiLoader, FiLink, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { uploadMedia, isImageFile } from './uploadMedia';

export default function ImagePicker({
  value,
  onChange,
  onError,
  label = 'ছবি',
  hint,
  aspect = 'aspect-[3/4]',
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handleFiles = async files => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    if (!isImageFile(file)) {
      onError?.('শুধু ছবি ফাইল (JPG, PNG, WebP) দেওয়া যাবে');
      return;
    }
    setBusy(true);
    setPct(0);
    try {
      const data = await uploadMedia(file, setPct);
      onChange(data.fileUrl);
    } catch (err) {
      onError?.(err.message || 'আপলোড ব্যর্থ হয়েছে');
    } finally {
      setBusy(false);
      setPct(0);
    }
  };

  return (
    <div>
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer?.files);
        }}
        className={`relative rounded-xl border-2 border-dashed transition ${
          dragging ? 'border-[#F3A522] bg-[#FEF6E7]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {value ? (
          <div className="p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className={`w-full ${aspect} object-contain rounded-lg bg-white border border-slate-200`}
              onError={e => {
                e.currentTarget.style.opacity = 0.3;
              }}
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                বদলান
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-rose-500 hover:bg-rose-50"
                title="সরিয়ে ফেলুন"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full px-4 py-8 flex flex-col items-center justify-center text-center gap-2"
          >
            {busy ? (
              <>
                <FiLoader className="animate-spin text-[#F3A522]" size={22} />
                <span className="text-xs text-slate-500">আপলোড হচ্ছে {pct}%</span>
                <span className="block w-32 h-1 rounded-full bg-slate-200 overflow-hidden">
                  <span
                    className="block h-full bg-[#F3A522] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </>
            ) : (
              <>
                <FiUploadCloud className="text-slate-400" size={24} />
                <span className="text-sm font-medium text-slate-600">
                  কম্পিউটার থেকে {label} বাছাই করুন
                </span>
                <span className="text-[11px] text-slate-400">
                  অথবা ফাইলটি এখানে টেনে এনে ছাড়ুন
                </span>
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={e => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowUrl(s => !s)}
          className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"
        >
          <FiLink size={11} /> {showUrl ? 'লিংক লুকান' : 'অথবা ছবির লিংক বসান'}
        </button>
        {showUrl && (
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            className="mt-1.5 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]"
          />
        )}
      </div>

      {hint && <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

/** Same idea, but for a list of images (book preview pages). */
export function MultiImagePicker({ value = [], onChange, onError, label = 'ছবি' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(null); // { index, total }
  const [dragging, setDragging] = useState(false);

  const handleFiles = async files => {
    const list = Array.from(files || []).filter(isImageFile);
    if (!list.length) {
      onError?.('শুধু ছবি ফাইল দেওয়া যাবে');
      return;
    }
    const added = [];
    for (const [i, file] of list.entries()) {
      setBusy({ index: i + 1, total: list.length });
      try {
        const data = await uploadMedia(file);
        added.push(data.fileUrl);
      } catch (err) {
        onError?.(`${file.name}: ${err.message}`);
      }
    }
    setBusy(null);
    if (added.length) onChange([...value, ...added]);
  };

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer?.files);
      }}
      className={`rounded-xl border-2 border-dashed p-3 transition ${
        dragging ? 'border-[#F3A522] bg-[#FEF6E7]' : 'border-slate-200 bg-slate-50'
      }`}
    >
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="w-16 h-20 object-cover rounded-md border border-slate-200 bg-white"
                onError={e => (e.currentTarget.style.opacity = 0.3)}
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow text-[11px]"
                title="সরান"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={Boolean(busy)}
        className="w-full py-3 flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        {busy ? (
          <>
            <FiLoader className="animate-spin" size={15} /> আপলোড হচ্ছে {busy.index}/{busy.total}
          </>
        ) : (
          <>
            <FiImage size={15} /> {label} বাছাই করুন (একসাথে কয়েকটা)
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

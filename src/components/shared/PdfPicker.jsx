'use client';

/**
 * Upload a PDF from the computer, or drop one on it.
 *
 * The book form used to accept a preview PDF as a URL and nothing else, so a
 * sample chapter had to be uploaded to some third-party host first and pasted
 * back in. The server has always accepted PDFs on the same endpoint the images
 * use — localUpload.ts allows them at up to 200MB — so the block was purely
 * that the picker on this screen only ever offered `accept="image/*"`.
 *
 * The URL box stays alongside this in the form, for PDFs that already live
 * somewhere.
 */

import { useRef, useState } from 'react';
import { FiFileText, FiLoader, FiTrash2, FiUploadCloud, FiExternalLink } from 'react-icons/fi';
import { uploadMedia, isPdfFile, formatFileSize } from './uploadMedia';

/** Last path segment of an uploaded URL, for showing what is attached. */
const fileNameFromUrl = url => {
  try {
    return decodeURIComponent((url || '').split('/').pop().split('?')[0]) || 'PDF';
  } catch {
    return 'PDF';
  }
};

export default function PdfPicker({
  value,
  onChange,
  onError,
  label = 'PDF',
  hint,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Only known for a file uploaded in this session — a value restored from the
  // book record is just a URL, with no size behind it.
  const [size, setSize] = useState(null);

  const handleFiles = async files => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    if (!isPdfFile(file)) {
      onError?.('শুধু PDF ফাইল দেওয়া যাবে');
      return;
    }
    setBusy(true);
    setPct(0);
    try {
      const data = await uploadMedia(file, setPct);
      setSize(data.size || file.size);
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
        className={`rounded-xl border-2 border-dashed transition ${
          dragging ? 'border-[#F3A522] bg-[#FEF6E7]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {value ? (
          <div className="p-3 flex items-center gap-3">
            <span className="w-10 h-10 shrink-0 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
              <FiFileText className="text-rose-500" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 truncate">
                {fileNameFromUrl(value)}
              </p>
              <p className="text-[11px] text-slate-400">
                {size ? formatFileSize(size) : 'সংযুক্ত আছে'}
              </p>
            </div>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              title="খুলে দেখুন"
              className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 border border-transparent hover:border-slate-200"
            >
              <FiExternalLink size={14} />
            </a>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              বদলান
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSize(null);
              }}
              title="সরিয়ে ফেলুন"
              className="p-2 rounded-lg bg-white border border-slate-200 text-rose-500 hover:bg-rose-50"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full px-4 py-7 flex flex-col items-center justify-center text-center gap-2"
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
          accept="application/pdf,.pdf"
          hidden
          onChange={e => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {hint && <p className="text-[11px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

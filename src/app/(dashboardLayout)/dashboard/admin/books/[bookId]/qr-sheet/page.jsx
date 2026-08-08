'use client';

/**
 * Printable QR sheet — one code per topic, ready to hand to the press.
 *
 * Export is the browser's own print dialog ("Save as PDF"), NOT
 * html2canvas + jsPDF. html2canvas rasterises the page, and a rasterised QR
 * printed small picks up resampling artefacts that break scanning. Printing
 * keeps the codes as vector SVG, so they stay sharp at any size.
 *
 * The base URL is editable on purpose: the codes have to be printed with the
 * FINAL domain, which is usually bought after the content is ready. Printing
 * today's sslip.io address would kill every code the day the domain changes.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import { FiPrinter, FiAlertTriangle } from 'react-icons/fi';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

export default function QrSheetPage() {
  const { bookId } = useParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [partFilter, setPartFilter] = useState('all');

  useEffect(() => {
    if (typeof window !== 'undefined') setBaseUrl(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/book-content/qr-sheet/${bookId}`, { headers: hdrs() });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Could not load QR codes');
      setRows(body.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  const parts = useMemo(() => {
    const seen = new Map();
    rows.forEach(r => seen.set(String(r.partId), r.partTitle));
    return [...seen.entries()];
  }, [rows]);

  const visible = useMemo(
    () => (partFilter === 'all' ? rows : rows.filter(r => String(r.partId) === partFilter)),
    [rows, partFilter]
  );

  const normalisedBase = baseUrl.replace(/\/+$/, '');
  const usingTempDomain = /sslip\.io|localhost|\d+\.\d+\.\d+\.\d+/.test(normalisedBase);

  if (loading) return <div className="p-8 text-slate-500">লোড হচ্ছে…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-4 lg:p-6">
      {/* Controls — hidden when printing */}
      <div className="print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">QR শিট</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {visible.length} টি কোড {partFilter !== 'all' && `(মোট ${rows.length})`}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm px-5 py-2.5 hover:bg-slate-800 transition"
          >
            <FiPrinter className="w-4 h-4" /> প্রিন্ট / PDF সংরক্ষণ
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              বেস URL — QR কোডে এটাই ছাপা হবে
            </label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://sabbirbooks.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">পার্ট</label>
            <select
              value={partFilter}
              onChange={e => setPartFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">সব পার্ট</option>
              {parts.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {usingTempDomain && (
          <div className="mb-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <FiAlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">এটা অস্থায়ী ঠিকানা — এভাবে ছাপবেন না।</p>
              <p className="mt-0.5">
                QR কোডে পুরো URL ছাপা হয়ে যায়। ডোমেইন বদলালে ছাপা সব কোড অচল হয়ে যাবে এবং
                বই পুনর্মুদ্রণ ছাড়া ঠিক করা যাবে না। ছাপার আগে উপরে আসল ডোমেইন বসান।
              </p>
            </div>
          </div>
        )}

        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-1">ছাপার আগে প্রুফ টেস্ট</p>
          <p>
            ২–৩টা কোড কাগজে ছেপে আসল ফোনে স্ক্যান করুন — স্ক্রিন থেকে নয়, কালি ও কাগজ আলাদা
            আচরণ করে। বইয়ে যে আকারে বসবে ঠিক সেই আকারেই টেস্ট করুন।
          </p>
        </div>
      </div>

      {/* Sheet */}
      <div className="qr-sheet grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visible.map(row => (
          <div
            key={row._id}
            className="qr-cell rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center text-center break-inside-avoid"
          >
            <div className="bg-white p-1.5">
              <QRCode
                value={`${normalisedBase}/b/${row.qrCode}`}
                size={104}
                // Medium correction survives the ink smudge and slight
                // misregistration you get from offset printing.
                level="M"
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-800 leading-tight line-clamp-2">
              {row.topicNo} {row.topicTitle}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
              {row.chapterNo}. {row.chapterTitle}
            </p>
            <code className="text-[10px] font-mono text-slate-400 mt-1">{row.qrCode}</code>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: #fff;
          }
          /* Dashboard chrome must not eat the page. */
          aside,
          header,
          nav {
            display: none !important;
          }
          .qr-sheet {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 6mm !important;
          }
          .qr-cell {
            border: none !important;
            padding: 0 !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

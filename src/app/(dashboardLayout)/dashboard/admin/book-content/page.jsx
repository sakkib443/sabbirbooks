'use client';

/**
 * Book picker for the QR content system.
 *
 * The sidebar link cannot carry a bookId, so this page stands between it and
 * /dashboard/admin/books/[bookId]/content. With one book it is a single row;
 * it keeps working when more are added.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiBook, FiGrid, FiEdit3, FiEye } from 'react-icons/fi';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

export default function BookContentPickerPage() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // status=all is required: the public default hides drafts, and a book is
      // normally still a draft while its QR content is being written.
      const res = await fetch(`${API}/books?status=all`);
      const body = await res.json();
      const list = body.data || [];
      setBooks(list);

      // Progress per book, so the admin can see what is left at a glance.
      const entries = await Promise.all(
        list.map(async b => {
          try {
            const r = await fetch(`${API}/book-content/stats/${b._id}`, { headers: hdrs() });
            const j = await r.json();
            return [b._id, j.data];
          } catch {
            return [b._id, null];
          }
        })
      );
      setStats(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-8 text-dash-mute">লোড হচ্ছে…</div>;

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-dash-ink">বই কনটেন্ট (QR)</h1>
      <p className="text-sm text-dash-mute mt-1 mb-6">
        ছাপা বইয়ের প্রতিটি টপিকের QR কোড ও প্রশ্ন-উত্তর এখান থেকে সাজান।
      </p>

      {books.length === 0 && (
        <p className="text-dash-mute text-sm">কোনো বই নেই। আগে একটি বই যোগ করুন।</p>
      )}

      <div className="space-y-3">
        {books.map(book => {
          const s = stats[book._id];
          const pct = s?.questions ? Math.round((s.answered / s.questions) * 100) : 0;
          return (
            <div
              key={book._id}
              className="rounded-xl border border-dash-line bg-dash-card p-4 flex flex-wrap items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-dash-soft2 flex items-center justify-center shrink-0">
                  <FiBook className="w-5 h-5 text-dash-mute" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-dash-ink truncate">{book.title}</p>
                  {s ? (
                    <p className="text-xs text-dash-mute mt-0.5">
                      {s.parts} পার্ট · {s.chapters} অধ্যায় · {s.topics} টপিক ({s.qrCodes} QR) ·{' '}
                      <span className={pct === 100 ? 'text-emerald-600' : 'text-dash-mute'}>
                        {s.answered}/{s.questions} উত্তর ({pct}%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-dash-mute2 mt-0.5">কনটেন্ট যোগ করা হয়নি</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/admin/books/${book._id}/content`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-sm px-4 py-2 hover:bg-slate-800 transition"
                >
                  <FiEdit3 className="w-4 h-4" /> কনটেন্ট
                </Link>
                <Link
                  href={`/book-preview/${book._id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 text-sm px-4 py-2 hover:bg-violet-100 transition"
                >
                  <FiEye className="w-4 h-4" /> প্রিভিউ
                </Link>
                <Link
                  href={`/dashboard/admin/books/${book._id}/qr-sheet`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line-strong text-sm px-4 py-2 hover:bg-dash-soft transition"
                >
                  <FiGrid className="w-4 h-4" /> QR শিট
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

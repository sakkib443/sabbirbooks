'use client';

/**
 * Book picker for the admin full-book content preview.
 * After upload via Book Content (QR), admins open a book here to browse
 * Part → Chapter → Topic → Question the way learners experience it —
 * but with the entire book unlocked in one tree.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiBook, FiEye, FiEdit3 } from 'react-icons/fi';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

export default function BookPreviewPickerPage() {
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/books?status=all`);
      const body = await res.json();
      const list = body.data || [];
      setBooks(list);

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

  if (loading) return <div className="text-slate-500">লোড হচ্ছে…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">বুক প্রিভিউ</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        প্রিভিউ আলাদা ফুল-স্ক্রিন প্লেয়ারে খুলবে — রেকর্ডেড কোর্সের মতো ডানপাশে কনটেন্ট ট্রি থাকবে।
      </p>

      {books.length === 0 && (
        <p className="text-slate-500 text-sm">কোনো বই নেই। আগে একটি বই যোগ করুন।</p>
      )}

      <div className="space-y-3">
        {books.map(book => {
          const s = stats[book._id];
          const pct = s?.questions ? Math.round((s.answered / s.questions) * 100) : 0;
          const hasContent = (s?.topics || 0) > 0 || (s?.questions || 0) > 0;

          return (
            <div
              key={book._id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <FiBook className="w-5 h-5 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{book.title}</p>
                  {s ? (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.parts} পার্ট · {s.chapters} অধ্যায় · {s.topics} টপিক ·{' '}
                      <span className={pct === 100 ? 'text-emerald-600' : 'text-slate-500'}>
                        {s.answered}/{s.questions} উত্তর ({pct}%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">কনটেন্ট যোগ করা হয়নি</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/book-preview/${book._id}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg text-sm px-4 py-2 transition ${
                    hasContent
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-slate-200 text-slate-400 pointer-events-none'
                  }`}
                >
                  <FiEye className="w-4 h-4" /> প্রিভিউ
                </Link>
                <Link
                  href={`/dashboard/admin/books/${book._id}/content`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-sm px-4 py-2 hover:bg-slate-50 transition"
                >
                  <FiEdit3 className="w-4 h-4" /> কনটেন্ট
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

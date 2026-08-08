'use client';

/**
 * "My book" — the topics this reader has unlocked by scanning.
 *
 * Deliberately NOT a browsable table of contents. Scanning the printed code is
 * what opens a topic; this page only lists the ones already opened, so the
 * physical book stays the gate for everything not on it.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiBookOpen, FiClock } from 'react-icons/fi';

const API =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '') + '/api';

const hdrs = () => ({
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

const timeAgo = iso => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'এইমাত্র';
  if (mins < 60) return `${mins} মিনিট আগে`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
  return `${Math.round(hrs / 24)} দিন আগে`;
};

export default function MyBookPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/book-access/my-scans`, { headers: hdrs() });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'লোড করা যায়নি');
      setScans(body.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-8 text-slate-500">লোড হচ্ছে…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-slate-900">আমার বই</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        যে টপিকগুলো আপনি স্ক্যান করেছেন। নতুন টপিক দেখতে বইয়ের সেই পাতার QR কোড স্ক্যান করুন।
      </p>

      {scans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <FiBookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">এখনো কোনো টপিক স্ক্যান করেননি</p>
          <p className="text-sm text-slate-500 mt-1">
            বইয়ের যেকোনো টপিকের পাশের QR কোড ফোন দিয়ে স্ক্যান করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scans.map(scan => {
            const topic = scan.topicId;
            if (!topic) return null;
            return (
              <Link
                key={scan._id}
                href={`/b/${topic.qrCode}`}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-slate-900 leading-snug line-clamp-2">
                  {topic.isImplicit ? topic.title : `${topic.topicNo ?? ''} ${topic.title}`.trim()}
                </p>
                {scan.bookId?.title && (
                  <p className="text-xs text-slate-500 mt-1">{scan.bookId.title}</p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-3">
                  <FiClock className="w-3.5 h-3.5" />
                  {timeAgo(scan.lastScannedAt)}
                  {scan.scanCount > 1 && <span>· {scan.scanCount} বার</span>}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

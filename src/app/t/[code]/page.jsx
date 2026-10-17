'use client';

/**
 * /t/<tracking code> — the link in the "your order is on its way" SMS.
 *
 * It used to point at Steadfast's own /t/ page, which now expects a token the
 * courier's API never gives out, so buyers landed on "This link is not
 * available". This page looks the parcel up on our server (which asks
 * Steadfast) and shows where it has got to. Nothing personal is shown — only
 * the order serial, the books and the parcel's progress.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LuCheck, LuClock, LuHouse, LuLoaderCircle, LuPackage, LuTriangleAlert, LuTruck, LuUndo2 } from 'react-icons/lu';
import API_BASE_URL from '@/config/api';

const GROUP = {
  transit: { label: 'পথে আছে', tone: 'text-sky-600 bg-sky-50 border-sky-200', icon: LuTruck },
  delivered: { label: 'পৌঁছে গেছে', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: LuHouse },
  partial: { label: 'আংশিক ডেলিভারি হয়েছে', tone: 'text-amber-700 bg-amber-50 border-amber-200', icon: LuHouse },
  returned: { label: 'ফেরত গেছে / বাতিল', tone: 'text-red-600 bg-red-50 border-red-200', icon: LuUndo2 },
};

// Steadfast's own words, in Bangla.
const STATUS_BN = {
  in_review: 'কুরিয়ার পার্সেলটি গ্রহণ করছে',
  pending: 'পার্সেল কুরিয়ারের কাছে — ডেলিভারির পথে',
  hold: 'পার্সেল সাময়িকভাবে হোল্ডে আছে',
  delivered: 'ডেলিভারি সম্পন্ন',
  delivered_approval_pending: 'ডেলিভারি সম্পন্ন',
  partial_delivered: 'আংশিক ডেলিভারি সম্পন্ন',
  partial_delivered_approval_pending: 'আংশিক ডেলিভারি সম্পন্ন',
  cancelled: 'পার্সেল বাতিল / ফেরত',
  cancelled_approval_pending: 'পার্সেল বাতিল / ফেরত',
  unknown: 'স্ট্যাটাস হালনাগাদ হচ্ছে',
  unknown_approval_pending: 'স্ট্যাটাস হালনাগাদ হচ্ছে',
};

const STEPS = [
  { key: 'confirmed', label: 'অর্ডার কনফার্ম', icon: LuCheck },
  { key: 'sent', label: 'কুরিয়ারে দেওয়া হয়েছে', icon: LuPackage },
  { key: 'transit', label: 'পথে', icon: LuTruck },
  { key: 'delivered', label: 'পৌঁছে গেছে', icon: LuHouse },
];

const when = (d) =>
  d
    ? new Date(d).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

export default function TrackParcelPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/courier/track/${encodeURIComponent(String(code || ''))}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.status === 404) return setError('এই ট্র্যাকিং কোডে কোনো পার্সেল পাওয়া যায়নি।');
        if (!res.ok || !json?.success) return setError('এখন লোড করা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।');
        setData(json.data);
      })
      .catch(() => alive && setError('সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।'));
    return () => {
      alive = false;
    };
  }, [code]);

  const c = data?.courier;
  const g = GROUP[c?.group] || GROUP.transit;
  const reached = !c ? 0 : c.group === 'delivered' || c.group === 'partial' ? 4 : c.status === 'in_review' ? 2 : 3;

  return (
    <main className="hind-siliguri min-h-screen bg-surface-soft/40 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="text-center">
          <Link href="/" className="text-sm font-semibold text-primary">Magic Viva</Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">পার্সেল ট্র্যাকিং</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{String(code || '')}</p>
        </div>

        {!data && !error && (
          <div className="flex justify-center p-10">
            <LuLoaderCircle className="animate-spin text-2xl text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <LuTriangleAlert className="mt-0.5 shrink-0 text-lg" />
            <div>
              <p>{error}</p>
              <Link href="/#track-order" className="mt-2 inline-block font-semibold underline">
                মোবাইল নম্বর দিয়ে অর্ডার খুঁজুন
              </Link>
            </div>
          </div>
        )}

        {data && (
          <>
            <div className={`rounded-2xl border p-5 ${g.tone}`}>
              <div className="flex items-center gap-3">
                <g.icon className="text-3xl" />
                <div>
                  <p className="text-lg font-bold">{g.label}</p>
                  <p className="text-sm opacity-90">{STATUS_BN[c.status] || c.status}</p>
                </div>
              </div>
              {c.updatedAt && <p className="mt-2 text-xs opacity-75">সর্বশেষ হালনাগাদ: {when(c.updatedAt)}</p>}
            </div>

            {c.group !== 'returned' && (
              <ol className="grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card p-4">
                {STEPS.map((s, i) => {
                  const done = i < reached;
                  return (
                    <li key={s.key} className="flex flex-col items-center gap-1.5 text-center">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <s.icon />
                      </span>
                      <span className={`text-[11px] leading-tight ${done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">অর্ডার</span>
                <span className="font-semibold text-foreground">#{data.orderSeq ?? '—'}</span>
              </div>
              {c.sentAt && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">কুরিয়ারে দেওয়া</span>
                  <span className="text-foreground">{when(c.sentAt)}</span>
                </div>
              )}
              {c.consignmentId && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Steadfast কনসাইনমেন্ট</span>
                  <span className="font-mono text-foreground">{c.consignmentId}</span>
                </div>
              )}
              <div className="mt-3 border-t border-border pt-3">
                {(data.items || []).map((it, i) => (
                  <p key={i} className="text-foreground">
                    📘 {it.title} × {it.quantity}
                  </p>
                ))}
              </div>
            </div>

            {(data.timeline || []).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">কুরিয়ারের আপডেট</h2>
                <ul className="space-y-3">
                  {data.timeline.map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <LuClock className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-foreground">{t.text}</p>
                        {t.at && <p className="text-xs text-muted-foreground">{when(t.at)}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {c.message && !(data.timeline || []).length && (
              <p className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground">{c.message}</p>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          কোনো প্রশ্ন থাকলে <Link href="/" className="font-semibold text-primary">Magic Viva</Link>-তে যোগাযোগ করুন।
        </p>
      </div>
    </main>
  );
}

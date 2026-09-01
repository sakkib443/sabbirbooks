'use client';

/**
 * The coupon owner's dashboard — the only screen an `affiliate` account has.
 *
 * Deliberately OUTSIDE the (dashboardLayout) group: that layout renders the admin
 * or student shell, and a coupon owner belongs to neither. This is a standalone
 * page with its own header and sign-out, showing only what the server scopes to
 * their own coupons (GET /api/book-coupons/my).
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChangePassword from '@/components/affiliate/ChangePassword';
import {
  FiTag, FiShoppingBag, FiDollarSign, FiLogOut, FiLoader,
  FiAlertCircle, FiGift, FiClock,
} from 'react-icons/fi';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const tk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');
const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};
const discountText = (c) =>
  c.discountType === 'fixed' ? `${tk(c.discountValue)} ছাড়` : `${c.discountValue}% ছাড়`;

function Stat({ icon: Icon, label, value, tone }) {
  const tones = {
    teal: 'from-teal-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
    indigo: 'from-indigo-500 to-violet-500',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-md`}>
        <Icon size={19} />
      </span>
      <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 hind-siliguri">{label}</p>
    </div>
  );
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [me, setMe] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('sb_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('sb_user');
      if (raw) setMe(JSON.parse(raw));
    } catch { /* a malformed cache is not worth blocking the page for */ }

    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/book-coupons/my`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'তথ্য আনা যায়নি');
        if (alive) setState({ loading: false, error: '', data: json.data });
      } catch (e) {
        if (alive) setState({ loading: false, error: e.message || 'তথ্য আনা যায়নি', data: null });
      }
    })();
    return () => { alive = false; };
  }, [router]);

  const logout = () => {
    ['token', 'sb_token', 'user', 'sb_user'].forEach((k) => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  const d = state.data;
  const name = `${me?.firstName || ''} ${me?.lastName || ''}`.trim() || me?.email || 'Coupon Owner';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md">
              <FiTag size={18} />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">আমার কুপন ড্যাশবোর্ড</p>
              <p className="text-xs text-slate-500">{name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-rose-600"
          >
            <FiLogOut size={15} /> লগ আউট
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        {state.loading ? (
          <div className="flex h-[50vh] items-center justify-center text-slate-400">
            <FiLoader className="mr-2 animate-spin" /> লোড হচ্ছে…
          </div>
        ) : state.error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
            <FiAlertCircle /> {state.error}
          </div>
        ) : (
          <>
            {/* Totals */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat icon={FiShoppingBag} label="মোট সেল" value={d.totals.sales} tone="indigo" />
              <Stat icon={FiDollarSign} label="আপনার মোট আয়" value={tk(d.totals.earned)} tone="amber" />
              <Stat icon={FiGift} label="ক্রেতারা ছাড় পেয়েছেন" value={tk(d.totals.discount)} tone="teal" />
            </div>

            {/* Per-coupon */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold text-slate-900 hind-siliguri">আমার কুপনসমূহ</h2>
                <p className="text-xs text-slate-500 hind-siliguri">প্রতিটি কোডে কয়টা সেল হয়েছে এবং আপনি কত পাবেন।</p>
              </div>
              {d.rows.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500 hind-siliguri">এখনো কোনো কুপন যুক্ত করা হয়নি।</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-5 py-3 font-semibold">কোড</th>
                        <th className="px-5 py-3 font-semibold">ছাড়</th>
                        <th className="px-5 py-3 text-center font-semibold">সেল</th>
                        <th className="px-5 py-3 text-right font-semibold">প্রতি সেলে</th>
                        <th className="px-5 py-3 text-right font-semibold">আয়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.map((r) => (
                        <tr key={r.code} className="border-b border-slate-100 last:border-0">
                          <td className="px-5 py-3">
                            <span className="font-mono font-bold text-slate-900">{r.code}</span>
                            {!r.isActive && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">বন্ধ</span>
                            )}
                            {r.name && <span className="block text-[11px] text-slate-500">{r.name}</span>}
                          </td>
                          <td className="px-5 py-3 text-slate-600 hind-siliguri">{discountText(r)}</td>
                          <td className="px-5 py-3 text-center font-semibold tabular-nums text-slate-900">{r.sales}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-600">{r.payoutPerSale ? tk(r.payoutPerSale) : '—'}</td>
                          <td className="px-5 py-3 text-right font-bold tabular-nums text-amber-600">{tk(r.earned)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* An ambassador's opening password is their own phone number, which
                is fine for getting them in and not fine for leaving them there.
                `isPasswordChanged: false` is set when approval creates the
                account and is what opens this card already expanded. */}
            <ChangePassword stillDefault={me?.isPasswordChanged === false} />

            {/* Recent sales */}
            {d.recent?.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="flex items-center gap-2 font-bold text-slate-900 hind-siliguri">
                    <FiClock className="text-slate-400" /> সাম্প্রতিক সেল
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-5 py-3 font-semibold">অর্ডার</th>
                        <th className="px-5 py-3 font-semibold">কোড</th>
                        <th className="px-5 py-3 font-semibold">তারিখ</th>
                        <th className="px-5 py-3 text-right font-semibold">আপনার আয়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.recent.map((o) => (
                        <tr key={o.orderNumber} className="border-b border-slate-100 last:border-0">
                          <td className="px-5 py-3 font-mono text-xs text-slate-700">{o.orderNumber}</td>
                          <td className="px-5 py-3 font-mono text-xs font-bold text-slate-900">{o.couponCode}</td>
                          <td className="px-5 py-3 text-slate-600">{fmtDate(o.createdAt)}</td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums text-amber-600">{tk(o.payout)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

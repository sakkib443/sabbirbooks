'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiArrowLeft, FiDollarSign, FiLoader, FiAlertCircle, FiUser,
  FiShoppingBag, FiTag, FiGift, FiLogIn,
} from 'react-icons/fi';
import { fetchPayouts, formatTk } from '@/components/admin/bookCoupon/couponApi';

const discountText = (c) =>
  c.discountType === 'fixed' ? formatTk(c.discountValue) + ' off' : `${c.discountValue}% off`;

function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand/10 to-brand/5 text-brand',
    green: 'from-green-100 to-green-50 text-green-600',
    amber: 'from-amber-100 to-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-dash-line bg-dash-card p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
        <Icon />
      </div>
      <p className="mt-3 text-2xl font-bold text-dash-ink2 tabular-nums">{value}</p>
      <p className="text-sm text-dash-mute2">{label}</p>
    </div>
  );
}

export default function CouponPayoutsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [], totals: { sales: 0, discount: 0, payout: 0 } });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchPayouts();
        if (!alive) return;
        setState({ loading: false, error: '', rows: data?.rows || [], totals: data?.totals || { sales: 0, discount: 0, payout: 0 } });
      } catch (e) {
        if (alive) setState((s) => ({ ...s, loading: false, error: e.message || 'Failed to load payouts' }));
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <Link href="/dashboard/admin/book-coupons" className="inline-flex items-center gap-2 text-dash-mute hover:text-dash-ink3 mb-3">
          <FiArrowLeft /> Back to coupons
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
          <FiDollarSign className="text-brand" /> Coupon Payouts
        </h1>
        <p className="text-dash-mute text-sm">How many sales each coupon made and how much is owed to its owner. Cancelled orders are excluded.</p>
      </div>

      {state.loading ? (
        <div className="flex items-center justify-center h-[40vh] text-dash-mute2">
          <FiLoader className="animate-spin mr-2" /> Loading payouts…
        </div>
      ) : state.error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {state.error}
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={FiShoppingBag} label="Coupon sales" value={state.totals.sales} tone="brand" />
            <StatCard icon={FiGift} label="Discount given to buyers" value={formatTk(state.totals.discount)} tone="green" />
            <StatCard icon={FiDollarSign} label="Total owed to owners" value={formatTk(state.totals.payout)} tone="amber" />
          </div>

          {/* Per-coupon */}
          {state.rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-dash-line p-12 text-center">
              <FiTag className="mx-auto mb-3 text-3xl text-dash-mute2" />
              <p className="text-dash-ink3 font-medium">No coupons yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-dash-line bg-dash-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dash-line text-left text-dash-mute2">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Discount</th>
                    <th className="px-4 py-3 font-semibold text-center">Sales</th>
                    <th className="px-4 py-3 font-semibold text-right">Payout / sale</th>
                    <th className="px-4 py-3 font-semibold text-right">Discount given</th>
                    <th className="px-4 py-3 font-semibold text-right">Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((r) => (
                    <tr key={r._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-dash-ink2">{r.code}</span>
                        {!r.isActive && <span className="ml-2 rounded bg-dash-soft2 px-1.5 py-0.5 text-[10px] font-bold text-dash-mute2">OFF</span>}
                        {r.name && <span className="block text-[11px] text-dash-mute2">{r.name}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-dash-ink3"><FiUser size={12} className="text-dash-mute2" /> {r.ownerName || '—'}</span>
                        {r.ownerPhone && <span className="block text-[11px] text-dash-mute2 font-mono">{r.ownerPhone}</span>}
                        {r.hasLogin && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700" title={r.ownerEmail}>
                            <FiLogIn size={9} /> {r.ownerEmail || 'login'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-dash-ink3">{discountText(r)}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-dash-ink2">{r.sales}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-dash-ink3">{r.payoutPerSale ? formatTk(r.payoutPerSale) : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-dash-ink3">{formatTk(r.totalDiscount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-600">{formatTk(r.totalPayout)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-dash-line bg-dash-soft/40 font-bold text-dash-ink2">
                    <td className="px-4 py-3" colSpan={3}>Total</td>
                    <td className="px-4 py-3 text-center tabular-nums">{state.totals.sales}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right tabular-nums">{formatTk(state.totals.discount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600">{formatTk(state.totals.payout)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

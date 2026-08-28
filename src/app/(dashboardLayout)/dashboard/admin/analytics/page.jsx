'use client';

/**
 * Admin — Book Sales Analytics.
 *
 * Replaces the old course/IELTS income report: the shop sells one thing now, so
 * a report about courses answered no question anyone was asking.
 *
 * The money is described exactly as the dashboard describes it — the shared
 * pieces live in components/admin/stats/OrderStats.jsx, so a figure can never
 * mean one thing here and another there:
 *   VALUE     what has been sold
 *   EARNED    money in hand — delivered, or paid online up front
 *   UPCOMING  sold but not yet collected
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiTrendingUp, FiPackage, FiDollarSign, FiTruck, FiShoppingCart, FiRefreshCw,
  FiTag, FiGift, FiCreditCard, FiAlertCircle, FiArrowRight, FiPieChart,
} from 'react-icons/fi';

import { can, getStoredUser } from '@/lib/permissions';
import {
  MoneyCard, RangeBar, RevenueChart, ChartLegend, resolvePreset, tk,
} from '@/components/admin/stats/OrderStats';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

// Fulfilment ladder, in the order an order actually walks it — so the breakdown
// reads as a pipeline rather than an alphabetical list.
const STATUS_ORDER = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'access-granted', 'cancelled'];
const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  processing: 'bg-sky-50 text-sky-700 border-sky-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'access-granted': 'bg-violet-50 text-violet-700 border-violet-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};
const METHOD_LABEL = {
  cod: 'Cash on delivery',
  sslcommerz: 'Online (SSLCommerz)',
  bkash: 'Online (bKash)',
  manual: 'Manual / Send Money',
  free: 'Free',
  unpaid: 'Not paid yet',
};

/** A labelled proportion row — used for both breakdowns. */
function BarRow({ label, badge, orders, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${badge || 'border-dash-line text-dash-ink3'}`}>
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums text-dash-ink2">{tk(value)}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-dash-soft2">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-hover" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-24 shrink-0 text-right text-[11px] text-dash-mute2 tabular-nums">
          {orders} order{orders === 1 ? '' : 's'} · {pct}%
        </span>
      </div>
    </div>
  );
}

export default function BookAnalyticsPage() {
  const [preset, setPreset] = useState('30d');
  const [range, setRange] = useState(() => resolvePreset('30d'));
  const [draft, setDraft] = useState(() => resolvePreset('30d'));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const allowed = can(getStoredUser(), 'analytics.read') || can(getStoredUser(), 'orders.read');

  const fetchData = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/orders/stats?from=${range.from}&to=${range.to}`, { headers: headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not load the report');
      setStats(json.data);
    } catch (e) {
      setError(e.message || 'Could not load the report');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [range, allowed]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyPreset = (key) => {
    const r = resolvePreset(key);
    setPreset(key); setDraft(r); setRange(r);
  };
  const applyCustom = () => {
    if (!draft.from || !draft.to) return;
    setPreset(''); setRange({ from: draft.from, to: draft.to });
  };

  const r = stats?.range;

  const statusRows = useMemo(() => {
    const by = stats?.byStatus || {};
    const total = Object.values(by).reduce((s, x) => s + (x.value || 0), 0);
    return {
      total,
      rows: STATUS_ORDER.filter((s) => by[s]).map((s) => ({ key: s, ...by[s] })),
    };
  }, [stats]);

  const methodRows = useMemo(() => {
    const by = stats?.byMethod || {};
    const total = Object.values(by).reduce((s, x) => s + (x.value || 0), 0);
    return {
      total,
      rows: Object.entries(by)
        .map(([k, v]) => ({ key: k, ...v }))
        .sort((a, b) => b.value - a.value),
    };
  }, [stats]);

  if (!allowed) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <FiAlertCircle /> This account cannot see sales reports.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-hover text-white shadow-md shadow-brand/20">
            <FiTrendingUp size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Book Sales Analytics</h1>
            <p className="text-xs text-dash-mute2">
              {r ? `${r.from} → ${r.to}` : 'Choose a period below'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-soft px-3 py-1.5 text-xs font-medium text-dash-ink4 transition hover:bg-dash-soft2">
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
          <Link href="/dashboard/admin/book-orders" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-hover px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:shadow-md hover:shadow-brand/30">
            <FiShoppingCart size={12} /> Orders
          </Link>
        </div>
      </div>

      <RangeBar
        preset={preset} onPreset={applyPreset}
        from={draft.from} to={draft.to}
        onFrom={(v) => setDraft((d) => ({ ...d, from: v }))}
        onTo={(v) => setDraft((d) => ({ ...d, to: v }))}
        onApply={applyCustom}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          <FiAlertCircle /> {error}
        </div>
      )}

      {/* Period money */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MoneyCard icon={FiShoppingCart} tone="brand" loading={loading}
          label="Orders in period" value={(r?.orders ?? 0).toLocaleString('en-US')} note="Cancelled excluded" />
        <MoneyCard icon={FiPackage} tone="indigo" loading={loading}
          label="Total Value" value={tk(r?.value)} note="What was sold" />
        <MoneyCard icon={FiDollarSign} tone="emerald" loading={loading}
          label="Total Earned" value={tk(r?.earned)} note="Delivered + paid online" />
        <MoneyCard icon={FiTruck} tone="sky" loading={loading}
          label="Upcoming" value={tk(r?.upcoming)} note="Still to be collected" />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div>
            <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold">Sold vs Earned</h2>
            <p className="mt-0.5 text-xs text-dash-mute2">
              The gap between the two lines is money still out with couriers and buyers.
            </p>
          </div>
          <ChartLegend />
        </div>
        <div className="px-2 pb-2">
          <RevenueChart daily={r?.daily} loading={loading} />
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-dash-line/60 bg-dash-card p-5 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-dash-ink2 outfit-semibold">
            <FiPieChart size={15} className="text-brand" /> By fulfilment status
          </h2>
          <p className="mb-2 text-xs text-dash-mute2">Where this period's orders are on the ladder.</p>
          {loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-dash-soft" />
          ) : statusRows.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-dash-mute2">No orders in this period.</p>
          ) : (
            <div className="divide-y divide-dash-line-soft">
              {statusRows.rows.map((s) => (
                <BarRow key={s.key} label={s.key} badge={STATUS_STYLE[s.key]}
                  orders={s.orders} value={s.value} total={statusRows.total} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-dash-line/60 bg-dash-card p-5 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-dash-ink2 outfit-semibold">
            <FiCreditCard size={15} className="text-brand" /> By payment method
          </h2>
          <p className="mb-2 text-xs text-dash-mute2">How buyers chose to pay in this period.</p>
          {loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-dash-soft" />
          ) : methodRows.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-dash-mute2">No orders in this period.</p>
          ) : (
            <div className="divide-y divide-dash-line-soft">
              {methodRows.rows.map((m) => (
                <BarRow key={m.key} label={METHOD_LABEL[m.key] || m.key}
                  orders={m.orders} value={m.value} total={methodRows.total} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All-time + coupons */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MoneyCard icon={FiPackage} tone="indigo" loading={loading}
          label="All-time Value" value={tk(stats?.totals?.value)}
          note={`${(stats?.totals?.orders ?? 0).toLocaleString('en-US')} orders`} />
        <MoneyCard icon={FiDollarSign} tone="emerald" loading={loading}
          label="All-time Earned" value={tk(stats?.totals?.earned)} note="Money in hand" />
        <MoneyCard icon={FiTag} tone="brand" loading={loading}
          label="Coupon Sales" value={(stats?.coupons?.orders ?? 0).toLocaleString('en-US')}
          note={`${tk(stats?.coupons?.discount)} discount given`}
          href="/dashboard/admin/book-coupons/payouts" />
        <MoneyCard icon={FiGift} tone="amber" loading={loading}
          label="Owed to Owners" value={tk(stats?.coupons?.payout)}
          note="Per-coupon payouts" href="/dashboard/admin/book-coupons/payouts" />
      </div>

      <Link href="/dashboard/admin/book-coupons/payouts"
        className="group flex items-center justify-between gap-3 rounded-xl border border-dash-line/60 bg-dash-card p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
            <FiGift size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dash-ink2">Coupon payouts</p>
            <p className="text-[11px] text-dash-mute2">Per-coupon sales and what each owner is owed</p>
          </div>
        </div>
        <FiArrowRight className="text-dash-mute transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </Link>
    </div>
  );
}

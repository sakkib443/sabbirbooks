/* eslint-disable react/no-unescaped-entities */
'use client';

/**
 * Admin — book order overview.
 *
 * Every panel here is order money, described the way the shop accounts for it
 * (see components/admin/stats/OrderStats.jsx):
 *   VALUE     what has been sold
 *   EARNED    money in hand — delivered, or paid online up front
 *   UPCOMING  sold but not yet collected
 *
 * An account without `orders.read` gets the content workspace instead, and
 * never fires the request — so the network tab holds no half-answered business
 * questions either.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  FiBook, FiDollarSign, FiGrid, FiArrowRight, FiShoppingCart, FiRefreshCw,
  FiPlus, FiClock, FiLayers, FiPackage, FiTag, FiGift, FiTruck, FiTrendingUp,
} from 'react-icons/fi';

import { can, getStoredUser } from '@/lib/permissions';
import {
  MoneyCard, RangeBar, RevenueChart, ChartLegend, resolvePreset, tk,
} from '@/components/admin/stats/OrderStats';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

// Where a content-only manager (no orders.read) works instead of the order
// dashboard, which would otherwise render a wall of zeros built from 403s.
const CONTENT_SHORTCUTS = [
  { label: 'All Books', href: '/dashboard/admin/books', icon: FiBook },
  { label: 'Add Book', href: '/dashboard/admin/books/create', icon: FiPlus },
  { label: 'Book Content (QR)', href: '/dashboard/admin/book-content', icon: FiGrid },
  { label: 'Book Orders', href: '/dashboard/admin/book-orders', icon: FiShoppingCart },
];

export default function AdminDashboard() {
  const [preset, setPreset] = useState('30d');
  const [range, setRange] = useState(() => resolvePreset('30d'));
  const [draft, setDraft] = useState(() => resolvePreset('30d'));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const showOrderDashboard = can(getStoredUser(), 'orders.read');

  const fetchData = useCallback(async () => {
    if (!showOrderDashboard) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/orders/stats?from=${range.from}&to=${range.to}`,
        { headers: headers() }
      ).then((r) => r.json());
      setStats(res?.data || null);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [range, showOrderDashboard]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const applyPreset = (key) => {
    const r = resolvePreset(key);
    setPreset(key);
    setDraft(r);
    setRange(r);
  };
  const applyCustom = () => {
    if (!draft.from || !draft.to) return;
    setPreset('');
    setRange({ from: draft.from, to: draft.to });
  };

  // ── Content-only manager view ────────────────────────────────────────────
  if (!showOrderDashboard) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-hover text-white shadow-md shadow-brand/20">
            <FiGrid size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Content workspace</h1>
            <p className="text-xs text-dash-mute2">Manage books and their QR content.</p>
          </div>
        </div>
        <div className="rounded-xl border border-dash-line/60 bg-dash-card p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CONTENT_SHORTCUTS.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.href} href={s.href}
                  className="flex items-center gap-3 rounded-xl border border-dash-line/60 bg-dash-soft px-4 py-3 transition hover:bg-dash-soft2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-dash-line bg-dash-card text-dash-ink2"><Icon size={16} /></span>
                  <span className="text-sm font-medium text-dash-ink2">{s.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const r = stats?.range;
  const t = stats?.totals;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-hover text-white shadow-md shadow-brand/20">
            <FiShoppingCart size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Order Overview</h1>
            <p className="text-xs text-dash-mute2">Book orders and money at a glance.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-soft px-3 py-1.5 text-xs font-medium text-dash-ink4 transition hover:bg-dash-soft2">
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
          <Link href="/dashboard/admin/analytics" className="flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-soft px-3 py-1.5 text-xs font-medium text-dash-ink4 transition hover:bg-dash-soft2">
            <FiTrendingUp size={12} /> Analytics
          </Link>
          <Link href="/dashboard/admin/book-orders" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-hover px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:shadow-md hover:shadow-brand/30">
            <FiShoppingCart size={12} /> All Orders
          </Link>
        </div>
      </div>

      {/* All-time money — the three numbers the shop actually runs on */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MoneyCard
          icon={FiClock} tone="amber" loading={loading}
          label="New Orders" value={(stats?.newOrders ?? 0).toLocaleString('en-US')}
          note="Awaiting your confirmation" href="/dashboard/admin/book-orders"
        />
        <MoneyCard
          icon={FiPackage} tone="indigo" loading={loading}
          label="Total Value" value={tk(t?.value)}
          note={`${(t?.orders ?? 0).toLocaleString('en-US')} orders, all time`}
        />
        <MoneyCard
          icon={FiDollarSign} tone="emerald" loading={loading}
          label="Total Earned" value={tk(t?.earned)}
          note="Delivered + paid online"
        />
        <MoneyCard
          icon={FiTruck} tone="sky" loading={loading}
          label="Upcoming" value={tk(t?.upcoming)}
          note="Sold, not yet collected"
        />
      </div>

      {/* Date range */}
      <RangeBar
        preset={preset} onPreset={applyPreset}
        from={draft.from} to={draft.to}
        onFrom={(v) => setDraft((d) => ({ ...d, from: v }))}
        onTo={(v) => setDraft((d) => ({ ...d, to: v }))}
        onApply={applyCustom}
      />

      {/* Revenue chart for the selected range */}
      <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div>
            <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold">Order Revenue</h2>
            <p className="mt-0.5 text-xs text-dash-mute2">
              {r ? `${r.from} → ${r.to}` : 'Loading…'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">Sold</p>
              <p className="text-sm font-bold text-dash-ink outfit tabular-nums">{tk(r?.value)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">Earned</p>
              <p className="text-sm font-bold text-emerald-600 outfit tabular-nums">{tk(r?.earned)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">Orders</p>
              <p className="text-sm font-bold text-dash-ink outfit tabular-nums">{(r?.orders ?? 0).toLocaleString('en-US')}</p>
            </div>
            <ChartLegend />
          </div>
        </div>
        <div className="px-2 pb-2">
          <RevenueChart daily={r?.daily} loading={loading} />
        </div>
      </div>

      {/* Today + shortcuts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MoneyCard
          icon={FiShoppingCart} tone="brand" loading={loading}
          label="Today's Orders" value={(stats?.today?.orders ?? 0).toLocaleString('en-US')}
          note={`${tk(stats?.today?.value)} sold · ${tk(stats?.today?.earned)} earned`}
        />
        <MoneyCard
          icon={FiTag} tone="indigo" loading={loading}
          label="Coupon Sales" value={(stats?.coupons?.orders ?? 0).toLocaleString('en-US')}
          note={`${tk(stats?.coupons?.discount)} discount given`}
          href="/dashboard/admin/book-coupons/payouts"
        />
        <MoneyCard
          icon={FiGift} tone="amber" loading={loading}
          label="Owed to Coupon Owners" value={tk(stats?.coupons?.payout)}
          note="See per-coupon payouts"
          href="/dashboard/admin/book-coupons/payouts"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/dashboard/admin/book-orders"
          className="group flex items-center justify-between gap-3 rounded-xl border border-dash-line/60 bg-dash-card p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
              <FiClock size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dash-ink2">Confirm new orders</p>
              <p className="text-[11px] text-dash-mute2">{stats?.newOrders ?? 0} waiting for you</p>
            </div>
          </div>
          <FiArrowRight className="text-dash-mute transition group-hover:translate-x-0.5 group-hover:text-brand" />
        </Link>

        <Link href="/dashboard/admin/books"
          className="group flex items-center justify-between gap-3 rounded-xl border border-dash-line/60 bg-dash-card p-4 shadow-sm transition hover:border-brand/40 hover:shadow-md">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md">
              <FiLayers size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dash-ink2">Manage books</p>
              <p className="text-[11px] text-dash-mute2">Catalogue, content &amp; QR</p>
            </div>
          </div>
          <FiArrowRight className="text-dash-mute transition group-hover:translate-x-0.5 group-hover:text-brand" />
        </Link>
      </div>
    </div>
  );
}

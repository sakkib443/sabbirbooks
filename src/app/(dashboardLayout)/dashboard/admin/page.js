/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FiBook, FiDollarSign, FiGrid, FiTrendingUp, FiArrowRight, FiCalendar,
  FiShoppingCart, FiRefreshCw, FiChevronLeft, FiChevronRight, FiPlus,
  FiClock, FiLayers, FiPackage,
} from 'react-icons/fi';

import { can, getStoredUser } from '@/lib/permissions';

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

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const tk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');
/** Compact money for the chart axis: 12500 → ৳12.5k. */
const tkShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return '৳' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return '৳' + Math.round(v);
};

export default function AdminDashboard() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Every panel below is order data. An account without `orders.read` gets the
  // content workspace instead — and never fires the request, so the network tab
  // holds no half-answered business questions either.
  const showOrderDashboard = can(getStoredUser(), 'orders.read');

  const fetchData = useCallback(async () => {
    if (!showOrderDashboard) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/orders/stats?year=${selectedYear}&month=${selectedMonth}`,
        { headers: headers() }
      ).then(r => r.json());
      setStats(res?.data || null);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, showOrderDashboard]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Stat cards ────────────────────────────────────────────────────────────
  const cards = useMemo(() => ([
    {
      title: 'New Orders',
      value: (stats?.newOrders ?? 0).toLocaleString('en-US'),
      subtitle: 'Awaiting your confirmation',
      icon: FiClock,
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    },
    {
      title: "Today's Orders",
      value: (stats?.today?.orders ?? 0).toLocaleString('en-US'),
      subtitle: 'Placed today',
      icon: FiShoppingCart,
      iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-500',
    },
    {
      title: 'Total Orders',
      value: (stats?.totals?.orders ?? 0).toLocaleString('en-US'),
      subtitle: 'All time',
      icon: FiPackage,
      iconBg: 'bg-gradient-to-br from-sky-500 to-cyan-500',
    },
    {
      title: "Today's Income",
      value: tk(stats?.today?.revenue ?? 0),
      subtitle: 'Sales placed today',
      icon: FiDollarSign,
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    },
  ]), [stats]);

  // ── Revenue chart geometry ─────────────────────────────────────────────────
  const daily = stats?.month?.daily ?? [];
  const W = 720, H = 240, PX = 46, PY = 20, BOTTOM = 30;
  const usableW = W - PX - 20, usableH = H - PY - BOTTOM;
  const maxRev = Math.max(...daily.map(d => d.revenue), 1);

  const smoothLine = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  };

  const chartPts = useMemo(() => daily.map((d, i) => {
    const x = PX + (i / Math.max(daily.length - 1, 1)) * usableW;
    const y = PY + usableH - (d.revenue / maxRev) * usableH;
    return [x, y];
  }), [daily, maxRev, usableW, usableH]);

  const linePath = useMemo(() => smoothLine(chartPts), [chartPts]);
  const areaPath = useMemo(() => {
    if (chartPts.length < 2) return '';
    const last = chartPts[chartPts.length - 1];
    const first = chartPts[0];
    return `${linePath} L ${last[0]},${PY + usableH} L ${first[0]},${PY + usableH} Z`;
  }, [linePath, chartPts, usableH]);

  const gridLines = useMemo(() => {
    const lines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = PY + (i / steps) * usableH;
      const val = maxRev * ((steps - i) / steps);
      lines.push({ y, label: tkShort(val) });
    }
    return lines;
  }, [maxRev, usableH]);

  const dayLabels = useMemo(() => (
    daily.filter((d) => d.day === 1 || d.day % 5 === 0 || d.day === daily.length).map(d => ({
      x: PX + ((d.day - 1) / Math.max(daily.length - 1, 1)) * usableW,
      label: d.day,
    }))
  ), [daily, usableW]);

  // ── Content-only manager view ──────────────────────────────────────────────
  if (!showOrderDashboard) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shadow-md shadow-brand/20">
            <FiGrid size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Content workspace</h1>
            <p className="text-xs text-dash-mute2">Manage books and their QR content.</p>
          </div>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line/60 p-5 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CONTENT_SHORTCUTS.map((s) => {
              const Icon = s.icon;
              return (
                <Link key={s.href} href={s.href}
                  className="flex items-center gap-3 rounded-xl border border-dash-line/60 bg-dash-soft px-4 py-3 hover:bg-dash-soft2 transition">
                  <span className="w-9 h-9 rounded-lg bg-dash-card border border-dash-line flex items-center justify-center text-dash-ink2"><Icon size={16} /></span>
                  <span className="text-sm font-medium text-dash-ink2">{s.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shadow-md shadow-brand/20">
            <FiShoppingCart size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Order Overview</h1>
            <p className="text-xs text-dash-mute2">Book orders and revenue at a glance.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Month picker — scopes the revenue chart */}
          <div className="flex items-center gap-1 bg-dash-soft border border-dash-line rounded-lg px-2 py-1.5">
            <button onClick={goToPrevMonth} className="p-0.5 hover:bg-dash-soft3 rounded transition">
              <FiChevronLeft size={14} className="text-dash-mute" />
            </button>
            <div className="flex items-center gap-1.5 px-2 min-w-[100px] justify-center">
              <FiCalendar size={12} className="text-dash-mute2" />
              <span className="text-xs font-medium text-dash-ink4">{MONTHS_SHORT[selectedMonth]} {selectedYear}</span>
            </div>
            <button onClick={goToNextMonth} disabled={isCurrentMonth}
              className={`p-0.5 rounded transition ${isCurrentMonth ? 'opacity-30' : 'hover:bg-dash-soft3'}`}>
              <FiChevronRight size={14} className="text-dash-mute" />
            </button>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dash-ink4 bg-dash-soft border border-dash-line rounded-lg hover:bg-dash-soft2 transition">
            <FiRefreshCw size={12} /> Reload
          </button>
          <Link href="/dashboard/admin/book-orders" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-brand to-brand-hover rounded-lg hover:shadow-md hover:shadow-brand/30 transition shadow-sm">
            <FiShoppingCart size={12} /> All Orders
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-dash-mute2 tracking-wider uppercase leading-tight">{stat.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl font-bold text-dash-ink outfit leading-none">
                      {loading ? <span className="inline-block w-14 h-6 bg-dash-soft2 animate-pulse rounded-md" /> : stat.value}
                    </p>
                  </div>
                  <p className="text-[11px] text-dash-mute2 mt-1 truncate">{stat.subtitle}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                  <Icon size={17} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue chart */}
      <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-2">
          <div>
            <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold">Order Revenue</h2>
            <p className="text-xs text-dash-mute2 mt-0.5">Daily revenue — {MONTHS_FULL[selectedMonth]} {selectedYear}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-semibold text-dash-mute2 uppercase tracking-wider">This month</p>
              <p className="text-sm font-bold text-dash-ink outfit">{tk(stats?.month?.revenue ?? 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-dash-mute2 uppercase tracking-wider">Orders</p>
              <p className="text-sm font-bold text-dash-ink outfit">{(stats?.month?.orders ?? 0).toLocaleString('en-US')}</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-dash-mute">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" /> Revenue
            </span>
          </div>
        </div>

        <div className="px-2 pb-2">
          {loading ? (
            <div className="h-[230px] bg-dash-soft rounded-lg animate-pulse mx-3 my-2" />
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {gridLines.map((line, i) => (
                <g key={i}>
                  <line x1={PX} y1={line.y} x2={PX + usableW} y2={line.y} stroke="var(--dash-line-soft)" strokeWidth="1" />
                  <text x={PX - 8} y={line.y + 3.5} fontSize="9" fill="var(--dash-mute2)" textAnchor="end" fontFamily="Inter, sans-serif">{line.label}</text>
                </g>
              ))}
              <line x1={PX} y1={PY + usableH} x2={PX + usableW} y2={PY + usableH} stroke="var(--dash-line)" strokeWidth="1" />
              {dayLabels.map((dl, i) => (
                <text key={i} x={dl.x} y={H - 8} fontSize="9" fill="var(--dash-mute2)" textAnchor="middle" fontFamily="Inter, sans-serif">{dl.label}</text>
              ))}
              {areaPath && <path d={areaPath} fill="url(#revGrad)" />}
              {linePath && <path d={linePath} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {chartPts.map(([x, y], i) => (
                <g key={i} className="group/dot">
                  <circle cx={x} cy={y} r="12" fill="transparent" className="cursor-pointer" />
                  <circle cx={x} cy={y} r="3.5" fill="var(--brand)" stroke="white" strokeWidth="2" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                  {daily[i]?.revenue > 0 && (
                    <>
                      <rect x={x - 34} y={y - 30} width="68" height="20" rx="4" fill="#1e293b" className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                      <text x={x} y={y - 16} fontSize="9" fill="white" textAnchor="middle" fontWeight="600" className="opacity-0 group-hover/dot:opacity-100 transition-opacity">
                        {tk(daily[i].revenue)} · {daily[i].orders}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* All-time summary + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-dash-card rounded-xl border border-dash-line/60 p-4 shadow-sm flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
            <FiTrendingUp size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-dash-mute2 uppercase tracking-wider">Total Revenue</p>
            <p className="text-lg font-bold text-dash-ink outfit leading-tight">
              {loading ? <span className="inline-block w-20 h-5 bg-dash-soft2 animate-pulse rounded-md" /> : tk(stats?.totals?.revenue ?? 0)}
            </p>
            <p className="text-[11px] text-dash-mute2">All confirmed &amp; pending orders, all time</p>
          </div>
        </div>

        <Link href="/dashboard/admin/book-orders"
          className="bg-dash-card rounded-xl border border-dash-line/60 p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md hover:border-brand/40 transition group">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shrink-0">
              <FiClock size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dash-ink2">Confirm new orders</p>
              <p className="text-[11px] text-dash-mute2">{stats?.newOrders ?? 0} waiting for you</p>
            </div>
          </div>
          <FiArrowRight className="text-dash-mute group-hover:text-brand group-hover:translate-x-0.5 transition" />
        </Link>

        <Link href="/dashboard/admin/books"
          className="bg-dash-card rounded-xl border border-dash-line/60 p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md hover:border-brand/40 transition group">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white shadow-md shrink-0">
              <FiLayers size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dash-ink2">Manage books</p>
              <p className="text-[11px] text-dash-mute2">Catalogue, content &amp; QR</p>
            </div>
          </div>
          <FiArrowRight className="text-dash-mute group-hover:text-brand group-hover:translate-x-0.5 transition" />
        </Link>
      </div>
    </div>
  );
}

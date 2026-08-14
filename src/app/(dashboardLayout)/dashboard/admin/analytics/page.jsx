'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FiTrendingUp, FiDollarSign, FiBook, FiHeadphones, FiLayers,
  FiDownload, FiPrinter, FiRefreshCw, FiCalendar, FiArrowLeft,
  FiBarChart2, FiPieChart, FiList, FiGrid,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const hdrs = () => ({ Authorization: `Bearer ${getToken()}` });

// Colors — match the admin dashboard convention (Course = indigo, IELTS = gold)
const COURSE_C = '#6366f1';
const IELTS_C = '#F3A522';
const METHOD_COLORS = ['#6366f1', '#10b981', '#F3A522', '#ec4899', '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6'];

const TABS = [
  { key: 'overall', label: 'Overall', icon: FiGrid },
  { key: 'course', label: 'Course', icon: FiBook },
];

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: 'This Month' },
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: 'year', label: 'This Year' },
  { key: 'lastyear', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

const iso = (d) => d.toISOString().split('T')[0];
function getRangeDates(key) {
  const now = new Date();
  const end = iso(now);
  switch (key) {
    case 'today': return { startDate: iso(now), endDate: end };
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - 6); return { startDate: iso(d), endDate: end }; }
    case 'month': return { startDate: iso(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: end };
    case '3m': { const d = new Date(now); d.setMonth(d.getMonth() - 2); d.setDate(1); return { startDate: iso(d), endDate: end }; }
    case '6m': { const d = new Date(now); d.setMonth(d.getMonth() - 5); d.setDate(1); return { startDate: iso(d), endDate: end }; }
    case 'year': return { startDate: `${now.getFullYear()}-01-01`, endDate: end };
    case 'lastyear': return { startDate: `${now.getFullYear() - 1}-01-01`, endDate: `${now.getFullYear() - 1}-12-31` };
    default: return { startDate: '', endDate: '' };
  }
}

const fmtBDT = (n) => '৳' + Number(n || 0).toLocaleString();
const prettyMethod = (m) => (m || 'other').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const TYPE_COLORS = { Online: '#6366f1', Offline: '#F3A522', Recorded: '#10b981' };

// ─── Reusable presentational cards (used by Course & IELTS tabs) ───
function DonutCard({ title, subtitle, slices, loading }) {
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const data = slices.filter((s) => s.amount > 0);
  return (
    <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5 flex flex-col">
      <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-dash-mute2 mb-2">{subtitle}</p>}
      <div className="flex-1 flex items-center justify-center py-1">
        {loading ? <div className="w-[160px] h-[160px] bg-dash-soft2 rounded-full animate-pulse" />
          : total === 0 ? <div className="h-[160px] flex items-center justify-center text-sm text-dash-mute2">No data</div>
            : (
              <div className="relative" style={{ width: 176, height: 176 }}>
                <svg viewBox="0 0 176 176" className="w-full h-full">
                  {(() => {
                    const cx = 88, cy = 88, r = 70, ir = 48; let acc = -90;
                    return data.map((s, i) => {
                      const ang = (s.amount / total) * 360; const gap = data.length > 1 ? 2 : 0;
                      const a1 = acc + gap / 2, a2 = acc + ang - gap / 2; acc += ang;
                      const r1 = a1 * Math.PI / 180, r2 = a2 * Math.PI / 180; const large = a2 - a1 > 180 ? 1 : 0;
                      const x1 = cx + r * Math.cos(r1), y1 = cy + r * Math.sin(r1), x2 = cx + r * Math.cos(r2), y2 = cy + r * Math.sin(r2);
                      const ix1 = cx + ir * Math.cos(r2), iy1 = cy + ir * Math.sin(r2), ix2 = cx + ir * Math.cos(r1), iy2 = cy + ir * Math.sin(r1);
                      return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`} fill={s.color} className="drop-shadow-sm" />;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-dash-ink2 outfit">{fmtBDT(total)}</span>
                  <span className="text-[11px] text-brand-ink font-medium">Total</span>
                </div>
              </div>
            )}
      </div>
      <div className="space-y-2 mt-3">
        {slices.map((s, i) => {
          const pct = total > 0 ? Math.round((s.amount / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm text-dash-ink4 min-w-0"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} /> <span className="truncate">{s.label}</span></span>
              <span className="text-sm font-semibold text-dash-ink2 whitespace-nowrap">{fmtBDT(s.amount)} <span className="text-xs text-dash-mute2">{pct}%</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HBarCard({ title, icon: Icon, items, loading }) {
  const total = items.reduce((s, x) => s + x.amount, 0);
  return (
    <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5">
      <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold mb-3 flex items-center gap-2">{Icon && <Icon size={15} className="text-brand-ink" />} {title}</h2>
      {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-6 bg-dash-soft2 rounded animate-pulse" />)}</div>
        : items.length === 0 ? <p className="text-sm text-dash-mute2 py-6 text-center">No data</p>
          : (
            <div className="space-y-3">
              {items.map((m, i) => {
                const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1 gap-2">
                      <span className="text-dash-ink4 truncate">{m.label}</span>
                      <span className="font-semibold text-dash-ink2 whitespace-nowrap">{fmtBDT(m.amount)} <span className="text-xs text-dash-mute2">{pct}%</span></span>
                    </div>
                    <div className="h-2 bg-dash-soft2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: m.color || METHOD_COLORS[i % METHOD_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
}

// Generic monthly bar chart — single-series or stacked (series = [{key,color,label}])
function MonthBarsCard({ title, subtitle, months, series, loading }) {
  const totals = months.map((m) => series.reduce((s, ser) => s + (m[ser.key] || 0), 0));
  const max = Math.max(...totals, 1);
  const BW = 720, BH = 250, PADX = 48, BASE = BH - 32, TOP = 16;
  const plotH = BASE - TOP;
  const slot = (BW - PADX - 12) / Math.max(months.length, 1);
  const barW = Math.min(slot * 0.5, 44);
  const grid = Array.from({ length: 5 }, (_, i) => ({ y: TOP + (i / 4) * plotH, val: Math.round(max * ((4 - i) / 4)) }));
  return (
    <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-dash-mute2 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 text-xs text-dash-mute">
          {series.map((s) => <span key={s.key} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}</span>)}
        </div>
      </div>
      {loading ? <div className="h-[230px] bg-dash-soft rounded-lg animate-pulse" />
        : months.length === 0 ? <div className="h-[230px] flex items-center justify-center text-sm text-dash-mute2">No income in this period</div>
          : (
            <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
              {grid.map((g, i) => (<g key={i}><line x1={PADX} y1={g.y} x2={BW - 12} y2={g.y} stroke="var(--dash-line-soft)" strokeWidth="1" /><text x={PADX - 8} y={g.y + 3.5} fontSize="9" fill="var(--dash-mute2)" textAnchor="end">{g.val >= 1000 ? (g.val / 1000).toFixed(0) + 'k' : g.val}</text></g>))}
              {months.map((m, i) => {
                const x = PADX + slot * i + slot / 2; let yTop = BASE;
                const segs = series.map((ser) => { const h = ((m[ser.key] || 0) / max) * plotH; const y = yTop - h; yTop = y; return { y, h, color: ser.color }; });
                const tot = totals[i];
                return (
                  <g key={i} className="group/bar">
                    {segs.map((sg, k) => sg.h > 0 && <rect key={k} x={x - barW / 2} y={sg.y} width={barW} height={sg.h} rx="2" fill={sg.color} />)}
                    <text x={x} y={BASE + 16} fontSize="9" fill="var(--dash-mute2)" textAnchor="middle">{m.label}</text>
                    {tot > 0 && <text x={x} y={yTop - 5} fontSize="8.5" fill="var(--dash-ink4)" textAnchor="middle" fontWeight="600" className="opacity-0 group-hover/bar:opacity-100 transition-opacity">{tot >= 1000 ? (tot / 1000).toFixed(1) + 'k' : tot}</text>}
                  </g>
                );
              })}
            </svg>
          )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [tab, setTab] = useState('overall');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applied, setApplied] = useState({ start: '', end: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (applied.start) p.set('startDate', applied.start);
      if (applied.end) p.set('endDate', applied.end);
      const q = p.toString() ? `?${p.toString()}` : '';
      const r = await fetch(`${API}/analytics/income-report${q}`, { headers: hdrs() }).then((r) => r.json());
      if (r.success) setData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [applied]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (key) => {
    setPreset(key);
    const { startDate: s, endDate: e } = getRangeDates(key);
    setStartDate(s); setEndDate(e); setApplied({ start: s, end: e });
  };
  const applyCustom = () => { setPreset('custom'); setApplied({ start: startDate, end: endDate }); };

  const course = data?.course;
  const ielts = data?.ielts;
  const combined = data?.combined;

  const rangeLabel = applied.start || applied.end
    ? `${applied.start || '…'} → ${applied.end || 'now'}`
    : 'All Time';

  // Combined transaction rows (Overall)
  const allTx = useMemo(() => {
    const c = (course?.transactions || []).map((t) => ({ date: t.date, source: 'Course', kind: t.kind, student: t.student, item: t.course, method: t.method, amount: t.amount }));
    const i = (ielts?.transactions || []).map((t) => ({ date: t.date, source: 'IELTS', kind: '', student: t.student, item: t.package, method: t.method, amount: t.amount }));
    return [...c, ...i].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Combined payment-method breakdown
  const methodBreakdown = useMemo(() => {
    const m = {};
    (course?.byMethod || []).forEach((x) => { m[x.method] = (m[x.method] || 0) + x.amount; });
    (ielts?.byMethod || []).forEach((x) => { m[x.method] = (m[x.method] || 0) + x.amount; });
    const arr = Object.entries(m).map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount);
    return { arr, total: arr.reduce((s, x) => s + x.amount, 0) };
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Top courses by income (from course transactions)
  const topCourses = useMemo(() => {
    const m = {};
    (course?.transactions || []).forEach((t) => { m[t.course] = (m[t.course] || 0) + t.amount; });
    return Object.entries(m).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── CSV export (Overall = combined transactions) ───
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const downloadCSV = () => {
    let headers, rows, name;
    if (tab === 'course') {
      headers = ['Date', 'Type', 'Student', 'Course', 'Course Type', 'Category', 'Method', 'Amount'];
      rows = (course?.transactions || []).map((t) => [new Date(t.date).toLocaleDateString(), t.kind, t.student, t.course, t.courseType, t.category, prettyMethod(t.method), t.amount]);
      name = 'income-course';
    } else if (tab === 'ielts') {
      headers = ['Date', 'Student', 'Package', 'Method', 'Amount'];
      rows = (ielts?.transactions || []).map((t) => [new Date(t.date).toLocaleDateString(), t.student, t.package, prettyMethod(t.method), t.amount]);
      name = 'income-ielts';
    } else {
      headers = ['Date', 'Source', 'Type', 'Student', 'Item', 'Method', 'Amount'];
      rows = allTx.map((t) => [new Date(t.date).toLocaleDateString(), t.source, t.kind || '', t.student, t.item, prettyMethod(t.method), t.amount]);
      name = 'income-overall';
    }
    const csv = '﻿' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}-${iso(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadPDF = () => window.print();

  const totalCourse = course?.total || 0;
  const totalIelts = ielts?.total || 0;
  const totalCombined = combined?.total || 0;
  const totalTx = (course?.transactionCount || 0) + (ielts?.transactionCount || 0);

  // ─── Monthly stacked-bar chart geometry ───
  const months = combined?.byMonth || [];
  const maxMonth = Math.max(...months.map((m) => m.total), 1);
  const BW = 720, BH = 250, PADX = 48, BASE = BH - 32, TOP = 16;
  const plotH = BASE - TOP;
  const slot = (BW - PADX - 12) / Math.max(months.length, 1);
  const barW = Math.min(slot * 0.5, 44);
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = TOP + (i / 4) * plotH;
    return { y, val: Math.round(maxMonth * ((4 - i) / 4)) };
  });

  const kpis = [
    { label: 'TOTAL INCOME', value: fmtBDT(totalCombined), icon: FiDollarSign, bg: 'from-brand to-brand-hover', note: 'Course + IELTS' },
    { label: 'COURSE INCOME', value: fmtBDT(totalCourse), icon: FiBook, bg: 'from-indigo-400 to-indigo-600', note: `${course?.transactionCount || 0} payments` },
    { label: 'IELTS INCOME', value: fmtBDT(totalIelts), icon: FiHeadphones, bg: 'from-violet-400 to-violet-600', note: `${ielts?.orderCount || 0} orders` },
    { label: 'TRANSACTIONS', value: totalTx, icon: FiList, bg: 'from-emerald-400 to-emerald-600', note: 'in this period' },
  ];

  return (
    <div className="space-y-4">
      {/* Print-only report header */}
      <div className="print-only hidden mb-4">
        <h1 className="text-2xl font-bold text-dash-ink">Aptech Learning — Income Report</h1>
        <p className="text-sm text-dash-mute">Period: {rangeLabel} · Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shadow-md shadow-brand/20">
            <FiBarChart2 size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Analytics &amp; Report</h1>
            <p className="text-xs text-dash-mute2">Income · {rangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dash-ink4 bg-dash-soft border border-dash-line rounded-lg hover:bg-dash-soft2 transition">
            <FiRefreshCw size={12} /> Reload
          </button>
          <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dash-ink4 bg-dash-soft border border-dash-line rounded-lg hover:bg-dash-soft2 transition">
            <FiDownload size={12} /> CSV
          </button>
          <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-brand to-brand-hover rounded-lg hover:shadow-md hover:shadow-brand/30 transition shadow-sm">
            <FiPrinter size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="no-print bg-dash-card rounded-xl border border-dash-line/60 p-3 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${preset === p.key ? 'bg-brand text-white border-brand' : 'bg-dash-card text-dash-mute border-dash-line hover:border-brand-line hover:text-brand-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <FiCalendar size={14} className="text-dash-mute2" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-dash-line rounded-lg text-dash-ink4 focus:outline-none focus:ring-2 focus:ring-brand/15" />
          <span className="text-dash-mute2 text-xs">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-xs border border-dash-line rounded-lg text-dash-ink4 focus:outline-none focus:ring-2 focus:ring-brand/15" />
          <button onClick={applyCustom} className="px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition">Apply</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex items-center gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${active ? 'bg-brand text-white border-brand shadow-sm shadow-brand/25' : 'bg-dash-card text-dash-mute border-dash-line hover:text-brand-ink hover:border-brand-line'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ OVERALL TAB ═══════════════ */}
      {tab === 'overall' && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-dash-mute2 tracking-wider uppercase truncate">{k.label}</p>
                      <p className="text-xl font-bold text-dash-ink mt-1 outfit leading-none">
                        {loading ? <span className="inline-block w-16 h-6 bg-dash-soft2 animate-pulse rounded-md" /> : k.value}
                      </p>
                      <p className="text-[11px] text-dash-mute2 mt-1 truncate">{k.note}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center text-white shadow-md shrink-0`}>
                      <Icon size={17} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly income chart + Source donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly income (stacked bars) */}
            <div className="lg:col-span-2 bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold">Income by Month</h2>
                  <p className="text-xs text-dash-mute2 mt-0.5">Course + IELTS, money received</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-dash-mute">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COURSE_C }} /> Course</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: IELTS_C }} /> IELTS</span>
                </div>
              </div>
              {loading ? (
                <div className="h-[230px] bg-dash-soft rounded-lg animate-pulse" />
              ) : months.length === 0 ? (
                <div className="h-[230px] flex items-center justify-center text-sm text-dash-mute2">No income in this period</div>
              ) : (
                <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                  {gridLines.map((g, i) => (
                    <g key={i}>
                      <line x1={PADX} y1={g.y} x2={BW - 12} y2={g.y} stroke="var(--dash-line-soft)" strokeWidth="1" />
                      <text x={PADX - 8} y={g.y + 3.5} fontSize="9" fill="var(--dash-mute2)" textAnchor="end">{g.val >= 1000 ? (g.val / 1000).toFixed(0) + 'k' : g.val}</text>
                    </g>
                  ))}
                  {months.map((m, i) => {
                    const x = PADX + slot * i + slot / 2;
                    const cH = (m.course / maxMonth) * plotH;
                    const iH = (m.ielts / maxMonth) * plotH;
                    return (
                      <g key={i} className="group/bar">
                        <rect x={x - barW / 2} y={BASE - cH} width={barW} height={cH} rx="2" fill={COURSE_C} />
                        <rect x={x - barW / 2} y={BASE - cH - iH} width={barW} height={iH} rx="2" fill={IELTS_C} />
                        <text x={x} y={BASE + 16} fontSize="9" fill="var(--dash-mute2)" textAnchor="middle">{m.label}</text>
                        {m.total > 0 && (
                          <text x={x} y={BASE - cH - iH - 5} fontSize="8.5" fill="var(--dash-ink4)" textAnchor="middle" fontWeight="600" className="opacity-0 group-hover/bar:opacity-100 transition-opacity">
                            {m.total >= 1000 ? (m.total / 1000).toFixed(1) + 'k' : m.total}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Source donut */}
            <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5 flex flex-col">
              <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold mb-1">Course vs IELTS</h2>
              <p className="text-xs text-dash-mute2 mb-3">Income share</p>
              <div className="flex-1 flex items-center justify-center">
                {loading ? (
                  <div className="w-[160px] h-[160px] bg-dash-soft2 rounded-full animate-pulse" />
                ) : (
                  <div className="relative" style={{ width: 176, height: 176 }}>
                    <svg viewBox="0 0 176 176" className="w-full h-full">
                      {(() => {
                        const cx = 88, cy = 88, r = 70, ir = 48;
                        const slices = [{ label: 'Course', amount: totalCourse, color: COURSE_C }, { label: 'IELTS', amount: totalIelts, color: IELTS_C }];
                        const tot = totalCombined;
                        if (tot === 0) return <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--dash-line-soft)" strokeWidth="22" />;
                        let acc = -90;
                        return slices.filter((s) => s.amount > 0).map((s, i) => {
                          const ang = (s.amount / tot) * 360;
                          const gap = 2;
                          const a1 = acc + gap / 2, a2 = acc + ang - gap / 2; acc += ang;
                          const r1 = (a1 * Math.PI) / 180, r2 = (a2 * Math.PI) / 180;
                          const large = a2 - a1 > 180 ? 1 : 0;
                          const x1 = cx + r * Math.cos(r1), y1 = cy + r * Math.sin(r1);
                          const x2 = cx + r * Math.cos(r2), y2 = cy + r * Math.sin(r2);
                          const ix1 = cx + ir * Math.cos(r2), iy1 = cy + ir * Math.sin(r2);
                          const ix2 = cx + ir * Math.cos(r1), iy2 = cy + ir * Math.sin(r1);
                          return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix2} ${iy2} Z`} fill={s.color} className="drop-shadow-sm" />;
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-dash-ink2 outfit">{fmtBDT(totalCombined)}</span>
                      <span className="text-[11px] text-brand-ink font-medium">Total</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2 mt-3">
                {[{ label: 'Course', amount: totalCourse, color: COURSE_C }, { label: 'IELTS', amount: totalIelts, color: IELTS_C }].map((s) => {
                  const pct = totalCombined > 0 ? Math.round((s.amount / totalCombined) * 100) : 0;
                  return (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-dash-ink4"><span className="w-3 h-3 rounded-full" style={{ background: s.color }} /> {s.label}</span>
                      <span className="text-sm font-semibold text-dash-ink2">{fmtBDT(s.amount)} <span className="text-xs text-dash-mute2">{pct}%</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Method breakdown + Month table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment methods */}
            <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5">
              <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold mb-3 flex items-center gap-2"><FiPieChart size={15} className="text-brand-ink" /> Payment Methods</h2>
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-6 bg-dash-soft2 rounded animate-pulse" />)}</div>
              ) : methodBreakdown.arr.length === 0 ? (
                <p className="text-sm text-dash-mute2 py-6 text-center">No data</p>
              ) : (
                <div className="space-y-3">
                  {methodBreakdown.arr.map((m, i) => {
                    const pct = methodBreakdown.total > 0 ? Math.round((m.amount / methodBreakdown.total) * 100) : 0;
                    return (
                      <div key={m.method}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-dash-ink4">{prettyMethod(m.method)}</span>
                          <span className="font-semibold text-dash-ink2">{fmtBDT(m.amount)} <span className="text-xs text-dash-mute2">{pct}%</span></span>
                        </div>
                        <div className="h-2 bg-dash-soft2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: METHOD_COLORS[i % METHOD_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Month table */}
            <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-dash-line-soft">
                <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold flex items-center gap-2"><FiCalendar size={15} className="text-brand-ink" /> Month-wise Income</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-dash-mute2 border-b border-dash-line-soft">
                      <th className="px-5 py-2.5 font-semibold">Month</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Course</th>
                      <th className="px-3 py-2.5 font-semibold text-right">IELTS</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-dash-mute2 text-xs">Loading…</td></tr>
                    ) : months.length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-dash-mute2 text-xs">No income</td></tr>
                    ) : (
                      [...months].reverse().map((m) => (
                        <tr key={m.month} className="border-b border-dash-soft hover:bg-dash-soft/50">
                          <td className="px-5 py-2.5 text-dash-ink3">{m.label}</td>
                          <td className="px-3 py-2.5 text-right text-dash-ink4">{fmtBDT(m.course)}</td>
                          <td className="px-3 py-2.5 text-right text-dash-ink4">{fmtBDT(m.ielts)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-dash-ink2">{fmtBDT(m.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Transactions table */}
          <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-dash-line-soft flex items-center justify-between">
              <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold flex items-center gap-2"><FiList size={15} className="text-brand-ink" /> Transactions</h2>
              <span className="text-xs text-dash-mute2">{allTx.length} total{allTx.length > 40 ? ' · showing 40, download CSV for all' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-dash-mute2 border-b border-dash-line-soft">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Source</th>
                    <th className="px-3 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Item</th>
                    <th className="px-3 py-2.5 font-semibold">Method</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-dash-mute2 text-xs">Loading…</td></tr>
                  ) : allTx.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-dash-mute2 text-xs">No transactions in this period</td></tr>
                  ) : (
                    allTx.slice(0, 40).map((t, i) => (
                      <tr key={i} className="border-b border-dash-soft hover:bg-dash-soft/50">
                        <td className="px-5 py-2.5 text-dash-mute whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.source === 'Course' ? 'text-indigo-600 bg-indigo-50' : 'text-brand-deep bg-brand-soft'}`}>
                            {t.source}{t.kind ? ` · ${t.kind}` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-dash-ink3 truncate max-w-[140px]">{t.student}</td>
                        <td className="px-3 py-2.5 text-dash-mute truncate max-w-[180px]">{t.item}</td>
                        <td className="px-3 py-2.5 text-dash-mute">{prettyMethod(t.method)}</td>
                        <td className="px-5 py-2.5 text-right font-semibold text-dash-ink2 whitespace-nowrap">{fmtBDT(t.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ COURSE TAB ═══════════════ */}
      {tab === 'course' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'COURSE INCOME', value: fmtBDT(totalCourse), icon: FiBook, bg: 'from-indigo-400 to-indigo-600', note: `${course?.transactionCount || 0} payments` },
              { label: 'ADMISSIONS', value: fmtBDT(course?.admissionTotal || 0), icon: FiDollarSign, bg: 'from-emerald-400 to-emerald-600', note: 'first payments' },
              { label: 'INSTALLMENTS', value: fmtBDT(course?.installmentTotal || 0), icon: FiLayers, bg: 'from-violet-400 to-violet-600', note: 'follow-up payments' },
              { label: 'PAYMENTS', value: course?.transactionCount || 0, icon: FiList, bg: 'from-brand to-brand-hover', note: 'in this period' },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-dash-mute2 tracking-wider uppercase truncate">{k.label}</p>
                      <p className="text-xl font-bold text-dash-ink mt-1 outfit leading-none">{loading ? <span className="inline-block w-16 h-6 bg-dash-soft2 animate-pulse rounded-md" /> : k.value}</p>
                      <p className="text-[11px] text-dash-mute2 mt-1 truncate">{k.note}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center text-white shadow-md shrink-0`}><Icon size={17} /></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month chart + Type donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MonthBarsCard title="Income by Month" subtitle="Course, money received" months={course?.byMonth || []} series={[{ key: 'amount', color: COURSE_C, label: 'Income' }]} loading={loading} />
            </div>
            <DonutCard title="By Course Type" subtitle="Online / Offline / Recorded" loading={loading}
              slices={(course?.byType || []).map((t) => ({ label: t.type, amount: t.amount, color: TYPE_COLORS[t.type] || 'var(--dash-mute2)' }))} />
          </div>

          {/* Category + Method + Admission-vs-Installment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <HBarCard title="By Category" icon={FiLayers} loading={loading} items={(course?.byCategory || []).map((c) => ({ label: c.category, amount: c.amount }))} />
            <HBarCard title="Payment Methods" icon={FiPieChart} loading={loading} items={(course?.byMethod || []).map((m) => ({ label: prettyMethod(m.method), amount: m.amount }))} />
            <DonutCard title="Admission vs Installment" loading={loading}
              slices={[{ label: 'Admission', amount: course?.admissionTotal || 0, color: '#10b981' }, { label: 'Installment', amount: course?.installmentTotal || 0, color: '#8b5cf6' }]} />
          </div>

          {/* Top courses */}
          <HBarCard title="Top Courses by Income" icon={FiTrendingUp} loading={loading} items={topCourses} />

          {/* Course transactions table */}
          <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-dash-line-soft flex items-center justify-between">
              <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold flex items-center gap-2"><FiList size={15} className="text-brand-ink" /> Course Payments</h2>
              <span className="text-xs text-dash-mute2">{(course?.transactions || []).length} total{(course?.transactions || []).length > 40 ? ' · showing 40, CSV for all' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-dash-mute2 border-b border-dash-line-soft">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Type</th>
                    <th className="px-3 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Course</th>
                    <th className="px-3 py-2.5 font-semibold">Method</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (<tr><td colSpan={6} className="px-5 py-8 text-center text-dash-mute2 text-xs">Loading…</td></tr>)
                    : (course?.transactions || []).length === 0 ? (<tr><td colSpan={6} className="px-5 py-8 text-center text-dash-mute2 text-xs">No course payments in this period</td></tr>)
                      : course.transactions.slice(0, 40).map((t, i) => (
                        <tr key={i} className="border-b border-dash-soft hover:bg-dash-soft/50">
                          <td className="px-5 py-2.5 text-dash-mute whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${t.kind === 'admission' ? 'text-emerald-600 bg-emerald-50' : 'text-violet-600 bg-violet-50'}`}>{t.kind}</span></td>
                          <td className="px-3 py-2.5 text-dash-ink3 truncate max-w-[140px]">{t.student}</td>
                          <td className="px-3 py-2.5 text-dash-mute truncate max-w-[200px]">{t.course}</td>
                          <td className="px-3 py-2.5 text-dash-mute">{prettyMethod(t.method)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-dash-ink2 whitespace-nowrap">{fmtBDT(t.amount)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ IELTS TAB ═══════════════ */}
      {tab === 'ielts' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'IELTS INCOME', value: fmtBDT(totalIelts), icon: FiHeadphones, bg: 'from-violet-400 to-violet-600', note: `${ielts?.transactionCount || 0} paid exams` },
              { label: 'ORDERS', value: ielts?.orderCount || 0, icon: FiLayers, bg: 'from-indigo-400 to-indigo-600', note: 'bundle = 1 order' },
              { label: 'EXAMS SOLD', value: ielts?.transactionCount || 0, icon: FiList, bg: 'from-brand to-brand-hover', note: 'paid tests' },
              { label: 'DISCOUNT GIVEN', value: fmtBDT(ielts?.discountTotal || 0), icon: FiTrendingUp, bg: 'from-emerald-400 to-emerald-600', note: 'via coupons' },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="bg-dash-card rounded-xl border border-dash-line/60 px-4 py-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-dash-mute2 tracking-wider uppercase truncate">{k.label}</p>
                      <p className="text-xl font-bold text-dash-ink mt-1 outfit leading-none">{loading ? <span className="inline-block w-16 h-6 bg-dash-soft2 animate-pulse rounded-md" /> : k.value}</p>
                      <p className="text-[11px] text-dash-mute2 mt-1 truncate">{k.note}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.bg} flex items-center justify-center text-white shadow-md shrink-0`}><Icon size={17} /></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month chart + Method donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <MonthBarsCard title="Income by Month" subtitle="IELTS, money received" months={ielts?.byMonth || []} series={[{ key: 'amount', color: IELTS_C, label: 'Income' }]} loading={loading} />
            </div>
            <DonutCard title="Payment Methods" subtitle="How students paid" loading={loading}
              slices={(ielts?.byMethod || []).map((m, i) => ({ label: prettyMethod(m.method), amount: m.amount, color: METHOD_COLORS[i % METHOD_COLORS.length] }))} />
          </div>

          {/* By Package */}
          <HBarCard title="Income by Package" icon={FiLayers} loading={loading}
            items={(ielts?.byPackage || []).map((p) => ({ label: `${p.package} · ${p.count} sold`, amount: p.amount }))} />

          {/* IELTS transactions table */}
          <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-dash-line-soft flex items-center justify-between">
              <h2 className="text-base font-semibold text-dash-ink2 outfit-semibold flex items-center gap-2"><FiList size={15} className="text-brand-ink" /> IELTS Payments</h2>
              <span className="text-xs text-dash-mute2">{(ielts?.transactions || []).length} total{(ielts?.transactions || []).length > 40 ? ' · showing 40, CSV for all' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-dash-mute2 border-b border-dash-line-soft">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Student</th>
                    <th className="px-3 py-2.5 font-semibold">Package</th>
                    <th className="px-3 py-2.5 font-semibold">Method</th>
                    <th className="px-3 py-2.5 font-semibold">Exam ID</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (<tr><td colSpan={6} className="px-5 py-8 text-center text-dash-mute2 text-xs">Loading…</td></tr>)
                    : (ielts?.transactions || []).length === 0 ? (<tr><td colSpan={6} className="px-5 py-8 text-center text-dash-mute2 text-xs">No paid IELTS orders in this period</td></tr>)
                      : ielts.transactions.slice(0, 40).map((t, i) => (
                        <tr key={i} className="border-b border-dash-soft hover:bg-dash-soft/50">
                          <td className="px-5 py-2.5 text-dash-mute whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2.5 text-dash-ink3 truncate max-w-[140px]">{t.student}</td>
                          <td className="px-3 py-2.5 text-dash-mute truncate max-w-[200px]">{t.package}</td>
                          <td className="px-3 py-2.5 text-dash-mute">{prettyMethod(t.method)}</td>
                          <td className="px-3 py-2.5 text-dash-mute2 text-xs">{t.examId}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-dash-ink2 whitespace-nowrap">{fmtBDT(t.amount)}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          aside, header, .no-print, .fixed { display: none !important; }
          main { margin-left: 0 !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}

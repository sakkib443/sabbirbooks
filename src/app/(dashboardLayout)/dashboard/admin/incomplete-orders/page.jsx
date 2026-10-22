'use client';

/**
 * Incomplete Orders (22 Oct 2026) — a list, not cards (the shop's request).
 *
 * People who typed something on the checkout and did NOT order. Anyone who
 * ordered (or paid) never shows here: the server leaves those rows out, and
 * the checkout tells the server the moment a visit orders. One row per phone
 * number (or email); "কয়বার" is how many separate visits that number made.
 *
 * Dates are the SAME days as Book Orders (the shop asked, 22 Oct 2026): a day
 * runs from the cutoff hour in Settings (12 PM) to the next, and is named by
 * the date it ends on — so after noon a new visitor is under "আগামীকাল", just
 * like a new order. By the last visit.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiUserX, FiRefreshCw, FiLoader, FiSearch, FiPhone, FiTrash2, FiEdit2, FiDownload, FiCheck, FiSliders, FiChevronDown, FiCheckCircle } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { getStoredUser } from '@/lib/permissions';
import { addDays, bdDate, dayWindow, getCutoffHour, hourLabel, pastCutoff, setCutoffHour } from '@/lib/shopDay';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API_BASE_URL}/incomplete-orders${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' });
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'এইমাত্র';
  if (m < 60) return `${m} মি. আগে`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ঘ. আগে`;
  return `${Math.round(h / 24)} দিন আগে`;
};

// The same shortcuts, and the same days, as Book Orders (book-orders/page.jsx
// daysForPreset) — "today" is the day named by today's date.
const DATES = [
  { key: 'yesterday', label: 'গতকাল', range: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: 'today', label: 'আজ', range: (t) => [t, t] },
  { key: 'tomorrow', label: 'আগামীকাল', range: (t) => [addDays(t, 1), addDays(t, 1)] },
  { key: '3d', label: '৩ দিন একসাথে', range: (t) => [addDays(t, -1), addDays(t, 1)] },
  { key: '7d', label: '৭ দিন', range: (t) => [addDays(t, -6), t] },
  { key: 'all', label: 'সব', range: () => null },
];
// The day new visitors are landing in right now: today until the cutoff, then tomorrow.
const liveDay = () => (pastCutoff() ? addDays(bdDate(), 1) : bdDate());
const fmtWindow = (w) => {
  const d = (x) => x.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', hour12: true });
  return `${d(w.from)} → ${d(w.to)}`;
};
// The two on the bar (23 Oct 2026); everything else lives under "Sort by".
const QUICK_DATES = ['today', 'tomorrow'];
const STATUSES = [
  { key: 'all', label: 'সব', count: (c) => c.total },
  { key: 'open', label: 'অর্ডার হয়নি', count: (c) => c.open },
  { key: 'todo', label: 'কল বাকি', count: (c) => c.todo },
  { key: 'contacted', label: 'কল করেছি', count: (c) => c.contacted },
  { key: 'ordered', label: 'পরে অর্ডার করেছে', count: (c) => c.ordered },
];

const input = 'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 focus:border-brand focus:outline-none';
const Dash = () => <span className="text-dash-mute2">—</span>;

export default function IncompleteOrdersPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [role] = useState(() => getStoredUser()?.role || '');
  const [today] = useState(() => bdDate(new Date()));
  // Opens on the day that is filling up now, as Book Orders' "new orders" link does.
  const [datePreset, setDatePreset] = useState(() => (pastCutoff() ? 'tomorrow' : 'today'));
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [status, setStatus] = useState('all');
  const [contact, setContact] = useState('');
  const [college, setCollege] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteFor, setNoteFor] = useState(null); // { id, text }
  const [busyId, setBusyId] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [cutoff, setCutoff] = useState(getCutoffHour);

  /**
   * When a day starts and ends — the same setting Book Orders uses (Settings →
   * shopDayCutoffHour), so the two pages keep counting the same days.
   */
  const changeCutoff = async (h) => {
    const before = getCutoffHour();
    setCutoff(h);
    setCutoffHour(h);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ shopDayCutoffHour: h }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not save');
      showToast('success', `দিন এখন ${hourLabel(h)} থেকে পরের দিন ${hourLabel(h)}`);
    } catch (e) {
      setCutoff(before);
      setCutoffHour(before);
      showToast('error', e.message);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const { params, window: shownWindow } = useMemo(() => {
    const p = new URLSearchParams();
    let days = null;
    if (datePreset === 'custom') {
      if (custom.from || custom.to) {
        const a = custom.from || custom.to;
        const b = custom.to || custom.from;
        days = a <= b ? [a, b] : [b, a];
      }
    } else {
      days = DATES.find((d) => d.key === datePreset)?.range(today) || null;
    }
    const w = days ? dayWindow(days[0], days[1]) : null;
    if (w) {
      p.set('from', w.from.toISOString());
      p.set('to', w.to.toISOString());
    }
    if (status !== 'all') p.set('status', status);
    if (contact) p.set('contact', contact);
    if (college) p.set('college', college);
    if (query) p.set('q', query);
    return { params: p.toString(), window: w };
    // cutoff: a new day-start hour moves every window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, custom, today, status, contact, college, query, cutoff]);
  const live = liveDay();

  const load = useCallback(async () => {
    try {
      setData(await call(`?${params}`));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const patch = async (row, body) => {
    setBusyId(row._id);
    try {
      const doc = await call(`/${row._id}`, 'PATCH', body);
      setData((d) => ({
        ...d,
        rows: d.rows.map((r) => (r._id === row._id ? { ...r, ...doc } : r)),
        counts:
          typeof body.contacted === 'boolean'
            ? {
                ...d.counts,
                contacted: d.counts.contacted + (body.contacted ? 1 : -1),
                todo: d.counts.todo + (body.contacted ? -1 : 1),
              }
            : d.counts,
      }));
      return true;
    } catch (e) {
      showToast('error', e.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row) => {
    if (!(await confirm({ title: 'এই সারিটা মুছবেন?', message: `${row.name || ''} ${row.phone || ''}`, confirmText: 'মুছুন', danger: true }))) return;
    try {
      await call(`/${row._id}`, 'DELETE');
      load();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const rows = data?.rows || [];
  const counts = data?.counts || { total: 0, todo: 0, contacted: 0, withPhone: 0 };

  const downloadCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['last_visit', 'name', 'phone', 'email', 'college', 'address', 'books', 'payment', 'coupon', 'visits', 'called', 'note'];
    const lines = rows.map((r) =>
      [
        new Date(r.lastSeenAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
        r.name, r.phone || r.typedPhone, r.email, r.collegeName, r.address, r.quantity,
        r.payMode === 'gateway' ? 'online' : r.payMode, r.couponCode, r.attempts, r.contacted ? 'yes' : 'no', r.note,
      ].map(esc).join(',')
    );
    const url = URL.createObjectURL(new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `incomplete-orders-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pickDate = (key) => {
    setLoading(true);
    setDatePreset(key);
    if (key !== 'custom') setCustom({ from: '', to: '' });
  };

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      {toastNode}
      {confirmNode}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-dash-ink2">
          <FiUserX className="text-brand" /> Incomplete Orders
        </h1>
        <div className="flex gap-2">
          <button onClick={downloadCsv} disabled={!rows.length} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft disabled:opacity-50">
            <FiDownload /> CSV
          </button>
          <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* One bar (23 Oct 2026, the shop): Today and Tomorrow on it, every other
          choice under "Sort by", and the search. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dash-line bg-dash-card px-3 py-2.5">
        <Segmented>
          {DATES.filter((d) => QUICK_DATES.includes(d.key)).map((d) => {
            const r = d.range(today);
            const isLive = !!r && r[1] === live;
            return (
              <SegBtn key={d.key} on={datePreset === d.key} onClick={() => pickDate(d.key)}>
                {d.label}
                {isLive && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle motion-safe:animate-pulse" title="নতুন যারা আসছে তারা এখানে" />}
              </SegBtn>
            );
          })}
        </Segmented>

        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              sortOpen || !QUICK_DATES.includes(datePreset) || status !== 'all' || college || contact
                ? 'border-brand text-brand'
                : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
            }`}
          >
            <FiSliders /> Sort by <FiChevronDown className={sortOpen ? 'rotate-180' : ''} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute left-0 z-40 mt-2 w-[320px] max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-dash-line bg-dash-card p-3 shadow-xl">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">তারিখ</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DATES.filter((d) => !QUICK_DATES.includes(d.key)).map((d) => (
                      <Chip key={d.key} on={datePreset === d.key} onClick={() => pickDate(d.key)}>{d.label}</Chip>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-dash-mute">
                    <input type="date" className={`min-w-0 flex-1 rounded-lg border bg-dash-card px-2 py-1 text-xs ${datePreset === 'custom' ? 'border-brand' : 'border-dash-line'}`} value={custom.from}
                      onChange={(e) => { setLoading(true); setCustom((c) => ({ ...c, from: e.target.value })); setDatePreset('custom'); }} />
                    থেকে
                    <input type="date" className={`min-w-0 flex-1 rounded-lg border bg-dash-card px-2 py-1 text-xs ${datePreset === 'custom' ? 'border-brand' : 'border-dash-line'}`} value={custom.to}
                      onChange={(e) => { setLoading(true); setCustom((c) => ({ ...c, to: e.target.value })); setDatePreset('custom'); }} />
                  </div>
                </div>
                {role !== 'manager' && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">দিন শুরু হয়</p>
                    <div className="flex items-center gap-1.5 text-xs text-dash-mute">
                      <select value={cutoff} onChange={(e) => changeCutoff(Number(e.target.value))}
                        className="rounded-lg border border-dash-line bg-dash-card px-2 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand">
                        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                      </select>
                      <span>→ পরের দিন একই সময় (Book Orders-ও)</span>
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">অবস্থা</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <Chip key={s.key} on={status === s.key} onClick={() => { setLoading(true); setStatus(s.key); }}>
                        {s.label} <span className="tabular-nums opacity-70">{Math.max(0, s.count(counts) || 0)}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <select className={input} value={college} onChange={(e) => { setLoading(true); setCollege(e.target.value); }}>
                    <option value="">সব মেডিকেল কলেজ</option>
                    {(data?.colleges || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className={input} value={contact} onChange={(e) => { setLoading(true); setContact(e.target.value); }}>
                    <option value="">নম্বর থাকুক বা না থাকুক</option>
                    <option value="yes">যাদের নম্বর আছে</option>
                    <option value="no">যাদের নম্বর নেই</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {shownWindow && <span className="text-xs text-dash-mute">{fmtWindow(shownWindow)}</span>}

        <div className="relative ml-auto w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input className={`${input} pl-9`} placeholder="নাম, নম্বর, কলেজ বা ঠিকানা" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <p className="text-xs text-dash-mute">
        <b className="text-dash-ink2">{counts.total}</b> জন · অর্ডার হয়নি <b className="text-amber-600">{counts.open ?? 0}</b> · কল বাকি <b className="text-red-600">{Math.max(0, counts.todo || 0)}</b> · পরে অর্ডার করেছে <b className="text-emerald-600">{counts.ordered ?? 0}</b>
        {role === 'manager' && ' · আপনি শুধু সাম্প্রতিক দিনগুলো দেখতে পাবেন'}
      </p>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {/* The list */}
      <div className="overflow-hidden rounded-xl border border-dash-line bg-dash-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-dash-soft text-left text-[11px] font-semibold uppercase tracking-wide text-dash-mute">
              <tr>
                <th className="w-10 px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">শেষ এসেছে</th>
                <th className="px-3 py-2.5">নাম</th>
                <th className="px-3 py-2.5">মোবাইল / WhatsApp</th>
                <th className="px-3 py-2.5">ইমেইল</th>
                <th className="px-3 py-2.5">মেডিকেল কলেজ</th>
                <th className="px-3 py-2.5">ঠিকানা</th>
                <th className="px-3 py-2.5 text-center">বই</th>
                <th className="px-3 py-2.5">পেমেন্ট</th>
                <th className="px-3 py-2.5 text-center">কয়বার</th>
                <th className="px-3 py-2.5">ফলো-আপ</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-line/60">
              {loading && !data ? (
                <tr><td colSpan={12} className="py-14 text-center"><FiLoader className="inline animate-spin text-xl text-brand" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={12} className="py-14 text-center text-sm text-dash-mute">এই ফিল্টারে কেউ নেই।</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r._id} className={`align-top transition-colors hover:bg-dash-soft/60 ${r.status === 'ordered' ? 'bg-emerald-50/50' : r.contacted ? 'bg-dash-soft/30' : ''}`}>
                    <td className="px-3 py-3 text-xs tabular-nums text-dash-mute2">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <p className="text-dash-ink3">{fmtDate(r.lastSeenAt)}, {fmtTime(r.lastSeenAt)}</p>
                      <p className="text-[11px] text-dash-mute2">{ago(r.lastSeenAt)}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold text-dash-ink2">{r.name || <Dash />}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {r.phone ? (
                        <div className="flex items-center gap-2">
                          <a href={`tel:${r.phone}`} className="font-mono text-dash-ink2 hover:text-brand">{r.phone}</a>
                          <a href={`tel:${r.phone}`} className="rounded-md p-1 text-brand hover:bg-brand-soft" aria-label="Call"><FiPhone /></a>
                          <a href={`https://wa.me/88${r.phone}`} target="_blank" rel="noreferrer" className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50" aria-label="WhatsApp"><FaWhatsapp /></a>
                        </div>
                      ) : r.typedPhone ? (
                        <span className="font-mono text-amber-600" title="পুরো নম্বর লেখেনি">{r.typedPhone}… <span className="font-sans text-[10px]">অসম্পূর্ণ</span></span>
                      ) : (
                        <Dash />
                      )}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-3 text-dash-ink3" title={r.email || ''}>{r.email || <Dash />}</td>
                    <td className="max-w-[200px] px-3 py-3 text-dash-ink3">{r.collegeName || <Dash />}</td>
                    <td className="max-w-[220px] px-3 py-3 text-dash-ink3"><span className="line-clamp-2" title={r.address || ''}>{r.address || <Dash />}</span></td>
                    <td className="px-3 py-3 text-center tabular-nums text-dash-ink3">{r.quantity || 1}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">
                      {r.payMode ? (
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${r.payMode === 'gateway' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>
                          {r.payMode === 'gateway' ? 'অনলাইন' : 'COD'}
                        </span>
                      ) : <Dash />}
                      {r.couponCode && <p className="mt-1 font-mono text-[11px] text-dash-mute">🎟 {r.couponCode}</p>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.attempts > 1 ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{r.attempts} বার</span>
                      ) : (
                        <span className="text-xs text-dash-mute2">১ বার</span>
                      )}
                    </td>
                    <td className="min-w-[260px] px-3 py-3">
                      {/* Ordered later: a badge instead of the call button. */}
                      <div className="flex items-center gap-2">
                      {r.status === 'ordered' ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700" title={r.orderNumber || ''}>
                          <FiCheckCircle /> অর্ডার কনফার্ম করেছে{r.order?.orderSeq ? ` #${r.order.orderSeq}` : ''}
                        </span>
                      ) : (
                      <button onClick={() => patch(r, { contacted: !r.contacted })} disabled={busyId === r._id}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${r.contacted ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-dash-line text-dash-ink3 hover:border-brand hover:text-brand'}`}>
                        {busyId === r._id ? <FiLoader className="animate-spin" /> : r.contacted ? <FiCheck /> : <FiPhone />}
                        {r.contacted ? 'কল করেছি' : 'কল বাকি'}
                      </button>
                      )}
                      {noteFor?.id === r._id ? (
                        <div className="flex min-w-0 flex-1 gap-1.5">
                          <input className="w-full rounded-md border border-dash-line bg-dash-card px-2 py-1 text-xs" value={noteFor.text} autoFocus
                            placeholder="যেমন: ধরেনি, কাল আবার"
                            onChange={(e) => setNoteFor({ ...noteFor, text: e.target.value })}
                            onKeyDown={async (e) => { if (e.key === 'Enter' && (await patch(r, { note: noteFor.text }))) setNoteFor(null); if (e.key === 'Escape') setNoteFor(null); }} />
                          <button onClick={async () => { if (await patch(r, { note: noteFor.text })) setNoteFor(null); }} className="rounded-md bg-brand px-2 text-xs font-semibold text-white">সেভ</button>
                        </div>
                      ) : (
                        <button onClick={() => setNoteFor({ id: r._id, text: r.note || '' })} className="flex min-w-0 max-w-[220px] items-start gap-1 text-left text-xs text-dash-mute hover:text-brand">
                          <FiEdit2 className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{r.note || 'নোট লিখুন'}</span>
                        </button>
                      )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {role === 'superAdmin' && (
                        <button onClick={() => remove(r)} className="rounded-md p-1.5 text-red-400 hover:bg-red-50" aria-label="Delete"><FiTrash2 /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length >= 1000 && <p className="text-center text-xs text-dash-mute">প্রথম ১০০০ জন দেখানো হচ্ছে — তারিখ ছোট করুন।</p>}
    </div>
  );
}

function Segmented({ children }) {
  return <div className="inline-flex flex-wrap rounded-lg border border-dash-line bg-dash-soft p-0.5">{children}</div>;
}

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? 'border-brand bg-brand text-white' : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'}`}>
      {children}
    </button>
  );
}

function SegBtn({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${on ? 'bg-dash-card text-brand shadow-sm' : 'text-dash-mute hover:text-dash-ink3'}`}>
      {children}
    </button>
  );
}

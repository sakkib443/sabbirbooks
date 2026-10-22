'use client';

/**
 * Accounts — income and expense, day by day.
 *
 *   Super Admin   "দোকানের হিসাব": the website's sales per day beside every shop
 *                 entry (an admin's too, marked with their name); and
 *                 "আমার নিজস্ব হিসাব": their own money, kept apart.
 *   admin         "আমার আয়-ব্যয়": only what they wrote themselves — daily
 *                 expenses, books sold by hand. Never the sales, never the
 *                 Super Admin's figures (23 Oct 2026).
 *
 * A day starts at Settings.ledgerDayStartHour (5 AM by default; the Super
 * Admin sets it under "Sort by") and runs to the same hour the next day. The
 * week starts on Saturday.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiDollarSign, FiDownload, FiEdit2, FiLoader, FiPlus, FiRefreshCw, FiSliders, FiTrash2, FiX } from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { DeliveryToggle, useDeliveryMode } from '@/components/admin/stats/OrderStats';
import { getStoredUser } from '@/lib/permissions';
import { addDays, bdDate, hourLabel } from '@/lib/shopDay';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const call = async (path, method = 'GET', body, base = '/ledger') => {
  const res = await fetch(`${API_BASE_URL}${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
};

const tk = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '−৳' : '৳') + Math.abs(v).toLocaleString('en-US');
};
const fmtDay = (d) => new Date(`${d}T00:00:00+06:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' });
const METHOD_LABEL = { cash: 'ক্যাশ', bkash: 'বিকাশ', nagad: 'নগদ', bank: 'ব্যাংক', other: 'অন্য' };
const input = 'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 focus:border-brand focus:outline-none';

/** The Accounts day an instant belongs to: it starts at hour h. */
const accountsDay = (h) => bdDate(new Date(Date.now() - h * 3600 * 1000));
/** Saturday on or before day d (the week starts on Saturday). */
const weekStart = (d) => {
  const dow = new Date(`${d}T00:00:00Z`).getUTCDay(); // Sun 0 … Sat 6
  return addDays(d, -((dow + 1) % 7));
};
const monthStart = (d) => `${d.slice(0, 8)}01`;

// "আজ" and "এই সপ্তাহ" on the bar; the rest under "Sort by" (23 Oct 2026).
const PRESETS = [
  { key: 'today', label: 'আজ', quick: true, range: (t) => [t, t] },
  { key: 'week', label: 'এই সপ্তাহ', quick: true, range: (t) => [weekStart(t), t] },
  { key: 'yesterday', label: 'গতকাল', range: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: 'lastweek', label: 'গত সপ্তাহ', range: (t) => [addDays(weekStart(t), -7), addDays(weekStart(t), -1)] },
  { key: 'month', label: 'এই মাস', range: (t) => [monthStart(t), t] },
  { key: 'lastmonth', label: 'গত মাস', range: (t) => { const end = addDays(monthStart(t), -1); return [monthStart(end), end]; } },
  { key: '30', label: '৩০ দিন', range: (t) => [addDays(t, -29), t] },
];

export default function AccountsPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [role] = useState(() => getStoredUser()?.role || '');
  const isOwner = role === 'superAdmin';
  const [book, setBook] = useState('shop'); // superAdmin: shop | personal
  const [mode, setMode] = useDeliveryMode();
  const withDelivery = mode === 'with';
  const [startHour, setStartHour] = useState(5);
  const today = accountsDay(startHour);
  const [preset, setPreset] = useState('today');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [sortOpen, setSortOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dayFilter, setDayFilter] = useState('');

  const range = useMemo(() => {
    if (preset === 'custom') {
      const a = custom.from || custom.to;
      const b = custom.to || custom.from;
      if (a) return a <= b ? [a, b] : [b, a];
    }
    return (PRESETS.find((p) => p.key === preset) || PRESETS[0]).range(today);
  }, [preset, custom, today]);

  const load = useCallback(async () => {
    try {
      const d = await call(`?from=${range[0]}&to=${range[1]}${isOwner ? `&book=${book}` : ''}`);
      setData(d);
      // The server's own day-start hour wins (it is the Settings value).
      if (Number.isInteger(d?.startHour)) setStartHour(d.startHour);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range, book, isOwner]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const pick = (key) => {
    setPreset(key);
    setLoading(true);
    setDayFilter('');
    if (key !== 'custom') setCustom({ from: '', to: '' });
  };

  const changeStartHour = async (h) => {
    const before = startHour;
    setStartHour(h);
    setLoading(true);
    try {
      await call('', 'PATCH', { ledgerDayStartHour: h }, '/settings');
      showToast('success', `দিন এখন ${hourLabel(h)} থেকে পরের দিন ${hourLabel(h)}`);
    } catch (e) {
      setStartHour(before);
      showToast('error', e.message);
    }
  };

  const hasSales = !!data?.sales;
  const salesOf = (r) => (withDelivery ? r.sales : r.sales - r.delivery);
  const earnedOf = (r) => (withDelivery ? r.earned : r.earned - r.earnedDelivery);

  const totals = useMemo(() => {
    const t = { orders: 0, sales: 0, earned: 0, income: 0, expense: 0 };
    for (const r of data?.days || []) {
      t.orders += r.orders;
      t.sales += salesOf(r);
      t.earned += earnedOf(r);
      t.income += r.income;
      t.expense += r.expense;
    }
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, withDelivery]);

  const byCategory = useMemo(() => {
    const m = new Map();
    for (const e of data?.entries || []) {
      if (e.type !== 'expense') continue;
      m.set(e.category, (m.get(e.category) || 0) + e.amount);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const entries = (data?.entries || []).filter((e) => !dayFilter || e.day === dayFilter);

  const openNew = (type) => setForm({ id: null, day: dayFilter || today, type, category: '', amount: '', method: 'cash', note: '' });
  const save = async () => {
    setSaving(true);
    try {
      const { id, ...body } = form;
      if (id) await call(`/${id}`, 'PATCH', body);
      else await call('', 'POST', { ...body, ...(isOwner ? { book } : {}) });
      showToast('success', 'সেভ হয়েছে');
      setForm(null);
      load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (e) => {
    if (!(await confirm({ title: 'এই হিসাবটা মুছবেন?', message: `${e.category} — ${tk(e.amount)}`, confirmText: 'মুছুন', danger: true }))) return;
    try {
      await call(`/${e._id}`, 'DELETE');
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const downloadCsv = () => {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = hasSales
      ? ['date', 'orders', withDelivery ? 'sales_with_delivery' : 'sales_without_delivery', 'in_hand', 'other_income', 'expense', 'net']
      : ['date', 'income', 'expense', 'net'];
    const lines = (data?.days || []).map((r) =>
      (hasSales
        ? [r.day, r.orders, salesOf(r), earnedOf(r), r.income, r.expense, salesOf(r) + r.income - r.expense]
        : [r.day, r.income, r.expense, r.income - r.expense]
      ).join(',')
    );
    const entryHead = ['', 'date', 'type', 'category', 'amount', 'method', 'note', 'by'];
    const entryLines = (data?.entries || []).map((e) =>
      ['', e.day, e.type, q(e.category), e.amount, e.method, q(e.note), q(nameOf(e.createdBy))].join(',')
    );
    const csv = '﻿' + [head.join(','), ...lines, '', entryHead.join(','), ...entryLines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${book}-${range[0]}-to-${range[1]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const net = (hasSales ? totals.sales : 0) + totals.income - totals.expense;
  const netInHand = totals.earned + totals.income - totals.expense;
  const title = isOwner ? 'আয়-ব্যয়' : 'আমার আয়-ব্যয়';
  const rangeText = range[0] === range[1] ? fmtDay(range[0]) : `${fmtDay(range[0])} → ${fmtDay(range[1])}`;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      {toastNode}
      {confirmNode}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-dash-ink2"><FiDollarSign className="text-brand" /> {title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {hasSales && <DeliveryToggle mode={mode} onChange={setMode} />}
          <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={downloadCsv} disabled={!data} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft disabled:opacity-50">
            <FiDownload /> CSV
          </button>
        </div>
      </div>

      {/* The Super Admin's two books */}
      {isOwner && (
        <div className="inline-flex rounded-xl border border-dash-line bg-dash-soft p-1">
          {[['shop', 'দোকানের হিসাব'], ['personal', 'আমার নিজস্ব হিসাব']].map(([k, t]) => (
            <button key={k} onClick={() => { setLoading(true); setDayFilter(''); setBook(k); }}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${book === k ? 'bg-dash-card text-brand shadow-sm' : 'text-dash-mute hover:text-dash-ink3'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dash-line bg-dash-card px-3 py-2.5">
        {PRESETS.filter((p) => p.quick).map((p) => (
          <button key={p.key} onClick={() => pick(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${preset === p.key ? 'bg-brand text-white shadow-sm' : 'text-dash-mute hover:bg-dash-soft hover:text-dash-ink3'}`}>
            {p.label}
          </button>
        ))}
        <div className="relative">
          <button onClick={() => setSortOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${sortOpen || !['today', 'week'].includes(preset) ? 'border-brand text-brand' : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'}`}>
            <FiSliders /> Sort by <FiChevronDown className={sortOpen ? 'rotate-180' : ''} />
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute left-0 z-40 mt-2 w-[300px] max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-dash-line bg-dash-card p-3 shadow-xl">
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.filter((p) => !p.quick).map((p) => (
                    <button key={p.key} onClick={() => { pick(p.key); setSortOpen(false); }}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${preset === p.key ? 'border-brand bg-brand text-white' : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-dash-mute">
                  <input type="date" className={`min-w-0 flex-1 rounded-lg border bg-dash-card px-2 py-1 text-xs ${preset === 'custom' ? 'border-brand' : 'border-dash-line'}`} value={custom.from}
                    onChange={(e) => { setLoading(true); setCustom((c) => ({ ...c, from: e.target.value })); setPreset('custom'); }} />
                  থেকে
                  <input type="date" className={`min-w-0 flex-1 rounded-lg border bg-dash-card px-2 py-1 text-xs ${preset === 'custom' ? 'border-brand' : 'border-dash-line'}`} value={custom.to}
                    onChange={(e) => { setLoading(true); setCustom((c) => ({ ...c, to: e.target.value })); setPreset('custom'); }} />
                </div>
                {isOwner && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">দিন শুরু হয়</p>
                    <div className="flex items-center gap-1.5 text-xs text-dash-mute">
                      <select value={startHour} onChange={(e) => changeStartHour(Number(e.target.value))}
                        className="rounded-lg border border-dash-line bg-dash-card px-2 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand">
                        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                      </select>
                      <span>→ পরের দিন একই সময়</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <span className="text-xs text-dash-mute">{rangeText}</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => openNew('income')} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><FiPlus /> আয়</button>
          <button onClick={() => openNew('expense')} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"><FiPlus /> খরচ</button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className={`grid grid-cols-2 gap-3 ${hasSales ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
        {hasSales && (
          <>
            <Card label="বিক্রি (অর্ডার)" value={tk(totals.sales)} note={`${totals.orders}টা অর্ডার · ${withDelivery ? 'ডেলিভারি সহ' : 'ডেলিভারি ছাড়া'}`} />
            <Card label="হাতে এসেছে" value={tk(totals.earned)} note="ডেলিভারি হয়েছে বা আগেই পেমেন্ট" />
          </>
        )}
        <Card label={hasSales ? 'অন্য আয়' : 'আয়'} value={tk(totals.income)} tone="text-emerald-600" />
        <Card label="খরচ" value={tk(totals.expense)} tone="text-red-600" />
        <Card label={hasSales ? 'নিট লাভ' : 'বাকি থাকল'} value={tk(net)} tone={net < 0 ? 'text-red-600' : 'text-emerald-700'} note={hasSales ? `হাতে আসা ধরে: ${tk(netInHand)}` : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="overflow-hidden rounded-xl border border-dash-line bg-dash-card">
          <p className="border-b border-dash-line px-4 py-2.5 text-sm font-bold text-dash-ink2">দিনভিত্তিক হিসাব</p>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dash-soft text-xs text-dash-mute">
                <tr>
                  <th className="px-3 py-2 text-left">দিন</th>
                  {hasSales && <th className="px-3 py-2 text-right">অর্ডার</th>}
                  {hasSales && <th className="px-3 py-2 text-right">বিক্রি</th>}
                  <th className="px-3 py-2 text-right">{hasSales ? 'অন্য আয়' : 'আয়'}</th>
                  <th className="px-3 py-2 text-right">খরচ</th>
                  <th className="px-3 py-2 text-right">নিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-line/60">
                {loading && !data ? (
                  <tr><td colSpan={6} className="py-10 text-center"><FiLoader className="inline animate-spin text-brand" /></td></tr>
                ) : (data?.days || []).map((r) => {
                  const n = (hasSales ? salesOf(r) : 0) + r.income - r.expense;
                  const empty = !r.orders && !r.income && !r.expense;
                  return (
                    <tr key={r.day} onClick={() => setDayFilter(dayFilter === r.day ? '' : r.day)}
                      className={`cursor-pointer hover:bg-dash-soft ${dayFilter === r.day ? 'bg-brand-soft' : ''} ${empty ? 'text-dash-mute2' : 'text-dash-ink3'}`}>
                      <td className="px-3 py-2">{fmtDay(r.day)}{r.day === today && <span className="ml-1.5 rounded bg-brand px-1.5 text-[10px] text-white">আজ</span>}</td>
                      {hasSales && <td className="px-3 py-2 text-right tabular-nums">{r.orders || '—'}</td>}
                      {hasSales && <td className="px-3 py-2 text-right tabular-nums">{r.orders ? tk(salesOf(r)) : '—'}</td>}
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{r.income ? tk(r.income) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">{r.expense ? tk(r.expense) : '—'}</td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${n < 0 ? 'text-red-600' : ''}`}>{empty ? '—' : tk(n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-dash-line bg-dash-card">
            <div className="flex items-center justify-between border-b border-dash-line px-4 py-2.5">
              <p className="text-sm font-bold text-dash-ink2">{dayFilter ? `${fmtDay(dayFilter)}-এর হিসাব` : 'সব আয়-খরচ'}</p>
              {dayFilter && <button onClick={() => setDayFilter('')} className="text-xs text-brand hover:underline">সব দেখুন</button>}
            </div>
            <div className="max-h-[360px] divide-y divide-dash-line/60 overflow-auto">
              {entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-dash-mute">কিছু লেখা নেই।</p>
              ) : entries.map((e) => (
                <div key={e._id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-dash-ink3">{e.category}{e.note && <span className="text-dash-mute"> — {e.note}</span>}</p>
                    <p className="text-[11px] text-dash-mute2">
                      {fmtDay(e.day)} · {METHOD_LABEL[e.method] || e.method}
                      {isOwner && e.createdBy?.role && e.createdBy.role !== 'superAdmin' && <span className="text-amber-600"> · লিখেছেন {nameOf(e.createdBy)}</span>}
                    </p>
                  </div>
                  <p className={`font-semibold tabular-nums ${e.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>{e.type === 'expense' ? '−' : '+'}{tk(e.amount)}</p>
                  <button onClick={() => setForm({ id: e._id, day: e.day, type: e.type, category: e.category, amount: e.amount, method: e.method, note: e.note })} className="rounded p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Edit"><FiEdit2 /></button>
                  {isOwner && <button onClick={() => remove(e)} className="rounded p-1.5 text-red-400 hover:bg-red-50" aria-label="Remove"><FiTrash2 /></button>}
                </div>
              ))}
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="rounded-xl border border-dash-line bg-dash-card px-4 py-3">
              <p className="mb-2 text-sm font-bold text-dash-ink2">কোন খাতে কত খরচ</p>
              <div className="space-y-1.5">
                {byCategory.map(([cat, amt]) => (
                  <div key={cat} className="text-sm">
                    <div className="flex justify-between text-dash-ink3"><span>{cat}</span><span className="tabular-nums">{tk(amt)}</span></div>
                    <div className="mt-0.5 h-1.5 rounded bg-dash-soft"><div className="h-1.5 rounded bg-red-400" style={{ width: `${Math.max(2, (amt / byCategory[0][1]) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-10" onClick={() => setForm(null)}>
          <div className="w-full max-w-md rounded-2xl bg-dash-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-dash-line px-5 py-3">
              <h2 className="font-bold text-dash-ink2">
                {form.id ? 'হিসাব এডিট' : form.type === 'expense' ? 'নতুন খরচ' : 'নতুন আয়'}
                {isOwner && <span className="ml-2 text-xs font-normal text-dash-mute">({book === 'personal' ? 'নিজস্ব' : 'দোকান'})</span>}
              </h2>
              <button onClick={() => setForm(null)} className="rounded-lg p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Close"><FiX /></button>
            </div>
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-2">
                {[['expense', 'খরচ'], ['income', 'আয়']].map(([k, t]) => (
                  <button key={k} onClick={() => setForm({ ...form, type: k })}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.type === k ? (k === 'expense' ? 'border-red-400 bg-red-50 text-red-600' : 'border-emerald-400 bg-emerald-50 text-emerald-700') : 'border-dash-line text-dash-ink3'}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-dash-mute">তারিখ</label><input type="date" className={input} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-dash-mute">টাকা (৳) *</label><input className={input} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus /></div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dash-mute">{form.type === 'income' ? 'কোথা থেকে' : 'কোন খাতে'}</label>
                <input className={input} list="ledger-cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="বেছে নিন বা লিখুন" />
                <datalist id="ledger-cats">{(data?.categories?.[form.type] || []).map((c) => <option key={c} value={c} />)}</datalist>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(data?.categories?.[form.type] || []).slice(0, 8).map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${form.category === c ? 'border-brand text-brand' : 'border-dash-line text-dash-mute'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dash-mute">কীভাবে</label>
                <select className={input} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {Object.entries(METHOD_LABEL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-semibold text-dash-mute">নোট</label><input className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setForm(null)} className="rounded-lg border border-dash-line px-4 py-2 text-sm text-dash-ink3 hover:bg-dash-soft">বন্ধ</button>
                <button onClick={save} disabled={saving || !form.amount} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                  {saving && <FiLoader className="animate-spin" />} সেভ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const nameOf = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

function Card({ label, value, note, tone = 'text-dash-ink' }) {
  return (
    <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold text-dash-mute2">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-dash-mute2">{note}</p>}
    </div>
  );
}

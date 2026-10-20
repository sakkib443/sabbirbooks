'use client';

/**
 * Accounts — income and expense, day by day (20 Oct 2026). Super Admin only.
 *
 * Each shop day (noon → noon, like Book Orders) shows the orders' sales — from
 * the orders themselves, the dashboard's rule — beside the money typed in here
 * by hand: other income, and every expense (printing, paper, courier, ads,
 * salaries…). "Net" is sales + other income − expense; "in hand" counts only
 * the sales already collected (delivered or paid).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiDollarSign, FiDownload, FiEdit2, FiLoader, FiPlus, FiRefreshCw, FiTrash2, FiX } from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { DeliveryToggle, useDeliveryMode } from '@/components/admin/stats/OrderStats';
import { addDays, dayOf } from '@/lib/shopDay';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API_BASE_URL}/ledger${path}`, {
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

const monthStart = (d) => `${d.slice(0, 8)}01`;
const PRESETS = [
  { key: 'month', label: 'এই মাস', range: (t) => [monthStart(t), t] },
  { key: 'last', label: 'গত মাস', range: (t) => { const end = addDays(monthStart(t), -1); return [monthStart(end), end]; } },
  { key: '7', label: '৭ দিন', range: (t) => [addDays(t, -6), t] },
  { key: '30', label: '৩০ দিন', range: (t) => [addDays(t, -29), t] },
  { key: 'today', label: 'আজ', range: (t) => [t, t] },
];

export default function AccountsPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [mode, setMode] = useDeliveryMode();
  const withDelivery = mode === 'with';
  // The shop day now — after the cutoff, new orders already count for tomorrow.
  const [today] = useState(() => dayOf(new Date()));
  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState(() => PRESETS[0].range(dayOf(new Date())));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // { id|null, day, type, category, amount, method, note }
  const [saving, setSaving] = useState(false);
  const [dayFilter, setDayFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await call(`?from=${range[0]}&to=${range[1]}`);
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const pick = (p) => {
    setPreset(p.key);
    setLoading(true);
    setDayFilter('');
    setRange(p.range(today));
  };

  // Sales for a day, with or without the delivery charge inside them.
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
      else await call('', 'POST', body);
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
    const head = ['date', 'orders', withDelivery ? 'sales_with_delivery' : 'sales_without_delivery', 'in_hand', 'other_income', 'expense', 'net'];
    const lines = (data?.days || []).map((r) => [r.day, r.orders, salesOf(r), earnedOf(r), r.income, r.expense, salesOf(r) + r.income - r.expense].join(','));
    const entryHead = ['', 'date', 'type', 'category', 'amount', 'method', 'note'];
    const entryLines = (data?.entries || []).map((e) => ['', e.day, e.type, `"${String(e.category).replace(/"/g, '""')}"`, e.amount, e.method, `"${String(e.note || '').replace(/"/g, '""')}"`].join(','));
    const csv = '﻿' + [head.join(','), ...lines, '', entryHead.join(','), ...entryLines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${range[0]}-to-${range[1]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const net = totals.sales + totals.income - totals.expense;
  const netInHand = totals.earned + totals.income - totals.expense;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      {toastNode}
      {confirmNode}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-dash-ink2"><FiDollarSign className="text-brand" /> আয়-ব্যয়</h1>
          <p className="mt-0.5 text-sm text-dash-mute">প্রতিদিনের বিক্রি (অর্ডার থেকে), অন্য আয় আর খরচ — দিন দুপুর ১২টা থেকে ১২টা, Book Orders-এর মতো।</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeliveryToggle mode={mode} onChange={setMode} />
          <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={downloadCsv} disabled={!data} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft disabled:opacity-50">
            <FiDownload /> CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dash-line bg-dash-card px-3 py-2.5">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => pick(p)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${preset === p.key ? 'border-brand bg-brand text-white' : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'}`}>
            {p.label}
          </button>
        ))}
        <span className="ml-1 flex items-center gap-1.5 text-xs text-dash-mute">
          <input type="date" className="rounded-lg border border-dash-line bg-dash-card px-2 py-1 text-xs" value={range[0]}
            onChange={(e) => { if (e.target.value) { setPreset('custom'); setLoading(true); setRange([e.target.value, range[1]]); } }} />
          থেকে
          <input type="date" className="rounded-lg border border-dash-line bg-dash-card px-2 py-1 text-xs" value={range[1]}
            onChange={(e) => { if (e.target.value) { setPreset('custom'); setLoading(true); setRange([range[0], e.target.value]); } }} />
        </span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => openNew('income')} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><FiPlus /> আয়</button>
          <button onClick={() => openNew('expense')} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"><FiPlus /> খরচ</button>
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card label="বিক্রি (অর্ডার)" value={tk(totals.sales)} note={`${totals.orders}টা অর্ডার · ${withDelivery ? 'ডেলিভারি সহ' : 'ডেলিভারি ছাড়া'}`} />
        <Card label="হাতে এসেছে" value={tk(totals.earned)} note="ডেলিভারি হয়েছে বা আগেই পেমেন্ট" />
        <Card label="অন্য আয়" value={tk(totals.income)} tone="text-emerald-600" />
        <Card label="খরচ" value={tk(totals.expense)} tone="text-red-600" />
        <Card label="নিট লাভ" value={tk(net)} tone={net < 0 ? 'text-red-600' : 'text-emerald-700'} note={`হাতে আসা ধরে: ${tk(netInHand)}`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="overflow-hidden rounded-xl border border-dash-line bg-dash-card">
          <p className="border-b border-dash-line px-4 py-2.5 text-sm font-bold text-dash-ink2">দিনভিত্তিক হিসাব <span className="font-normal text-dash-mute">(দিনে ক্লিক করলে সেদিনের খরচগুলো)</span></p>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dash-soft text-xs text-dash-mute">
                <tr>
                  <th className="px-3 py-2 text-left">দিন</th>
                  <th className="px-3 py-2 text-right">অর্ডার</th>
                  <th className="px-3 py-2 text-right">বিক্রি</th>
                  <th className="px-3 py-2 text-right">অন্য আয়</th>
                  <th className="px-3 py-2 text-right">খরচ</th>
                  <th className="px-3 py-2 text-right">নিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-line/60">
                {loading && !data ? (
                  <tr><td colSpan={6} className="py-10 text-center"><FiLoader className="inline animate-spin text-brand" /></td></tr>
                ) : (data?.days || []).map((r) => {
                  const n = salesOf(r) + r.income - r.expense;
                  const empty = !r.orders && !r.income && !r.expense;
                  return (
                    <tr key={r.day} onClick={() => setDayFilter(dayFilter === r.day ? '' : r.day)}
                      className={`cursor-pointer hover:bg-dash-soft ${dayFilter === r.day ? 'bg-brand-soft' : ''} ${empty ? 'text-dash-mute2' : 'text-dash-ink3'}`}>
                      <td className="px-3 py-2">{fmtDay(r.day)}{r.day === today && <span className="ml-1.5 rounded bg-brand px-1.5 text-[10px] text-white">আজ</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.orders || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.orders ? tk(salesOf(r)) : '—'}</td>
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
                    <p className="text-[11px] text-dash-mute2">{fmtDay(e.day)} · {METHOD_LABEL[e.method] || e.method}</p>
                  </div>
                  <p className={`font-semibold tabular-nums ${e.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>{e.type === 'expense' ? '−' : '+'}{tk(e.amount)}</p>
                  <button onClick={() => setForm({ id: e._id, day: e.day, type: e.type, category: e.category, amount: e.amount, method: e.method, note: e.note })} className="rounded p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Edit"><FiEdit2 /></button>
                  <button onClick={() => remove(e)} className="rounded p-1.5 text-red-400 hover:bg-red-50" aria-label="Remove"><FiTrash2 /></button>
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
              <h2 className="font-bold text-dash-ink2">{form.id ? 'হিসাব এডিট' : form.type === 'expense' ? 'নতুন খরচ' : 'নতুন আয়'}</h2>
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
                <label className="mb-1 block text-xs font-semibold text-dash-mute">খাত</label>
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

function Card({ label, value, note, tone = 'text-dash-ink' }) {
  return (
    <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold text-dash-mute2">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-dash-mute2">{note}</p>}
    </div>
  );
}

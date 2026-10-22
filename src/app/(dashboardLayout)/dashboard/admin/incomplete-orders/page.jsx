'use client';

/**
 * Incomplete Orders (22 Oct 2026).
 *
 * People who typed something on the checkout — a name, a number, a college —
 * and did not order. One row per phone number (or email); `attempts` is how
 * many separate visits that number made. When the same number later orders,
 * the row turns "অর্ডার করেছে" by itself. The shop calls the rest: "কল
 * করেছি" and a note keep track of who has been called.
 *
 * Days are the shop's days (noon → noon, lib/shopDay), by the last visit.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiUserX, FiRefreshCw, FiLoader, FiSearch, FiPhone, FiCheck, FiTrash2, FiEdit2, FiMapPin, FiBookOpen, FiTag,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { getStoredUser } from '@/lib/permissions';
import { addDays, dayOf, dayWindow } from '@/lib/shopDay';

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

const when = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
    : '—';
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'এইমাত্র';
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  return `${Math.round(h / 24)} দিন আগে`;
};
const waLink = (phone) => `https://wa.me/88${phone}`;

const DATES = [
  { key: 'today', label: 'আজ', range: (t) => [t, t] },
  { key: 'yesterday', label: 'গতকাল', range: (t) => [addDays(t, -1), addDays(t, -1)] },
  { key: '7', label: '৭ দিন', range: (t) => [addDays(t, -6), t] },
  { key: '30', label: '৩০ দিন', range: (t) => [addDays(t, -29), t] },
  { key: 'all', label: 'সব', range: () => null },
];
const STATUSES = [
  { key: 'all', label: 'সব', count: (c) => c.total },
  { key: 'open', label: 'অর্ডার হয়নি', count: (c) => c.open },
  { key: 'todo', label: 'কল বাকি', count: (c) => c.open - c.contacted },
  { key: 'contacted', label: 'কল করেছি', count: (c) => c.contacted },
  { key: 'ordered', label: 'পরে অর্ডার করেছে', count: (c) => c.ordered },
];
const ORDER_STATUS = { pending: 'পেন্ডিং', processing: 'কনফার্ম', shipped: 'কুরিয়ারে', delivered: 'ডেলিভারি হয়েছে', cancelled: 'বাতিল' };

const input = 'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 focus:border-brand focus:outline-none';

export default function IncompleteOrdersPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [role] = useState(() => getStoredUser()?.role || '');
  const [today] = useState(() => dayOf(new Date()));
  const [datePreset, setDatePreset] = useState('7');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [status, setStatus] = useState('open');
  const [contact, setContact] = useState('');
  const [college, setCollege] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, after a pause
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteFor, setNoteFor] = useState(null); // { id, text }
  const [busyId, setBusyId] = useState(null);

  // Searching waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    let days = null;
    if (datePreset === 'custom') {
      if (custom.from && custom.to) days = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
    } else {
      days = DATES.find((d) => d.key === datePreset)?.range(today) || null;
    }
    if (days) {
      const w = dayWindow(days[0], days[1]);
      p.set('from', w.from.toISOString());
      p.set('to', w.to.toISOString());
    }
    if (status !== 'all') p.set('status', status);
    if (contact) p.set('contact', contact);
    if (college) p.set('college', college);
    if (query) p.set('q', query);
    return p.toString();
  }, [datePreset, custom, today, status, contact, college, query]);

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
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r._id === row._id ? { ...r, ...doc } : r)) }));
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
      setData((d) => ({ ...d, rows: d.rows.filter((r) => r._id !== row._id) }));
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const counts = data?.counts || { total: 0, open: 0, ordered: 0, contacted: 0 };
  const rows = data?.rows || [];

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      {toastNode}
      {confirmNode}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-dash-ink2">
            <FiUserX className="text-brand" /> Incomplete Orders
          </h1>
          <p className="mt-0.5 text-sm text-dash-mute">চেকআউটে লিখেছে কিন্তু অর্ডার করেনি — একই নম্বর কয়বার এসেছে সহ।</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft">
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="মোট" value={counts.total} />
        <Card label="অর্ডার হয়নি" value={counts.open} tone="text-amber-600" />
        <Card label="কল বাকি" value={Math.max(0, counts.open - counts.contacted)} tone="text-red-600" />
        <Card label="পরে অর্ডার করেছে" value={counts.ordered} tone="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="space-y-2.5 rounded-xl border border-dash-line bg-dash-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {DATES.map((d) => (
            <Chip key={d.key} on={datePreset === d.key} onClick={() => { setLoading(true); setDatePreset(d.key); }}>{d.label}</Chip>
          ))}
          <span className="ml-1 flex items-center gap-1.5 text-xs text-dash-mute">
            <input type="date" className="rounded-lg border border-dash-line bg-dash-card px-2 py-1 text-xs" value={custom.from}
              onChange={(e) => { setCustom((c) => ({ ...c, from: e.target.value })); setDatePreset('custom'); }} />
            থেকে
            <input type="date" className="rounded-lg border border-dash-line bg-dash-card px-2 py-1 text-xs" value={custom.to}
              onChange={(e) => { setCustom((c) => ({ ...c, to: e.target.value })); setDatePreset('custom'); }} />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => (
            <Chip key={s.key} on={status === s.key} onClick={() => { setLoading(true); setStatus(s.key); }}>
              {s.label} <span className="opacity-70">({Math.max(0, s.count(counts))})</span>
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
            <input className={`${input} pl-9`} placeholder="নাম, নম্বর, কলেজ বা ঠিকানা" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={input} value={college} onChange={(e) => { setLoading(true); setCollege(e.target.value); }}>
            <option value="">সব কলেজ</option>
            {(data?.colleges || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={input} value={contact} onChange={(e) => { setLoading(true); setContact(e.target.value); }}>
            <option value="">নম্বর থাকুক বা না থাকুক</option>
            <option value="yes">শুধু নম্বর আছে</option>
            <option value="no">নম্বর নেই</option>
          </select>
        </div>
        {role === 'manager' && <p className="text-[11px] text-dash-mute">আপনি শুধু সাম্প্রতিক দিনগুলো দেখতে পাবেন।</p>}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading && !data ? (
        <div className="flex justify-center py-16"><FiLoader className="animate-spin text-2xl text-brand" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dash-line bg-dash-card py-14 text-center text-sm text-dash-mute">এই ফিল্টারে কিছু নেই।</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {rows.map((r) => (
            <div key={r._id} className={`flex flex-col gap-2 rounded-xl border bg-dash-card p-4 shadow-sm ${r.status === 'ordered' ? 'border-emerald-200' : r.contacted ? 'border-dash-line' : 'border-amber-200'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-dash-ink2">{r.name || <span className="font-normal italic text-dash-mute">নাম দেয়নি</span>}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
                    {r.phone ? (
                      <>
                        <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 font-mono text-brand hover:underline"><FiPhone /> {r.phone}</a>
                        <a href={waLink(r.phone)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700" aria-label="WhatsApp"><FaWhatsapp /></a>
                      </>
                    ) : r.typedPhone ? (
                      <span className="font-mono text-dash-mute">{r.typedPhone}… <span className="font-sans text-[11px]">(অসম্পূর্ণ নম্বর)</span></span>
                    ) : (
                      <span className="text-xs italic text-dash-mute">নম্বর দেয়নি</span>
                    )}
                    {r.email && <span className="text-xs text-dash-mute">{r.email}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.attempts > 1 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600" title="কয়বার চেকআউটে এসেছে">{r.attempts} বার এসেছে</span>
                  )}
                  {r.status === 'ordered' ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      অর্ডার করেছে{r.order?.orderSeq ? ` #${r.order.orderSeq}` : ''}{r.order?.status ? ` · ${ORDER_STATUS[r.order.status] || r.order.status}` : ''}
                    </span>
                  ) : r.contacted ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">কল করেছি</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">অর্ডার হয়নি</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dash-ink3">
                {r.collegeName && <span className="inline-flex items-center gap-1">🎓 {r.collegeName}</span>}
                {r.address && <span className="inline-flex items-center gap-1"><FiMapPin className="text-dash-mute" /> {r.address}</span>}
                <span className="inline-flex items-center gap-1"><FiBookOpen className="text-dash-mute" /> {r.quantity || 1}টা বই</span>
                {r.payMode && <span>{r.payMode === 'cod' ? 'ক্যাশ অন ডেলিভারি' : 'এখনই পেমেন্ট'}</span>}
                {r.couponCode && <span className="inline-flex items-center gap-1"><FiTag className="text-dash-mute" /> {r.couponCode}</span>}
              </div>

              <p className="text-[11px] text-dash-mute2">
                শেষ এসেছে {when(r.lastSeenAt)} ({ago(r.lastSeenAt)}){r.attempts > 1 ? ` · প্রথম ${when(r.firstSeenAt)}` : ''}
              </p>

              {noteFor?.id === r._id ? (
                <div className="flex gap-2">
                  <input className={input} value={noteFor.text} autoFocus placeholder="যেমন: কল ধরেনি, কাল আবার" onChange={(e) => setNoteFor({ ...noteFor, text: e.target.value })} />
                  <button onClick={async () => { if (await patch(r, { note: noteFor.text })) setNoteFor(null); }} disabled={busyId === r._id}
                    className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">সেভ</button>
                </div>
              ) : r.note ? (
                <p className="rounded-lg bg-dash-soft px-3 py-1.5 text-xs text-dash-ink3">📝 {r.note}</p>
              ) : null}

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-dash-line/60 pt-2.5">
                {r.status !== 'ordered' && (
                  <button onClick={() => patch(r, { contacted: !r.contacted })} disabled={busyId === r._id}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${r.contacted ? 'border border-dash-line text-dash-ink3 hover:bg-dash-soft' : 'bg-brand text-white hover:bg-brand-hover'}`}>
                    {busyId === r._id ? <FiLoader className="animate-spin" /> : <FiCheck />} {r.contacted ? 'কল করা হয়নি' : 'কল করেছি'}
                  </button>
                )}
                <button onClick={() => setNoteFor({ id: r._id, text: r.note || '' })}
                  className="flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-1.5 text-xs text-dash-ink3 hover:bg-dash-soft">
                  <FiEdit2 /> নোট
                </button>
                {r.contacted && r.contactedAt && <span className="text-[11px] text-dash-mute">কল: {when(r.contactedAt)}</span>}
                {role === 'superAdmin' && (
                  <button onClick={() => remove(r)} className="ml-auto rounded-lg p-1.5 text-red-400 hover:bg-red-50" aria-label="Delete"><FiTrash2 /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {rows.length >= 1000 && <p className="text-center text-xs text-dash-mute">প্রথম ১০০০টা দেখানো হচ্ছে — তারিখ ছোট করুন।</p>}
    </div>
  );
}

function Card({ label, value, tone = 'text-dash-ink' }) {
  return (
    <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold text-dash-mute2">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-brand bg-brand text-white' : 'border-dash-line bg-dash-card text-dash-ink3 hover:bg-dash-soft'}`}>
      {children}
    </button>
  );
}

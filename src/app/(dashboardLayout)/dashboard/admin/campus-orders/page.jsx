'use client';

/**
 * Campus Orders (20 Oct 2026).
 *
 * The shop writes to a batch's senior; the senior posts the shop's message in
 * the batch group and collects orders until a last date, with an extra
 * discount per book (sometimes free delivery, sometimes a free copy for the
 * senior). After the last date the senior says how many, the shop works out
 * the money and sends the parcel.
 *
 * Each row is one such deal. "অর্ডার তৈরি" turns it into a real order in Book
 * Orders (stock, packing list and sales run through that), and "কুরিয়ারে
 * পাঠান" hands that order to Steadfast. "কলেজ ও সিনিয়র" is the phone book of
 * every college's senior (or the ordinary student where the senior does not
 * take the books). The money is worked out on the server (campus.service).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiRefreshCw, FiLoader, FiX, FiEdit2, FiTrash2, FiTruck, FiCheckCircle, FiUsers, FiSearch, FiPhone, FiMapPin, FiGift,
} from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { getStoredUser } from '@/lib/permissions';
import { sendToCourier } from '@/components/admin/courier/courierApi';
import { bdDate } from '@/lib/shopDay';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API_BASE_URL}/campus${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
};

const tk = (n) => `৳${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const fmtDay = (d) => (d ? new Date(`${d}T00:00:00+06:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' }) : '—');
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);

const ROLE_LABEL = { senior: 'সিনিয়র', student: 'সাধারণ স্টুডেন্ট', other: 'অন্য' };
const ROLE_STYLE = {
  senior: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  student: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

// One status per row: the deal's own until the order exists, the order's after.
const stageOf = (d) => {
  if (d.order) {
    const s = d.order.status;
    if (s === 'delivered') return 'delivered';
    if (s === 'shipped') return 'shipped';
    if (s === 'cancelled') return 'cancelled';
    return 'ordered';
  }
  return d.status === 'cancelled' ? 'cancelled' : d.status === 'collecting' ? 'collecting' : 'contacted';
};
const STAGES = [
  { key: 'all', label: 'সব' },
  { key: 'contacted', label: 'যোগাযোগ হয়েছে', cls: 'bg-slate-50 text-slate-700 border-slate-200' },
  { key: 'collecting', label: 'অর্ডার নিচ্ছে', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'ordered', label: 'অর্ডার হয়েছে', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'shipped', label: 'কুরিয়ারে', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'delivered', label: 'ডেলিভারি হয়েছে', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'cancelled', label: 'বাতিল', cls: 'bg-red-50 text-red-600 border-red-200' },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const input = 'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 focus:border-brand focus:outline-none';
const label = 'mb-1 block text-xs font-semibold text-dash-mute';

const EMPTY = {
  collegeName: '', college: '', contact: { name: '', phone: '', role: 'senior' }, batch: '',
  book: '', quantity: '', unitPrice: '', extraDiscount: '', giftAbove: '', freeBooks: '', freeDelivery: false, deliveryCharge: '',
  payment: 'cod', contactedOn: '', deadline: '', shipOn: '', address: '', note: '', status: 'contacted',
};

export default function CampusOrdersPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [role] = useState(() => getStoredUser()?.role || '');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('all');
  const [q, setQ] = useState('');
  const [colleges, setColleges] = useState([]);
  const [books, setBooks] = useState([]);
  const [editing, setEditing] = useState(null); // { id|null, form }
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [bookOpen, setBookOpen] = useState(false);
  const today = bdDate(new Date());

  const load = useCallback(async () => {
    try {
      const [list, dir] = await Promise.all([call('/orders'), call('/contacts')]);
      setRows(list || []);
      setColleges(dir || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    fetch(`${API_BASE_URL}/books`)
      .then((r) => r.json())
      .then((j) => {
        const list = Array.isArray(j?.data) ? j.data : j?.data?.books || [];
        setBooks(list.filter((b) => b.format === 'printed'));
      })
      .catch(() => {});
    return () => clearTimeout(t);
  }, [load]);

  const isOwner = role === 'superAdmin';

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((d) => {
      if (stage !== 'all' && stageOf(d) !== stage) return false;
      if (!needle) return true;
      return [d.collegeName, d.contact?.name, d.contact?.phone, d.batch].some((v) => String(v || '').toLowerCase().includes(needle));
    });
  }, [rows, stage, q]);

  const counts = useMemo(() => {
    const c = {};
    for (const d of rows) c[stageOf(d)] = (c[stageOf(d)] || 0) + 1;
    return c;
  }, [rows]);
  const overdue = rows.filter((d) => !d.order && d.status !== 'cancelled' && d.deadline && d.deadline < today).length;
  const copies = rows.filter((d) => d.order && d.order.status !== 'cancelled').reduce((s, d) => s + (d.quantity || 0) + (d.freeBooks || 0), 0);
  const value = rows.filter((d) => d.order && d.order.status !== 'cancelled').reduce((s, d) => s + (d.total || 0), 0);

  // ── Edit / new ──
  const openNew = (preset = {}) => setEditing({ id: null, placed: false, form: { ...EMPTY, contactedOn: today, ...preset } });
  const openEdit = (d) =>
    setEditing({
      id: d._id,
      placed: !!d.order,
      form: {
        ...EMPTY,
        ...d,
        college: d.college || '',
        book: d.book || '',
        contact: { ...EMPTY.contact, ...(d.contact || {}) },
        quantity: d.quantity || '', extraDiscount: d.extraDiscount || '', giftAbove: d.giftAbove || '',
        freeBooks: d.freeBooks || '', deliveryCharge: d.deliveryCharge || '',
      },
    });

  const save = async () => {
    const { id, placed, form } = editing;
    setSaving(true);
    try {
      const body = {
        contact: form.contact, batch: form.batch, contactedOn: form.contactedOn, deadline: form.deadline,
        shipOn: form.shipOn, address: form.address, note: form.note,
        ...(id ? { status: form.status } : {}),
        ...(form.college ? { college: form.college } : { collegeName: form.collegeName }),
      };
      if (!placed) {
        Object.assign(body, {
          book: form.book || undefined, quantity: form.quantity, unitPrice: form.unitPrice, extraDiscount: form.extraDiscount,
          giftAbove: form.giftAbove, freeBooks: form.freeBooks, freeDelivery: !!form.freeDelivery,
          deliveryCharge: form.deliveryCharge, payment: form.payment,
        });
      }
      if (id) await call(`/orders/${id}`, 'PATCH', body);
      else await call('/orders', 'POST', body);
      showToast('success', 'সেভ হয়েছে');
      setEditing(null);
      load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const place = async (d) => {
    const n = (d.quantity || 0) + (d.freeBooks || 0);
    const ok = await confirm({
      title: `${d.collegeName} — অর্ডার তৈরি করবেন?`,
      message: `${d.contact?.name} (${d.contact?.phone || 'নম্বর নেই'}) — ${n}টা বই${d.freeBooks ? ` (${d.freeBooks}টা ফ্রি)` : ''}, মোট ${tk(d.total)}। Book Orders-এ Confirmed অর্ডার হিসেবে যাবে, স্টক থেকে ${n}টা কমবে।`,
      confirmText: 'অর্ডার তৈরি',
    });
    if (!ok) return;
    setBusyId(d._id);
    try {
      await call(`/orders/${d._id}/place`, 'POST', {});
      showToast('success', 'অর্ডার তৈরি হয়েছে');
      load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const ship = async (d) => {
    const ok = await confirm({
      title: 'Steadfast-এ পাঠাবেন?',
      message: `${d.collegeName} — ${d.contact?.name}, COD ${d.payment === 'paid' ? '৳0 (আগেই পেয়েছি)' : tk(d.order?.total)}`,
      confirmText: 'কুরিয়ারে পাঠান',
    });
    if (!ok) return;
    setBusyId(d._id);
    try {
      const r = await sendToCourier([d.order._id]);
      const fail = (Array.isArray(r) ? r : r?.results || []).find((x) => !x.ok);
      if (fail) throw new Error(fail.error || 'পাঠানো যায়নি');
      showToast('success', 'কুরিয়ারে পাঠানো হয়েছে');
      load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (d) => {
    const ok = await confirm({ title: 'এই ক্যাম্পাসটা মুছবেন?', message: d.collegeName, confirmText: 'মুছুন', danger: true });
    if (!ok) return;
    try {
      await call(`/orders/${d._id}`, 'DELETE');
      showToast('success', 'মোছা হয়েছে');
      load();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      {toastNode}
      {confirmNode}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-dash-ink2">
            <FiUsers className="text-brand" /> Campus Orders
          </h1>
          <p className="mt-0.5 text-sm text-dash-mute">সিনিয়রের মাধ্যমে ব্যাচের অর্ডার — ছাড়, ফ্রি বই, তারিখ আর কুরিয়ার এক জায়গায়।</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setLoading(true); load(); }} className="flex items-center gap-2 rounded-lg border border-dash-line px-3 py-2 text-sm text-dash-ink4 hover:bg-dash-soft">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setBookOpen(true)} className="flex items-center gap-2 rounded-lg border border-brand/40 px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">
            <FiPhone /> কলেজ ও সিনিয়র
          </button>
          <button onClick={() => openNew()} className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover">
            <FiPlus /> নতুন ক্যাম্পাস
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="অর্ডার নিচ্ছে" value={(counts.contacted || 0) + (counts.collecting || 0)} note={overdue ? `${overdue}টার শেষ তারিখ পেরিয়েছে — সংখ্যা জানতে হবে` : 'শেষ তারিখ পেরোয়নি'} tone={overdue ? 'text-amber-600' : undefined} />
        <Card label="অর্ডার হয়েছে, যায়নি" value={counts.ordered || 0} note="কুরিয়ারে পাঠানো বাকি" />
        <Card label="পাঠানো / ডেলিভারি" value={`${counts.shipped || 0} / ${counts.delivered || 0}`} />
        <Card label="মোট বই (অর্ডার হওয়া)" value={copies} note={isOwner ? `মোট ${tk(value)}` : 'ফ্রি বই সহ'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map((s) => (
          <button key={s.key} onClick={() => setStage(s.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${stage === s.key ? 'border-brand bg-brand text-white' : 'border-dash-line bg-dash-card text-dash-ink3 hover:bg-dash-soft'}`}>
            {s.label}{s.key !== 'all' && counts[s.key] ? ` (${counts[s.key]})` : s.key === 'all' ? ` (${rows.length})` : ''}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input className={`${input} pl-9`} placeholder="কলেজ, নাম বা নম্বর" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16"><FiLoader className="animate-spin text-2xl text-brand" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dash-line bg-dash-card py-14 text-center text-sm text-dash-mute">
          কিছু নেই। <button onClick={() => openNew()} className="font-semibold text-brand hover:underline">নতুন ক্যাম্পাস যোগ করুন</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {shown.map((d) => (
            <DealCard key={d._id} d={d} today={today} busy={busyId === d._id} isOwner={isOwner}
              onEdit={() => openEdit(d)} onPlace={() => place(d)} onShip={() => ship(d)} onDelete={() => remove(d)} />
          ))}
        </div>
      )}

      {editing && (
        <DealForm editing={editing} setEditing={setEditing} colleges={colleges} books={books} saving={saving} onSave={save} onClose={() => setEditing(null)} />
      )}
      {bookOpen && (
        <PhoneBook colleges={colleges} reload={load} showToast={showToast} confirm={confirm} onClose={() => setBookOpen(false)}
          onStart={(c, p) => { setBookOpen(false); openNew({ college: c._id, collegeName: c.name, contact: { name: p.name, phone: p.phone, role: p.role }, batch: p.batch || '' }); }} />
      )}
    </div>
  );
}

function Card({ label: l, value, note, tone = 'text-dash-ink' }) {
  return (
    <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold text-dash-mute2">{l}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-dash-mute2">{note}</p>}
    </div>
  );
}

function DealCard({ d, today, busy, isOwner, onEdit, onPlace, onShip, onDelete }) {
  const st = STAGE[stageOf(d)];
  const left = d.deadline ? daysBetween(today, d.deadline) : null;
  const perCopy = Math.max(0, (d.unitPrice || 0) - (d.extraDiscount || 0));
  const code = d.order?.courier?.trackingCode;
  const giftDue = !d.order && d.giftAbove > 0 && d.quantity > d.giftAbove && !d.freeBooks;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dash-line bg-dash-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-dash-ink2">{d.collegeName}{d.batch && <span className="ml-1.5 text-xs font-medium text-dash-mute">({d.batch})</span>}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-dash-ink3">
            {d.contact?.name}
            {d.contact?.phone && <a href={`tel:${d.contact.phone}`} className="font-mono text-xs text-brand hover:underline">{d.contact.phone}</a>}
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[d.contact?.role] || ROLE_STYLE.other}`}>{ROLE_LABEL[d.contact?.role] || '—'}</span>
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-4">
        <Info k="বই" v={`${d.quantity || 0}টা`} />
        <Info k="প্রতি বইয়ে ছাড়" v={d.extraDiscount ? tk(d.extraDiscount) : '—'} sub={`বই ${tk(perCopy)}`} />
        <Info k="সিনিয়রের ফ্রি বই" v={d.freeBooks ? `${d.freeBooks}টা` : 'নেই'} sub={d.giftAbove ? `${d.giftAbove}টার বেশি হলে` : ''} />
        <Info k="ডেলিভারি" v={d.freeDelivery ? 'ফ্রি' : tk(d.deliveryCharge)} />
        <Info k="যোগাযোগ" v={fmtDay(d.contactedOn)} />
        <Info k="ছাড়ের শেষ তারিখ" v={fmtDay(d.deadline)}
          sub={left == null || d.order ? '' : left > 0 ? `${left} দিন বাকি` : left === 0 ? 'আজ শেষ' : 'পেরিয়েছে'}
          subTone={left != null && left < 0 && !d.order ? 'text-amber-600 font-semibold' : ''} />
        <Info k="বই যাবে" v={fmtDay(d.shipOn)} />
        <Info k="মোট" v={<span className="font-bold text-dash-ink2">{tk(d.total)}</span>} sub={d.payment === 'paid' ? 'টাকা আগেই পেয়েছি' : 'COD'} />
      </div>

      {giftDue && <p className="flex items-center gap-1.5 text-xs text-amber-700"><FiGift /> {d.giftAbove}টার বেশি অর্ডার — সিনিয়রের ফ্রি বই যোগ করুন।</p>}
      {d.address && <p className="flex items-center gap-1.5 text-xs text-dash-mute"><FiMapPin /> {d.address}</p>}
      {d.note && <p className="rounded-lg bg-dash-soft px-3 py-2 text-xs text-dash-ink3">{d.note}</p>}

      {d.order && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-dash-mute">
          <Link href="/dashboard/admin/book-orders" className="font-semibold text-brand hover:underline">অর্ডার #{d.order.orderSeq}</Link>
          {code && <a href={`/t/${code}`} target="_blank" rel="noreferrer" className="font-mono text-brand hover:underline">ট্র্যাকিং {code}</a>}
          {d.order.courier?.status && <span>Steadfast: {d.order.courier.status}</span>}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-dash-line/60 pt-3">
        <button onClick={onEdit} className="flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft"><FiEdit2 /> এডিট</button>
        {!d.order && d.status !== 'cancelled' && (
          <button onClick={onPlace} disabled={busy || !((d.quantity || 0) + (d.freeBooks || 0))}
            title={(d.quantity || 0) + (d.freeBooks || 0) ? '' : 'আগে কয়টা বই অর্ডার হয়েছে লিখুন'}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
            {busy ? <FiLoader className="animate-spin" /> : <FiCheckCircle />} অর্ডার তৈরি
          </button>
        )}
        {d.order && d.order.status === 'processing' && !d.order.courier?.consignmentId && (
          <button onClick={onShip} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
            {busy ? <FiLoader className="animate-spin" /> : <FiTruck />} কুরিয়ারে পাঠান
          </button>
        )}
        {isOwner && !d.order && (
          <button onClick={onDelete} className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"><FiTrash2 /> মুছুন</button>
        )}
      </div>
    </div>
  );
}

function Info({ k, v, sub, subTone = '' }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-dash-mute2">{k}</p>
      <p className="text-dash-ink3">{v}</p>
      {sub && <p className={`text-[11px] text-dash-mute2 ${subTone}`}>{sub}</p>}
    </div>
  );
}

function DealForm({ editing, setEditing, colleges, books, saving, onSave, onClose }) {
  const { form, placed, id } = editing;
  const setF = (patch) => setEditing((e) => ({ ...e, form: { ...e.form, ...patch } }));
  const set = (k) => (e) => setF({ [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const setC = (k) => (e) => setF({ contact: { ...form.contact, [k]: e.target.value } });
  const college = colleges.find((c) => c._id === form.college);
  const book = books.find((b) => b._id === form.book) || (books.length === 1 ? books[0] : null);
  const unit = form.unitPrice !== '' && form.unitPrice != null ? Number(form.unitPrice) || 0 : Number(book?.offerPrice ?? book?.price) || 0;
  const perCopy = Math.max(0, unit - (Number(form.extraDiscount) || 0));
  const qty = Number(form.quantity) || 0;
  const total = perCopy * qty + (form.freeDelivery ? 0 : Number(form.deliveryCharge) || 0);
  const giftDue = Number(form.giftAbove) > 0 && qty > Number(form.giftAbove) && !Number(form.freeBooks);

  const pickCollege = (name) => {
    const c = colleges.find((x) => x.name === name);
    setF({ collegeName: name, college: c?._id || '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl bg-dash-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-dash-line px-5 py-3">
          <h2 className="font-bold text-dash-ink2">{id ? 'ক্যাম্পাস এডিট' : 'নতুন ক্যাম্পাস'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Close"><FiX /></button>
        </div>
        <div className="space-y-4 p-5">
          <Section title="কলেজ ও যার কাছে যাবে">
            <div className="sm:col-span-2">
              <label className={label}>মেডিকেল কলেজ *</label>
              <input className={input} list="campus-colleges" value={form.collegeName} onChange={(e) => pickCollege(e.target.value)} placeholder="নাম লিখুন বা বেছে নিন" />
              <datalist id="campus-colleges">{colleges.map((c) => <option key={c._id} value={c.name} />)}</datalist>
              {college?.contacts?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {college.contacts.map((p) => (
                    <button key={p._id} type="button" onClick={() => setF({ contact: { name: p.name, phone: p.phone, role: p.role }, batch: form.batch || p.batch || '' })}
                      className="rounded-full border border-dash-line px-2.5 py-0.5 text-xs text-dash-ink3 hover:border-brand hover:text-brand">
                      {p.name} · {ROLE_LABEL[p.role]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><label className={label}>নাম *</label><input className={input} value={form.contact.name} onChange={setC('name')} /></div>
            <div><label className={label}>মোবাইল</label><input className={input} value={form.contact.phone} onChange={setC('phone')} placeholder="01XXXXXXXXX" /></div>
            <div>
              <label className={label}>কার কাছে যাচ্ছে</label>
              <select className={input} value={form.contact.role} onChange={setC('role')}>
                <option value="senior">সিনিয়র</option>
                <option value="student">সাধারণ স্টুডেন্ট</option>
                <option value="other">অন্য</option>
              </select>
            </div>
            <div><label className={label}>ব্যাচ</label><input className={input} value={form.batch} onChange={set('batch')} placeholder="যেমন K-60" /></div>
          </Section>

          <Section title={placed ? 'বই ও টাকা (অর্ডার হয়ে গেছে — বদলানো যাবে না)' : 'বই ও টাকা'}>
            <fieldset disabled={placed} className="contents">
              <div>
                <label className={label}>বই</label>
                <select className={input} value={form.book || book?._id || ''} onChange={set('book')}>
                  {books.map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
                </select>
              </div>
              <div><label className={label}>কয়টা বই অর্ডার হয়েছে</label><input className={input} type="number" min="0" value={form.quantity} onChange={set('quantity')} placeholder="পরে লিখলেও হবে" /></div>
              <div><label className={label}>বইয়ের দাম (৳)</label><input className={input} type="number" min="0" value={form.unitPrice} onChange={set('unitPrice')} placeholder={String(Number(book?.offerPrice ?? book?.price) || '')} /></div>
              <div><label className={label}>প্রতি বইয়ে এক্সট্রা ছাড় (৳)</label><input className={input} type="number" min="0" value={form.extraDiscount} onChange={set('extraDiscount')} placeholder="0" /></div>
              <div><label className={label}>কয়টার বেশি হলে সিনিয়রের ফ্রি বই</label><input className={input} type="number" min="0" value={form.giftAbove} onChange={set('giftAbove')} placeholder="নেই" /></div>
              <div><label className={label}>সিনিয়রের ফ্রি বই (কয়টা)</label><input className={input} type="number" min="0" value={form.freeBooks} onChange={set('freeBooks')} placeholder="0" /></div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-dash-ink3">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={!!form.freeDelivery} onChange={set('freeDelivery')} /> ডেলিভারি চার্জ ফ্রি
              </label>
              {!form.freeDelivery && <div><label className={label}>ডেলিভারি চার্জ (৳)</label><input className={input} type="number" min="0" value={form.deliveryCharge} onChange={set('deliveryCharge')} placeholder={String(college?.deliveryCharge ?? '')} /></div>}
              <div>
                <label className={label}>পেমেন্ট</label>
                <select className={input} value={form.payment} onChange={set('payment')}>
                  <option value="cod">Cash on delivery</option>
                  <option value="paid">টাকা আগেই পেয়েছি</option>
                </select>
              </div>
            </fieldset>
            <div className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-dash-ink2 sm:col-span-2">
              প্রতি বই <b>{tk(perCopy)}</b> × {qty} = {tk(perCopy * qty)}{!form.freeDelivery && Number(form.deliveryCharge) ? ` + ডেলিভারি ${tk(form.deliveryCharge)}` : ''} → মোট <b>{tk(total)}</b>
              {Number(form.freeBooks) > 0 && <span className="text-dash-mute"> · সাথে {form.freeBooks}টা ফ্রি বই</span>}
              {giftDue && <p className="mt-1 text-xs text-amber-700">{form.giftAbove}টার বেশি — সিনিয়রের ফ্রি বই দিতে ভুলবেন না।</p>}
            </div>
          </Section>

          <Section title="তারিখ ও অন্যান্য">
            <div><label className={label}>যোগাযোগ করেছি</label><input className={input} type="date" value={form.contactedOn} onChange={set('contactedOn')} /></div>
            <div><label className={label}>ছাড়ের শেষ তারিখ</label><input className={input} type="date" value={form.deadline} onChange={set('deadline')} /></div>
            <div><label className={label}>বই যাবে</label><input className={input} type="date" value={form.shipOn} onChange={set('shipOn')} /></div>
            {id && !placed && (
              <div>
                <label className={label}>স্ট্যাটাস</label>
                <select className={input} value={form.status} onChange={set('status')}>
                  <option value="contacted">যোগাযোগ হয়েছে</option>
                  <option value="collecting">অর্ডার নিচ্ছে</option>
                  <option value="cancelled">বাতিল</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2"><label className={label}>ঠিকানা (খালি রাখলে কলেজের নাম)</label><input className={input} value={form.address} onChange={set('address')} /></div>
            <div className="sm:col-span-2"><label className={label}>নোট</label><textarea className={input} rows={2} value={form.note} onChange={set('note')} placeholder="যেমন: সিনিয়র নেয় না, সাধারণ স্টুডেন্টের কাছে যাচ্ছে" /></div>
          </Section>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-dash-line px-4 py-2 text-sm text-dash-ink3 hover:bg-dash-soft">বন্ধ</button>
            <button onClick={onSave} disabled={saving || !form.collegeName || !form.contact.name}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
              {saving && <FiLoader className="animate-spin" />} সেভ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-dash-mute2">{title}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** Every college, with its seniors / students — editable in place. */
function PhoneBook({ colleges, reload, showToast, confirm, onClose, onStart }) {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState('all'); // all | with | without
  const [draft, setDraft] = useState(null); // { collegeId, id|null, name, phone, role, batch, note }
  const [busy, setBusy] = useState(false);

  const shown = colleges.filter((c) => {
    if (only === 'with' && !c.contacts.length) return false;
    if (only === 'without' && c.contacts.length) return false;
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return [c.name, c.abbreviation, c.district, ...c.contacts.flatMap((p) => [p.name, p.phone])].some((v) => String(v || '').toLowerCase().includes(n));
  });
  const withCount = colleges.filter((c) => c.contacts.length).length;

  const saveDraft = async () => {
    setBusy(true);
    try {
      const { id, collegeId, ...body } = draft;
      if (id) await call(`/contacts/${id}`, 'PATCH', body);
      else await call('/contacts', 'POST', { ...body, college: collegeId });
      setDraft(null);
      await reload();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async (p) => {
    if (!(await confirm({ title: `${p.name} — তালিকা থেকে সরাবেন?`, confirmText: 'সরান', danger: true }))) return;
    try {
      await call(`/contacts/${p._id}`, 'DELETE');
      await reload();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const editor = (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-brand/30 bg-brand-soft/40 p-3 sm:grid-cols-5">
      <input className={input} placeholder="নাম *" value={draft?.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      <input className={input} placeholder="মোবাইল" value={draft?.phone || ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
      <select className={input} value={draft?.role || 'senior'} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
        <option value="senior">সিনিয়র</option>
        <option value="student">সাধারণ স্টুডেন্ট</option>
        <option value="other">অন্য</option>
      </select>
      <input className={input} placeholder="ব্যাচ" value={draft?.batch || ''} onChange={(e) => setDraft({ ...draft, batch: e.target.value })} />
      <input className={input} placeholder="নোট" value={draft?.note || ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
      <div className="flex justify-end gap-2 sm:col-span-5">
        <button onClick={() => setDraft(null)} className="rounded-lg border border-dash-line px-3 py-1.5 text-xs text-dash-ink3">বাদ</button>
        <button onClick={saveDraft} disabled={busy || !draft?.name} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {busy && <FiLoader className="animate-spin" />} সেভ
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl bg-dash-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-dash-line px-5 py-3">
          <h2 className="font-bold text-dash-ink2">কলেজ ও সিনিয়র ({withCount}/{colleges.length} কলেজে নম্বর আছে)</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Close"><FiX /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
              <input className={`${input} pl-9`} placeholder="কলেজ, জেলা, নাম বা নম্বর" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {[['all', 'সব'], ['with', 'নম্বর আছে'], ['without', 'নম্বর নেই']].map(([k, t]) => (
              <button key={k} onClick={() => setOnly(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${only === k ? 'border-brand bg-brand text-white' : 'border-dash-line text-dash-ink3'}`}>{t}</button>
            ))}
          </div>
          <div className="divide-y divide-dash-line/60 rounded-xl border border-dash-line">
            {shown.map((c) => (
              <div key={c._id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-dash-ink2">{c.name}{c.abbreviation && <span className="ml-1.5 text-xs text-dash-mute">({c.abbreviation})</span>} <span className="text-xs font-normal text-dash-mute2">· {c.district}</span></p>
                  <button onClick={() => setDraft({ collegeId: c._id, id: null, name: '', phone: '', role: 'senior', batch: '', note: '' })}
                    className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><FiPlus /> নম্বর যোগ</button>
                </div>
                {c.contacts.map((p) =>
                  draft?.id === p._id ? <div key={p._id}>{editor}</div> : (
                    <div key={p._id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-dash-ink3">{p.name}</span>
                      {p.phone && <a href={`tel:${p.phone}`} className="font-mono text-xs text-brand">{p.phone}</a>}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[p.role]}`}>{ROLE_LABEL[p.role]}</span>
                      {p.batch && <span className="text-xs text-dash-mute">{p.batch}</span>}
                      {p.note && <span className="text-xs italic text-dash-mute">— {p.note}</span>}
                      <span className="ml-auto flex items-center gap-1">
                        <button onClick={() => onStart(c, p)} className="rounded px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft">ক্যাম্পাস শুরু</button>
                        <button onClick={() => setDraft({ collegeId: c._id, id: p._id, name: p.name, phone: p.phone, role: p.role, batch: p.batch, note: p.note })} className="rounded p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Edit"><FiEdit2 /></button>
                        <button onClick={() => del(p)} className="rounded p-1.5 text-red-400 hover:bg-red-50" aria-label="Remove"><FiTrash2 /></button>
                      </span>
                    </div>
                  )
                )}
                {draft && !draft.id && draft.collegeId === c._id && editor}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

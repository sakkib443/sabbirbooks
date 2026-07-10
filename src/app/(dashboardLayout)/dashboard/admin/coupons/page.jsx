'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiLoader, FiPlus, FiEdit3, FiTrash2, FiX, FiSave, FiTag,
  FiSearch, FiCopy, FiCheck, FiPercent, FiDollarSign, FiUsers, FiZap, FiCalendar,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const jhdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const hdr = () => ({ Authorization: `Bearer ${getToken()}` });

const toDateInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
};
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const blank = {
  code: '', discountType: 'percentage', discountValue: '', maxUses: 100,
  validFrom: toDateInput(new Date()), validUntil: '', minPurchase: 0, isActive: true,
};

// active | expired | inactive | usedUp
const statusOf = (c) => {
  if (!c.isActive) return 'inactive';
  if (c.validUntil && new Date(c.validUntil) < new Date()) return 'expired';
  if ((c.usedCount || 0) >= (c.maxUses || 0)) return 'usedUp';
  return 'active';
};

export default function CourseCouponsPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/coupon`, { headers: hdr() });
      const data = await res.json();
      if (data.success) setList(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); };
  const openEdit = (c) => {
    setEditId(c._id);
    setForm({
      code: c.code || '', discountType: c.discountType || 'percentage',
      discountValue: c.discountValue ?? '', maxUses: c.maxUses ?? 100,
      validFrom: toDateInput(c.validFrom), validUntil: toDateInput(c.validUntil),
      minPurchase: c.minPurchase ?? 0, isActive: c.isActive !== false,
    });
  };

  const save = async () => {
    if (!form.code.trim()) return showToast('error', 'Coupon code দিন');
    if (form.discountValue === '' || Number(form.discountValue) <= 0) return showToast('error', 'Discount value দিন');
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) return showToast('error', 'Percentage ১০০-এর বেশি হতে পারে না');
    if (!form.validUntil) return showToast('error', 'Valid Until date দিন');
    if (form.validFrom && new Date(form.validUntil) < new Date(form.validFrom)) return showToast('error', 'Valid Until, Valid From-এর আগে হতে পারে না');
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        maxUses: Number(form.maxUses) || 0,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil,
        minPurchase: Number(form.minPurchase) || 0,
        isActive: form.isActive,
      };
      const url = editId ? `${API}/coupon/${editId}` : `${API}/coupon`;
      const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers: jhdr(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { showToast('success', editId ? 'Coupon updated' : 'Coupon created'); setForm(null); load(); }
      else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); } finally { setSaving(false); }
  };

  const del = async (c) => {
    if (!(await confirm({ title: 'Delete this coupon?', message: `“${c.code}” মুছে যাবে — এটা আর ব্যবহার করা যাবে না।`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`${API}/coupon/${c._id}`, { method: 'DELETE', headers: hdr() });
      const data = await res.json();
      if (data.success) { showToast('success', 'Deleted'); load(); } else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
  };

  const copyCode = (code) => {
    try { navigator.clipboard?.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1500); } catch { }
  };

  const F = (k, v) => setForm({ ...form, [k]: v });
  const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F3A522]/15 focus:border-[#F3A522]';
  const lbl = 'text-[10px] font-bold text-slate-500 uppercase block mb-1';
  const valueLabel = (c) => c.discountType === 'percentage' ? `${c.discountValue}%` : `৳${c.discountValue}`;

  // ── Stats ──
  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter(c => statusOf(c) === 'active').length,
    redemptions: list.reduce((s, c) => s + (c.usedCount || 0), 0),
    expired: list.filter(c => ['expired', 'usedUp', 'inactive'].includes(statusOf(c))).length,
  }), [list]);

  // ── Filter + search ──
  const filtered = useMemo(() => list.filter(c => {
    const s = statusOf(c);
    const matchFilter = filter === 'all' ? true : filter === 'active' ? s === 'active' : filter === 'inactive' ? (s !== 'active') : true;
    const matchSearch = !search || c.code?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [list, filter, search]);

  const STAT_CARDS = [
    { label: 'Total Coupons', value: stats.total, icon: FiTag, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Active Now', value: stats.active, icon: FiZap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Redemptions', value: stats.redemptions, icon: FiUsers, color: 'text-[#c9871a]', bg: 'bg-[#FEF6E7]' },
    { label: 'Expired / Off', value: stats.expired, icon: FiCalendar, color: 'text-slate-400', bg: 'bg-slate-50' },
  ];

  const badge = (s) => ({
    active: 'bg-emerald-100 text-emerald-600', expired: 'bg-rose-100 text-rose-500',
    usedUp: 'bg-amber-100 text-amber-600', inactive: 'bg-slate-100 text-slate-400',
  }[s]);
  const badgeText = (s) => ({ active: 'Active', expired: 'Expired', usedUp: 'Limit reached', inactive: 'Inactive' }[s]);

  return (
    <div className="space-y-6 poppins">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 outfit">Course Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">Discount codes students apply at course checkout — works on every course.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/20 hover:shadow-xl transition">
          <FiPlus size={16} /> New Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={s.color} size={18} /></div>
            <div><p className="text-xl font-bold text-slate-900">{loading ? '—' : s.value}</p><p className="text-[11px] text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white shadow-sm focus:outline-none focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15" />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive / Expired']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === id ? 'bg-white text-[#c9871a] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF6E7] flex items-center justify-center mx-auto mb-4"><FiTag className="text-[#F3A522]" size={26} /></div>
          <h3 className="text-base font-bold text-slate-700">{list.length === 0 ? 'No coupons yet' : 'No coupons match'}</h3>
          <p className="text-sm text-slate-400 mt-1">{list.length === 0 ? 'Create your first discount code for course students.' : 'Try a different search or filter.'}</p>
          {list.length === 0 && (
            <button onClick={openNew} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F3A522] text-white text-sm font-bold"><FiPlus size={14} /> New Coupon</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const s = statusOf(c);
            const pct = c.maxUses > 0 ? Math.min(100, Math.round(((c.usedCount || 0) / c.maxUses) * 100)) : 0;
            return (
              <div key={c._id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden">
                {/* ticket top */}
                <div className="relative p-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white shrink-0">
                      {c.discountType === 'percentage' ? <FiPercent size={18} /> : <FiDollarSign size={18} />}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${badge(s)}`}>{badgeText(s)}</span>
                  </div>

                  <button onClick={() => copyCode(c.code)} title="Copy code"
                    className="mt-3 inline-flex items-center gap-1.5 font-mono font-black text-slate-800 tracking-wide hover:text-[#c9871a] transition">
                    {c.code}
                    {copied === c.code ? <FiCheck size={13} className="text-emerald-500" /> : <FiCopy size={12} className="text-slate-300 group-hover:text-slate-400" />}
                  </button>

                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-extrabold text-[#c9871a]">{valueLabel(c)}</span>
                    <span className="text-[11px] text-slate-400">off · min ৳{c.minPurchase || 0}</span>
                  </div>
                </div>

                {/* usage bar */}
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400 font-semibold uppercase tracking-wider">Redeemed</span>
                    <span className={`font-bold ${pct >= 100 ? 'text-rose-500' : 'text-slate-500'}`}>{c.usedCount || 0} / {c.maxUses || 0}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-400' : 'bg-gradient-to-r from-[#F3A522] to-[#d88f13]'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1"><FiCalendar size={10} /> {fmtDate(c.validFrom)} → {fmtDate(c.validUntil)}</p>
                </div>

                <div className="flex border-t border-slate-100">
                  <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[#c9871a] hover:bg-[#FEF6E7] text-xs font-bold transition"><FiEdit3 size={13} /> Edit</button>
                  <button onClick={() => del(c)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-rose-500 hover:bg-rose-50 text-xs font-bold transition border-l border-slate-100"><FiTrash2 size={13} /> Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white shrink-0">
              <h3 className="font-bold text-lg outfit">{editId ? 'Edit Coupon' : 'New Coupon'}</h3>
              <button onClick={() => setForm(null)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto">
              <div><label className={lbl}>Coupon Code *</label><input value={form.code} onChange={e => F('code', e.target.value.toUpperCase())} className={`${inp} font-mono uppercase tracking-wide`} placeholder="SAVE20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Discount Type</label><select value={form.discountType} onChange={e => F('discountType', e.target.value)} className={inp}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (৳)</option></select></div>
                <div><label className={lbl}>{form.discountType === 'percentage' ? 'Value (%)' : 'Value (৳)'} *</label><input type="number" min="0" max={form.discountType === 'percentage' ? 100 : undefined} value={form.discountValue} onChange={e => F('discountValue', e.target.value)} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Max Uses</label><input type="number" min="1" value={form.maxUses} onChange={e => F('maxUses', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Min Purchase (৳)</label><input type="number" min="0" value={form.minPurchase} onChange={e => F('minPurchase', e.target.value)} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Valid From</label><input type="date" value={form.validFrom} onChange={e => F('validFrom', e.target.value)} className={inp} /></div>
                <div><label className={lbl}>Valid Until *</label><input type="date" min={form.validFrom || undefined} value={form.validUntil} onChange={e => F('validUntil', e.target.value)} className={inp} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer pt-1"><input type="checkbox" checked={form.isActive} onChange={e => F('isActive', e.target.checked)} className="accent-[#F3A522]" /> Active</label>

              {form.discountValue && Number(form.discountValue) > 0 && (
                <div className="rounded-lg bg-[#FEF6E7]/60 border border-[#F0DFB4] px-3 py-2 text-[11px] text-[#a5680f]">
                  Preview: on a ৳1000 order → {form.discountType === 'percentage'
                    ? `৳${Math.round((1000 * Number(form.discountValue)) / 100)} off (pay ৳${Math.max(0, 1000 - Math.round((1000 * Number(form.discountValue)) / 100))})`
                    : `৳${Math.min(Number(form.discountValue), 1000)} off (pay ৳${Math.max(0, 1000 - Number(form.discountValue))})`}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setForm(null)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50">
                {saving ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
      {confirmNode}
    </div>
  );
}

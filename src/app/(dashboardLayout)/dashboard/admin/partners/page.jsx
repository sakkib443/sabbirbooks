'use client';

import React, { useEffect, useState } from 'react';
import {
  FiLoader, FiPlus, FiEdit3, FiTrash2, FiX, FiSave, FiUsers,
  FiUploadCloud, FiExternalLink, FiEye, FiEyeOff, FiImage,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';
const jhdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const hdr = () => ({ Authorization: `Bearer ${getToken()}` });

const blank = { name: '', websiteUrl: '', logoUrl: '', order: 0, isActive: true };

export default function AdminPartnersPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/partners`, { headers: hdr() });
      const data = await res.json();
      if (data.success) setList(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank, order: list.length + 1 }); };
  const openEdit = (p) => {
    setEditId(p._id);
    setForm({ name: p.name || '', websiteUrl: p.websiteUrl || '', logoUrl: p.logoUrl || '', order: p.order ?? 0, isActive: p.isActive !== false });
  };
  const F = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch(`${API}/partners/upload`, { method: 'POST', headers: hdr(), body: fd });
      const data = await res.json();
      if (data.success) { setForm((f) => ({ ...f, logoUrl: data.data.url })); showToast('success', 'Logo uploaded'); }
      else showToast('error', data.message || 'Upload failed');
    } catch { showToast('error', 'Upload failed'); } finally { setUploading(false); e.target.value = ''; }
  };

  const save = async () => {
    if (!form.name.trim()) return showToast('error', 'নাম দিন');
    if (!form.logoUrl) return showToast('error', 'Logo দিন');
    setSaving(true);
    try {
      const body = { name: form.name.trim(), websiteUrl: form.websiteUrl.trim(), logoUrl: form.logoUrl, order: Number(form.order) || 0, isActive: form.isActive };
      const url = editId ? `${API}/partners/${editId}` : `${API}/partners`;
      const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers: jhdr(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { showToast('success', editId ? 'Partner updated' : 'Partner added'); setForm(null); load(); }
      else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); } finally { setSaving(false); }
  };

  const del = async (p) => {
    if (!(await confirm({ title: 'Delete this partner?', message: `“${p.name}” মুছে যাবে।`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`${API}/partners/${p._id}`, { method: 'DELETE', headers: hdr() });
      const data = await res.json();
      if (data.success) { showToast('success', 'Deleted'); load(); } else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
  };

  const toggleActive = async (p) => {
    try {
      const res = await fetch(`${API}/partners/${p._id}`, { method: 'PATCH', headers: jhdr(), body: JSON.stringify({ isActive: !p.isActive }) });
      const data = await res.json();
      if (data.success) load(); else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
  };

  const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F3A522]/15 focus:border-[#F3A522]';
  const lbl = 'text-[10px] font-bold text-slate-500 uppercase block mb-1';

  return (
    <div className="space-y-6 poppins">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 outfit">Partners / Collaborations</h1>
          <p className="text-sm text-slate-500 mt-1">হোমপেজের চলমান logo carousel — যেকোনো ওয়েবসাইটের logo + link যোগ করুন।</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/20 hover:shadow-xl transition">
          <FiPlus size={16} /> New Partner
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF6E7] flex items-center justify-center mx-auto mb-4"><FiUsers className="text-[#F3A522]" size={26} /></div>
          <h3 className="text-base font-bold text-slate-700">No partners yet</h3>
          <p className="text-sm text-slate-400 mt-1">প্রথম partner/website যোগ করুন।</p>
          <button onClick={openNew} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F3A522] text-white text-sm font-bold"><FiPlus size={14} /> New Partner</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <div key={p._id} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${p.isActive === false ? 'opacity-60' : ''}`}>
              <div className="h-16 flex items-center justify-center bg-slate-50 rounded-lg mb-3 px-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logoUrl} alt={p.name} className="max-h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{p.name}</p>
                  {p.websiteUrl && (
                    <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#c9871a] hover:underline truncate max-w-[160px]">
                      <FiExternalLink size={10} /> {p.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">Order: {p.order ?? 0}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(p)} title={p.isActive === false ? 'Show' : 'Hide'} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#c9871a] hover:bg-[#FEF6E7] transition">
                    {p.isActive === false ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                  <button onClick={() => openEdit(p)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#c9871a] hover:bg-[#FEF6E7] transition"><FiEdit3 size={15} /></button>
                  <button onClick={() => del(p)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"><FiTrash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white shrink-0">
              <h3 className="font-bold text-lg outfit">{editId ? 'Edit Partner' : 'New Partner'}</h3>
              <button onClick={() => setForm(null)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div><label className={lbl}>নাম / Name *</label><input value={form.name} onChange={(e) => F('name', e.target.value)} className={inp} placeholder="British Council" /></div>
              <div><label className={lbl}>Website URL</label><input value={form.websiteUrl} onChange={(e) => F('websiteUrl', e.target.value)} className={inp} placeholder="https://example.com" /></div>

              {/* Logo */}
              <div>
                <label className={lbl}>Logo *</label>
                {form.logoUrl ? (
                  <div className="flex items-center justify-between rounded-lg border border-[#F0DFB4] bg-[#FEF6E7]/50 px-3 py-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.logoUrl} alt="logo" className="max-h-9 w-auto object-contain" />
                    <button onClick={() => F('logoUrl', '')} className="text-slate-400 hover:text-rose-500 shrink-0"><FiX size={16} /></button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-500 cursor-pointer hover:border-[#F3A522] hover:text-[#c9871a] transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    {uploading ? <FiLoader className="animate-spin" size={16} /> : <FiUploadCloud size={16} />}
                    {uploading ? 'Uploading...' : 'Logo আপলোড (PNG/SVG)'}
                    <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div><label className={lbl}>Order</label><input type="number" value={form.order} onChange={(e) => F('order', e.target.value)} className={inp} /></div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer pb-2"><input type="checkbox" checked={form.isActive} onChange={(e) => F('isActive', e.target.checked)} className="accent-[#F3A522]" /> Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setForm(null)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={saving || uploading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50">
                {saving ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} {editId ? 'Update' : 'Add'}
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

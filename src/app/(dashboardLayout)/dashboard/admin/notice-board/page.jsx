'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiLoader, FiPlus, FiEdit3, FiTrash2, FiX, FiSave, FiClipboard,
  FiSearch, FiGlobe, FiUsers, FiPaperclip, FiFileText, FiImage, FiUploadCloud, FiEye, FiEyeOff,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const jhdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
const hdr = () => ({ Authorization: `Bearer ${getToken()}` });

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const blank = { title: '', body: '', audience: 'public', attachmentUrl: '', attachmentType: '', attachmentName: '', isActive: true };

export default function AdminNoticeBoardPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | public | enrolled

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/notices`, { headers: hdr() });
      const data = await res.json();
      if (data.success) setList(data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm({ ...blank }); };
  const openEdit = (n) => {
    setEditId(n._id);
    setForm({
      title: n.title || '', body: n.body || '', audience: n.audience || 'public',
      attachmentUrl: n.attachmentUrl || '', attachmentType: n.attachmentType || '', attachmentName: n.attachmentName || '',
      isActive: n.isActive !== false,
    });
  };

  const F = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/notices/upload`, { method: 'POST', headers: hdr(), body: fd });
      const data = await res.json();
      if (data.success) {
        setForm((f) => ({ ...f, attachmentUrl: data.data.url, attachmentType: data.data.type, attachmentName: data.data.name }));
        showToast('success', 'File uploaded');
      } else showToast('error', data.message || 'Upload failed');
    } catch { showToast('error', 'Upload failed'); } finally { setUploading(false); e.target.value = ''; }
  };

  const removeAttachment = () => setForm((f) => ({ ...f, attachmentUrl: '', attachmentType: '', attachmentName: '' }));

  const save = async () => {
    if (!form.title.trim()) return showToast('error', 'শিরোনাম দিন');
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(), body: form.body.trim(), audience: form.audience,
        attachmentUrl: form.attachmentUrl || undefined, attachmentType: form.attachmentType || undefined,
        attachmentName: form.attachmentName || undefined, isActive: form.isActive,
      };
      const url = editId ? `${API}/notices/${editId}` : `${API}/notices`;
      const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers: jhdr(), body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { showToast('success', editId ? 'Notice updated' : 'Notice published'); setForm(null); load(); }
      else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); } finally { setSaving(false); }
  };

  const del = async (n) => {
    if (!(await confirm({ title: 'Delete this notice?', message: `“${n.title}” মুছে যাবে।`, confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`${API}/notices/${n._id}`, { method: 'DELETE', headers: hdr() });
      const data = await res.json();
      if (data.success) { showToast('success', 'Deleted'); load(); } else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
  };

  const toggleActive = async (n) => {
    try {
      const res = await fetch(`${API}/notices/${n._id}`, { method: 'PATCH', headers: jhdr(), body: JSON.stringify({ isActive: !n.isActive }) });
      const data = await res.json();
      if (data.success) load(); else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
  };

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter((n) => n.isActive !== false).length,
    public: list.filter((n) => n.audience === 'public').length,
    enrolled: list.filter((n) => n.audience === 'enrolled').length,
  }), [list]);

  const filtered = useMemo(() => list.filter((n) => {
    const mf = filter === 'all' ? true : n.audience === filter;
    const ms = !search || n.title?.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  }), [list, filter, search]);

  const inp = 'w-full px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/15 focus:border-brand';
  const lbl = 'text-[10px] font-bold text-dash-mute uppercase block mb-1';

  const AudBadge = ({ a }) => a === 'enrolled'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-brand-soft text-brand-deep"><FiUsers size={10} /> Enrolled</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600"><FiGlobe size={10} /> Public</span>;

  const STAT_CARDS = [
    { label: 'Total Notices', value: stats.total, icon: FiClipboard, color: 'text-dash-ink3', bg: 'bg-dash-soft2' },
    { label: 'Active', value: stats.active, icon: FiEye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Public', value: stats.public, icon: FiGlobe, color: 'text-brand-ink', bg: 'bg-brand-soft' },
    { label: 'Enrolled only', value: stats.enrolled, icon: FiUsers, color: 'text-dash-mute', bg: 'bg-dash-soft' },
  ];

  return (
    <div className="space-y-6 poppins">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink outfit">Notice Board</h1>
          <p className="text-sm text-dash-mute mt-1">নোটিশ প্রকাশ করুন — সবার জন্য (Public) অথবা শুধু ভর্তিকৃত স্টুডেন্টদের জন্য।</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-hover text-white text-sm font-bold shadow-lg shadow-brand/20 hover:shadow-xl transition">
          <FiPlus size={16} /> New Notice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="bg-dash-card rounded-xl border border-dash-line/60 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={s.color} size={18} /></div>
            <div><p className="text-xl font-bold text-dash-ink">{loading ? '—' : s.value}</p><p className="text-[11px] text-dash-mute2">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-faint" size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-dash-line text-sm bg-dash-card shadow-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </div>
        <div className="flex gap-1 bg-dash-soft2 rounded-xl p-1">
          {[['all', 'All'], ['public', 'Public'], ['enrolled', 'Enrolled']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filter === id ? 'bg-dash-card text-brand-ink shadow-sm' : 'text-dash-mute hover:text-dash-ink3'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><FiLoader className="animate-spin text-brand" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dashed border-dash-line p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center mx-auto mb-4"><FiClipboard className="text-brand" size={26} /></div>
          <h3 className="text-base font-bold text-dash-ink3">{list.length === 0 ? 'No notices yet' : 'No notices match'}</h3>
          <p className="text-sm text-dash-mute2 mt-1">{list.length === 0 ? 'প্রথম নোটিশটি প্রকাশ করুন।' : 'অন্য search/filter দিন।'}</p>
          {list.length === 0 && (
            <button onClick={openNew} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold"><FiPlus size={14} /> New Notice</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div key={n._id} className={`bg-dash-card rounded-xl border shadow-sm p-4 flex items-start gap-4 ${n.isActive === false ? 'border-dash-line opacity-70' : 'border-dash-line'}`}>
              <div className="w-11 h-11 rounded-xl bg-brand-soft flex items-center justify-center shrink-0">
                {n.attachmentType === 'image' ? <FiImage className="text-brand-ink" size={18} /> : n.attachmentType === 'pdf' ? <FiFileText className="text-brand-ink" size={18} /> : <FiClipboard className="text-brand-ink" size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-dash-ink2 truncate">{n.title}</h3>
                  <AudBadge a={n.audience} />
                  {n.isActive === false && <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-dash-soft2 text-dash-mute2">Hidden</span>}
                </div>
                {n.body && <p className="text-sm text-dash-mute mt-1 line-clamp-2">{n.body}</p>}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-dash-mute2">
                  <span>{fmtDate(n.createdAt)}</span>
                  {n.attachmentUrl && (
                    <a href={n.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-ink hover:underline">
                      <FiPaperclip size={11} /> {n.attachmentName || 'attachment'}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(n)} title={n.isActive === false ? 'Show' : 'Hide'} className="w-8 h-8 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-brand-ink hover:bg-brand-soft transition">
                  {n.isActive === false ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
                <button onClick={() => openEdit(n)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-brand-ink hover:bg-brand-soft transition"><FiEdit3 size={15} /></button>
                <button onClick={() => del(n)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-rose-500 hover:bg-rose-50 transition"><FiTrash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setForm(null)}>
          <div className="bg-dash-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand to-brand-hover text-white shrink-0">
              <h3 className="font-bold text-lg outfit">{editId ? 'Edit Notice' : 'New Notice'}</h3>
              <button onClick={() => setForm(null)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div><label className={lbl}>শিরোনাম / Title *</label><input value={form.title} onChange={(e) => F('title', e.target.value)} className={inp} placeholder="যেমন: ঈদের ছুটির নোটিশ" /></div>
              <div><label className={lbl}>বিবরণ / Description</label><textarea value={form.body} onChange={(e) => F('body', e.target.value)} rows={4} className={inp} placeholder="নোটিশের বিস্তারিত (ঐচ্ছিক)" /></div>

              {/* Audience */}
              <div>
                <label className={lbl}>কারা দেখবে / Audience *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'public', icon: FiGlobe, t: 'Public', d: 'সবাই (footer পেজ + student)' },
                    { v: 'enrolled', icon: FiUsers, t: 'Enrolled', d: 'শুধু ভর্তিকৃত student' },
                  ].map((o) => (
                    <button key={o.v} type="button" onClick={() => F('audience', o.v)}
                      className={`flex items-start gap-2 p-3 rounded-lg border-2 text-left transition ${form.audience === o.v ? 'border-brand bg-brand-soft/50' : 'border-dash-line hover:border-dash-line-strong'}`}>
                      <o.icon size={16} className={form.audience === o.v ? 'text-brand-ink mt-0.5' : 'text-dash-mute2 mt-0.5'} />
                      <div><p className="text-sm font-bold text-dash-ink2">{o.t}</p><p className="text-[10px] text-dash-mute2">{o.d}</p></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attachment */}
              <div>
                <label className={lbl}>Attachment (PDF / ছবি)</label>
                {form.attachmentUrl ? (
                  <div className="flex items-center justify-between rounded-lg border border-brand-line bg-brand-soft/50 px-3 py-2.5">
                    <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 text-sm text-brand-deep hover:underline">
                      {form.attachmentType === 'image' ? <FiImage size={15} className="shrink-0" /> : <FiFileText size={15} className="shrink-0" />}
                      <span className="truncate">{form.attachmentName || 'attachment'}</span>
                    </a>
                    <button onClick={removeAttachment} className="text-dash-mute2 hover:text-rose-500 shrink-0"><FiX size={16} /></button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-dash-line text-sm text-dash-mute cursor-pointer hover:border-brand hover:text-brand-ink transition ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    {uploading ? <FiLoader className="animate-spin" size={16} /> : <FiUploadCloud size={16} />}
                    {uploading ? 'Uploading...' : 'PDF বা ছবি আপলোড করুন'}
                    <input type="file" accept=".pdf,image/*" onChange={onFile} className="hidden" disabled={uploading} />
                  </label>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-dash-ink4 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => F('isActive', e.target.checked)} className="accent-brand" /> Active (এখনই দেখাবে)
              </label>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-dash-line-soft shrink-0">
              <button onClick={() => setForm(null)} className="px-4 py-2.5 rounded-lg border border-dash-line text-dash-ink4 text-sm font-semibold hover:bg-dash-soft">Cancel</button>
              <button onClick={save} disabled={saving || uploading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-strong disabled:opacity-50">
                {saving ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} {editId ? 'Update' : 'Publish'}
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

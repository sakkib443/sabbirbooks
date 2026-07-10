'use client';

import React, { useEffect, useState } from 'react';
import {
  FiLoader, FiSave, FiPlus, FiTrash2, FiX, FiLayout, FiPhone, FiMapPin,
  FiMap, FiShare2, FiExternalLink, FiGlobe,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { CONTACT_DEFAULTS } from '@/lib/siteContent/contactContent';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const jhdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

// deep-merge fetched content over defaults so new fields always exist
const merge = (def, got) => {
  if (Array.isArray(def)) return Array.isArray(got) ? got : def;
  if (def && typeof def === 'object') {
    const out = { ...def };
    for (const k of Object.keys(def)) out[k] = merge(def[k], got?.[k]);
    return out;
  }
  return got === undefined || got === null ? def : got;
};

const TABS = [
  { id: 'hero', label: 'Hero', icon: FiLayout },
  { id: 'info', label: 'Contact Info', icon: FiPhone },
  { id: 'branches', label: 'Branches', icon: FiMapPin },
  { id: 'map', label: 'Map', icon: FiMap },
  { id: 'social', label: 'Social & WhatsApp', icon: FiShare2 },
];

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F3A522]/15 focus:border-[#F3A522]';
const lbl = 'text-[10px] font-bold text-slate-500 uppercase block mb-1';

// Small labelled field
const Field = ({ label, value, onChange, textarea, placeholder, bn }) => (
  <div>
    <label className={`${lbl} ${bn ? 'text-[#c9871a]' : ''}`}>{label}{bn ? ' (বাংলা)' : ''}</label>
    {textarea
      ? <textarea rows={2} value={value || ''} onChange={e => onChange(e.target.value)} className={`${inp} ${bn ? 'hind-siliguri' : ''}`} placeholder={placeholder} />
      : <input value={value || ''} onChange={e => onChange(e.target.value)} className={`${inp} ${bn ? 'hind-siliguri' : ''}`} placeholder={placeholder} />}
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
    {title && <h3 className="text-sm font-bold text-slate-700 mb-4">{title}</h3>}
    {children}
  </div>
);

export default function ContactContentPage() {
  const { showToast, toastNode } = useToast();
  const [tab, setTab] = useState('hero');
  const [c, setC] = useState(CONTACT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/site-content/contact`);
        const data = await res.json();
        setC(merge(CONTACT_DEFAULTS, data?.data?.content || {}));
      } catch { setC(CONTACT_DEFAULTS); } finally { setLoading(false); }
    })();
  }, []);

  const set = (section, key, val) => setC(prev => ({ ...prev, [section]: { ...prev[section], [key]: val } }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/site-content/contact`, { method: 'PUT', headers: jhdr(), body: JSON.stringify({ content: c }) });
      const data = await res.json();
      if (res.ok && data.success) showToast('success', 'Contact page content saved ✓');
      else showToast('error', data.message || 'Save failed');
    } catch { showToast('error', 'Network error'); } finally { setSaving(false); }
  };

  // ── branches helpers ──
  const setBranch = (i, key, val) => setC(prev => ({ ...prev, branches: prev.branches.map((b, idx) => idx === i ? { ...b, [key]: val } : b) }));
  const setBranchPhone = (i, pi, val) => setC(prev => ({ ...prev, branches: prev.branches.map((b, idx) => idx === i ? { ...b, phones: b.phones.map((p, x) => x === pi ? val : p) } : b) }));
  const addBranchPhone = (i) => setC(prev => ({ ...prev, branches: prev.branches.map((b, idx) => idx === i ? { ...b, phones: [...b.phones, ''] } : b) }));
  const delBranchPhone = (i, pi) => setC(prev => ({ ...prev, branches: prev.branches.map((b, idx) => idx === i ? { ...b, phones: b.phones.filter((_, x) => x !== pi) } : b) }));
  const addBranch = () => setC(prev => ({ ...prev, branches: [...prev.branches, { nameEn: '', nameBn: '', addressEn: '', addressBn: '', phones: [''] }] }));
  const delBranch = (i) => setC(prev => ({ ...prev, branches: prev.branches.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="flex justify-center py-24"><FiLoader className="animate-spin text-[#F3A522]" size={30} /></div>;

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-slate-50 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#c9871a] uppercase tracking-wider flex items-center gap-1.5"><FiGlobe size={12} /> Site Content</p>
          <h1 className="text-2xl font-bold text-slate-900 outfit">Contact Page</h1>
          <p className="text-sm text-slate-500 mt-0.5">Edit each section of the public Contact page. Changes go live after save.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/contact" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-[#F3A522] hover:text-[#c9871a] transition"><FiExternalLink size={14} /> Preview</a>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/20 hover:shadow-xl disabled:opacity-50 transition">
            {saving ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} Save Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white rounded-xl border border-slate-200/70 p-1.5 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${tab === t.id ? 'bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── HERO ── */}
      {tab === 'hero' && (
        <Card title="Hero Section — the dark banner at the top">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Badge" value={c.hero.badge} onChange={v => set('hero', 'badge', v)} placeholder="Get in touch" />
            <Field label="Badge" value={c.hero.badgeBn} onChange={v => set('hero', 'badgeBn', v)} bn />
            <Field label="Title" value={c.hero.title} onChange={v => set('hero', 'title', v)} placeholder="Let's " />
            <Field label="Title" value={c.hero.titleBn} onChange={v => set('hero', 'titleBn', v)} bn />
            <Field label="Highlighted word (gold)" value={c.hero.highlight} onChange={v => set('hero', 'highlight', v)} placeholder="Connect" />
            <Field label="Highlighted word (gold)" value={c.hero.highlightBn} onChange={v => set('hero', 'highlightBn', v)} bn />
            <Field label="Subtitle" value={c.hero.subtitle} onChange={v => set('hero', 'subtitle', v)} textarea />
            <Field label="Subtitle" value={c.hero.subtitleBn} onChange={v => set('hero', 'subtitleBn', v)} textarea bn />
          </div>
        </Card>
      )}

      {/* ── CONTACT INFO ── */}
      {tab === 'info' && (
        <Card title="Contact Info cards">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Email" value={c.info.email} onChange={v => set('info', 'email', v)} placeholder="info@aptechlearning.com" />
            <Field label="Phone" value={c.info.phone} onChange={v => set('info', 'phone', v)} placeholder="+880 1611-661666" />
            <Field label="Visit / locations text" value={c.info.visitText} onChange={v => set('info', 'visitText', v)} placeholder="Narsingdi · Bhairab · Brahmanbaria" />
            <Field label="Visit / locations text" value={c.info.visitTextBn} onChange={v => set('info', 'visitTextBn', v)} bn />
            <Field label="Office hours" value={c.info.officeHours} onChange={v => set('info', 'officeHours', v)} placeholder="Sat–Thu, 9AM–8PM" />
            <Field label="Office hours" value={c.info.officeHoursBn} onChange={v => set('info', 'officeHoursBn', v)} bn />
          </div>
        </Card>
      )}

      {/* ── BRANCHES ── */}
      {tab === 'branches' && (
        <div className="space-y-4">
          {c.branches.map((b, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-[#FEF6E7] text-[#c9871a] flex items-center justify-center text-xs font-black">{i + 1}</span> Branch {i + 1}</h3>
                <button onClick={() => delBranch(i)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"><FiTrash2 size={15} /></button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Branch name" value={b.nameEn} onChange={v => setBranch(i, 'nameEn', v)} placeholder="Narsingdi Branch" />
                <Field label="Branch name" value={b.nameBn} onChange={v => setBranch(i, 'nameBn', v)} bn />
                <Field label="Address" value={b.addressEn} onChange={v => setBranch(i, 'addressEn', v)} textarea />
                <Field label="Address" value={b.addressBn} onChange={v => setBranch(i, 'addressBn', v)} textarea bn />
              </div>
              <div className="mt-4">
                <label className={lbl}>Phone numbers</label>
                <div className="space-y-2">
                  {b.phones.map((p, pi) => (
                    <div key={pi} className="flex gap-2">
                      <input value={p} onChange={e => setBranchPhone(i, pi, e.target.value)} className={`${inp} font-mono`} placeholder="01700000000" />
                      <button onClick={() => delBranchPhone(i, pi)} className="px-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><FiX size={15} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addBranchPhone(i)} className="mt-2 text-xs font-bold text-[#c9871a] hover:underline inline-flex items-center gap-1"><FiPlus size={12} /> Add phone</button>
              </div>
            </Card>
          ))}
          <button onClick={addBranch} className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-[#F3A522] hover:text-[#c9871a] text-sm font-bold inline-flex items-center justify-center gap-2 transition"><FiPlus size={15} /> Add Branch</button>
        </div>
      )}

      {/* ── MAP ── */}
      {tab === 'map' && (
        <Card title="Google Map embed">
          <Field label="Map embed URL (Google Maps → Share → Embed → copy the src)" value={c.map.embedUrl} onChange={v => set('map', 'embedUrl', v)} placeholder="https://www.google.com/maps?q=...&output=embed" />
          {c.map.embedUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-100">
              <iframe src={c.map.embedUrl} width="100%" height="240" className="border-0" loading="lazy" title="Map preview" />
            </div>
          )}
        </Card>
      )}

      {/* ── SOCIAL ── */}
      {tab === 'social' && (
        <div className="space-y-4">
          <Card title="Social links">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Facebook URL" value={c.social.facebook} onChange={v => set('social', 'facebook', v)} placeholder="https://facebook.com/..." />
              <Field label="YouTube URL" value={c.social.youtube} onChange={v => set('social', 'youtube', v)} placeholder="https://youtube.com/..." />
              <Field label="LinkedIn URL" value={c.social.linkedin} onChange={v => set('social', 'linkedin', v)} placeholder="https://linkedin.com/..." />
              <Field label="WhatsApp number (digits only)" value={c.social.whatsapp} onChange={v => set('social', 'whatsapp', v)} placeholder="8801611661666" />
            </div>
          </Card>
          <Card title="Section texts">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Follow-us title" value={c.social.followTitle} onChange={v => set('social', 'followTitle', v)} placeholder="Follow Us" />
              <Field label="Follow-us title" value={c.social.followTitleBn} onChange={v => set('social', 'followTitleBn', v)} bn />
              <Field label="WhatsApp box title" value={c.social.quickTitle} onChange={v => set('social', 'quickTitle', v)} placeholder="Need quick help?" />
              <Field label="WhatsApp box title" value={c.social.quickTitleBn} onChange={v => set('social', 'quickTitleBn', v)} bn />
              <Field label="WhatsApp box text" value={c.social.quickDesc} onChange={v => set('social', 'quickDesc', v)} textarea />
              <Field label="WhatsApp box text" value={c.social.quickDescBn} onChange={v => set('social', 'quickDescBn', v)} textarea bn />
            </div>
          </Card>
        </div>
      )}

      {toastNode}
    </div>
  );
}

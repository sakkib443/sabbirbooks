'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FiCalendar, FiLoader, FiClock, FiVideo, FiMapPin, FiExternalLink,
  FiFileText, FiUsers, FiFolder, FiArrowRight, FiCheck, FiChevronDown, FiCheckCircle,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const typeBadge = (t) => ({
  live: { label: 'Live', cls: 'bg-rose-50 text-rose-600 border-rose-200', icon: <FiVideo size={10} /> },
  offline: { label: 'Offline', cls: 'bg-brand-soft text-brand-deep border-brand-line', icon: <FiMapPin size={10} /> },
  recorded: { label: 'Recorded', cls: 'bg-dash-soft2 text-dash-ink4 border-dash-line', icon: <FiVideo size={10} /> },
}[t] || { label: t || 'Class', cls: 'bg-dash-soft2 text-dash-ink4 border-dash-line', icon: <FiFolder size={10} /> });

// Classes shown on the schedule = NOT yet completed (and not cancelled).
const isDone = (c) => c.status === 'completed' || c.status === 'cancelled';

export default function MentorSchedulePage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, c] = await Promise.all([
          fetch(`${API}/batches/my-batches`, { headers: auth() }).then(r => r.json()),
          fetch(`${API}/classes/mentor/my-classes`, { headers: auth() }).then(r => r.json()),
        ]);
        setBatches(b.data || []);
        setClasses(c.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const batchIdOf = (c) => (typeof c.batchId === 'object' ? c.batchId?._id : c.batchId);
  const inBatch = (c) => selectedBatch === 'all' || batchIdOf(c) === selectedBatch;

  // Next classes = not completed/cancelled, soonest first
  const nextClasses = useMemo(() => classes
    .filter(c => inBatch(c) && !isDone(c))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0) || (a.startTime || '').localeCompare(b.startTime || '')),
    [classes, selectedBatch]);

  const completedCount = useMemo(() => classes.filter(c => inBatch(c) && c.status === 'completed').length, [classes, selectedBatch]);

  const markCompleted = async (cls) => {
    if (!(await confirm({ title: 'Class Completed?', message: `"${cls.title || 'এই ক্লাস'}" completed করলে Schedule থেকে সরে যাবে (Batch Materials-এ history-তে থাকবে)।`, confirmText: 'Mark Completed' }))) return;
    setBusy(cls._id);
    try {
      const res = await fetch(`${API}/classes/${cls._id}`, { method: 'PATCH', headers: hdrs(), body: JSON.stringify({ status: 'completed' }) });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setClasses(prev => prev.map(x => x._id === cls._id ? { ...x, status: 'completed' } : x));
        showToast('success', 'Class completed ✓');
      } else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-brand" size={28} /></div>;

  const ClassRow = ({ cls }) => {
    const badge = typeBadge(cls.type);
    const batch = typeof cls.batchId === 'object' ? cls.batchId : null;
    const bId = batchIdOf(cls);
    const d = cls.date ? new Date(cls.date) : null;
    const overdue = d && d.getTime() < startOfToday().getTime();
    const recs = (cls.recordings?.length || 0) || (cls.recordingUrl ? 1 : 0);
    return (
      <div className="flex items-stretch gap-3 bg-dash-card rounded-xl border border-dash-line hover:shadow-md hover:border-brand-line transition overflow-hidden">
        {/* date block */}
        <div className={`flex flex-col items-center justify-center px-4 py-3 shrink-0 w-[68px] ${overdue ? 'bg-rose-50 text-rose-600' : 'bg-brand-soft text-brand-deep'}`}>
          <span className="text-[10px] font-bold uppercase">{d ? d.toLocaleDateString('en-GB', { month: 'short' }) : '—'}</span>
          <span className="text-2xl font-black leading-none outfit">{d ? d.getDate() : '—'}</span>
          <span className={`text-[9px] ${overdue ? 'text-rose-400' : 'text-brand-ink'}`}>{d ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : ''}</span>
        </div>
        {/* details */}
        <div className="flex-1 min-w-0 py-3 pr-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-dash-ink2 truncate">{cls.title || cls.topic || 'Class'}</h3>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${badge.cls}`}>{badge.icon}{badge.label}</span>
            {overdue && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Overdue</span>}
            {cls.sentToStudents && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"><FiCheck size={8} /> Sent</span>}
          </div>
          {cls.topic && <p className="text-xs text-dash-mute truncate mt-0.5">{cls.topic}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-dash-mute2 flex-wrap">
            <span className="flex items-center gap-1"><FiClock size={10} className="text-brand-ink" /> {cls.startTime || '—'}{cls.endTime ? `–${cls.endTime}` : ''}</span>
            <span className="flex items-center gap-1"><FiUsers size={10} /> {batch?.id || batch?.courseName || '—'}</span>
            {cls.materials?.length > 0 && <span className="flex items-center gap-1"><FiFileText size={10} /> {cls.materials.length} material{cls.materials.length !== 1 ? 's' : ''}</span>}
            {recs > 0 && <span className="flex items-center gap-1 text-violet-500"><FiVideo size={10} /> {recs} rec</span>}
            {cls.venue && <span className="flex items-center gap-1"><FiMapPin size={10} /> {cls.venue}</span>}
          </div>
        </div>
        {/* actions */}
        <div className="flex flex-col items-end justify-center gap-1.5 pr-3 py-3 shrink-0">
          <button onClick={() => markCompleted(cls)} disabled={busy === cls._id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 disabled:opacity-50 transition">
            {busy === cls._id ? <FiLoader className="animate-spin" size={11} /> : <FiCheckCircle size={11} />} Complete
          </button>
          <div className="flex items-center gap-2">
            {cls.type === 'live' && cls.meetingLink && (
              <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline">Join <FiExternalLink size={10} /></a>
            )}
            {bId && (
              <Link href={`/dashboard/mentor/batch-materials/${bId}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-ink hover:underline">Manage <FiArrowRight size={10} /></Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2 outfit">Schedule</h1>
          <p className="text-sm text-dash-mute mt-0.5">তোমার <b className="text-brand-ink">পরবর্তী ক্লাসগুলো</b> · Complete করলে সরে যাবে · তৈরি/এডিট হয় <b className="text-brand-ink">Batch Materials</b> থেকে</p>
        </div>
        <div className="relative">
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-dash-line text-sm font-medium text-dash-ink4 bg-dash-card focus:outline-none focus:border-brand">
            <option value="all">All Batches</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name || b.courseName}</option>)}
          </select>
          <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dash-mute2 pointer-events-none" size={14} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Next Classes', value: nextClasses.length, c: 'text-brand-ink', b: 'bg-brand-soft' },
          { label: 'Completed', value: completedCount, c: 'text-emerald-600', b: 'bg-emerald-50' },
          { label: 'With Recording', value: nextClasses.filter(c => (c.recordings?.length > 0) || c.recordingUrl).length, c: 'text-violet-600', b: 'bg-violet-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-dash-line/70 p-4 ${s.b}`}>
            <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
            <p className="text-[11px] text-dash-mute2">{s.label}</p>
          </div>
        ))}
      </div>

      {nextClasses.length === 0 ? (
        <div className="bg-dash-card rounded-xl border border-dash-line p-16 text-center">
          <FiCalendar className="mx-auto text-dash-faint mb-4" size={40} />
          <h3 className="text-lg font-bold text-dash-ink3 mb-1">No Upcoming Classes</h3>
          <p className="text-sm text-dash-mute mb-4">সব ক্লাস completed অথবা এখনো তৈরি হয়নি। নতুন ক্লাস Batch Materials থেকে তৈরি করো।</p>
          <Link href="/dashboard/mentor/batch-materials" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-strong transition">
            <FiFolder size={14} /> Go to Batch Materials
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {nextClasses.map(c => <ClassRow key={c._id} cls={c} />)}
        </div>
      )}

      {completedCount > 0 && (
        <p className="text-center text-xs text-dash-mute2">
          {completedCount}টি ক্লাস completed — history দেখতে <Link href="/dashboard/mentor/batch-materials" className="text-brand-ink font-semibold hover:underline">Batch Materials</Link>-এ যাও
        </p>
      )}

      {toastNode}{confirmNode}
    </div>
  );
}

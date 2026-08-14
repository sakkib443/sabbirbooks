'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FiLoader, FiClipboard, FiPlus, FiChevronDown, FiArrowLeft, FiSave,
  FiUsers, FiCheckCircle, FiTrash2, FiX, FiAward, FiCalendar, FiEdit3,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const nameOf = (s) => s?.name || [s?.firstName, s?.lastName].filter(Boolean).join(' ').trim() || s?.email || 'Student';

export default function MentorGradingPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);      // all enrollments (mentor-students)
  const [batchId, setBatchId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [open, setOpen] = useState(null);            // the assignment being marked

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', totalMarks: 100, date: '' });
  const [creating, setCreating] = useState(false);

  // marksheet
  const [marks, setMarks] = useState({});            // studentId -> { marks, feedback }
  const [savingMarks, setSavingMarks] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [b, s] = await Promise.all([
          fetch(`${API}/batches/my-batches`, { headers: auth() }).then(r => r.json()),
          fetch(`${API}/enrollments/mentor-students`, { headers: auth() }).then(r => r.json()),
        ]);
        const bl = b.data || [];
        setBatches(bl);
        setStudents(s.data || []);
        if (bl.length) setBatchId(bl[0]._id);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const loadAssignments = async (bid) => {
    if (!bid) return;
    try {
      const r = await fetch(`${API}/assignments?batchId=${bid}`, { headers: auth() }).then(r => r.json());
      setAssignments(r.data || []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (batchId) { setOpen(null); loadAssignments(batchId); } }, [batchId]);

  const batch = useMemo(() => batches.find(b => b._id === batchId), [batches, batchId]);
  const batchStudents = useMemo(() => students.filter(e => {
    const eb = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
    return eb === batchId;
  }).map(e => ({
    id: e.studentId?._id || e.studentId,
    name: nameOf(e.studentId),
    email: e.studentId?.email || '',
    phone: e.studentId?.phoneNumber || '',
  })), [students, batchId]);

  // ── Create assignment ──
  const createAssignment = async () => {
    if (!form.title.trim()) return showToast('error', 'Assignment name দিন');
    if (!form.totalMarks || Number(form.totalMarks) < 1) return showToast('error', 'Total marks দিন');
    setCreating(true);
    try {
      const courseId = batch?.courseId?._id || batch?.courseId;
      const body = { title: form.title.trim(), totalMarks: Number(form.totalMarks), courseId, batchId, isPublished: true };
      if (form.date) body.deadline = form.date;
      const r = await fetch(`${API}/assignments`, { method: 'POST', headers: hdrs(), body: JSON.stringify(body) }).then(r => r.json());
      if (r.success) {
        setShowCreate(false);
        setForm({ title: '', totalMarks: 100, date: '' });
        await loadAssignments(batchId);
        showToast('success', 'Assignment তৈরি হয়েছে');
      } else showToast('error', r.message || 'তৈরি করা যায়নি');
    } catch { showToast('error', 'Network error'); }
    finally { setCreating(false); }
  };

  const deleteAssignment = async (a) => {
    if (!(await confirm({ title: `Delete "${a.title}"?`, message: 'এই assignment ও এর সব নম্বর মুছে যাবে।', confirmText: 'Delete', danger: true }))) return;
    try {
      const r = await fetch(`${API}/assignments/${a._id}`, { method: 'DELETE', headers: auth() }).then(r => r.json());
      if (r.success !== false) { setAssignments(prev => prev.filter(x => x._id !== a._id)); showToast('success', 'Deleted'); }
      else showToast('error', r.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
  };

  // ── Open marksheet ──
  const openSheet = async (a) => {
    setOpen(a);
    setLoadingSheet(true);
    try {
      const r = await fetch(`${API}/assignments/${a._id}/submissions`, { headers: auth() }).then(r => r.json());
      const map = {};
      (r.data || []).forEach(sub => {
        const sid = sub.studentId?._id || sub.studentId;
        map[sid] = { marks: sub.marks ?? '', feedback: sub.feedback || '' };
      });
      setMarks(map);
    } catch { showToast('error', 'Load করা যায়নি'); }
    finally { setLoadingSheet(false); }
  };

  const setMark = (sid, field, val) => setMarks(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: val } }));

  const saveMarks = async () => {
    setSavingMarks(true);
    try {
      const payload = batchStudents.map(s => ({ studentId: s.id, marks: marks[s.id]?.marks, feedback: marks[s.id]?.feedback || '' }));
      const r = await fetch(`${API}/assignments/${open._id}/marks`, { method: 'POST', headers: hdrs(), body: JSON.stringify({ marks: payload }) }).then(r => r.json());
      if (r.success) { showToast('success', 'নম্বর সেভ হয়েছে'); await loadAssignments(batchId); }
      else showToast('error', r.message || 'সেভ করা যায়নি');
    } catch { showToast('error', 'Network error'); }
    finally { setSavingMarks(false); }
  };

  // marksheet stats
  const sheetStats = useMemo(() => {
    const vals = batchStudents.map(s => marks[s.id]?.marks).filter(v => v !== '' && v !== undefined && v !== null).map(Number);
    const graded = vals.length;
    const total = open?.totalMarks || 0;
    const avg = graded ? Math.round(vals.reduce((a, b) => a + b, 0) / graded) : 0;
    const high = graded ? Math.max(...vals) : 0;
    const pass = total ? vals.filter(v => v >= total * 0.4).length : 0;
    return { graded, avg, high, pass, count: batchStudents.length };
  }, [marks, batchStudents, open]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-brand" size={28} /></div>;

  if (batches.length === 0) {
    return (
      <div className="bg-dash-card rounded-xl border border-dash-line p-16 text-center">
        <FiClipboard className="mx-auto text-dash-faint mb-4" size={40} />
        <h3 className="text-lg font-bold text-dash-ink3 mb-1">No Batches Assigned</h3>
        <p className="text-sm text-dash-mute">Assignment marks দিতে হলে আগে একটা batch assigned থাকতে হবে।</p>
      </div>
    );
  }

  // ═══════════ MARKSHEET VIEW ═══════════
  if (open) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(null)} className="w-10 h-10 rounded-xl bg-dash-soft2 flex items-center justify-center text-dash-mute hover:bg-dash-soft3 transition"><FiArrowLeft size={16} /></button>
            <div>
              <h1 className="text-xl font-bold text-dash-ink2 outfit">{open.title}</h1>
              <p className="text-sm text-dash-mute">{batch?.name} · Total <b className="text-brand-ink">{open.totalMarks}</b> marks · {batchStudents.length} students</p>
            </div>
          </div>
          <button onClick={saveMarks} disabled={savingMarks}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-hover text-white text-sm font-bold shadow-lg shadow-brand/25 hover:shadow-xl disabled:opacity-50 transition">
            {savingMarks ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} Save Marks
          </button>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Graded', value: `${sheetStats.graded}/${sheetStats.count}`, c: 'text-brand-ink', b: 'bg-brand-soft' },
            { label: 'Average', value: sheetStats.avg, c: 'text-sky-600', b: 'bg-sky-50' },
            { label: 'Highest', value: sheetStats.high, c: 'text-emerald-600', b: 'bg-emerald-50' },
            { label: 'Passed (≥40%)', value: sheetStats.pass, c: 'text-violet-600', b: 'bg-violet-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-dash-line/70 p-3 text-center ${s.b}`}>
              <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
              <p className="text-[10px] uppercase font-bold text-dash-mute2">{s.label}</p>
            </div>
          ))}
        </div>

        {/* marksheet table */}
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm overflow-hidden">
          {loadingSheet ? (
            <div className="flex justify-center py-16"><FiLoader className="animate-spin text-brand" size={24} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase w-10">#</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase">Student</th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold uppercase w-40">Marks / {open.totalMarks}</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase">Note (optional)</th>
                  </tr>
                </thead>
                <tbody>
                  {batchStudents.map((s, i) => {
                    const m = marks[s.id] || {};
                    const has = m.marks !== '' && m.marks !== undefined && m.marks !== null;
                    return (
                      <tr key={s.id} className="border-b border-dash-soft last:border-0 hover:bg-brand-soft/40 transition">
                        <td className="px-4 py-2.5 text-[11px] font-bold text-dash-mute2">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{s.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-xs font-semibold text-dash-ink3">{s.name}</p>
                              <p className="text-[9px] text-dash-mute2">{s.email || s.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <input type="number" min="0" max={open.totalMarks} value={m.marks ?? ''}
                              onChange={e => setMark(s.id, 'marks', e.target.value)}
                              placeholder="—"
                              className={`w-20 px-2 py-1.5 text-sm text-center font-bold border-2 rounded-lg outline-none focus:border-brand ${has ? 'border-brand-line bg-brand-soft text-brand-deep' : 'border-dash-line text-dash-ink4'}`} />
                            <span className="text-xs text-dash-mute2">/ {open.totalMarks}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input value={m.feedback || ''} onChange={e => setMark(s.id, 'feedback', e.target.value)} placeholder="Optional note"
                            className="w-full px-2 py-1.5 text-xs border border-dash-line rounded-lg outline-none focus:border-brand" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {toastNode}{confirmNode}
      </div>
    );
  }

  // ═══════════ LIST VIEW ═══════════
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2 outfit">Grading</h1>
          <p className="text-sm text-dash-mute mt-0.5">Assignment তৈরি করে batch-এর students-দের নম্বর তুলুন</p>
        </div>
        <div className="flex items-center gap-2">
          {batches.length > 1 && (
            <div className="relative">
              <select value={batchId} onChange={e => setBatchId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-dash-line text-sm font-medium text-dash-ink4 bg-dash-card focus:outline-none focus:border-brand">
                {batches.map(b => <option key={b._id} value={b._id}>{b.name || b.courseName}</option>)}
              </select>
              <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dash-mute2 pointer-events-none" size={14} />
            </div>
          )}
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-hover text-white text-sm font-bold shadow-lg shadow-brand/25 hover:shadow-xl transition">
            <FiPlus size={16} /> Create Assignment
          </button>
        </div>
      </div>

      {batches.length > 1 && (
        <p className="text-xs text-dash-mute2">Batch: <b className="text-dash-ink4">{batch?.name}</b> · {batchStudents.length} students</p>
      )}

      {/* Assignment list */}
      {assignments.length === 0 ? (
        <div className="bg-dash-card rounded-xl border border-dash-line p-16 text-center">
          <FiClipboard className="mx-auto text-dash-faint mb-4" size={40} />
          <h3 className="text-lg font-bold text-dash-ink3 mb-1">No Assignments Yet</h3>
          <p className="text-sm text-dash-mute mb-4">Create your first assignment to start entering marks.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-strong transition">
            <FiPlus className="inline mr-1" size={14} /> Create Assignment
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assignments.map(a => (
            <div key={a._id} className="bg-dash-card rounded-2xl border border-dash-line p-5 hover:shadow-md hover:border-brand-line transition group">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shrink-0">
                  <FiClipboard size={18} />
                </div>
                <button onClick={() => deleteAssignment(a)} className="p-1.5 rounded-lg text-dash-faint hover:text-rose-500 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"><FiTrash2 size={14} /></button>
              </div>
              <h3 className="text-base font-bold text-dash-ink2 mt-3">{a.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-dash-mute2">
                <span className="flex items-center gap-1"><FiAward size={11} className="text-brand-ink" /> {a.totalMarks} marks</span>
                {a.deadline && <span className="flex items-center gap-1"><FiCalendar size={11} /> {new Date(a.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
              </div>
              <button onClick={() => openSheet(a)}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-brand-line bg-brand-soft text-brand-deep text-sm font-bold hover:bg-brand hover:text-white transition">
                <FiEdit3 size={14} /> Enter / View Marks
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-dash-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand to-brand-hover text-white">
              <h3 className="font-bold text-lg outfit flex items-center gap-2"><FiPlus /> Create Assignment</h3>
              <button onClick={() => setShowCreate(false)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[11px] text-dash-mute2">Batch: <b className="text-dash-ink4">{batch?.name}</b> ({batchStudents.length} students)</p>
              <div>
                <label className="text-[10px] font-bold text-dash-mute uppercase block mb-1">Assignment Name *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Assignment 1" className="w-full px-3 py-2.5 text-sm border border-dash-line rounded-lg focus:outline-none focus:border-brand" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-dash-mute uppercase block mb-1">Total Marks *</label>
                  <input type="number" min="1" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-dash-line rounded-lg focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-dash-mute uppercase block mb-1">Date (optional)</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-dash-line rounded-lg focus:outline-none focus:border-brand" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-dash-line-soft">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg border border-dash-line text-dash-ink4 text-sm font-semibold hover:bg-dash-soft">Cancel</button>
              <button onClick={createAssignment} disabled={creating} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-strong disabled:opacity-50">
                {creating ? <FiLoader className="animate-spin" size={15} /> : <><FiPlus size={15} /> Create</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}{confirmNode}
    </div>
  );
}

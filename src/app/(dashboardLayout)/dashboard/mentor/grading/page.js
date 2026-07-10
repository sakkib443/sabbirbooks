'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FiLoader, FiClipboard, FiPlus, FiChevronDown, FiArrowLeft, FiSave,
  FiUsers, FiCheckCircle, FiTrash2, FiX, FiAward, FiCalendar, FiEdit3,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
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

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>;

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
        <FiClipboard className="mx-auto text-slate-300 mb-4" size={40} />
        <h3 className="text-lg font-bold text-slate-700 mb-1">No Batches Assigned</h3>
        <p className="text-sm text-slate-500">Assignment marks দিতে হলে আগে একটা batch assigned থাকতে হবে।</p>
      </div>
    );
  }

  // ═══════════ MARKSHEET VIEW ═══════════
  if (open) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(null)} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"><FiArrowLeft size={16} /></button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 outfit">{open.title}</h1>
              <p className="text-sm text-slate-500">{batch?.name} · Total <b className="text-[#c9871a]">{open.totalMarks}</b> marks · {batchStudents.length} students</p>
            </div>
          </div>
          <button onClick={saveMarks} disabled={savingMarks}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/25 hover:shadow-xl disabled:opacity-50 transition">
            {savingMarks ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />} Save Marks
          </button>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Graded', value: `${sheetStats.graded}/${sheetStats.count}`, c: 'text-[#c9871a]', b: 'bg-[#FEF6E7]' },
            { label: 'Average', value: sheetStats.avg, c: 'text-sky-600', b: 'bg-sky-50' },
            { label: 'Highest', value: sheetStats.high, c: 'text-emerald-600', b: 'bg-emerald-50' },
            { label: 'Passed (≥40%)', value: sheetStats.pass, c: 'text-violet-600', b: 'bg-violet-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border border-slate-200/70 p-3 text-center ${s.b}`}>
              <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* marksheet table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingSheet ? (
            <div className="flex justify-center py-16"><FiLoader className="animate-spin text-[#F3A522]" size={24} /></div>
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
                      <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-[#FEF6E7]/40 transition">
                        <td className="px-4 py-2.5 text-[11px] font-bold text-slate-400">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{s.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{s.name}</p>
                              <p className="text-[9px] text-slate-400">{s.email || s.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <input type="number" min="0" max={open.totalMarks} value={m.marks ?? ''}
                              onChange={e => setMark(s.id, 'marks', e.target.value)}
                              placeholder="—"
                              className={`w-20 px-2 py-1.5 text-sm text-center font-bold border-2 rounded-lg outline-none focus:border-[#F3A522] ${has ? 'border-[#F0DFB4] bg-[#FEF6E7] text-[#a5680f]' : 'border-slate-200 text-slate-600'}`} />
                            <span className="text-xs text-slate-400">/ {open.totalMarks}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input value={m.feedback || ''} onChange={e => setMark(s.id, 'feedback', e.target.value)} placeholder="Optional note"
                            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-[#F3A522]" />
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
          <h1 className="text-2xl font-bold text-slate-800 outfit">Grading</h1>
          <p className="text-sm text-slate-500 mt-0.5">Assignment তৈরি করে batch-এর students-দের নম্বর তুলুন</p>
        </div>
        <div className="flex items-center gap-2">
          {batches.length > 1 && (
            <div className="relative">
              <select value={batchId} onChange={e => setBatchId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 bg-white focus:outline-none focus:border-[#F3A522]">
                {batches.map(b => <option key={b._id} value={b._id}>{b.name || b.courseName}</option>)}
              </select>
              <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          )}
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/25 hover:shadow-xl transition">
            <FiPlus size={16} /> Create Assignment
          </button>
        </div>
      </div>

      {batches.length > 1 && (
        <p className="text-xs text-slate-400">Batch: <b className="text-slate-600">{batch?.name}</b> · {batchStudents.length} students</p>
      )}

      {/* Assignment list */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiClipboard className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Assignments Yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first assignment to start entering marks.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] transition">
            <FiPlus className="inline mr-1" size={14} /> Create Assignment
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {assignments.map(a => (
            <div key={a._id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-[#F0DFB4] transition group">
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white shrink-0">
                  <FiClipboard size={18} />
                </div>
                <button onClick={() => deleteAssignment(a)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"><FiTrash2 size={14} /></button>
              </div>
              <h3 className="text-base font-bold text-slate-800 mt-3">{a.title}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1"><FiAward size={11} className="text-[#c9871a]" /> {a.totalMarks} marks</span>
                {a.deadline && <span className="flex items-center gap-1"><FiCalendar size={11} /> {new Date(a.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>}
              </div>
              <button onClick={() => openSheet(a)}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#F0DFB4] bg-[#FEF6E7] text-[#a5680f] text-sm font-bold hover:bg-[#F3A522] hover:text-white transition">
                <FiEdit3 size={14} /> Enter / View Marks
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !creating && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white">
              <h3 className="font-bold text-lg outfit flex items-center gap-2"><FiPlus /> Create Assignment</h3>
              <button onClick={() => setShowCreate(false)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[11px] text-slate-400">Batch: <b className="text-slate-600">{batch?.name}</b> ({batchStudents.length} students)</p>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Assignment Name *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Assignment 1" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total Marks *</label>
                  <input type="number" min="1" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Date (optional)</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={createAssignment} disabled={creating} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50">
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

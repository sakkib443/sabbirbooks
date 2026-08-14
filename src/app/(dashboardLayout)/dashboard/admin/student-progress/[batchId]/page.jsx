'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FiLoader, FiUsers, FiSearch, FiX, FiArrowLeft, FiCalendar,
  FiClipboard, FiRefreshCw,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const overallColor = (p) => (p >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : p >= 60 ? 'text-sky-600 bg-sky-50 border-sky-200' : p >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-500 bg-rose-50 border-rose-200');

export default function StudentProgressDetailPage() {
  const { batchId } = useParams();
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState({});
  const [prog, setProg] = useState({ assignments: [], students: [] });
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bd, pr] = await Promise.all([
        fetch(`${API}/analytics/batch-details/${batchId}`, { headers: hdrs() }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/assignments/batch/${batchId}/progress`, { headers: hdrs() }).then(r => r.json()).catch(() => ({})),
      ]);
      setBatch(bd?.data?.batch || {});
      setProg(pr?.success ? pr.data : { assignments: [], students: [] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [batchId]);
  useEffect(() => { load(); }, [load]);

  const students = (prog.students || []).filter((s) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (s.name || '').toLowerCase().includes(t) || (s.email || '').toLowerCase().includes(t) || (s.phone || '').includes(t);
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-brand" size={28} /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/student-progress" className="w-9 h-9 rounded-lg bg-dash-card border border-dash-line flex items-center justify-center text-dash-mute hover:text-brand-ink hover:border-brand-line transition shrink-0">
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-dash-ink2 outfit">{batch.name || batch.courseName || 'Batch'}</h1>
              {batch.status && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${batch.status === 'active' || batch.status === 'running' ? 'bg-emerald-50 text-emerald-600' : batch.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-dash-soft2 text-dash-mute'}`}>{batch.status}</span>}
            </div>
            <p className="text-xs text-dash-mute2 mt-0.5 flex items-center gap-3">
              <span>{batch.courseName || batch.courseId?.title}</span>
              <span className="flex items-center gap-1"><FiCalendar size={10} /> {fmtDate(batch.startDate)}</span>
              <span className="flex items-center gap-1"><FiUsers size={10} /> {prog.students.length} students</span>
              <span className="flex items-center gap-1 text-brand-ink"><FiClipboard size={10} /> {prog.assignments.length} assignments</span>
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dash-ink4 bg-dash-card border border-dash-line rounded-lg hover:bg-dash-soft transition shrink-0">
          <FiRefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-dash-ink4">{students.length} Students</span>
        <div className="flex items-center gap-1.5 bg-dash-card border border-dash-line rounded-lg px-2.5 py-1.5 w-56">
          <FiSearch size={12} className="text-dash-mute2" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search students..."
            className="text-sm text-dash-ink4 outline-none bg-transparent w-full placeholder:text-dash-mute2" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-dash-mute2 hover:text-dash-ink4"><FiX size={11} /></button>}
        </div>
      </div>

      {prog.students.length === 0 ? (
        <div className="bg-dash-card rounded-xl border border-dash-line p-16 text-center text-dash-mute2">
          <FiUsers className="mx-auto mb-2" size={30} /> No students enrolled in this batch
        </div>
      ) : prog.assignments.length === 0 ? (
        <div className="bg-dash-card rounded-xl border border-dashed border-dash-line p-12 text-center text-sm text-dash-mute2">
          <FiClipboard className="mx-auto mb-2 text-dash-faint" size={28} /> এই batch-এ এখনো কোনো assignment তৈরি হয়নি।
        </div>
      ) : (
        <>
          <div className="bg-dash-card rounded-xl border border-dash-line overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="sticky left-0 z-10 bg-slate-800 text-left px-3 py-3 text-[11px] font-bold uppercase w-10">#</th>
                  <th className="sticky left-[40px] z-10 bg-slate-800 text-left px-3 py-3 text-[11px] font-bold uppercase min-w-[150px]">Student</th>
                  {prog.assignments.map((a) => (
                    <th key={a._id} className="text-center px-3 py-3 text-[10px] font-bold uppercase min-w-[90px]">
                      <div className="truncate max-w-[110px] mx-auto" title={a.title}>{a.title}</div>
                      <div className="text-[8px] font-normal text-dash-faint">/ {a.totalMarks}</div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase bg-brand-ink min-w-[80px]">Overall</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.studentId} className="border-b border-dash-soft last:border-0 hover:bg-brand-soft/40">
                    <td className="sticky left-0 z-[1] bg-dash-card px-3 py-2.5 text-[11px] font-bold text-dash-mute2">{i + 1}</td>
                    <td className="sticky left-[40px] z-[1] bg-dash-card px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{s.name?.charAt(0)?.toUpperCase() || '?'}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-dash-ink2 truncate max-w-[130px]">{s.name}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.studentStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : s.studentStatus === 'dropout' ? 'bg-rose-50 text-rose-500' : 'bg-dash-soft2 text-dash-mute'}`}>{s.studentStatus}</span>
                        </div>
                      </div>
                    </td>
                    {prog.assignments.map((a) => {
                      const m = s.marks?.[a._id];
                      const has = m !== undefined && m !== null;
                      const pct = has ? (m / a.totalMarks) * 100 : 0;
                      return (
                        <td key={a._id} className="px-3 py-2.5 text-center">
                          {has ? (
                            <span className={`text-sm font-bold ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>{m}<span className="text-[10px] text-dash-mute2 font-normal">/{a.totalMarks}</span></span>
                          ) : <span className="text-dash-faint text-xs">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      {s.gradedCount > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${overallColor(s.overallPct)}`}>{s.overallPct}%</span>
                          <span className="text-[9px] text-dash-mute2 mt-0.5">{s.totalObtained}/{s.totalMax}</span>
                        </div>
                      ) : <span className="text-dash-faint text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-dash-mute2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 80%+ Excellent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> 60-79% Good</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 40-59% Average</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Below 40%</span>
          </div>
        </>
      )}
    </div>
  );
}

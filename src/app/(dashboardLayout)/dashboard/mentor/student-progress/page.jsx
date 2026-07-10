'use client';

import React, { useState, useEffect } from 'react';
import {
  FiLoader, FiUsers, FiSearch, FiX, FiChevronDown, FiBook,
  FiClipboard, FiCalendar, FiAward,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const overallColor = (pct) => {
  if (pct >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (pct >= 60) return 'text-sky-600 bg-sky-50 border-sky-200';
  if (pct >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-rose-500 bg-rose-50 border-rose-200';
};

export default function MentorStudentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [progress, setProgress] = useState({ assignments: [], students: [] });
  const [loadingProg, setLoadingProg] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/batches/my-batches`, { headers: auth() }).then(r => r.json());
        setBatches(r.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const toggleBatch = async (batchId) => {
    if (expandedBatch === batchId) { setExpandedBatch(null); setProgress({ assignments: [], students: [] }); return; }
    setExpandedBatch(batchId);
    setLoadingProg(true);
    setSearchTerm('');
    try {
      const r = await fetch(`${API}/assignments/batch/${batchId}/progress`, { headers: auth() }).then(r => r.json());
      setProgress(r.success ? r.data : { assignments: [], students: [] });
    } catch (e) { console.error(e); setProgress({ assignments: [], students: [] }); }
    finally { setLoadingProg(false); }
  };

  const students = progress.students.filter(s => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (s.name || '').toLowerCase().includes(t) || (s.email || '').toLowerCase().includes(t) || (s.phone || '').includes(t);
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 outfit">Student Progress</h1>
        <p className="text-sm text-slate-500 mt-0.5">প্রতি student-এর assignment নম্বর ও overall — admin ও student নিজেও দেখতে পারে</p>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiBook className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Batches Assigned</h3>
          <p className="text-sm text-slate-500">You haven't been assigned to any batches yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => {
            const isExpanded = expandedBatch === batch._id;
            return (
              <div key={batch._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                <button onClick={() => toggleBatch(batch._id)} className="w-full text-left px-5 py-4 hover:bg-[#FEF6E7]/40 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white shadow-sm">
                        <FiBook size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">{batch.name || batch.courseName}</h3>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${batch.status === 'active' ? 'bg-emerald-50 text-emerald-600' : batch.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{batch.status}</span>
                          <code className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{batch.id}</code>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><FiCalendar size={10} />{batch.classTime || '—'}</p>
                      </div>
                    </div>
                    <FiChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30">
                    {loadingProg ? (
                      <div className="flex items-center justify-center py-12"><FiLoader className="animate-spin text-[#F3A522]" size={22} /><span className="ml-2 text-sm text-slate-400">Loading...</span></div>
                    ) : progress.students.length === 0 ? (
                      <div className="text-center py-12 text-sm text-slate-400"><FiUsers className="mx-auto mb-2" size={28} />No students enrolled</div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-600">
                            {students.length} Students · <span className="text-[#c9871a]">{progress.assignments.length} Assignments</span>
                          </span>
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 w-52">
                            <FiSearch size={12} className="text-slate-400" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search students..." className="text-sm text-slate-600 outline-none bg-transparent w-full placeholder:text-slate-400" />
                            {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600"><FiX size={11} /></button>}
                          </div>
                        </div>

                        {progress.assignments.length === 0 ? (
                          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                            <FiClipboard className="mx-auto mb-2 text-slate-300" size={26} />
                            এই batch-এ কোনো assignment নেই। Grading থেকে assignment তৈরি করে নম্বর দিন।
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-800 text-white">
                                  <th className="sticky left-0 z-10 bg-slate-800 text-left px-3 py-3 text-[11px] font-bold uppercase w-10">#</th>
                                  <th className="sticky left-[40px] z-10 bg-slate-800 text-left px-3 py-3 text-[11px] font-bold uppercase min-w-[150px]">Student</th>
                                  {progress.assignments.map(a => (
                                    <th key={a._id} className="text-center px-3 py-3 text-[10px] font-bold uppercase min-w-[90px]">
                                      <div className="truncate max-w-[110px] mx-auto" title={a.title}>{a.title}</div>
                                      <div className="text-[8px] font-normal text-slate-300">/ {a.totalMarks}</div>
                                    </th>
                                  ))}
                                  <th className="text-center px-3 py-3 text-[10px] font-bold uppercase bg-[#c9871a] min-w-[80px]">Overall</th>
                                </tr>
                              </thead>
                              <tbody>
                                {students.map((s, i) => (
                                  <tr key={s.studentId} className="border-b border-slate-50 last:border-0 hover:bg-[#FEF6E7]/40">
                                    <td className="sticky left-0 z-[1] bg-white px-3 py-2.5 text-[11px] font-bold text-slate-400">{i + 1}</td>
                                    <td className="sticky left-[40px] z-[1] bg-white px-3 py-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{s.name?.charAt(0)?.toUpperCase() || '?'}</div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{s.name}</p>
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.studentStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : s.studentStatus === 'dropout' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>{s.studentStatus}</span>
                                        </div>
                                      </div>
                                    </td>
                                    {progress.assignments.map(a => {
                                      const m = s.marks?.[a._id];
                                      const has = m !== undefined && m !== null;
                                      const pct = has ? (m / a.totalMarks) * 100 : 0;
                                      return (
                                        <td key={a._id} className="px-3 py-2.5 text-center">
                                          {has ? (
                                            <span className={`text-sm font-bold ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>{m}<span className="text-[10px] text-slate-400 font-normal">/{a.totalMarks}</span></span>
                                          ) : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                      );
                                    })}
                                    <td className="px-3 py-2.5 text-center">
                                      {s.gradedCount > 0 ? (
                                        <div className="inline-flex flex-col items-center">
                                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${overallColor(s.overallPct)}`}>{s.overallPct}%</span>
                                          <span className="text-[9px] text-slate-400 mt-0.5">{s.totalObtained}/{s.totalMax}</span>
                                        </div>
                                      ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 80%+ Excellent</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> 60-79% Good</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 40-59% Average</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Below 40%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

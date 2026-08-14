'use client';

import React, { useState, useEffect } from 'react';
import {
  FiLoader, FiClipboard, FiBook, FiTrendingUp, FiCheckCircle,
  FiAward, FiCalendar, FiChevronDown,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const cid = (v) => String(v?._id || v || '');

const overallColor = (p) => (p >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : p >= 60 ? 'text-brand-ink bg-brand-soft border-brand-line' : p >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-500 bg-rose-50 border-rose-200');
const barColor = (p) => (p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-brand' : p >= 40 ? 'bg-amber-500' : 'bg-rose-400');

export default function MyProgressPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchProgress(); }, []);

  const fetchProgress = async () => {
    try {
      const headers = auth();
      const [enrollRes, subRes] = await Promise.all([
        fetch(`${API}/enrollments/my-enrollments`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/assignments/my-submissions`, { headers }).then(r => r.json()).catch(() => ({})),
      ]);
      const enrollments = (enrollRes.data || []).filter(e => e.status !== 'deleted');
      const submissions = subRes.data || [];

      // group assignment marks by courseId
      const asgByCourse = {};
      submissions.forEach(s => {
        const c = cid(s.assignmentId?.courseId);
        if (!c) return;
        (asgByCourse[c] ||= []).push({
          id: s._id,
          title: s.assignmentId?.title || 'Assignment',
          total: s.assignmentId?.totalMarks || 0,
          marks: (s.status === 'graded' && s.marks != null) ? s.marks : null,
          feedback: s.feedback || '',
        });
      });

      // build per-course cards
      const list = [];
      for (const e of enrollments) {
        const courseId = cid(e.courseId);
        const batchId = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
        const asgs = (asgByCourse[courseId] || []).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

        let obtained = 0, max = 0, graded = 0;
        asgs.forEach(a => { if (a.marks != null) { obtained += a.marks; max += a.total; graded++; } });

        // attendance summary
        let att = { rate: 0, present: 0, late: 0, total: 0 };
        if (batchId) {
          try { const a = await fetch(`${API}/attendance/my-summary?batchId=${batchId}`, { headers }); const aj = await a.json(); if (aj.success && aj.data) att = aj.data; } catch { }
        }

        list.push({
          key: batchId || courseId,
          title: e.batchId?.name || e.courseId?.title || 'Course',
          courseTitle: e.courseId?.title || '',
          status: e.status,
          image: e.courseId?.image || '',
          assignments: asgs,
          overallPct: max > 0 ? Math.round((obtained / max) * 100) : 0,
          obtained, max, graded,
          attendance: att,
        });
      }
      setCourses(list);
      if (list.length) setExpanded(list[0].key);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-brand" size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dash-ink outfit">My Progress</h1>
        <p className="text-sm text-dash-mute mt-0.5">প্রতিটি assignment-এ তোমার নম্বর ও overall ফলাফল</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-dash-card rounded-xl border border-dash-line p-16 text-center">
          <FiTrendingUp className="mx-auto text-dash-faint mb-4" size={40} />
          <h3 className="text-lg font-bold text-dash-ink3 mb-1">No Progress Yet</h3>
          <p className="text-sm text-dash-mute">কোনো course-এ enroll করলে এখানে তোমার progress দেখাবে।</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map(course => {
            const isOpen = expanded === course.key;
            return (
              <div key={course.key} className="bg-dash-card rounded-2xl border border-dash-line overflow-hidden">
                {/* Header */}
                <button onClick={() => setExpanded(isOpen ? null : course.key)} className="w-full text-left px-5 py-4 hover:bg-dash-soft/60 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shrink-0">
                        {course.image ? <img src={course.image} alt="" className="w-full h-full object-cover" /> : <FiBook size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-dash-ink2 truncate">{course.title}</h3>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${course.status === 'active' ? 'bg-emerald-50 text-emerald-600' : course.status === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-dash-soft2 text-dash-mute'}`}>{course.status}</span>
                        </div>
                        <p className="text-xs text-dash-mute2 mt-0.5">{course.graded} graded · {course.assignments.length} assignment{course.assignments.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-dash-mute2 uppercase">Overall</p>
                        <p className={`text-xl font-black leading-none ${course.overallPct >= 60 ? 'text-brand-ink' : course.overallPct > 0 ? 'text-amber-600' : 'text-dash-faint'}`}>{course.graded > 0 ? `${course.overallPct}%` : '—'}</p>
                      </div>
                      <FiChevronDown size={16} className={`text-dash-mute2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-dash-line-soft bg-dash-soft/30 p-5 space-y-4">
                    {/* summary stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-dash-card rounded-xl border border-dash-line-soft p-3 text-center">
                        <p className="text-lg font-bold text-brand-ink">{course.graded > 0 ? `${course.obtained}/${course.max}` : '—'}</p>
                        <p className="text-[10px] text-dash-mute2 uppercase font-bold">Total Marks</p>
                      </div>
                      <div className="bg-dash-card rounded-xl border border-dash-line-soft p-3 text-center">
                        <p className={`text-lg font-bold ${overallColor(course.overallPct).split(' ')[0]}`}>{course.graded > 0 ? `${course.overallPct}%` : '—'}</p>
                        <p className="text-[10px] text-dash-mute2 uppercase font-bold">Overall</p>
                      </div>
                      <div className="bg-dash-card rounded-xl border border-dash-line-soft p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600">{course.attendance.total > 0 ? `${course.attendance.rate}%` : '—'}</p>
                        <p className="text-[10px] text-dash-mute2 uppercase font-bold">Attendance</p>
                      </div>
                    </div>

                    {/* assignment breakdown */}
                    {course.assignments.length === 0 ? (
                      <div className="bg-dash-card rounded-xl border border-dashed border-dash-line p-6 text-center text-sm text-dash-mute2">
                        <FiClipboard className="mx-auto mb-2 text-dash-faint" size={24} /> এখনো কোনো assignment নেই।
                      </div>
                    ) : (
                      <div className="bg-dash-card rounded-xl border border-dash-line-soft overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-dash-line-soft flex items-center gap-2">
                          <FiClipboard size={13} className="text-brand-ink" />
                          <h4 className="text-xs font-bold text-dash-ink4 uppercase tracking-wide">Assignment Marks</h4>
                        </div>
                        <div className="divide-y divide-dash-soft">
                          {course.assignments.map((a, i) => {
                            const pct = a.marks != null && a.total ? Math.round((a.marks / a.total) * 100) : 0;
                            return (
                              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="text-[11px] font-bold text-dash-faint w-5">{String(i + 1).padStart(2, '0')}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-dash-ink3 truncate">{a.title}</p>
                                  {a.marks != null ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="w-28 h-1.5 bg-dash-soft2 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                      </div>
                                      <span className="text-[11px] text-dash-mute2">{pct}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-amber-500 font-medium">নম্বর এখনো দেওয়া হয়নি</span>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  {a.marks != null ? (
                                    <span className={`text-sm font-bold ${pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>{a.marks}<span className="text-[11px] text-dash-mute2 font-normal">/{a.total}</span></span>
                                  ) : <span className="text-dash-faint text-sm">—/{a.total}</span>}
                                </div>
                              </div>
                            );
                          })}
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

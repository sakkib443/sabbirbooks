'use client';

import React, { useState, useEffect } from 'react';
import { FiLoader, FiAward, FiBook, FiBarChart2 } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';

export default function StudentMarksPage() {
  const [results, setResults] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [examRes, assignRes] = await Promise.all([
          fetch(`${API}/exams/my-results`, { headers: { Authorization: `Bearer ${getToken()}` } }),
          fetch(`${API}/assignments/my-submissions`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        ]);
        const examData = await examRes.json();
        const assignData = await assignRes.json();
        setResults(examData.success ? examData.data || [] : []);
        setSubmissions((assignData.success ? assignData.data || [] : []).filter(s => s.status === 'graded'));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Calculate overall stats
  const totalExamMarks = results.reduce((s, r) => s + (r.totalMarks || 0), 0);
  const obtainedExamMarks = results.reduce((s, r) => s + (r.obtainedMarks || 0), 0);
  const totalAssignMarks = submissions.reduce((s, r) => s + (r.assignmentId?.totalMarks || 0), 0);
  const obtainedAssignMarks = submissions.reduce((s, r) => s + (r.marks || 0), 0);
  const totalAll = totalExamMarks + totalAssignMarks;
  const obtainedAll = obtainedExamMarks + obtainedAssignMarks;
  const overallPct = totalAll > 0 ? Math.round((obtainedAll / totalAll) * 100) : 0;

  const getGrade = (pct) => {
    if (pct >= 80) return { grade: 'A+', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (pct >= 70) return { grade: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (pct >= 60) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (pct >= 50) return { grade: 'C', color: 'text-amber-600', bg: 'bg-amber-50' };
    if (pct >= 40) return { grade: 'D', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const gradeInfo = getGrade(overallPct);

  if (loading) return <div className="p-6 min-h-screen bg-dash-soft flex items-center justify-center"><FiLoader className="animate-spin text-brand" size={30} /></div>;

  return (
    <div className="space-y-6">
      <div className="mb-2"><h1 className="text-2xl font-bold text-dash-ink">Marks Sheet</h1></div>

      {/* Overall Summary */}
      <div className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-dash-ink2 text-lg">Overall Performance</h2>
          <div className={`w-16 h-16 rounded-full ${gradeInfo.bg} flex items-center justify-center`}>
            <span className={`text-2xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-dash-ink">{obtainedAll}/{totalAll}</p>
            <p className="text-xs text-dash-mute">Total Marks</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${gradeInfo.color}`}>{overallPct}%</p>
            <p className="text-xs text-dash-mute">Average</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{results.filter(r => r.status === 'graded').length}</p>
            <p className="text-xs text-dash-mute">Exams</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{submissions.length}</p>
            <p className="text-xs text-dash-mute">Assignments</p>
          </div>
        </div>
        <div className="w-full h-3 bg-dash-soft2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${overallPct >= 60 ? 'bg-emerald-500' : overallPct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Exam Results */}
      <h2 className="font-bold text-dash-ink2 mb-3 flex items-center gap-2"><FiBook className="text-brand" /> Exam Results</h2>
      <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden mb-8">
        {results.length === 0 ? (
          <p className="text-center text-dash-mute py-8 text-sm">No exam results</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dash-soft/80 border-b border-dash-line-soft">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Exam</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Course</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Type</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Obtained</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">%</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Grade</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const g = getGrade(r.percentage);
                return (
                  <tr key={r._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/50 transition">
                    <td className="px-4 py-3 font-medium text-dash-ink2">{r.examId?.title}</td>
                    <td className="px-4 py-3 text-dash-mute">{r.examId?.courseId?.title}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-dash-soft2 rounded-md text-[10px] font-bold text-dash-mute">{r.examId?.type}</span></td>
                    <td className="px-4 py-3 text-center font-bold">{r.obtainedMarks}</td>
                    <td className="px-4 py-3 text-center text-dash-mute">{r.totalMarks}</td>
                    <td className={`px-4 py-3 text-center font-bold ${g.color}`}>{r.percentage}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${g.bg} ${g.color}`}>{r.grade || 'Pending'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Assignment Results */}
      <h2 className="font-bold text-dash-ink2 mb-3 flex items-center gap-2"><FiBarChart2 className="text-purple-600" /> Assignment Results</h2>
      <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
        {submissions.length === 0 ? (
          <p className="text-center text-dash-mute py-8 text-sm">No graded assignments</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dash-soft/80 border-b border-dash-line-soft">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Assignment</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Course</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Obtained</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Total</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">%</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-dash-mute2 uppercase tracking-wider">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => {
                const pct = s.assignmentId?.totalMarks > 0 ? Math.round((s.marks / s.assignmentId.totalMarks) * 100) : 0;
                const g = getGrade(pct);
                return (
                  <tr key={s._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/50 transition">
                    <td className="px-4 py-3 font-medium text-dash-ink2">{s.assignmentId?.title}</td>
                    <td className="px-4 py-3 text-dash-mute">{s.assignmentId?.courseId?.title}</td>
                    <td className="px-4 py-3 text-center font-bold">{s.marks}</td>
                    <td className="px-4 py-3 text-center text-dash-mute">{s.assignmentId?.totalMarks}</td>
                    <td className={`px-4 py-3 text-center font-bold ${g.color}`}>{pct}%</td>
                    <td className="px-4 py-3 text-xs text-dash-mute">{s.feedback || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

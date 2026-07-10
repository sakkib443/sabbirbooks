'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import {
  FiArrowLeft, FiLoader, FiCheck, FiX, FiClock, FiSave,
  FiCalendar, FiUsers, FiCheckSquare, FiAlertCircle,
  FiChevronLeft, FiChevronRight,
  FiGrid, FiList,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function AttendanceSheetPage({ params }) {
  const { batchId } = use(params);
  const { showToast, toastNode } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batch, setBatch] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [classTitle, setClassTitle] = useState('');
  const [records, setRecords] = useState([]);
  const [existingAttendance, setExistingAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'take'

  const tableRef = useRef(null);

  useEffect(() => { fetchBatchData(); }, [batchId]);
  useEffect(() => { if (enrolledStudents.length > 0 && viewMode === 'take') fetchAttendance(); }, [selectedDate, enrolledStudents, viewMode]);

  const fetchBatchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [batchRes, studentsRes, historyRes] = await Promise.all([
        fetch(`${API}/batches/my-batches`, { headers }).then(r => r.json()),
        fetch(`${API}/enrollments/mentor-students`, { headers }).then(r => r.json()),
        fetch(`${API}/attendance/history/${batchId}`, { headers }).then(r => r.json()),
      ]);
      const found = (batchRes.data || []).find(b => b._id === batchId);
      setBatch(found);
      const batchStudents = (studentsRes.data || []).filter(e => {
        const eBatch = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
        return eBatch === batchId;
      });
      setEnrolledStudents(batchStudents);
      setHistory((historyRes.data || []).sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/attendance?batchId=${batchId}&date=${selectedDate}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.data) {
        setExistingAttendance(data.data);
        setClassTitle(data.data.classTitle || '');
        const recs = enrolledStudents.map(s => {
          const sid = s.studentId?._id || s.studentId;
          const found = data.data.records.find(r => (r.studentId?._id || r.studentId) === sid);
          return { studentId: sid, studentName: `${s.studentId?.firstName || s.studentId?.name || ''} ${s.studentId?.lastName || ''}`.trim(), email: s.studentId?.email || '', phone: s.studentId?.phoneNumber || '', status: found?.status || 'absent', note: found?.note || '' };
        });
        setRecords(recs);
      } else {
        setExistingAttendance(null); setClassTitle('');
        setRecords(enrolledStudents.map(s => ({ studentId: s.studentId?._id || s.studentId, studentName: `${s.studentId?.firstName || s.studentId?.name || ''} ${s.studentId?.lastName || ''}`.trim(), email: s.studentId?.email || '', phone: s.studentId?.phoneNumber || '', status: 'absent', note: '' })));
      }
      setSaved(false);
    } catch (err) { console.error(err); }
  };

  // Grid helpers
  const allDates = history.map(h => new Date(h.date));
  const studentList = enrolledStudents.map(s => ({
    id: s.studentId?._id || s.studentId,
    name: `${s.studentId?.firstName || s.studentId?.name || ''} ${s.studentId?.lastName || ''}`.trim(),
    email: s.studentId?.email || '',
    phone: s.studentId?.phoneNumber || '',
  }));

  const getStatusForGrid = (studentId, dateIdx) => {
    const h = history[dateIdx];
    if (!h) return null;
    const rec = h.records.find(r => (r.studentId?._id || r.studentId) === studentId);
    return rec?.status || null;
  };

  const getStudentTotals = (studentId) => {
    let present = 0, absent = 0, late = 0;
    history.forEach(h => {
      const rec = h.records.find(r => (r.studentId?._id || r.studentId) === studentId);
      if (rec) {
        if (rec.status === 'present') present++;
        else if (rec.status === 'late') late++;
        else absent++;
      } else absent++;
    });
    return { present, absent, late, total: history.length, rate: history.length > 0 ? Math.round(((present + late) / history.length) * 100) : 0 };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batchId, date: selectedDate, classTitle, records: records.map(r => ({ studentId: r.studentId, status: r.status, note: r.note })) }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        showToast('success', 'Attendance সেভ হয়েছে');
        const hRes = await fetch(`${API}/attendance/history/${batchId}`, { headers: { Authorization: `Bearer ${token}` } });
        const hData = await hRes.json();
        setHistory((hData.data || []).sort((a, b) => new Date(a.date) - new Date(b.date)));
      } else showToast('error', data.message || 'সেভ করা যায়নি');
    } catch { showToast('error', 'Network error'); }
    setSaving(false);
  };

  const changeDate = (d) => { const dt = new Date(selectedDate); dt.setDate(dt.getDate() + d); setSelectedDate(dt.toISOString().split('T')[0]); };

  const statusCell = (status) => {
    if (!status) return <span className="text-slate-300 text-[10px]">—</span>;
    const cfg = {
      present: { bg: 'bg-emerald-600', text: 'text-white', label: 'Present' },
      absent: { bg: 'bg-red-500', text: 'text-white', label: 'Absent' },
      late: { bg: 'bg-amber-500', text: 'text-white', label: 'Late' },
      excused: { bg: 'bg-blue-500', text: 'text-white', label: 'Excused' },
    };
    const c = cfg[status] || cfg.absent;
    return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text} min-w-[52px] text-center`}>{c.label}</span>;
  };

  const formatDateShort = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/mentor/attendance" className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 outfit flex items-center gap-2"><FiCheckSquare size={18} className="text-[#F3A522]" /> Attendance</h1>
            <p className="text-sm text-slate-500">{batch?.name || batch?.courseName} <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded ml-1">{batch?.id}</code> • <span className="text-[#c9871a] font-medium">{studentList.length} students</span> • <span className="text-blue-600 font-medium">{history.length} classes</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${viewMode === 'grid' ? 'bg-white text-[#c9871a] shadow-sm' : 'text-slate-500'}`}><FiGrid size={12} /> Grid View</button>
            <button onClick={() => setViewMode('take')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${viewMode === 'take' ? 'bg-white text-[#c9871a] shadow-sm' : 'text-slate-500'}`}><FiList size={12} /> Take Attendance</button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GRID VIEW — Spreadsheet Style (Students × Dates)
         ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'grid' && (
        <>
          {history.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FiCalendar className="mx-auto text-slate-300 mb-3" size={36} />
              <h3 className="font-medium text-slate-600">No Attendance Records Yet</h3>
              <p className="text-sm text-slate-400 mt-1">Switch to "Take Attendance" to start recording.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto" ref={tableRef}>
                <table className="w-full border-collapse" style={{ minWidth: Math.max(800, 320 + allDates.length * 80) }}>
                  <thead>
                    {/* Top header — Dates */}
                    <tr className="bg-slate-800 text-white">
                      <th className="sticky left-0 z-20 bg-slate-800 text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border-r border-slate-700 w-10">#</th>
                      <th className="sticky left-[40px] z-20 bg-slate-800 text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border-r border-slate-700 min-w-[160px]">Student</th>
                      <th className="sticky left-[200px] z-20 bg-slate-800 text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border-r border-slate-700 w-[80px]">Phone</th>
                      {allDates.map((d, i) => (
                        <th key={i} className="text-center px-1 py-2.5 text-[10px] font-bold uppercase border-r border-slate-700 min-w-[72px] whitespace-nowrap">
                          <div>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                          <div className="text-[8px] font-normal text-slate-400">{d.toLocaleDateString('en-GB', { year: '2-digit' })}</div>
                        </th>
                      ))}
                      <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase bg-emerald-700 border-r border-emerald-600 min-w-[50px]">P</th>
                      <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase bg-red-700 border-r border-red-600 min-w-[50px]">A</th>
                      <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase bg-amber-700 border-r border-amber-600 min-w-[50px]">L</th>
                      <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase bg-blue-700 min-w-[50px]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.map((student, sIdx) => {
                      const totals = getStudentTotals(student.id);
                      const isAtRisk = totals.rate < 60;
                      return (
                        <tr key={student.id} className={`border-b border-slate-100 transition hover:bg-slate-50/50 ${sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${isAtRisk ? '!bg-rose-50/40' : ''}`}>
                          {/* # */}
                          <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-[11px] font-bold text-slate-400 border-r border-slate-100">{sIdx + 1}</td>
                          {/* Name */}
                          <td className="sticky left-[40px] z-10 bg-inherit px-3 py-2 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${isAtRisk ? 'bg-rose-500' : 'bg-[#F3A522]'}`}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">{student.name}</p>
                                {isAtRisk && <span className="text-[7px] font-bold text-rose-500 bg-rose-100 px-1 rounded">AT RISK</span>}
                              </div>
                            </div>
                          </td>
                          {/* Phone */}
                          <td className="sticky left-[200px] z-10 bg-inherit px-2 py-2 text-[10px] text-slate-500 border-r border-slate-100 text-center truncate max-w-[80px]">{student.phone || '—'}</td>
                          {/* Date cells */}
                          {allDates.map((d, dIdx) => {
                            const status = getStatusForGrid(student.id, dIdx);
                            return (
                              <td key={dIdx} className="text-center px-1 py-1.5 border-r border-slate-50">
                                {statusCell(status)}
                              </td>
                            );
                          })}
                          {/* Totals */}
                          <td className="text-center px-2 py-2 bg-emerald-50/50 border-r border-emerald-100">
                            <span className="text-xs font-bold text-emerald-700">{totals.present}</span>
                          </td>
                          <td className="text-center px-2 py-2 bg-rose-50/50 border-r border-rose-100">
                            <span className="text-xs font-bold text-rose-600">{totals.absent}</span>
                          </td>
                          <td className="text-center px-2 py-2 bg-amber-50/50 border-r border-amber-100">
                            <span className="text-xs font-bold text-amber-600">{totals.late}</span>
                          </td>
                          <td className="text-center px-2 py-2">
                            <div className="flex flex-col items-center">
                              <span className={`text-xs font-bold ${totals.rate >= 75 ? 'text-emerald-600' : totals.rate >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{totals.rate}%</span>
                              <div className="w-10 h-1 rounded-full bg-slate-200 mt-0.5 overflow-hidden">
                                <div className={`h-full rounded-full ${totals.rate >= 75 ? 'bg-emerald-500' : totals.rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${totals.rate}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">{statusCell('present')} Present</span>
                  <span className="flex items-center gap-1">{statusCell('absent')} Absent</span>
                  <span className="flex items-center gap-1">{statusCell('late')} Late</span>
                  <span className="flex items-center gap-1">{statusCell('excused')} Excused</span>
                </div>
                <span>{studentList.length} students × {history.length} classes</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAKE ATTENDANCE VIEW — Single Day
         ═══════════════════════════════════════════════════════════════ */}
      {viewMode === 'take' && (
        <>
          {/* Date + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => changeDate(-1)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"><FiChevronLeft size={16} /></button>
                <div className="flex-1 text-center">
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-base font-bold text-slate-800 outline-none bg-transparent text-center cursor-pointer w-full" />
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(selectedDate).toLocaleDateString('bn-BD', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <button onClick={() => changeDate(1)} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"><FiChevronRight size={16} /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <input type="text" value={classTitle} onChange={e => setClassTitle(e.target.value)} placeholder="Class title (optional)" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]" />
                {existingAttendance && <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-2 rounded-lg border border-emerald-200 flex items-center gap-1"><FiCheck size={10} /> Saved</span>}
              </div>
            </div>
            <div className="lg:col-span-7 grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { label: 'Total', value: records.length, color: 'text-slate-700', bg: 'bg-white border-slate-200' },
                { label: 'Present', value: records.filter(r => r.status === 'present').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Absent', value: records.filter(r => r.status === 'absent').length, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' },
                { label: 'Late', value: records.filter(r => r.status === 'late').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                { label: 'Excused', value: records.filter(r => r.status === 'excused').length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                { label: 'Rate', value: `${records.length > 0 ? Math.round(((records.filter(r => r.status === 'present' || r.status === 'late').length) / records.length) * 100) : 0}%`, color: 'text-[#c9871a]', bg: 'bg-[#FEF6E7] border-[#F0DFB4]' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 text-center shadow-sm ${s.bg}`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] uppercase font-bold text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { setRecords(records.map(r => ({ ...r, status: 'present' }))); setSaved(false); }} className="px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition">✓ All Present</button>
            <button onClick={() => { setRecords(records.map(r => ({ ...r, status: 'absent' }))); setSaved(false); }} className="px-3 py-2 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition">✗ All Absent</button>
          </div>

          {/* Table */}
          {records.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase w-10">#</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase">Student</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase w-24">Attended</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase w-16">Rate</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase w-20">Last 2</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-emerald-300 w-32">Today</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase w-36">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec, idx) => {
                      const totals = getStudentTotals(rec.studentId);
                      const isAtRisk = totals.rate > 0 && totals.rate < 60;
                      const sc = { present: 'bg-emerald-50 text-emerald-700 border-emerald-300', absent: 'bg-rose-50 text-rose-600 border-rose-300', late: 'bg-amber-50 text-amber-700 border-amber-300', excused: 'bg-blue-50 text-blue-600 border-blue-300' };
                      // Last 2 from history
                      const last2 = [];
                      const sortedDesc = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
                      for (let i = 0; i < Math.min(2, sortedDesc.length); i++) {
                        const r = sortedDesc[i].records.find(r => (r.studentId?._id || r.studentId) === rec.studentId);
                        last2.push(r?.status || 'absent');
                      }

                      return (
                        <tr key={rec.studentId} className={`border-b border-slate-50 transition hover:bg-slate-50/50 ${idx % 2 === 0 ? '' : 'bg-slate-50/30'} ${isAtRisk ? '!bg-rose-50/30' : ''}`}>
                          <td className="px-4 py-2.5"><span className="text-[11px] font-bold text-slate-400">{String(idx + 1).padStart(2, '0')}</span></td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${isAtRisk ? 'bg-rose-500' : 'bg-[#F3A522]'}`}>{rec.studentName.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">{rec.studentName}</p>
                                  {isAtRisk && <span className="text-[7px] font-bold text-rose-500 bg-rose-100 px-1 rounded border border-rose-200">⚠ RISK</span>}
                                </div>
                                <p className="text-[9px] text-slate-400">{rec.email || rec.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center"><span className="text-xs font-bold text-slate-700">{totals.present + totals.late}</span><span className="text-[10px] text-slate-400">/{totals.total}</span></td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs font-bold ${totals.rate >= 75 ? 'text-emerald-600' : totals.rate >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{totals.rate}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex justify-center gap-1">{last2.map((s, i) => <span key={i}>{statusCell(s)}</span>)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <select value={rec.status} onChange={e => { const u = [...records]; u[idx] = { ...u[idx], status: e.target.value }; setRecords(u); setSaved(false); }}
                              className={`appearance-none px-3 py-2 rounded-xl text-xs font-bold border-2 cursor-pointer outline-none w-full ${sc[rec.status]}`}>
                              <option value="present">✅ Present</option>
                              <option value="absent">❌ Absent</option>
                              <option value="late">⏰ Late</option>
                              <option value="excused">📋 Excused</option>
                            </select>
                          </td>
                          <td className="px-4 py-2.5"><input type="text" value={rec.note} placeholder="—" onChange={e => { const u = [...records]; u[idx] = { ...u[idx], note: e.target.value }; setRecords(u); setSaved(false); }} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] outline-none focus:border-[#F3A522]" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Save */}
          {records.length > 0 && (
            <div className="sticky bottom-4 flex justify-center z-10">
              <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-12 py-4 rounded-2xl text-sm font-bold shadow-2xl transition-all ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white hover:shadow-[#F3A522]/40 hover:-translate-y-0.5'} disabled:opacity-50`}>
                {saving ? <FiLoader className="animate-spin" size={16} /> : saved ? <FiCheck size={16} /> : <FiSave size={16} />}
                {saving ? 'Saving...' : saved ? 'Attendance Saved ✓' : 'Save Attendance'}
              </button>
            </div>
          )}
        </>
      )}

      {toastNode}
    </div>
  );
}

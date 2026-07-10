'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FiCalendar, FiUsers, FiBook, FiClock, FiCheckCircle, FiRefreshCw,
  FiArrowLeft, FiAlertCircle, FiTarget, FiX, FiDollarSign, FiAward,
  FiLoader, FiPercent,
} from 'react-icons/fi';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';
const hdrs = () => ({ Authorization: `Bearer ${getToken()}` });

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const daysUntil = (d) => (d ? Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24)) : 0);
const formatTaka = (n) => `৳${(n || 0).toLocaleString('en-IN')}`;

// ─── Mini Progress Bar ──────────────────────────────────────
const MiniProgress = ({ value, color = 'teal', label, sublabel }) => (
  <div className="flex-1">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <span className={`text-[11px] font-bold text-${color}-600`}>{value}%</span>
    </div>
    <div className="w-full bg-slate-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full bg-${color}-500 transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    {sublabel && <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>}
  </div>
);

// ─── Stat Mini Card ─────────────────────────────────────────
const StatMini = ({ icon: Icon, label, value, color = 'slate', sub }) => (
  <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3">
    <div className={`w-9 h-9 rounded-lg bg-${color}-50 flex items-center justify-center flex-shrink-0`}>
      <Icon size={16} className={`text-${color}-500`} />
    </div>
    <div>
      <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  </div>
);

// ─── Student Section ─────────────────────────────────────────
function StudentSection({ students, onRefresh }) {
  const [statusLoading, setStatusLoading] = useState({});
  const updateStatus = async (enrollmentId, newStatus) => {
    setStatusLoading((p) => ({ ...p, [enrollmentId]: true }));
    try {
      const res = await fetch(`${API}/analytics/update-student-status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ enrollmentId, studentStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success && onRefresh) onRefresh();
    } catch (e) { console.error(e); }
    finally { setStatusLoading((p) => ({ ...p, [enrollmentId]: false })); }
  };
  if (students.length === 0) {
    return <div className="text-center py-8 text-sm text-slate-400"><FiUsers className="mx-auto mb-2" size={28} /> No students enrolled yet</div>;
  }
  const statusOptions = [{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'dropout', label: 'Dropout' }, { value: 'inactive', label: 'Inactive' }];
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-3 py-3 text-[13px] font-semibold text-slate-600">Name</th>
            <th className="text-left px-3 py-3 text-[13px] font-semibold text-slate-600">Email</th>
            <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Phone</th>
            <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Status</th>
            <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Attendance</th>
            <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Exams</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => (
            <tr key={s._id || i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{s.name?.charAt(0)?.toUpperCase() || '?'}</div>
                  <span className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">{s.name}</span>
                </div>
              </td>
              <td className="px-3 py-3"><span className="text-sm text-slate-500 truncate block max-w-[180px]">{s.email || ''}</span></td>
              <td className="px-3 py-3 text-center"><span className="text-sm text-slate-600">{s.phone || '—'}</span></td>
              <td className="px-3 py-3 text-center">
                <select value={s.studentStatus || 'active'} onChange={(e) => updateStatus(s.enrollmentId, e.target.value)} disabled={statusLoading[s.enrollmentId]}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none transition ${s.studentStatus === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : s.studentStatus === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-200' : s.studentStatus === 'dropout' ? 'bg-red-50 text-red-500 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'} ${statusLoading[s.enrollmentId] ? 'opacity-50' : ''}`}>
                  {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </td>
              <td className="px-3 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${s.attendancePct >= 75 ? 'bg-emerald-500' : s.attendancePct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.min(s.attendancePct, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${s.attendancePct >= 75 ? 'text-emerald-600' : s.attendancePct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{s.attendancePct}%</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{s.attendancePresent}/{s.attendanceSessions || s.attendanceTotal} classes</span>
                </div>
              </td>
              <td className="px-3 py-3 text-center">
                <span className={`text-sm font-semibold ${s.assignmentsTotal > 0 && s.assignmentsSubmitted >= s.assignmentsTotal ? 'text-emerald-600' : s.assignmentsSubmitted > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{s.assignmentsSubmitted || 0}/{s.assignmentsTotal || 0}</span>
                <p className="text-[11px] text-slate-400">submitted</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Payment Section ─────────────────────────────────────────
function PaymentSection({ payment, batchId, courseId, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ amount: '', method: 'manual', status: 'paid', notes: '' });
  const [expandedStudent, setExpandedStudent] = useState(null);
  const coursePrice = payment?.coursePrice || 0;
  const perStudent = payment?.perStudent || [];

  const handleAddInstallment = async () => {
    if (!showAddModal || !addForm.amount) return;
    setAddLoading(true);
    try {
      const res = await fetch(`${API}/analytics/add-installment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ enrollmentId: showAddModal.enrollmentId, studentId: showAddModal.studentId, courseId: courseId || batchId, amount: Number(addForm.amount), status: addForm.status, method: addForm.method, notes: addForm.notes || `Installment payment - ${addForm.amount}৳` }),
      });
      const data = await res.json();
      if (data.success) { setShowAddModal(null); setAddForm({ amount: '', method: 'manual', status: 'paid', notes: '' }); if (onRefresh) onRefresh(); }
    } catch (e) { console.error(e); }
    finally { setAddLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini icon={FiDollarSign} label="Total Collected" value={formatTaka(payment.totalCollected)} color="emerald" />
        <StatMini icon={FiClock} label="Total Due" value={formatTaka(payment.totalRemainingDue ?? payment.installments?.dueAmount ?? payment.totalPending)} color="amber" />
        <StatMini icon={FiCheckCircle} label="Paid Installments" value={payment.installments?.paid || 0} color="teal" />
        <StatMini icon={FiAlertCircle} label="Due Installments" value={payment.installments?.due || 0} color="rose" />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h4 className="text-xs font-semibold text-slate-700">💰 Student Payment Details</h4>
          {coursePrice > 0 && <span className="text-[10px] text-slate-400">Course: {formatTaka(coursePrice)}</span>}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-3 py-3 text-[13px] font-semibold text-slate-600">Student</th>
              <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Phone</th>
              <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Paid</th>
              <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Due</th>
              <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Installments</th>
              <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {perStudent.map((ps, i) => (
              <React.Fragment key={ps.studentId || i}>
                <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                  <td className="px-3 py-3"><p className="text-sm font-semibold text-slate-700 truncate max-w-[160px]">{ps.name}</p><p className="text-xs text-slate-400 truncate">{ps.email}</p></td>
                  <td className="px-3 py-3 text-center"><span className="text-sm text-slate-600">{ps.phone || '—'}</span></td>
                  <td className="px-3 py-3 text-center"><span className="text-sm font-bold text-emerald-600">{formatTaka(ps.totalPaid)}</span></td>
                  <td className="px-3 py-3 text-center"><span className={`text-sm font-bold ${ps.totalDue > 0 ? 'text-red-500' : 'text-slate-400'}`}>{ps.totalDue > 0 ? formatTaka(ps.totalDue) : '—'}</span></td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => setExpandedStudent(expandedStudent === ps.studentId ? null : ps.studentId)} className="text-xs font-semibold text-teal-600 hover:text-teal-700 underline">{ps.paidCount} paid / {ps.installmentCount} total</button>
                  </td>
                  <td className="px-3 py-3 text-center"><button onClick={() => setShowAddModal(ps)} className="text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition">+ Add</button></td>
                </tr>
                {expandedStudent === ps.studentId && ps.installments?.length > 0 && (
                  <tr><td colSpan={6} className="p-0">
                    <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-600 mb-2">📋 Installment History — {ps.name}</p>
                      <div className="space-y-2">
                        {ps.installments.map((inst, idx) => (
                          <div key={inst._id || idx} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${inst.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{inst.installmentNumber}</span>
                              <div><p className="text-sm font-semibold text-slate-700">{formatTaka(inst.amount)}</p><p className="text-xs text-slate-400">{inst.notes || ''}</p></div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inst.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : inst.status === 'due' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>{inst.status}</span>
                              <p className="text-xs text-slate-400 mt-0.5">{inst.status === 'paid' && inst.paidDate ? formatDate(inst.paidDate) : formatDate(inst.dueDate)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-base font-bold text-slate-800">Add Installment</h3><p className="text-xs text-slate-400">{showAddModal.name}</p></div>
              <button onClick={() => setShowAddModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[11px] font-semibold text-slate-600 mb-1 block">Amount (৳) *</label><input type="number" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" placeholder="e.g. 5000" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] font-semibold text-slate-600 mb-1 block">Status</label><select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"><option value="paid">Paid</option><option value="due">Due</option><option value="upcoming">Upcoming</option></select></div>
                <div><label className="text-[11px] font-semibold text-slate-600 mb-1 block">Method</label><select value={addForm.method} onChange={(e) => setAddForm({ ...addForm, method: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"><option value="manual">Manual</option><option value="bkash">bKash</option><option value="sslcommerz">SSLCommerz</option></select></div>
              </div>
              <div><label className="text-[11px] font-semibold text-slate-600 mb-1 block">Notes</label><input type="text" value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" placeholder="Optional notes" /></div>
              <div className="bg-slate-50 rounded-lg p-3 text-[10px] text-slate-500">
                <p>Course Price: <strong className="text-slate-700">{formatTaka(showAddModal.coursePrice || coursePrice)}</strong></p>
                <p>Already Paid: <strong className="text-emerald-600">{formatTaka(showAddModal.totalPaid)}</strong></p>
                <p>Current Due: <strong className="text-red-500">{formatTaka(showAddModal.totalDue)}</strong></p>
              </div>
              <button onClick={handleAddInstallment} disabled={addLoading || !addForm.amount} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                {addLoading ? <FiLoader className="animate-spin" size={14} /> : <FiCheckCircle size={14} />}{addLoading ? 'Adding...' : 'Add Installment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Attendance Section (Spreadsheet Grid) ──────────────────
function AttendanceSection({ students, details }) {
  const attendance = details?.attendance || {};
  const grid = attendance.grid || [];
  const [sortBy, setSortBy] = useState('name');
  const atRisk = students.filter((s) => s.attendancePct < 60 && (s.attendanceTotal || 0) > 0);
  const excellent = students.filter((s) => s.attendancePct >= 90 && (s.attendanceTotal || 0) > 0);
  const sorted = [...students].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'pctAsc') return (a.attendancePct || 0) - (b.attendancePct || 0);
    if (sortBy === 'pctDesc') return (b.attendancePct || 0) - (a.attendancePct || 0);
    return 0;
  });
  const fmtCol = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');
  const getStatus = (sessionRecords, studentId) => (sessionRecords.find((r) => r.studentId === studentId)?.status || null);
  const statusCell = (status) => {
    if (status === 'present') return <span className="inline-block w-5 h-5 rounded bg-emerald-500 text-white text-[9px] font-bold leading-5 text-center" title="Present">P</span>;
    if (status === 'late') return <span className="inline-block w-5 h-5 rounded bg-amber-400 text-white text-[9px] font-bold leading-5 text-center" title="Late">L</span>;
    if (status === 'absent') return <span className="inline-block w-5 h-5 rounded bg-red-500 text-white text-[9px] font-bold leading-5 text-center" title="Absent">A</span>;
    if (status === 'excused') return <span className="inline-block w-5 h-5 rounded bg-blue-400 text-white text-[9px] font-bold leading-5 text-center" title="Excused">E</span>;
    return <span className="text-[9px] text-slate-300">—</span>;
  };
  if (students.length === 0) return <div className="text-center py-8 text-sm text-slate-400"><FiUsers className="mx-auto mb-2" size={28} /> No students enrolled yet</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatMini icon={FiUsers} label="Total Students" value={students.length} color="blue" />
        <StatMini icon={FiCheckCircle} label="Overall Attendance" value={`${attendance.overallPct || 0}%`} color="teal" />
        <StatMini icon={FiBook} label="Total Sessions" value={attendance.totalSessions || 0} color="violet" />
        <StatMini icon={FiTarget} label="Excellent (90%+)" value={excellent.length} color="emerald" />
        <StatMini icon={FiAlertCircle} label="At Risk (<60%)" value={atRisk.length} color="rose" />
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h4 className="text-xs font-semibold text-slate-700">📋 Attendance Grid</h4>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block"></span> Present</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block"></span> Late</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-red-500 inline-block"></span> Absent</span>
            <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 rounded bg-blue-400 inline-block"></span> Excused</span>
          </div>
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none">
          <option value="name">Sort: Name</option><option value="pctDesc">Sort: Highest %</option><option value="pctAsc">Sort: Lowest %</option>
        </select>
      </div>
      {grid.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
          <FiBook className="mx-auto text-slate-300 mb-2" size={28} />
          <p className="text-sm text-slate-500">No attendance records yet</p>
          <p className="text-xs text-slate-400 mt-1">Attendance data will appear here once the mentor starts taking attendance</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: `${260 + grid.length * 60 + 200}px` }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 z-10 bg-slate-50 text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 border-r border-slate-200 w-8">#</th>
                  <th className="sticky left-8 z-10 bg-slate-50 text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 border-r border-slate-200 min-w-[180px]">Student</th>
                  {grid.map((session, idx) => (
                    <th key={session._id || idx} className="text-center px-1 py-2.5 text-[9px] font-bold text-slate-500 min-w-[52px] border-r border-slate-100 last:border-r-0" title={session.classTitle || fmtCol(session.date)}>
                      <div>{fmtCol(session.date)}</div>
                      {session.classTitle && <div className="text-[8px] font-normal text-slate-400 truncate max-w-[50px]">{session.classTitle}</div>}
                    </th>
                  ))}
                  <th className="text-center px-2 py-2.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 border-l-2 border-emerald-200 min-w-[40px]">P</th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-bold text-amber-600 bg-amber-50/50 min-w-[35px]">L</th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-bold text-red-600 bg-red-50/50 min-w-[35px]">A</th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-bold text-slate-600 bg-slate-100 min-w-[55px]">%</th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-bold text-slate-600 bg-slate-100 min-w-[60px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const pct = s.attendancePct || 0, present = s.attendancePresent || 0, late = s.attendanceLate || 0;
                  const total = s.attendanceTotal || s.attendanceSessions || 0, absent = Math.max(0, total - present), isAtRisk = pct < 60 && total > 0;
                  return (
                    <tr key={s._id || i} className={`border-b border-slate-50 last:border-0 ${isAtRisk ? 'bg-red-50/20' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-[10px] text-slate-400 border-r border-slate-200">{i + 1}</td>
                      <td className="sticky left-8 z-10 bg-inherit px-3 py-2 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${isAtRisk ? 'bg-red-500' : 'bg-teal-500'}`}>{s.name?.charAt(0)?.toUpperCase() || '?'}</div>
                          <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[140px]">{s.name}</span>
                        </div>
                      </td>
                      {grid.map((session, idx) => (
                        <td key={session._id || idx} className="text-center px-1 py-2 border-r border-slate-50">{statusCell(getStatus(session.records, s._id))}</td>
                      ))}
                      <td className="text-center px-2 py-2 border-l-2 border-emerald-200 bg-emerald-50/30"><span className="text-[11px] font-bold text-emerald-600">{present}</span></td>
                      <td className="text-center px-2 py-2 bg-amber-50/30"><span className={`text-[11px] font-bold ${late > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{late}</span></td>
                      <td className="text-center px-2 py-2 bg-red-50/30"><span className={`text-[11px] font-bold ${absent > 0 ? 'text-red-600' : 'text-slate-300'}`}>{absent}</span></td>
                      <td className="text-center px-2 py-2 bg-slate-50/50"><span className={`text-[11px] font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-teal-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span></td>
                      <td className="text-center px-2 py-2 bg-slate-50/50">
                        {total === 0 ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">—</span>
                          : isAtRisk ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Risk</span>
                          : pct >= 90 ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">A+</span>
                          : pct >= 75 ? <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-600">Good</span>
                          : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">Fair</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {atRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-xs font-bold text-red-700 mb-1">⚠ At-Risk Students ({atRisk.length})</p>
          <p className="text-[11px] text-red-600">{atRisk.map((s) => `${s.name} (${s.attendancePct}%)`).join(', ')}</p>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
export default function BatchDetailPage() {
  const { batchId } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/batch-details/${batchId}`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) setDetails(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [batchId]);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-violet-500" size={28} /></div>;
  }
  if (!details) {
    return <div className="p-10 text-center text-sm text-slate-400">Failed to load batch details. <Link href="/dashboard/admin/batch-analytics" className="text-violet-600 underline">Go back</Link></div>;
  }

  const { classes, attendance, students, payment, certificates, batch } = details;
  const now = new Date();
  const start = batch.startDate ? new Date(batch.startDate) : null;
  const end = batch.endDate ? new Date(batch.endDate) : null;
  const batchStatus = (batch.status === 'completed' || (end && end < now)) ? 'completed'
    : (batch.status === 'active' || batch.status === 'running' || (start && end && start <= now && end >= now)) ? 'running'
    : 'upcoming';

  const sections = batchStatus === 'completed' ? ['overview', 'students', 'attendance', 'payment', 'certificates']
    : batchStatus === 'upcoming' ? ['overview', 'students', 'payment']
    : ['overview', 'students', 'attendance', 'payment'];
  const sectionLabels = {
    overview: batchStatus === 'running' ? '📊 Classes & Attendance' : batchStatus === 'upcoming' ? '📅 Timeline' : '✅ Summary',
    students: '👥 Students', attendance: '📋 Attendance', payment: '💰 Payment', certificates: '🎓 Certificates',
  };
  const activeSec = sections.includes(activeSection) ? activeSection : 'overview';
  const statusBadge = batchStatus === 'running' ? 'bg-emerald-50 text-emerald-600' : batchStatus === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/batch-analytics" className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:border-violet-200 transition shrink-0">
            <FiArrowLeft size={16} />
          </Link>
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            {batch.courseId?.image ? <img src={batch.courseId.image} alt="" className="w-full h-full object-cover" /> :
              <div className="w-full h-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold">{(batch.courseName || batch.name || 'B')?.charAt(0)}</div>}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 outfit">{batch.name || batch.courseName || 'Batch'}</h1>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge}`}>{batchStatus}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
              <span>{batch.courseName || batch.courseId?.title}</span>
              <span className="flex items-center gap-1"><FiCalendar size={10} /> {formatDate(batch.startDate)} — {formatDate(batch.endDate)}</span>
              <span className="flex items-center gap-1"><FiUsers size={10} /> {students.length} students</span>
            </p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shrink-0">
          <FiRefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Section Tabs + Content */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-0 overflow-x-auto border-b border-slate-100">
          {sections.map((s) => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`px-4 py-2.5 rounded-t-lg text-sm font-semibold whitespace-nowrap transition border-b-2 -mb-px ${activeSec === s ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              {sectionLabels[s]}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeSec === 'overview' && (
            <div className="space-y-4">
              {batchStatus === 'running' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini icon={FiBook} label="Total Classes" value={classes.total} color="violet" />
                    <StatMini icon={FiCheckCircle} label="Completed" value={classes.completed} color="emerald" />
                    <StatMini icon={FiClock} label="Upcoming" value={classes.upcoming} color="blue" />
                    <StatMini icon={FiUsers} label="Attendance" value={`${attendance.overallPct}%`} color="teal" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniProgress value={classes.progressPct} color="violet" label="Class Progress" sublabel={`${classes.completed}/${classes.total} classes done`} />
                    <MiniProgress value={attendance.overallPct} color="teal" label="Overall Attendance" sublabel={`${attendance.totalSessions} sessions recorded`} />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                      {batch.classTime && <span>🕐 Class Time: <strong className="text-slate-700">{batch.classTime}</strong></span>}
                      {batch.classDays?.length > 0 && <span>📅 Days: <strong className="text-slate-700">{batch.classDays.join(', ')}</strong></span>}
                      {batch.mentorId?.name && <span>👨‍🏫 Mentor: <strong className="text-slate-700">{batch.mentorId.name}</strong></span>}
                    </div>
                  </div>
                </>
              )}
              {batchStatus === 'upcoming' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini icon={FiUsers} label="Enrolled" value={students.length} color="blue" />
                    <StatMini icon={FiClock} label="Starts In" value={`${daysUntil(batch.startDate)} days`} color="violet" />
                    <StatMini icon={FiCalendar} label="Start Date" value={formatDate(batch.startDate)} color="teal" />
                    <StatMini icon={FiCalendar} label="End Date" value={formatDate(batch.endDate)} color="slate" />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
                      {batch.classTime && <span>🕐 Class Time: <strong className="text-slate-700">{batch.classTime}</strong></span>}
                      {batch.classDays?.length > 0 && <span>📅 Days: <strong className="text-slate-700">{batch.classDays.join(', ')}</strong></span>}
                      {batch.mentorId?.name && <span>👨‍🏫 Mentor: <strong className="text-slate-700">{batch.mentorId.name}</strong></span>}
                      <span>💺 Max Seats: <strong className="text-slate-700">{batch.maxStudents || 50}</strong></span>
                    </div>
                  </div>
                </>
              )}
              {batchStatus === 'completed' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatMini icon={FiBook} label="Total Classes" value={classes.total} color="violet" />
                    <StatMini icon={FiUsers} label="Students" value={students.length} color="blue" />
                    <StatMini icon={FiPercent} label="Attendance" value={`${attendance.overallPct}%`} color="teal" />
                    <StatMini icon={FiAward} label="Certificates" value={certificates.active} color="amber" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniProgress value={classes.progressPct} color="emerald" label="Classes Completed" sublabel={`${classes.completed}/${classes.total}`} />
                    <MiniProgress value={attendance.overallPct} color="teal" label="Final Attendance" sublabel={`${attendance.totalSessions} sessions`} />
                    <MiniProgress value={students.length > 0 ? Math.round((students.filter((s) => s.studentStatus === 'completed').length / students.length) * 100) : 0} color="blue" label="Completion Rate" sublabel={`${students.filter((s) => s.studentStatus === 'completed').length}/${students.length} completed`} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeSec === 'students' && <StudentSection students={students} onRefresh={load} />}
          {activeSec === 'attendance' && <AttendanceSection students={students} details={details} />}
          {activeSec === 'payment' && <PaymentSection payment={payment} batchId={batchId} courseId={batch?.courseId?._id || batch?.courseId} onRefresh={load} />}
          {activeSec === 'certificates' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatMini icon={FiAward} label="Total Issued" value={certificates.total} color="amber" />
                <StatMini icon={FiCheckCircle} label="Active" value={certificates.active} color="emerald" />
                <StatMini icon={FiClock} label="Pending" value={certificates.pending} color="blue" />
              </div>
              {certificates.total === 0 && <div className="text-center py-4 text-sm text-slate-400"><FiAward className="mx-auto mb-2" size={24} /> No certificates issued yet</div>}
              {students.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-3">
                  <MiniProgress value={students.length > 0 ? Math.round((certificates.active / students.length) * 100) : 0} color="amber" label="Certificate Issuance" sublabel={`${certificates.active} of ${students.length} students received certificates`} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

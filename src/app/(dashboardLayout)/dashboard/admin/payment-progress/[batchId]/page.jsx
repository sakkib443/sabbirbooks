'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  FiDollarSign, FiUsers, FiCalendar, FiChevronDown, FiCheckCircle,
  FiClock, FiAlertCircle, FiSearch, FiX, FiLoader, FiRefreshCw,
  FiArrowLeft, FiPhone, FiMail, FiPlus, FiTrash2, FiEdit3, FiSave,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';
const hdrs = () => ({ Authorization: `Bearer ${getToken()}` });
const jsonHdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const formatTk = (n) => `৳${(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const daysFrom = (d) => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
};

// Stable, module-level editable value cell (defined outside the page so it
// doesn't remount every render — which would drop focus while typing).
function EditableCell({ studentId, enrollmentId, field, value, color, editing, editValue, setEditValue, onSave, onCancel, onStart, saving }) {
  const isEditing = editing?.studentId === studentId && editing?.field === field;
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
          className="w-20 px-1.5 py-0.5 text-xs border border-teal-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
          autoFocus onKeyDown={(e) => { if (e.key === 'Enter') onSave(enrollmentId, field, editValue); if (e.key === 'Escape') onCancel(); }} />
        <button onClick={() => onSave(enrollmentId, field, editValue)} disabled={saving} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
          {saving ? <FiLoader className="animate-spin" size={10} /> : <FiSave size={10} />}
        </button>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><FiX size={10} /></button>
      </div>
    );
  }
  return (
    <div className="group flex items-center justify-center gap-1">
      <span className={`text-xs font-bold ${color}`}>{formatTk(value)}</span>
      <button onClick={(e) => { e.stopPropagation(); onStart(studentId, field, value); }}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-teal-600 transition">
        <FiEdit3 size={9} />
      </button>
    </div>
  );
}

export default function BatchPaymentPage({ params }) {
  const { batchId } = use(params);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [payFilter, setPayFilter] = useState('all'); // all | paid | due | overdue

  // Add installment modal
  const [showAdd, setShowAdd] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ amount: '', method: 'cash', status: 'paid', notes: '', dueDate: '' });

  // Inline edit states
  const [editingField, setEditingField] = useState(null); // { studentId, field: 'customFee' | 'admissionPayment' }
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/batch-details/${batchId}`, { headers: hdrs() });
      const r = await res.json();
      if (r.success) setDetails(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [batchId]);

  // Save inline edit (customFee or admissionPayment)
  const saveEdit = async (enrollmentId, field, value) => {
    setEditLoading(true);
    try {
      const body = { enrollmentId };
      if (field === 'customFee') body.customFee = Number(value);
      if (field === 'admissionPayment') body.admissionPayment = Number(value);

      const res = await fetch(`${API}/analytics/update-payment-details`, {
        method: 'PATCH', headers: jsonHdrs(), body: JSON.stringify(body),
      });
      const r = await res.json();
      if (r.success) {
        setEditingField(null);
        setEditValue('');
        load(); // reload data
        showToast('success', 'Updated');
      } else showToast('error', r.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
    finally { setEditLoading(false); }
  };

  const startEdit = (studentId, field, currentValue) => {
    setEditingField({ studentId, field });
    setEditValue(String(currentValue || ''));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Open the add-payment modal (optionally prefilled, e.g. for a full settlement)
  const openAdd = (ps, prefill = {}) => {
    setAddForm({ amount: '', method: 'cash', status: 'paid', notes: '', dueDate: '', ...prefill });
    setShowAdd({ ...ps, courseId: details?.batch?.courseId?._id || details?.batch?.courseId || '' });
  };

  // One-click full settle: বিদ্যমান unpaid installment paid করে + বাকি gap যোগ করে (কোনো over-plan হয় না)
  const markFullyPaid = async (ps) => {
    if (!(await confirm({ title: 'Mark fully paid?', message: `Settle remaining ${formatTk(ps.remainingDue)} for ${ps.name}?`, confirmText: 'Settle', danger: false }))) return;
    try {
      const res = await fetch(`${API}/analytics/settle-full`, {
        method: 'POST', headers: jsonHdrs(),
        body: JSON.stringify({ enrollmentId: ps.enrollmentId, method: 'cash' }),
      });
      const r = await res.json();
      if (r.success) { load(); showToast('success', 'Fully settled'); }
      else showToast('error', r.message || 'Error');
    } catch { showToast('error', 'Network error'); }
  };

  const deleteInst = async (id) => {
    if (!(await confirm({ title: 'Delete payment?', message: 'This payment / installment will be removed.', confirmText: 'Delete' }))) return;
    try {
      const res = await fetch(`${API}/analytics/installment/${id}`, { method: 'DELETE', headers: hdrs() });
      const r = await res.json();
      if (r.success) { load(); showToast('success', 'Deleted'); }
      else showToast('error', r.message || 'Error');
    } catch { showToast('error', 'Network error'); }
  };

  const handleAdd = async () => {
    if (!showAdd || !addForm.amount) return;
    const remaining = showAdd.remainingDue || 0;
    if (addForm.status === 'paid' && Number(addForm.amount) > remaining && remaining > 0) {
      if (!(await confirm({ title: 'Amount exceeds due', message: `${formatTk(addForm.amount)} is more than the remaining due ${formatTk(remaining)}. Continue?`, confirmText: 'Continue', danger: false }))) return;
    }
    setAddLoading(true);
    try {
      const res = await fetch(`${API}/analytics/add-installment`, {
        method: 'POST', headers: jsonHdrs(),
        body: JSON.stringify({
          enrollmentId: showAdd.enrollmentId,
          studentId: showAdd.studentId,
          courseId: showAdd.courseId,
          amount: Number(addForm.amount),
          status: addForm.status,
          method: addForm.method,
          notes: addForm.notes || '',
          dueDate: addForm.dueDate || new Date().toISOString(),
        }),
      });
      const r = await res.json();
      if (r.success) {
        setShowAdd(null);
        setAddForm({ amount: '', method: 'cash', status: 'paid', notes: '', dueDate: '' });
        load();
        showToast('success', 'Payment saved');
      } else showToast('error', r.message || 'Error');
    } catch { showToast('error', 'Network error'); }
    finally { setAddLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-teal-500" size={28} /></div>;
  if (!details) return (
    <div className="text-center py-20">
      <p className="text-sm text-slate-500">Failed to load</p>
      <Link href="/dashboard/admin/payment-progress" className="text-sm text-teal-600 hover:underline mt-2 inline-block">← Back</Link>
    </div>
  );

  const payment = details.payment || {};
  const coursePrice = payment.coursePrice || 0;
  const perStudent = payment.perStudent || [];
  const batchName = details.batch?.name || 'Batch';

  const hasOverdue = (ps) => (ps.installments || []).some(i =>
    i.status === 'overdue' || (i.status === 'due' && i.dueDate && new Date(i.dueDate) < new Date())
  );

  const filtered = perStudent.filter(ps => {
    // search
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      const match = (ps.name || '').toLowerCase().includes(q) || (ps.email || '').toLowerCase().includes(q) || (ps.phone || '').includes(q);
      if (!match) return false;
    }
    // payment filter
    if (payFilter === 'paid') return ps.remainingDue <= 0;
    if (payFilter === 'due') return ps.remainingDue > 0;
    if (payFilter === 'overdue') return hasOverdue(ps);
    return true;
  });

  const filterTabs = [
    { id: 'all', label: 'All', count: perStudent.length, active: 'bg-slate-700 text-white border-slate-700' },
    { id: 'paid', label: 'Fully Paid', count: perStudent.filter(p => p.remainingDue <= 0).length, active: 'bg-emerald-600 text-white border-emerald-600' },
    { id: 'due', label: 'Due', count: perStudent.filter(p => p.remainingDue > 0).length, active: 'bg-amber-500 text-white border-amber-500' },
    { id: 'overdue', label: 'Overdue', count: perStudent.filter(hasOverdue).length, active: 'bg-red-500 text-white border-red-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/admin/payment-progress" className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition shrink-0">
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800 outfit">{batchName}</h1>
            <p className="text-xs text-slate-400">{details.batch?.courseName || ''} • {fmtDate(details.batch?.startDate)} — {fmtDate(details.batch?.endDate)}</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
          <FiRefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Batch Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Course Fee', value: formatTk(coursePrice), border: 'border-slate-200', color: 'text-slate-700' },
          { label: 'Total Collected', value: formatTk(payment.totalCollected), border: 'border-emerald-200', color: 'text-emerald-600' },
          { label: 'Total Due', value: formatTk(payment.totalRemainingDue ?? payment.totalPending), border: 'border-red-200', color: 'text-red-500' },
          { label: 'Paid Installments', value: payment.installments?.paid || 0, border: 'border-teal-200', color: 'text-teal-600' },
          { label: 'Due Installments', value: payment.installments?.due || 0, border: 'border-amber-200', color: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className={`bg-white border ${c.border} rounded-xl px-4 py-3`}>
            <p className="text-[10px] text-slate-400 font-medium uppercase">{c.label}</p>
            <p className={`text-lg font-bold ${c.color} mt-0.5`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map(f => (
            <button key={f.id} onClick={() => setPayFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                payFilter === f.id ? f.active : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}>
              {f.label}
              <span className={`ml-1 ${payFilter === f.id ? 'text-white/80' : 'text-slate-400'}`}>({f.count})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 w-full sm:w-56 shrink-0">
          <FiSearch size={13} className="text-slate-400" />
          <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
            placeholder="Search students..." className="text-sm text-slate-600 outline-none bg-transparent w-full" />
          {studentSearch && <button onClick={() => setStudentSearch('')}><FiX size={12} className="text-slate-400" /></button>}
        </div>
      </div>

      {/* Student Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FiUsers className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-sm text-slate-500">No students found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ps, i) => {
            const isOpen = expandedStudent === ps.studentId;
            const installments = ps.installments || [];
            const payPct = ps.coursePrice > 0 ? Math.min(Math.round((ps.totalPaid / ps.coursePrice) * 100), 100) : 0;

            return (
              <div key={ps.studentId || i}
                className={`transition-all duration-300 ${expandedStudent && !isOpen ? 'opacity-30 scale-[0.99] blur-[1px] pointer-events-none' : 'opacity-100'}`}>
                <div className={`bg-white border rounded-xl overflow-hidden transition-all ${isOpen ? 'border-teal-300 shadow-lg shadow-teal-100/40' : 'border-slate-200 hover:shadow-sm'}`}>
                  {/* Student Header Row */}
                  <div className="cursor-pointer px-5 py-3.5 hover:bg-slate-50/50 transition"
                    onClick={() => setExpandedStudent(isOpen ? null : ps.studentId)}>
                    <div className="grid grid-cols-12 gap-3 items-center">
                      {/* # + Name */}
                      <div className="col-span-3 flex items-center gap-3 min-w-0">
                        <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}</span>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {ps.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{ps.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5 truncate"><FiPhone size={8} /> {ps.phone || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Payable (editable) */}
                      <div className="col-span-2 text-center" onClick={e => e.stopPropagation()}>
                        <p className="text-[9px] text-slate-400 uppercase">Total Payment</p>
                        <EditableCell studentId={ps.studentId} enrollmentId={ps.enrollmentId}
                          field="customFee" value={ps.coursePrice} color="text-slate-700"
                          editing={editingField} editValue={editValue} setEditValue={setEditValue}
                          onSave={saveEdit} onCancel={cancelEdit} onStart={startEdit} saving={editLoading} />
                        {ps.hasCustomFee && (
                          <p className="text-[8px] text-violet-400">Custom (default: {formatTk(ps.defaultCoursePrice)})</p>
                        )}
                      </div>

                      {/* Admission (editable) */}
                      <div className="col-span-2 text-center" onClick={e => e.stopPropagation()}>
                        <p className="text-[9px] text-slate-400 uppercase">Admission Paid</p>
                        <EditableCell studentId={ps.studentId} enrollmentId={ps.enrollmentId}
                          field="admissionPayment" value={ps.admissionPayment} color="text-blue-600"
                          editing={editingField} editValue={editValue} setEditValue={setEditValue}
                          onSave={saveEdit} onCancel={cancelEdit} onStart={startEdit} saving={editLoading} />
                      </div>

                      {/* Paid / Due */}
                      <div className="col-span-1 text-center">
                        <p className="text-[9px] text-slate-400 uppercase">Paid</p>
                        <p className="text-xs font-bold text-emerald-600">{formatTk(ps.totalPaid)}</p>
                      </div>
                      <div className="col-span-1 text-center">
                        <p className="text-[9px] text-slate-400 uppercase">Due</p>
                        <p className={`text-xs font-bold ${ps.remainingDue > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {ps.remainingDue > 0 ? formatTk(ps.remainingDue) : '✓'}
                        </p>
                      </div>

                      {/* Installments */}
                      <div className="col-span-2 text-center">
                        <p className="text-[9px] text-slate-400 uppercase">Installments</p>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold text-teal-600">{ps.paidCount}/{ps.installmentCount}</span>
                          <div className="w-14 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${payPct >= 100 ? 'bg-emerald-500' : payPct >= 50 ? 'bg-amber-500' : payPct > 0 ? 'bg-orange-400' : 'bg-red-300'}`}
                              style={{ width: `${payPct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{payPct}%</span>
                        </div>
                      </div>

                      {/* Expand */}
                      <div className="col-span-1 flex justify-end">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-teal-100 text-teal-600 rotate-180' : 'bg-slate-100 text-slate-400'}`}>
                          <FiChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ═══ EXPANDED ═══ */}
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
                      <div className="px-5 py-5 space-y-5">
                        {/* Payment Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] text-slate-400 font-medium">Total Payment</p>
                              <button onClick={() => startEdit(ps.studentId, 'customFee', ps.coursePrice)}
                                className="text-slate-400 hover:text-teal-600"><FiEdit3 size={10} /></button>
                            </div>
                            {editingField?.studentId === ps.studentId && editingField?.field === 'customFee' ? (
                              <div className="flex items-center gap-1">
                                <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none"
                                  autoFocus onKeyDown={e => {
                                    if (e.key === 'Enter') saveEdit(ps.enrollmentId, 'customFee', editValue);
                                    if (e.key === 'Escape') cancelEdit();
                                  }} />
                                <button onClick={() => saveEdit(ps.enrollmentId, 'customFee', editValue)} disabled={editLoading}
                                  className="text-emerald-600"><FiSave size={12} /></button>
                              </div>
                            ) : (
                              <p className="text-base font-bold text-slate-700">{formatTk(ps.coursePrice)}</p>
                            )}
                            {ps.hasCustomFee && <p className="text-[9px] text-violet-400 mt-0.5">Custom fee (default: {formatTk(ps.defaultCoursePrice)})</p>}
                          </div>
                          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] text-blue-500 font-medium">Admission Paid</p>
                              <button onClick={() => startEdit(ps.studentId, 'admissionPayment', ps.admissionPayment)}
                                className="text-blue-300 hover:text-blue-600"><FiEdit3 size={10} /></button>
                            </div>
                            {editingField?.studentId === ps.studentId && editingField?.field === 'admissionPayment' ? (
                              <div className="flex items-center gap-1">
                                <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none"
                                  autoFocus onKeyDown={e => {
                                    if (e.key === 'Enter') saveEdit(ps.enrollmentId, 'admissionPayment', editValue);
                                    if (e.key === 'Escape') cancelEdit();
                                  }} />
                                <button onClick={() => saveEdit(ps.enrollmentId, 'admissionPayment', editValue)} disabled={editLoading}
                                  className="text-blue-600"><FiSave size={12} /></button>
                              </div>
                            ) : (
                              <p className="text-base font-bold text-blue-600">{formatTk(ps.admissionPayment)}</p>
                            )}
                            <p className="text-[9px] text-blue-400 mt-0.5">{ps.enrolledAt ? fmtDate(ps.enrolledAt) : ''}</p>
                          </div>
                          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
                            <p className="text-[10px] text-emerald-500 font-medium">Total Paid</p>
                            <p className="text-base font-bold text-emerald-600">{formatTk(ps.totalPaid)}</p>
                            <p className="text-[9px] text-emerald-400 mt-0.5">Auto-calculated</p>
                          </div>
                          <div className={`${ps.remainingDue > 0 ? 'bg-red-50/50 border-red-200' : 'bg-emerald-50/50 border-emerald-200'} border rounded-lg p-3`}>
                            <p className={`text-[10px] font-medium ${ps.remainingDue > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Remaining Due</p>
                            <p className={`text-base font-bold ${ps.remainingDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {ps.remainingDue > 0 ? formatTk(ps.remainingDue) : '✓ Fully Paid'}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Auto-calculated</p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center">
                            <div className="relative w-12 h-12">
                              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <circle cx="18" cy="18" r="14" fill="none"
                                  stroke={payPct >= 100 ? '#10b981' : payPct >= 50 ? '#f59e0b' : '#ef4444'}
                                  strokeWidth="3" strokeDasharray={`${payPct * 0.88} 88`} strokeLinecap="round" />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{payPct}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Installment Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-700">Installment Schedule</h4>
                            <p className="text-[11px] text-slate-400">
                              {installments.length > 0 ? `${ps.paidCount} of ${installments.length} installments paid` : 'No installment plan set'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ps.remainingDue > 0 && (
                              <button onClick={() => markFullyPaid(ps)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition">
                                <FiCheckCircle size={10} /> Mark Fully Paid ({formatTk(ps.remainingDue)})
                              </button>
                            )}
                            <button onClick={() => openAdd(ps)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition">
                              <FiPlus size={10} /> Add Payment
                            </button>
                          </div>
                        </div>

                        {/* Installment Table */}
                        {installments.length === 0 ? (
                          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                            <FiDollarSign className="mx-auto text-slate-300 mb-2" size={28} />
                            <p className="text-sm text-slate-500 mb-1">No payments recorded yet</p>
                            <p className="text-xs text-slate-400">Use “Add Payment” or “Mark Fully Paid” to record a payment</p>
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 w-12">#</th>
                                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500">Description</th>
                                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-slate-500">Amount</th>
                                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">Due Date</th>
                                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">Paid Date</th>
                                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">Method</th>
                                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500">Status</th>
                                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500 w-16"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {installments.map((inst, idx) => {
                                  const isPaid = inst.status === 'paid';
                                  const isOverdue = inst.status === 'overdue' || (inst.status === 'due' && inst.dueDate && daysFrom(inst.dueDate) < 0);
                                  const isDue = inst.status === 'due' && !isOverdue;
                                  const isUpcoming = inst.status === 'upcoming';
                                  const dLeft = inst.dueDate ? daysFrom(inst.dueDate) : null;

                                  return (
                                    <tr key={inst._id || idx}
                                      className={`border-b border-slate-50 last:border-0 transition ${
                                        isPaid ? 'bg-white hover:bg-emerald-50/30'
                                        : isOverdue ? 'bg-red-50/40 hover:bg-red-50/60'
                                        : isDue ? 'bg-amber-50/30 hover:bg-amber-50/50'
                                        : 'bg-white hover:bg-slate-50/50'
                                      }`}>
                                      <td className="px-4 py-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          isPaid ? 'bg-emerald-100 text-emerald-600'
                                          : isOverdue ? 'bg-red-100 text-red-600'
                                          : isDue ? 'bg-amber-100 text-amber-600'
                                          : 'bg-slate-100 text-slate-400'
                                        }`}>{isPaid ? '✓' : inst.installmentNumber || idx + 1}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <p className="text-xs font-medium text-slate-700">
                                          {`Installment ${inst.installmentNumber || idx + 1}`}
                                        </p>
                                        {inst.notes && <p className="text-[10px] text-slate-400 mt-0.5">{inst.notes}</p>}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <span className={`text-sm font-bold ${isPaid ? 'text-emerald-600' : isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                          {formatTk(inst.amount)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{fmtDate(inst.dueDate)}</span>
                                        {!isPaid && dLeft !== null && (
                                          <p className={`text-[9px] font-bold mt-0.5 ${isOverdue ? 'text-red-500' : dLeft <= 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {isOverdue ? `${Math.abs(dLeft)}d overdue` : `${dLeft}d left`}
                                          </p>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center text-xs text-slate-500">{isPaid && inst.paidDate ? fmtDate(inst.paidDate) : '—'}</td>
                                      <td className="px-4 py-3 text-center">
                                        {inst.method ? (
                                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {inst.method === 'bkash' ? 'bKash' : inst.method === 'cash' ? 'Cash' : inst.method === 'sslcommerz' ? 'SSL' : 'Manual'}
                                          </span>
                                        ) : '—'}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                          isPaid ? 'bg-emerald-100 text-emerald-700'
                                          : isOverdue ? 'bg-red-100 text-red-600'
                                          : isDue ? 'bg-amber-100 text-amber-700'
                                          : 'bg-slate-100 text-slate-500'
                                        }`}>{isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : isDue ? 'DUE' : 'UPCOMING'}</span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <button onClick={() => deleteInst(inst._id)}
                                          className="text-slate-300 hover:text-red-500 transition" title="Delete payment">
                                          <FiTrash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {/* Summary Row */}
                                <tr className="bg-slate-50 border-t border-slate-200">
                                  <td colSpan={2} className="px-4 py-2.5 text-xs font-bold text-slate-600">Total</td>
                                  <td className="px-4 py-2.5 text-right text-sm font-bold text-slate-700">
                                    {formatTk(installments.reduce((s, x) => s + (x.amount || 0), 0))}
                                  </td>
                                  <td colSpan={2} className="px-4 py-2.5 text-center">
                                    <span className="text-[10px] text-slate-400">
                                      Paid: {formatTk(installments.filter(x => x.status === 'paid').reduce((s, x) => s + (x.amount || 0), 0))}
                                      {' | '}
                                      Due: {formatTk(installments.filter(x => x.status !== 'paid').reduce((s, x) => s + (x.amount || 0), 0))}
                                    </span>
                                  </td>
                                  <td colSpan={3}></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Balance Warning */}
                        {installments.length > 0 && (() => {
                          const totalPlanned = installments.reduce((s, x) => s + (x.amount || 0), 0);
                          // Model A: admission + installments মিলে মোট কোর্স ফি হওয়া উচিত
                          const balanceToPlan = Math.max(0, ps.coursePrice - ps.admissionPayment);
                          const diff = balanceToPlan - totalPlanned;
                          if (diff > 0) return (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                              <FiAlertCircle size={14} className="text-amber-500 shrink-0" />
                              <p className="text-xs text-amber-700">Admission ({formatTk(ps.admissionPayment)}) + installments ({formatTk(totalPlanned)}) is less than total ({formatTk(ps.coursePrice)}). Remaining {formatTk(diff)} needs planning.</p>
                            </div>
                          );
                          if (diff < 0) return (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                              <FiAlertCircle size={14} className="text-red-500 shrink-0" />
                              <p className="text-xs text-red-700">Admission ({formatTk(ps.admissionPayment)}) + installments ({formatTk(totalPlanned)}) exceed total ({formatTk(ps.coursePrice)}) by {formatTk(Math.abs(diff))}.</p>
                            </div>
                          );
                          return (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                              <FiCheckCircle size={14} className="text-emerald-500 shrink-0" />
                              <p className="text-xs text-emerald-700">Admission + installments match the total ({formatTk(ps.coursePrice)}) perfectly.</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ ADD INSTALLMENT MODAL ═══ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowAdd(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Add Payment</h3>
                <p className="text-xs text-slate-400">{showAdd.name}</p>
              </div>
              <button onClick={() => setShowAdd(null)} className="p-1 hover:bg-slate-100 rounded-lg"><FiX size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-lg p-3">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold">Total Payment</p>
                  <p className="text-xs font-bold text-slate-700">{formatTk(showAdd.coursePrice)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-emerald-500 uppercase font-bold">Total Paid</p>
                  <p className="text-xs font-bold text-emerald-600">{formatTk(showAdd.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-red-400 uppercase font-bold">Remaining</p>
                  <p className="text-xs font-bold text-red-500">{formatTk(showAdd.remainingDue)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Amount (tk) *</label>
                  {showAdd.remainingDue > 0 && (
                    <button type="button" onClick={() => setAddForm({ ...addForm, amount: String(showAdd.remainingDue) })}
                      className="text-[10px] font-semibold text-teal-600 hover:text-teal-700">Full ({formatTk(showAdd.remainingDue)})</button>
                  )}
                </div>
                <input type="number" value={addForm.amount}
                  onChange={e => setAddForm({ ...addForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  placeholder={showAdd.remainingDue > 0 ? `Max: ${showAdd.remainingDue}` : '0'} />
                {addForm.amount && Number(addForm.amount) > showAdd.remainingDue && showAdd.remainingDue > 0 && (
                  <p className="text-[10px] text-red-500 mt-1">⚠ Exceeds remaining due ({formatTk(showAdd.remainingDue)})</p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Due Date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="date" value={addForm.dueDate}
                  onChange={e => setAddForm({ ...addForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Status</label>
                  <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
                    <option value="paid">Paid (received)</option>
                    <option value="due">Due (scheduled)</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Method</label>
                  <select value={addForm.method} onChange={e => setAddForm({ ...addForm, method: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
                    <option value="manual">Manual</option>
                    <option value="bkash">bKash</option>
                    <option value="sslcommerz">SSLCommerz</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Notes</label>
                <input type="text" value={addForm.notes}
                  onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  placeholder="Optional notes" />
              </div>

              <button onClick={handleAdd} disabled={addLoading || !addForm.amount}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2">
                {addLoading ? <FiLoader className="animate-spin" size={14} /> : <FiCheckCircle size={14} />}
                {addLoading ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
      {confirmNode}
    </div>
  );
}

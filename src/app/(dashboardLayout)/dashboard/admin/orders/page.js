'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiShoppingCart, FiCheck, FiX, FiSearch,
  FiDollarSign, FiClock, FiAlertCircle,
  FiChevronDown, FiCalendar, FiFilter, FiGlobe, FiBookOpen, FiTrash2,
  FiEye, FiUser, FiMail, FiPhone, FiMapPin, FiHash, FiCreditCard,
  FiEdit2, FiSave,
} from 'react-icons/fi';
import { SkeletonCard, SkeletonRow } from '@/components/shared/Skeleton';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';

const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-2">
    <Icon size={13} className="text-dash-faint mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-dash-mute2 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-dash-ink3 break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  </div>
);

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [installments, setInstallments] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [processing, setProcessing] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const auth = { Authorization: `Bearer ${getToken()}` };
      // One shot: all orders (no 20-row cap) + all installments (no N+1 per-order fetch)
      const [res, iRes] = await Promise.all([
        fetch(`${API}/enrollments/all?includeDeleted=true&limit=10000`, { headers: auth }),
        fetch(`${API}/installments/all`, { headers: auth }),
      ]);
      const data = await res.json();
      const iData = await iRes.json();
      setOrders(data.data || []);

      // Group every installment by its enrollmentId
      const installmentMap = {};
      (iData.data || []).forEach((inst) => {
        const eid = String(inst.enrollmentId?._id || inst.enrollmentId || '');
        if (!eid) return;
        (installmentMap[eid] ||= []).push(inst);
      });
      Object.values(installmentMap).forEach((list) => list.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0)));
      setInstallments(installmentMap);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollmentId) => {
    if (!(await confirm({ title: 'Approve this order?', message: 'This will activate the enrollment and mark payment received.', confirmText: 'Approve', danger: false }))) return;
    setProcessing(enrollmentId);
    try {
      const res = await fetch(`${API}/enrollments/approve/${enrollmentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) { loadOrders(); showToast('success', 'Order approved'); }
      else showToast('error', data.message || 'Error');
    } catch (err) {
      showToast('error', 'Error approving');
    } finally {
      setProcessing(null);
    }
  };

  // ── Admin: edit order/payment details ──────────────────────
  const startEdit = (o) => {
    const p = o.payment || {};
    const gw = p.gatewayData || {};
    setEditForm({
      customFee: o.customFee ?? '',
      amount: p.amount ?? '',
      method: p.method || 'manual',
      status: p.status || 'pending',
      transactionId: p.transactionId || '',
      senderNumber: gw.senderNumber || '',
      paymentType: gw.paymentType || '',
      sentAt: gw.sentAt ? new Date(gw.sentAt).toISOString().slice(0, 16) : '',
      notes: gw.notes || '',
    });
    setEditMode(true);
  };

  const saveEdit = async (orderId) => {
    setSavingEdit(true);
    try {
      const res = await fetch(`${API}/enrollments/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          customFee: editForm.customFee === '' ? undefined : Number(editForm.customFee),
          payment: {
            amount: Number(editForm.amount) || 0,
            method: editForm.method,
            status: editForm.status,
            transactionId: editForm.transactionId,
            gatewayData: {
              senderNumber: editForm.senderNumber,
              paymentType: editForm.paymentType,
              sentAt: editForm.sentAt ? new Date(editForm.sentAt).toISOString() : undefined,
              notes: editForm.notes,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Reflect edits in the open modal (keep populated student/course)
        setDetailsOrder(prev => prev ? {
          ...prev,
          customFee: editForm.customFee === '' ? prev.customFee : Number(editForm.customFee),
          payment: {
            ...prev.payment,
            amount: Number(editForm.amount) || 0,
            method: editForm.method,
            status: editForm.status,
            transactionId: editForm.transactionId,
            paidAt: editForm.status === 'paid' ? (prev.payment?.paidAt || new Date().toISOString()) : prev.payment?.paidAt,
            gatewayData: { ...(prev.payment?.gatewayData || {}), senderNumber: editForm.senderNumber, paymentType: editForm.paymentType, sentAt: editForm.sentAt ? new Date(editForm.sentAt).toISOString() : prev.payment?.gatewayData?.sentAt, notes: editForm.notes },
          },
        } : prev);
        setEditMode(false);
        loadOrders();
        showToast('success', 'Order updated');
      } else {
        showToast('error', data.message || 'Failed to update');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (enrollmentId, newStatus) => {
    setProcessing(enrollmentId);
    try {
      let res;
      if (newStatus === 'active') {
        // Approve → activate + mark paid
        res = await fetch(`${API}/enrollments/approve/${enrollmentId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      } else if (newStatus === 'cancelled') {
        res = await fetch(`${API}/enrollments/cancel/${enrollmentId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      } else {
        // pending / completed → generic status update (do NOT cancel)
        res = await fetch(`${API}/enrollments/${enrollmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      const data = await res.json();
      if (data.success) loadOrders();
      else showToast('error', data.message || 'Error');
    } catch (err) {
      showToast('error', 'Error updating status');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!(await confirm({ title: 'Delete this order?', message: 'This order will be permanently deleted. This cannot be undone.', confirmText: 'Delete' }))) return;
    setProcessing(orderId);
    try {
      const res = await fetch(`${API}/enrollments/order/${orderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) { loadOrders(); showToast('success', 'Order deleted'); }
      else showToast('error', data.message || 'Error');
    } catch (err) {
      showToast('error', 'Error deleting order');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (s) => ({
    active: 'bg-emerald-50 text-emerald-600 border-emerald-300',
    pending: 'bg-amber-50 text-amber-600 border-amber-300',
    cancelled: 'bg-red-50 text-red-500 border-red-300',
    completed: 'bg-blue-50 text-blue-600 border-blue-300',
    deleted: 'bg-rose-100 text-rose-600 border-rose-400',
  }[s] || 'bg-dash-soft2 text-dash-mute border-dash-line-strong');

  const getPaymentColor = (s) => ({
    paid: 'bg-emerald-50 text-emerald-600 border-emerald-300',
    pending: 'bg-amber-50 text-amber-600 border-amber-300',
    failed: 'bg-red-50 text-red-500 border-red-300',
  }[s] || 'bg-dash-soft2 text-dash-mute border-dash-line-strong');

  const getInstColor = (s) => ({
    paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    due: 'bg-amber-50 text-amber-600 border-amber-200',
    overdue: 'bg-red-50 text-red-500 border-red-200',
    upcoming: 'bg-blue-50 text-blue-500 border-blue-200',
  }[s] || 'bg-dash-soft text-dash-mute border-dash-line');

  // ── Model A money helper: paid = admission(if paid) + paid installments; due = agreedTotal − paid ──
  const parseFee = (v) => parseInt(String(v ?? '').replace(/[^0-9]/g, '')) || 0;
  const orderMoney = (o) => {
    const p = o.payment || {};
    const list = installments[o._id] || [];
    // Agreed total = admin customFee, else OFFER price (discounted), else base fee — never the full fee over an offer.
    const agreedTotal = Number(o.customFee) || parseFee(o.courseId?.offerPrice) || parseFee(o.courseId?.fee);
    const submittedAdmission = p.amount || 0;                       // student যা পাঠিয়েছে / admin যা বসিয়েছে (confirm-এর আগেও)
    const verifiedAdmission = p.status === 'paid' ? submittedAdmission : 0;
    const paidInst = list.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amount || 0), 0);
    const shownPaid = submittedAdmission + paidInst;                // display: এ পর্যন্ত জমা (verified না হলেও)
    const collected = verifiedAdmission + paidInst;                 // verified revenue only
    const due = Math.max(0, agreedTotal - shownPaid);
    return { agreedTotal, submittedAdmission, shownPaid, collected, paidInst, due };
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  // Collected = verified আদায় (deleted/cancelled বাদে) — paid admission + paid installments
  const totalRevenue = orders
    .filter(o => o.status !== 'deleted' && o.status !== 'cancelled')
    .reduce((s, o) => s + orderMoney(o).collected, 0);
  // Due = active enrollment-গুলোর বাকি টাকা
  const dueAmount = orders
    .filter(o => o.status === 'active')
    .reduce((s, o) => s + orderMoney(o).due, 0);

  // Build unique course list for filter
  const courseMap = new Map();
  orders.forEach(o => { if (o.courseId?._id) courseMap.set(o.courseId._id, o.courseId.title); });
  const courseList = Array.from(courseMap, ([id, title]) => ({ id, title }));

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'pending' && o.status === 'pending') ||
      (filterStatus === 'active' && o.status === 'active') ||
      (filterStatus === 'cancelled' && o.status === 'cancelled') ||
      (filterStatus === 'deleted' && o.status === 'deleted') ||
      (filterStatus === 'installment' && installments[o._id]);
    const matchType = filterType === 'all' || (o.courseId?.type || '').toLowerCase() === filterType;
    const matchCourse = filterCourse === 'all' || o.courseId?._id === filterCourse;
    const term = searchTerm.toLowerCase();
    const name = `${o.studentId?.firstName || ''} ${o.studentId?.lastName || ''} ${o.studentId?.name || ''}`.toLowerCase();
    const course = (o.courseId?.title || '').toLowerCase();
    const txn = (o.payment?.transactionId || '').toLowerCase();
    return matchStatus && matchType && matchCourse && (name.includes(term) || course.includes(term) || txn.includes(term));
  });

  return (
    <div className="poppins space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dash-ink outfit">Orders</h1>
        <p className="text-sm text-dash-mute mt-1">All course purchase orders & payment tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</>
        ) : [
          { label: 'Total Orders', value: orders.length, icon: FiShoppingCart, color: 'text-dash-ink3', bg: 'bg-dash-soft2' },
          { label: 'Pending', value: pendingOrders.length, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Collected', value: `৳${totalRevenue.toLocaleString()}`, icon: FiDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Due Amount', value: `৳${dueAmount.toLocaleString()}`, icon: FiAlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-dash-card rounded-xl border border-dash-line/60 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-dash-mute2">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-3 text-dash-mute2" size={16} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, course, or transaction ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dash-line/60 text-sm focus:border-teal-400 outline-none bg-dash-card shadow-sm" />
          </div>
          <div className="flex gap-1 bg-dash-soft2 rounded-xl p-1 flex-wrap">
            {['all', 'pending', 'active', 'installment', 'cancelled', 'deleted'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition ${filterStatus === s ? 'bg-dash-card text-teal-600 shadow-sm font-medium' : 'text-dash-mute'}`}>
                {s === 'installment' ? '📋 Installment' : s === 'deleted' ? '🗑️ Deleted' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-dash-mute2 flex items-center gap-1"><FiFilter size={13} /> Filters:</span>

          {/* Course Type */}
          <div className="relative">
            <FiGlobe size={13} className="absolute left-2.5 top-[8px] pointer-events-none text-dash-mute2" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className={`appearance-none pl-8 pr-7 py-1.5 rounded-lg border text-sm cursor-pointer outline-none transition ${
                filterType !== 'all' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-dash-card text-dash-ink4 border-dash-line'
              }`}>
              <option value="all">All Types</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="recorded">Recorded</option>
            </select>
            <FiChevronDown size={12} className="absolute right-2 top-[9px] pointer-events-none text-dash-faint" />
          </div>

          {/* Course */}
          <div className="relative">
            <FiBookOpen size={13} className="absolute left-2.5 top-[8px] pointer-events-none text-dash-mute2" />
            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
              className={`appearance-none pl-8 pr-7 py-1.5 rounded-lg border text-sm cursor-pointer outline-none transition max-w-[220px] truncate ${
                filterCourse !== 'all' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-dash-card text-dash-ink4 border-dash-line'
              }`}>
              <option value="all">All Courses</option>
              {courseList.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <FiChevronDown size={12} className="absolute right-2 top-[9px] pointer-events-none text-dash-faint" />
          </div>

          {/* Clear all filters */}
          {(filterStatus !== 'all' || filterType !== 'all' || filterCourse !== 'all' || searchTerm) && (
            <button onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterCourse('all'); setSearchTerm(''); }}
              className="px-3 py-1.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50 transition border border-rose-200">
              ✕ Clear
            </button>
          )}

          <span className="ml-auto text-sm text-dash-mute2">{filtered.length} of {orders.length} orders</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dash-soft/80 border-b border-dash-line-soft">
                  {['Student','Course','Amount','TXN ID','Payment','Status','Installment','Date','Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-sm font-medium text-dash-mute">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FiShoppingCart className="mx-auto text-dash-faint mb-3" size={36} />
            <h3 className="font-medium text-dash-ink4 text-base">No Orders Found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dash-soft/80 border-b border-dash-line-soft">
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Student</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Course</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Amount</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">TXN ID / Method</th>
                  <th className="text-center px-5 py-3 text-sm font-medium text-dash-mute">Payment</th>
                  <th className="text-center px-5 py-3 text-sm font-medium text-dash-mute">Status</th>
                  <th className="text-center px-5 py-3 text-sm font-medium text-dash-mute">Installment</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Date & Time</th>
                  <th className="text-right px-5 py-3 text-sm font-medium text-dash-mute">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const student = order.studentId || {};
                  const course = order.courseId || {};
                  const payment = order.payment || {};
                  const inst = installments[order._id] || [];
                  const paidInst = inst.filter(i => i.status === 'paid').length;
                  const totalInst = inst.length;
                  const overdue = inst.filter(i => i.status === 'overdue').length;
                  const nextDue = inst.find(i => i.status === 'due' || i.status === 'upcoming');
                  const isExpanded = expandedOrder === order._id;
                  const orderDate = new Date(order.createdAt || order.enrolledAt);
                  const studentName = `${student.firstName || student.name || 'Student'} ${student.lastName || ''}`.trim();

                  return (
                    <React.Fragment key={order._id}>
                      <tr className="border-b border-dash-line-soft hover:bg-dash-soft/50 transition">
                        {/* Student */}
                        <td className="px-5 py-3.5">
                          <Link href={`/dashboard/admin/user/${student._id || ''}`} className="flex items-center gap-2.5 group">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-dash-ink3 group-hover:text-teal-600 transition truncate max-w-[140px]">
                                {studentName}
                              </p>
                              <p className="text-xs text-dash-mute2 truncate max-w-[140px]">{student.email}</p>
                            </div>
                          </Link>
                        </td>

                        {/* Course */}
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-dash-ink3 truncate max-w-[160px]">{course.title || 'Course'}</p>
                        </td>

                        {/* Amount — paid so far + remaining due */}
                        <td className="px-5 py-3.5">
                          {(() => { const m = orderMoney(order); return (
                            <>
                              <span className="text-sm font-medium text-dash-ink3">৳{m.shownPaid.toLocaleString()}</span>
                              {m.due > 0 && <p className="text-[11px] text-red-400">৳{m.due.toLocaleString()} due</p>}
                            </>
                          ); })()}
                        </td>

                        {/* TXN */}
                        <td className="px-5 py-3.5">
                          {payment.transactionId ? (
                            <div>
                              <p className="font-mono text-sm text-dash-ink4">{payment.transactionId}</p>
                              <p className="text-xs text-dash-mute2 capitalize">
                                {payment.method}{payment.gatewayData?.paymentType ? ` · ${payment.gatewayData.paymentType}` : ''}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-dash-mute2 capitalize">{payment.method || '—'}</span>
                          )}
                        </td>

                        {/* Payment Status */}
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium border ${getPaymentColor(payment.status)}`}>
                            {payment.status || '—'}
                          </span>
                        </td>

                        {/* Order Status — Editable */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="relative inline-block">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              disabled={processing === order._id || order.status === 'deleted'}
                              className={`appearance-none px-3 py-1.5 pr-7 rounded-md text-xs font-medium border cursor-pointer outline-none disabled:opacity-50 ${getStatusColor(order.status)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="active">Approved</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="completed">Completed</option>
                              {order.status === 'deleted' && <option value="deleted">🗑️ Deleted</option>}
                            </select>
                            <FiChevronDown size={10} className="absolute right-2 top-2.5 pointer-events-none opacity-40" />
                          </div>
                        </td>

                        {/* Installment */}
                        <td className="px-5 py-3.5 text-center">
                          {totalInst > 0 ? (
                            <button onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition border border-blue-200">
                              {paidInst}/{totalInst} paid
                              {overdue > 0 && <span className="text-red-500 ml-1">({overdue} overdue)</span>}
                              <FiChevronDown size={11} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          ) : (
                            <span className="text-sm text-dash-faint">—</span>
                          )}
                        </td>

                        {/* Date + Time */}
                        <td className="px-5 py-3.5">
                          <p className="text-sm text-dash-ink4">{orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-dash-mute2">{orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => { setEditMode(false); setDetailsOrder(order); }}
                              title="View order details"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-brand-ink hover:bg-brand-soft transition border border-transparent hover:border-brand-line"
                            >
                              <FiEye size={15} />
                            </button>
                            {order.status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(order._id)} disabled={processing === order._id}
                                  className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition">
                                  ✓ Approve
                                </button>
                                <button onClick={() => handleStatusChange(order._id, 'cancelled')} disabled={processing === order._id}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-rose-500 hover:bg-rose-50 transition">
                                  <FiX size={16} />
                                </button>
                              </>
                            )}
                            {order.status === 'active' && <span className="text-sm text-emerald-500">✓ Approved</span>}
                            {order.status === 'cancelled' && <span className="text-sm text-red-400">Cancelled</span>}
                            {order.status === 'deleted' && <span className="text-sm text-rose-500 font-medium">🗑️ Enrollment Deleted</span>}
                            {/* Delete button - always visible for admin */}
                            <button
                              onClick={() => handleDeleteOrder(order._id)}
                              disabled={processing === order._id}
                              title="Permanently delete this order"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 disabled:opacity-50"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Installment Detail */}
                      {isExpanded && totalInst > 0 && (
                        <tr>
                          <td colSpan={9} className="bg-dash-soft/70 px-5 py-4 border-b border-dash-line-soft">
                            <div className="ml-12">
                              <p className="text-sm font-medium text-dash-mute mb-3">Installment Plan</p>
                              <div className="space-y-2">
                                {inst.map((item, idx) => (
                                  <div key={item._id} className={`flex items-center gap-4 p-3 rounded-xl border ${getInstColor(item.status)}`}>
                                    <span className="text-sm font-medium w-6 text-center">#{item.installmentNumber || idx + 1}</span>
                                    <span className="text-sm font-medium flex-1">৳{item.amount?.toLocaleString()}</span>
                                    <span className="text-sm flex items-center gap-1">
                                      <FiCalendar size={13} />
                                      Due: {new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                    {item.paidDate && (
                                      <span className="text-sm flex items-center gap-1">
                                        <FiCheck size={13} />
                                        Paid: {new Date(item.paidDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} {new Date(item.paidDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </span>
                                    )}
                                    {item.transactionId && <span className="font-mono text-xs text-dash-mute">TXN: {item.transactionId}</span>}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase border ${getInstColor(item.status)}`}>
                                      {item.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {nextDue && (
                                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-700">
                                  <FiAlertCircle className="inline mr-1" size={14} />
                                  Next payment: <strong>৳{nextDue.amount?.toLocaleString()}</strong> due on{' '}
                                  <strong>{new Date(nextDue.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Order Details Modal ═══ */}
      {detailsOrder && (() => {
        const o = detailsOrder;
        const s = o.studentId || {};
        const c = o.courseId || {};
        const p = o.payment || {};
        const inst = installments[o._id] || [];
        const hasInst = inst.length > 0;
        // Total = agreed fee: customFee, else OFFER price, else base fee
        const total = Number(o.customFee) || parseFee(c.offerPrice) || parseFee(c.fee);
        const submittedAdmission = p.amount || 0;
        const paidInst = inst.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amount || 0), 0);
        const paid = submittedAdmission + paidInst;
        const due = Math.max(0, total - paid);
        const name = `${s.firstName || s.name || 'Student'} ${s.lastName || ''}`.trim();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { setEditMode(false); setDetailsOrder(null); }}>
            <div className="bg-dash-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand to-brand-hover shrink-0">
                <div>
                  <h3 className="text-white font-bold text-lg outfit">Order Details</h3>
                  <p className="text-white/80 text-xs font-mono">#{String(o._id).slice(-8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!editMode && (
                    <button onClick={() => startEdit(o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition">
                      <FiEdit2 size={13} /> Edit
                    </button>
                  )}
                  <button onClick={() => { setEditMode(false); setDetailsOrder(null); }} className="text-white/70 hover:text-white transition"><FiX size={20} /></button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Status badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${getStatusColor(o.status)}`}>{o.status}</span>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${getPaymentColor(p.status)}`}>Payment: {p.status || '—'}</span>
                  {c.type && <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-brand-soft text-brand-ink border border-brand-line">{c.type}</span>}
                </div>

                {/* Student */}
                <div className="rounded-xl border border-dash-line-soft p-4">
                  <h4 className="text-[11px] font-bold text-dash-mute2 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiUser size={12} /> Student</h4>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white font-bold text-lg outfit shrink-0">{name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="font-bold text-dash-ink2">{name}</p>
                      <p className="text-xs text-dash-mute2 capitalize">{s.gender || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DetailRow icon={FiMail} label="Email" value={s.email} />
                    <DetailRow icon={FiPhone} label="Phone" value={s.phoneNumber} />
                    <DetailRow icon={FiMapPin} label="Location" value={s.location} />
                  </div>
                </div>

                {/* Course */}
                <div className="rounded-xl border border-dash-line-soft p-4">
                  <h4 className="text-[11px] font-bold text-dash-mute2 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiBookOpen size={12} /> Course</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-11 rounded-lg overflow-hidden bg-dash-soft2 shrink-0">
                      {c.image && <img src={c.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-dash-ink2 truncate">{c.title || 'Course'}</p>
                      <p className="text-xs text-dash-mute2 flex items-center gap-1"><FiCalendar size={11} /> Ordered: {fmtDateTime(o.createdAt || o.enrolledAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Payment — edit form (admin) vs read-only view */}
                {editMode && editForm ? (
                  <div className="rounded-xl border border-brand-line bg-brand-soft/40 p-4 space-y-3">
                    <h4 className="text-[11px] font-bold text-brand-ink uppercase tracking-wider flex items-center gap-1.5"><FiEdit2 size={12} /> Edit Payment</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Total Fee (৳)</label>
                        <input type="number" min="0" value={editForm.customFee}
                          onChange={e => setEditForm({ ...editForm, customFee: e.target.value })}
                          placeholder={`Default: ${total}`}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Amount Paid / Sent (৳)</label>
                        <input type="number" min="0" value={editForm.amount}
                          onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Method</label>
                        <select value={editForm.method} onChange={e => setEditForm({ ...editForm, method: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none bg-dash-card">
                          <option value="manual">Manual (bank/mobile)</option>
                          <option value="cash">Hand Cash</option>
                          <option value="bkash">bKash</option>
                          <option value="sslcommerz">Card/Bank (SSL)</option>
                          <option value="free">Free</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Payment Status</label>
                        <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none bg-dash-card">
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Transaction ID</label>
                        <input type="text" value={editForm.transactionId}
                          onChange={e => setEditForm({ ...editForm, transactionId: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Paid From (number)</label>
                        <input type="text" value={editForm.senderNumber}
                          onChange={e => setEditForm({ ...editForm, senderNumber: e.target.value })}
                          placeholder="01XXXXXXXXX"
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Payment Via</label>
                        <select value={editForm.paymentType} onChange={e => setEditForm({ ...editForm, paymentType: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none bg-dash-card">
                          <option value="">—</option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="rocket">Rocket</option>
                          <option value="cash">Hand Cash</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Sent At</label>
                        <input type="datetime-local" value={editForm.sentAt}
                          onChange={e => setEditForm({ ...editForm, sentAt: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-dash-mute uppercase">Notes</label>
                        <input type="text" value={editForm.notes}
                          onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                          className="w-full mt-1 px-3 py-2 text-sm border border-dash-line rounded-lg focus:outline-none" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => saveEdit(o._id)} disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition">
                        {savingEdit ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />} Save Changes
                      </button>
                      <button onClick={() => setEditMode(false)} disabled={savingEdit}
                        className="px-4 py-2 border border-dash-line text-dash-ink4 text-sm font-semibold rounded-lg hover:bg-dash-soft transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Payment */}
                    <div className="rounded-xl border border-dash-line-soft p-4">
                      <h4 className="text-[11px] font-bold text-dash-mute2 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FiCreditCard size={12} /> Payment</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DetailRow icon={FiCreditCard} label="Method" value={`${p.method || '—'}${p.gatewayData?.paymentType ? ` · ${p.gatewayData.paymentType}` : ''}`} />
                        <DetailRow icon={FiPhone} label="Paid from (number)" value={p.gatewayData?.senderNumber} />
                        <DetailRow icon={FiHash} label="Transaction ID" value={p.transactionId} mono />
                        <DetailRow icon={FiClock} label="Paid at" value={p.paidAt ? fmtDateTime(p.paidAt) : 'Not paid yet'} />
                      </div>
                    </div>

                    {/* Amount summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-dash-soft border border-dash-line-soft p-3 text-center">
                        <p className="text-lg font-bold text-dash-ink2 outfit">৳{total.toLocaleString()}</p>
                        <p className="text-[11px] text-dash-mute2">Total</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600 outfit">৳{paid.toLocaleString()}</p>
                        <p className="text-[11px] text-emerald-500">Paid</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                        <p className="text-lg font-bold text-amber-600 outfit">৳{due.toLocaleString()}</p>
                        <p className="text-[11px] text-amber-500">Due</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Installments */}
                {hasInst && (
                  <div className="rounded-xl border border-dash-line-soft p-4">
                    <h4 className="text-[11px] font-bold text-dash-mute2 uppercase tracking-wider mb-3">
                      Installments ({inst.filter(i => i.status === 'paid').length}/{inst.length} paid)
                    </h4>
                    <div className="space-y-1.5">
                      {inst.map((i, idx) => (
                        <div key={i._id || idx} className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${getInstColor(i.status)}`}>
                          <span className="font-semibold">#{i.installmentNumber || idx + 1} · ৳{(i.amount || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><FiCalendar size={11} /> {new Date(i.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                          <span className="font-bold uppercase">{i.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              {!editMode && (
              <div className="flex items-center gap-2 px-6 py-4 border-t border-dash-line-soft shrink-0">
                {o.status === 'pending' && (
                  <>
                    <button
                      onClick={() => { handleApprove(o._id); setDetailsOrder(null); }}
                      className="px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition"
                    >
                      ✓ Approve Order
                    </button>
                    <button
                      onClick={() => { handleStatusChange(o._id, 'cancelled'); setDetailsOrder(null); }}
                      className="px-4 py-2.5 border border-dash-line text-dash-ink4 text-sm font-semibold rounded-lg hover:bg-dash-soft transition"
                    >
                      Cancel Order
                    </button>
                  </>
                )}
                <button
                  onClick={() => { handleDeleteOrder(o._id); setDetailsOrder(null); }}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
                >
                  <FiTrash2 size={14} /> Delete
                </button>
              </div>
              )}
            </div>
          </div>
        );
      })()}

      {toastNode}
      {confirmNode}
    </div>
  );
}

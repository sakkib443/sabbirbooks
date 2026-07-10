'use client';

import React, { useState, useEffect } from 'react';
import {
  FiDollarSign, FiDownload, FiLoader, FiFilter,
  FiCheckCircle, FiClock, FiXCircle, FiCreditCard,
  FiCalendar, FiFileText, FiSearch,
} from 'react-icons/fi';

import { useToast } from '@/components/shared/Toast';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function UserPaymentsPage() {
  const { showToast, toastNode } = useToast();
  const [enrollments, setEnrollments] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);
  // Pay Due modal
  const [payModal, setPayModal] = useState(null);   // { enrollment, due }
  const [payForm, setPayForm] = useState({ amount: '', paymentType: 'bkash', senderNumber: '', transactionId: '' });
  const [paying, setPaying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const headers = { Authorization: `Bearer ${token}` };
      const [eRes, iRes] = await Promise.all([
        fetch(`${API}/enrollments/my-enrollments`, { headers }),
        fetch(`${API}/installments/my`, { headers }),
      ]);
      const eData = await eRes.json();
      const iData = await iRes.json();
      if (eData.success) setEnrollments(eData.data || []);
      if (iData.success) setInstallments(iData.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDownloadInvoice = async (enrollmentId) => {
    setDownloadingId(enrollmentId);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/invoice/download/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${enrollmentId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        showToast('error', 'Failed to download invoice');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            <FiCheckCircle size={12} /> Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
            <FiClock size={12} /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200">
            <FiXCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Show the REAL method (manual হলে bKash/Nagad/Rocket, cash হলে Hand Cash)
  const getMethodLabel = (payment = {}) => {
    const method = payment.method;
    const via = payment.gatewayData?.paymentType;
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    switch (method) {
      case 'bkash': return { label: 'bKash', icon: '🅱️', color: 'text-pink-600' };
      case 'sslcommerz': return { label: 'Card/Bank', icon: '💳', color: 'text-blue-600' };
      case 'cash': return { label: 'Hand Cash', icon: '💵', color: 'text-emerald-600' };
      case 'free': return { label: 'Free', icon: '🎁', color: 'text-green-600' };
      case 'manual': return {
        label: via ? cap(via) : 'Bank Transfer',
        icon: via === 'bkash' ? '🅱️' : via === 'nagad' ? '🟠' : via === 'rocket' ? '🟣' : '🏦',
        color: 'text-amber-600',
      };
      default: return { label: cap(method) || '—', icon: '💰', color: 'text-slate-600' };
    }
  };

  const openPay = (enrollment, due) => {
    setPayForm({ amount: String(due || ''), paymentType: 'bkash', senderNumber: '', transactionId: '' });
    setPayModal({ enrollment, due });
  };

  const submitPay = async () => {
    if (!payModal) return;
    const amt = Number(payForm.amount) || 0;
    if (amt <= 0) return showToast('error', 'সঠিক amount দিন');
    if (amt > payModal.due) return showToast('error', `সর্বোচ্চ ৳${payModal.due.toLocaleString()} দেওয়া যাবে`);
    if (!payForm.transactionId) return showToast('error', 'Transaction ID দিন');
    setPaying(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/installments/pay-due`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enrollmentId: payModal.enrollment._id,
          amount: amt,
          method: 'manual',
          transactionId: payForm.transactionId,
          notes: `${payForm.paymentType}${payForm.senderNumber ? ` · from ${payForm.senderNumber}` : ''}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayModal(null);
        await loadData();
        showToast('success', 'Payment recorded');
      } else {
        showToast('error', data.message || 'Payment failed');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setPaying(false);
    }
  };

  const filtered = filter === 'all'
    ? enrollments
    : enrollments.filter(e => e.payment?.status === filter);

  // Model A money per enrollment: paid = admission(if paid) + paid installments; due = agreed − paid
  const parseFee = (v) => parseInt(String(v ?? '').replace(/[^0-9]/g, '')) || 0;
  const enrollMoney = (e) => {
    const p = e.payment || {};
    const list = installments.filter(i => (i.enrollmentId === e._id) || (i.enrollmentId?._id === e._id));
    // Agreed total = customFee, else OFFER price (discounted), else base fee
    const agreedTotal = Number(e.customFee) || parseFee(e.courseId?.offerPrice) || parseFee(e.courseId?.fee);
    const admissionPaid = p.status === 'paid' ? (p.amount || 0) : 0;
    const paidInst = list.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amount || 0), 0);
    const totalPaid = admissionPaid + paidInst;
    const due = Math.max(0, agreedTotal - totalPaid);
    return { agreedTotal, admissionPaid, paidInst, totalPaid, due };
  };

  // Stats
  const totalPaid = enrollments.reduce((acc, e) => acc + enrollMoney(e).totalPaid, 0);
  const totalDue = enrollments.filter(e => e.status === 'active').reduce((acc, e) => acc + enrollMoney(e).due, 0);
  const totalPending = enrollments.filter(e => e.payment?.status === 'pending').length;

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-slate-50 flex items-center justify-center">
        <FiLoader className="animate-spin text-[#F3A522]" size={30} />
        <p className="ml-3 text-slate-500">Loading payment history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
        <p className="text-slate-500 text-sm mt-1">View your payment records and download invoices</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FiDollarSign className="text-emerald-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Paid</p>
              <p className="text-xl font-bold text-slate-900 outfit">৳{totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
              <FiDollarSign className="text-red-500" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Due</p>
              <p className="text-xl font-bold text-slate-900 outfit">৳{totalDue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <FiCreditCard className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Transactions</p>
              <p className="text-xl font-bold text-slate-900 outfit">{enrollments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <FiClock className="text-amber-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending</p>
              <p className="text-xl font-bold text-slate-900 outfit">{totalPending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm w-fit">
        {[
          { id: 'all', label: 'All' },
          { id: 'paid', label: 'Paid' },
          { id: 'pending', label: 'Pending' },
          { id: 'failed', label: 'Failed' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === tab.id
              ? 'bg-[#F3A522] text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payment Records */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <FiCreditCard className="mx-auto text-4xl text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Payment Records</h3>
          <p className="text-slate-500 text-sm">No payments found for the selected filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Course</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((enrollment) => {
                  const course = enrollment.courseId || {};
                  const payment = enrollment.payment || {};
                  const method = getMethodLabel(payment);

                  return (
                    <tr key={enrollment._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {course.image && (
                            <img src={course.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{course.title || 'Course'}</p>
                            <p className="text-[11px] text-slate-400">{course.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => { const m = enrollMoney(enrollment); return (
                          <>
                            <span className="text-sm font-bold text-slate-800">৳{m.totalPaid.toLocaleString()}</span>
                            {m.due > 0 && <p className="text-[11px] text-red-400 mt-0.5">৳{m.due.toLocaleString()} due</p>}
                          </>
                        ); })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${method.color}`}>
                          <span>{method.icon}</span>
                          {method.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : new Date(enrollment.enrolledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {enrollMoney(enrollment).due > 0 && (
                            <button
                              onClick={() => openPay(enrollment, enrollMoney(enrollment).due)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all"
                            >
                              Pay Now
                            </button>
                          )}
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => handleDownloadInvoice(enrollment._id)}
                              disabled={downloadingId === enrollment._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-[#F3A522] hover:text-white transition-all disabled:opacity-50"
                            >
                              {downloadingId === enrollment._id ? (
                                <FiLoader className="animate-spin" size={12} />
                              ) : (
                                <FiDownload size={12} />
                              )}
                              Invoice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ Pay Now (due) Modal ═══ */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13]">
              <div>
                <h3 className="text-white font-bold text-lg outfit">Pay Due</h3>
                <p className="text-white/80 text-xs truncate max-w-[280px]">{payModal.enrollment.courseId?.title || 'Course'}</p>
              </div>
              <button onClick={() => setPayModal(null)} className="text-white/70 hover:text-white"><FiXCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Due */}
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-[11px] text-red-400 font-medium">Remaining Due</p>
                <p className="text-2xl font-extrabold text-red-500 outfit">৳{payModal.due.toLocaleString()}</p>
              </div>

              {/* Send money note */}
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  নিচের যেকোনো নম্বরে “Send Money” করুন, তারপর তথ্য দিন:
                </p>
                <p className="text-sm font-bold text-slate-700 font-mono mt-1">01711-946614 <span className="text-[10px] font-normal text-slate-400">(bKash / Nagad / Rocket)</span></p>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Amount (৳)</label>
                <input type="number" min="1" max={payModal.due} value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3A522]/20 focus:border-[#F3A522]" />
              </div>

              {/* Payment via */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Via</label>
                <div className="flex gap-2">
                  {['bkash', 'nagad', 'rocket'].map(t => (
                    <button key={t} type="button" onClick={() => setPayForm({ ...payForm, paymentType: t })}
                      className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border transition ${payForm.paymentType === t ? 'border-[#F3A522] bg-[#f0fffe] text-[#F3A522]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender number */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Sender Number</label>
                <input type="tel" placeholder="01XXXXXXXXX" value={payForm.senderNumber}
                  onChange={e => setPayForm({ ...payForm, senderNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F3A522]/20 focus:border-[#F3A522]" />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Transaction ID</label>
                <input type="text" placeholder="e.g. TXN8K4F2J9D" value={payForm.transactionId}
                  onChange={e => setPayForm({ ...payForm, transactionId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F3A522]/20 focus:border-[#F3A522]" />
              </div>

              <button onClick={submitPay} disabled={paying}
                className="w-full py-3 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white font-bold text-sm rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {paying ? <FiLoader className="animate-spin" size={16} /> : <FiCheckCircle size={16} />}
                {paying ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  );
}

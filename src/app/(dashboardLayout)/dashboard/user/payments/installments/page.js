'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiCheckCircle, FiClock, FiAlertTriangle,
  FiDollarSign, FiCalendar, FiArrowLeft, FiCreditCard,
} from 'react-icons/fi';

import { useToast } from '@/components/shared/Toast';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function InstallmentsPage() {
  const { showToast, toastNode } = useToast();
  const [installments, setInstallments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        const headers = { Authorization: `Bearer ${token}` };
        const [iRes, eRes] = await Promise.all([
          fetch(`${API}/installments/my`, { headers }),
          fetch(`${API}/enrollments/my-enrollments`, { headers }),
        ]);
        const iData = await iRes.json();
        const eData = await eRes.json();
        if (iData.success) setInstallments(iData.data || []);
        if (eData.success) setEnrollments(eData.data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePayInstallment = async (id) => {
    setPayingId(id);
    try {
      const token = localStorage.getItem('token') || '';
      // Demo mode: auto-pay
      const res = await fetch(`${API}/installments/${id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          transactionId: `DEMO_INST_${Date.now()}`,
          method: 'demo',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInstallments(prev =>
          prev.map(inst => inst._id === id ? { ...inst, status: 'paid', paidDate: new Date() } : inst)
        );
        showToast('success', 'Installment paid');
      } else {
        showToast('error', data.message || 'Payment failed');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setPayingId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: FiCheckCircle };
      case 'due': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: FiClock };
      case 'overdue': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: FiAlertTriangle };
      default: return { bg: 'bg-dash-soft', text: 'text-dash-mute', border: 'border-dash-line', icon: FiClock };
    }
  };

  const parseFee = (v) => parseInt(String(v ?? '').replace(/[^0-9]/g, '')) || 0;
  const enrollmentByCourse = {};
  enrollments.forEach(e => { const cid = e.courseId?._id; if (cid) enrollmentByCourse[cid] = e; });

  // Group installments by course, attach the matching enrollment
  const grouped = installments.reduce((acc, inst) => {
    const courseId = inst.courseId?._id || 'unknown';
    if (!acc[courseId]) acc[courseId] = { course: inst.courseId, enrollment: enrollmentByCourse[courseId], items: [] };
    acc[courseId].items.push(inst);
    return acc;
  }, {});

  // Per-course money (Model A: admission + installments = total course fee)
  const groupMoney = (g) => {
    const e = g.enrollment;
    const instSum = g.items.reduce((a, i) => a + (i.amount || 0), 0);
    const admissionAll = e?.payment?.amount || 0;
    const admissionPaid = e?.payment?.status === 'paid' ? admissionAll : 0;
    const agreedTotal = Number(e?.customFee) || parseFee(e?.courseId?.offerPrice) || parseFee(e?.courseId?.fee) || (admissionAll + instSum);
    const paidInst = g.items.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amount || 0), 0);
    const totalPaid = admissionPaid + paidInst;
    const due = Math.max(0, agreedTotal - totalPaid);
    return { agreedTotal, admissionPaid, paidInst, totalPaid, due };
  };

  // Stats
  const groups = Object.values(grouped);
  const totalPaid = groups.reduce((a, g) => a + groupMoney(g).totalPaid, 0);
  const totalDue = groups.reduce((a, g) => a + groupMoney(g).due, 0);
  const overdueCount = installments.filter(i => i.status === 'overdue').length;

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-dash-soft flex items-center justify-center">
        <FiLoader className="animate-spin text-brand" size={30} />
        <p className="ml-3 text-dash-mute">Loading installments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-dash-soft">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dash-ink outfit">Installment Tracker</h1>
        <p className="text-dash-mute mt-1">Track your installment payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-dash-card rounded-2xl border border-dash-line p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FiCheckCircle className="text-emerald-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-dash-mute">Total Paid</p>
              <p className="text-xl font-bold text-dash-ink outfit">৳{totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-dash-card rounded-2xl border border-dash-line p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <FiDollarSign className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-dash-mute">Due Amount</p>
              <p className="text-xl font-bold text-dash-ink outfit">৳{totalDue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-dash-card rounded-2xl border border-dash-line p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${overdueCount > 0 ? 'bg-red-50' : 'bg-dash-soft'}`}>
              <FiAlertTriangle className={overdueCount > 0 ? 'text-red-600' : 'text-dash-mute2'} size={20} />
            </div>
            <div>
              <p className="text-xs text-dash-mute">Overdue</p>
              <p className={`text-xl font-bold outfit ${overdueCount > 0 ? 'text-red-600' : 'text-dash-ink'}`}>{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Installment Groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dash-line p-16 text-center">
          <FiCreditCard className="mx-auto text-4xl text-dash-faint mb-4" />
          <h3 className="text-lg font-bold text-dash-ink3 mb-2">No Installments</h3>
          <p className="text-dash-mute text-sm">You don&apos;t have any installment plans.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const { course, items } = g;
            const m = groupMoney(g);
            return (
            <div key={course?._id || 'unknown'} className="bg-dash-card rounded-2xl border border-dash-line shadow-sm overflow-hidden">
              {/* Course Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-dash-soft to-dash-card border-b border-dash-line-soft">
                <div className="flex items-center gap-3">
                  {course?.image && (
                    <img src={course.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-dash-ink2 truncate">{course?.title || 'Course'}</h3>
                    <p className="text-xs text-dash-mute">{items.length} installments</p>
                  </div>
                </div>
                {/* Money summary (Model A) */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { label: 'Total Fee', value: m.agreedTotal, color: 'text-dash-ink3' },
                    { label: 'Admission', value: m.admissionPaid, color: 'text-blue-600' },
                    { label: 'Paid', value: m.totalPaid, color: 'text-emerald-600' },
                    { label: 'Due', value: m.due, color: m.due > 0 ? 'text-red-500' : 'text-emerald-500' },
                  ].map(c => (
                    <div key={c.label} className="rounded-lg bg-dash-soft border border-dash-line-soft px-2 py-1.5 text-center">
                      <p className="text-[9px] text-dash-mute2 uppercase tracking-wider">{c.label}</p>
                      <p className={`text-sm font-bold ${c.color}`}>৳{(c.value || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="p-6">
                <div className="space-y-4">
                  {items.sort((a, b) => a.installmentNumber - b.installmentNumber).map((inst, idx) => {
                    const style = getStatusStyle(inst.status);
                    const StatusIcon = style.icon;
                    const isLast = idx === items.length - 1;

                    return (
                      <div key={inst._id} className="flex gap-4">
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${style.bg} border ${style.border}`}>
                            <StatusIcon className={style.text} size={14} />
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-dash-soft2 mt-1" />}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 flex items-center justify-between p-4 rounded-xl border ${style.border} ${style.bg} mb-1`}>
                          <div>
                            <p className="text-sm font-bold text-dash-ink2">
                              Installment #{inst.installmentNumber}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-dash-mute">
                              <span className="flex items-center gap-1">
                                <FiCalendar size={12} />
                                Due: {new Date(inst.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              {inst.paidDate && (
                                <span className="text-emerald-600">
                                  Paid: {new Date(inst.paidDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-dash-ink2">৳{inst.amount.toLocaleString()}</span>
                            {(inst.status === 'due' || inst.status === 'overdue') && (
                              <button
                                onClick={() => handlePayInstallment(inst._id)}
                                disabled={payingId === inst._id}
                                className="px-4 py-2 bg-gradient-to-r from-brand to-brand-hover text-white text-xs font-bold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                              >
                                {payingId === inst._id ? <FiLoader className="animate-spin" size={14} /> : 'Pay Now'}
                              </button>
                            )}
                            {inst.status === 'paid' && (
                              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">✓ PAID</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {toastNode}
    </div>
  );
}

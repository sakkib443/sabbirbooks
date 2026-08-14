'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSend, FiLoader, FiCheckCircle,
  FiCopy, FiPhone, FiFileText, FiAlertCircle
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

function ManualPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') || '';
  const amount = searchParams.get('amount') || '0';
  const courseName = searchParams.get('courseName') || 'Course';

  const [formData, setFormData] = useState({
    bankName: '',
    transactionId: '',
    senderNumber: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.transactionId.trim()) {
      alert('Please enter transaction ID');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/payment/manual/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          amount: Number(amount),
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || 'Submission failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dash-soft flex items-center justify-center p-4">
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheckCircle className="text-emerald-500" size={30} />
          </div>
          <h2 className="text-2xl font-bold text-dash-ink mb-2">Payment Submitted!</h2>
          <p className="text-dash-mute mb-6">
            Your manual payment has been submitted for verification.
            Our admin team will review and verify within 24-48 hours.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
            <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
              <FiAlertCircle />
              You will get course access once payment is verified by admin.
            </p>
          </div>
          <Link
            href="/dashboard/user/payments"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition"
          >
            View Payment History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dash-soft p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link href="/courses" className="text-dash-mute flex items-center gap-2 text-sm font-medium hover:text-brand mb-6">
          <FiArrowLeft /> Back
        </Link>

        {/* Header */}
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-brand-hover px-6 py-5">
            <h1 className="text-xl font-bold text-white">Manual Payment</h1>
            <p className="text-white/80 text-sm mt-1">Bank Transfer / bKash / Nagad</p>
          </div>

          {/* Course Info */}
          <div className="px-6 py-4 border-b border-dash-line-soft bg-dash-soft/50">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-dash-mute font-medium">Course</p>
                <p className="text-sm font-bold text-dash-ink2 mt-0.5">{decodeURIComponent(courseName)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dash-mute font-medium">Amount</p>
                <p className="text-xl font-bold text-brand">৳{Number(amount).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="px-6 py-4 border-b border-dash-line-soft bg-blue-50/30">
            <h3 className="text-sm font-bold text-dash-ink3 mb-3">Send payment to:</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-dash-card rounded-xl px-4 py-3 border border-dash-line">
                <div>
                  <p className="text-[10px] text-dash-mute2 uppercase font-bold">bKash (Personal)</p>
                  <p className="text-sm font-bold text-dash-ink2">01XXXXXXXXX</p>
                </div>
                <button className="text-dash-mute2 hover:text-brand transition" onClick={() => navigator.clipboard.writeText('01XXXXXXXXX')}>
                  <FiCopy size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between bg-dash-card rounded-xl px-4 py-3 border border-dash-line">
                <div>
                  <p className="text-[10px] text-dash-mute2 uppercase font-bold">Bank</p>
                  <p className="text-sm font-bold text-dash-ink2">Aptech Learning — Islami Bank Bangladesh</p>
                  <p className="text-xs text-dash-mute">A/C: 0123456789</p>
                </div>
                <button className="text-dash-mute2 hover:text-brand transition" onClick={() => navigator.clipboard.writeText('0123456789')}>
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <h3 className="text-sm font-bold text-dash-ink3">After sending payment, fill in details below:</h3>

            <div>
              <label className="text-xs font-bold text-dash-mute uppercase mb-1 block">Payment Method / Bank Name *</label>
              <select
                value={formData.bankName}
                onChange={e => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-sm"
                required
              >
                <option value="">Select method</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-dash-mute uppercase mb-1 block">Transaction ID *</label>
              <input
                value={formData.transactionId}
                onChange={e => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-sm"
                placeholder="e.g. TRX123456789"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-dash-mute uppercase mb-1 block">Sender Number</label>
              <input
                value={formData.senderNumber}
                onChange={e => setFormData(prev => ({ ...prev, senderNumber: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-sm"
                placeholder="e.g. 01700000000"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-dash-mute uppercase mb-1 block">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-dash-line focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none text-sm"
                placeholder="Any additional info..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-brand to-brand-hover text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <FiLoader className="animate-spin" /> : <FiSend />}
              Submit Payment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ManualPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dash-soft flex items-center justify-center"><FiLoader className="animate-spin text-brand" size={30} /></div>}>
      <ManualPaymentContent />
    </Suspense>
  );
}

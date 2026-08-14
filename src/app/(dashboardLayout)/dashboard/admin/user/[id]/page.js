'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FiLoader, FiArrowLeft, FiUser, FiMail, FiPhone,
  FiBook, FiCalendar, FiDollarSign, FiHash, FiCheck,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';

export default function StudentDetailPage() {
  const params = useParams();
  const userId = params.id;
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [installments, setInstallments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadStudentData();
  }, [userId]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      // Get student info
      const userRes = await fetch(`${API}/students/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await userRes.json();
      setStudent(userData.data || userData);

      // Get all enrollments then filter by this student
      const enrollRes = await fetch(`${API}/enrollments/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const enrollData = await enrollRes.json();
      const allEnrollments = enrollData.data || [];
      const studentEnrollments = allEnrollments.filter(
        e => (e.studentId?._id === userId || e.studentId === userId)
      );
      setEnrollments(studentEnrollments);

      // Load installments
      const instMap = {};
      await Promise.all(
        studentEnrollments.map(async (enr) => {
          try {
            const iRes = await fetch(`${API}/installments/enrollment/${enr._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const iData = await iRes.json();
            if (iData.success && iData.data?.length > 0) {
              instMap[enr._id] = iData.data;
            }
          } catch (e) { }
        })
      );
      setInstallments(instMap);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-300';
      case 'pending': return 'bg-amber-50 text-amber-600 border-amber-300';
      case 'cancelled': return 'bg-red-50 text-red-500 border-red-300';
      case 'completed': return 'bg-blue-50 text-blue-600 border-blue-300';
      default: return 'bg-dash-soft2 text-dash-mute border-dash-line-strong';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-teal-500" size={28} />
      </div>
    );
  }

  const totalPaid = enrollments.reduce((sum, e) => sum + (e.payment?.status === 'paid' ? e.payment.amount : 0), 0);
  const totalDue = enrollments.reduce((sum, e) => sum + (e.payment?.status === 'pending' ? e.payment.amount : 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="w-10 h-10 rounded-xl bg-dash-soft2 flex items-center justify-center text-dash-mute hover:bg-dash-soft3 transition">
          <FiArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-dash-ink">Student Details</h1>
          <p className="text-sm text-dash-mute mt-0.5">Complete profile with enrollment & payment history</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
            {(student?.firstName || student?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-dash-ink2">
              {student?.firstName || student?.name || 'Student'} {student?.lastName || ''}
            </h2>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="text-sm text-dash-mute flex items-center gap-1.5"><FiMail size={13} /> {student?.email || '—'}</span>
              <span className="text-sm text-dash-mute flex items-center gap-1.5"><FiPhone size={13} /> {student?.phone || '—'}</span>
              <span className="text-sm text-dash-mute flex items-center gap-1.5"><FiCalendar size={13} /> Joined: {student?.createdAt ? new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">৳{totalPaid.toLocaleString()}</p>
              <p className="text-xs text-dash-mute2">Total Paid</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">৳{totalDue.toLocaleString()}</p>
              <p className="text-xs text-dash-mute2">Due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollments */}
      <div>
        <h3 className="text-lg font-bold text-dash-ink2 mb-3">Enrolled Courses ({enrollments.length})</h3>
        {enrollments.length === 0 ? (
          <div className="bg-dash-card rounded-xl border border-dash-line/60 p-12 text-center shadow-sm">
            <FiBook className="mx-auto text-dash-faint mb-3" size={32} />
            <p className="text-sm text-dash-mute2">No enrollments found for this student.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollments.map(enr => {
              const course = enr.courseId || {};
              const payment = enr.payment || {};
              const batch = typeof enr.batchId === 'object' ? enr.batchId : null;
              const inst = installments[enr._id] || [];

              return (
                <div key={enr._id} className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Course */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-dash-soft2">
                        {course.image && <img src={course.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-dash-ink2">{course.title || 'Course'}</p>
                        {course.type && <span className="text-xs font-semibold uppercase text-dash-mute2">{course.type}</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(enr.status)}`}>
                      {enr.status}
                    </span>

                    {/* Batch */}
                    <div className="text-sm text-dash-ink4">
                      <span className="text-xs text-dash-mute2">Batch: </span>
                      {batch ? (
                        <span className="font-semibold text-teal-600">{batch.id || batch.name}</span>
                      ) : (
                        <span className="text-amber-500">Not assigned</span>
                      )}
                    </div>

                    {/* Enrolled Date */}
                    <span className="text-sm text-dash-mute">
                      {new Date(enr.enrolledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Payment Section */}
                  <div className="mt-4 pt-4 border-t border-dash-line-soft">
                    <p className="text-xs font-semibold text-dash-mute2 uppercase mb-2">Payment</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-dash-mute2">Amount</p>
                        <p className="text-sm font-semibold text-dash-ink2">৳{(payment.amount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dash-mute2">Method</p>
                        <p className="text-sm text-dash-ink3 capitalize">{payment.method || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dash-mute2">TXN ID</p>
                        <p className="text-sm text-dash-ink3 font-mono">{payment.transactionId || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-dash-mute2">Payment Status</p>
                        <span className={`text-xs font-semibold capitalize ${payment.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {payment.status || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Installments */}
                  {inst.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-dash-line-soft">
                      <p className="text-xs font-semibold text-dash-mute2 uppercase mb-2">
                        Installment Plan ({inst.filter(i => i.status === 'paid').length}/{inst.length} paid)
                      </p>
                      <div className="space-y-2">
                        {inst.map((item, idx) => (
                          <div key={item._id} className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm ${
                            item.status === 'paid' ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' :
                            item.status === 'overdue' ? 'bg-red-50/50 border-red-200 text-red-600' :
                            item.status === 'due' ? 'bg-amber-50/50 border-amber-200 text-amber-700' :
                            'bg-blue-50/50 border-blue-200 text-blue-600'
                          }`}>
                            <span className="font-semibold w-6">#{item.installmentNumber || idx + 1}</span>
                            <span className="font-semibold flex-1">৳{item.amount?.toLocaleString()}</span>
                            <span className="text-xs">
                              Due: {new Date(item.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {item.paidDate && (
                              <span className="text-xs flex items-center gap-1">
                                <FiCheck size={10} /> Paid: {new Date(item.paidDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            <span className="text-xs font-semibold uppercase">{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

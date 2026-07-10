'use client';

import React, { useState, useEffect } from 'react';
import {
  FiDownload, FiFileText, FiUsers, FiBook,
  FiDollarSign, FiCalendar, FiLoader, FiFilter,
  FiTrendingUp, FiPieChart, FiBarChart2, FiGlobe, FiChevronDown,
} from 'react-icons/fi';
import { SkeletonCard, SkeletonChart } from '@/components/shared/Skeleton';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

// CSV-safe: quote/escape any field containing a comma, quote, or newline
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCSV = (headerRow, rows) => '﻿' + [headerRow.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [income, setIncome] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportType, setExportType] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eRes, cRes, bRes, iRes] = await Promise.all([
        fetch(`${API}/enrollments/all?limit=10000`, { headers: headers() }),  // no 20-row cap
        fetch(`${API}/courses`),
        fetch(`${API}/analytics/batch-overview`, { headers: headers() }),      // has enrolledStudents
        fetch(`${API}/analytics/income-report`, { headers: headers() }).catch(() => null),
      ]);
      const eData = await eRes.json();
      const cData = await cRes.json();
      const bData = await bRes.json();
      const iData = iRes ? await iRes.json() : {};
      const allEnrollments = eData.data || [];
      setEnrollments(allEnrollments);
      setOrders(allEnrollments);
      setCourses(Array.isArray(cData) ? cData : cData.data || []);
      const bo = bData.data || {};
      setBatches([...(bo.running || []), ...(bo.upcoming || []), ...(bo.completed || [])]);
      setIncome(iData.data || null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const pendingOrders = enrollments.filter(e => e.status === 'pending');
  // Correct revenue = admission + paid installments (from income-report); fall back to admission-only
  const totalRevenue = income?.course?.total ?? enrollments.filter(e => e.payment?.status === 'paid').reduce((s, e) => s + (e.payment?.amount || 0), 0);
  const pendingRevenue = enrollments.filter(e => e.payment?.status === 'pending').reduce((s, e) => s + (e.payment?.amount || 0), 0);

  // Course type breakdown
  const courseTypeMap = {};
  enrollments.forEach(e => {
    const type = e.courseId?.type || 'unknown';
    courseTypeMap[type] = (courseTypeMap[type] || 0) + 1;
  });

  // Monthly enrollment trend
  const monthlyMap = {};
  enrollments.forEach(e => {
    const date = new Date(e.enrolledAt || e.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + 1;
  });
  const monthlyData = Object.entries(monthlyMap).sort().slice(-6).map(([k, v]) => ({
    month: new Date(k + '-01').toLocaleDateString('en-US', { month: 'short' }),
    count: v,
  }));
  const maxMonthly = Math.max(...monthlyData.map(d => d.count), 1);

  // Status breakdown
  const statusMap = {};
  enrollments.forEach(e => {
    statusMap[e.status || 'unknown'] = (statusMap[e.status || 'unknown'] || 0) + 1;
  });

  // Course popularity
  const coursePopMap = {};
  enrollments.forEach(e => {
    const title = e.courseId?.title || 'Unknown';
    coursePopMap[title] = (coursePopMap[title] || 0) + 1;
  });
  const topCourses = Object.entries(coursePopMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxPop = topCourses.length > 0 ? topCourses[0][1] : 1;

  // CSV export (escaped + BOM, full dataset)
  const downloadCSV = (type) => {
    const d = (v) => (v ? new Date(v).toLocaleDateString() : '');
    let headerRow = [], rows = [], filename = '';

    if (type === 'enrollments') {
      headerRow = ['Student', 'Email', 'Course', 'Status', 'Batch', 'Enrolled Date'];
      rows = activeEnrollments.map((e) => [
        `${e.studentId?.firstName || ''} ${e.studentId?.lastName || ''}`.trim() || e.studentId?.name || '',
        e.studentId?.email || '',
        e.courseId?.title || '',
        e.studentStatus || e.status || '',
        typeof e.batchId === 'object' ? (e.batchId?.name || e.batchId?.id || '') : '',
        d(e.enrolledAt || e.createdAt),
      ]);
      filename = 'enrollments_report.csv';
    } else if (type === 'orders') {
      headerRow = ['Student', 'Email', 'Course', 'Amount', 'Payment Status', 'Transaction ID', 'Date'];
      rows = orders.map((o) => [
        `${o.studentId?.firstName || ''} ${o.studentId?.lastName || ''}`.trim() || o.studentId?.name || '',
        o.studentId?.email || '',
        o.courseId?.title || '',
        o.payment?.amount || 0,
        o.payment?.status || '',
        o.payment?.transactionId || '',
        d(o.createdAt || o.enrolledAt),
      ]);
      filename = 'orders_report.csv';
    } else if (type === 'courses') {
      headerRow = ['Title', 'Type', 'Fee', 'Offer Price', 'Duration (months)', 'Category'];
      rows = courses.map((c) => [c.title, c.type || '', c.fee || 0, c.offerPrice || '', c.durationMonth || 0, c.category?.name || '']);
      filename = 'courses_report.csv';
    } else if (type === 'batches') {
      headerRow = ['Batch ID', 'Name', 'Course', 'Status', 'Students', 'Start Date'];
      rows = batches.map((b) => [
        b.id, b.name || '',
        (typeof b.courseId === 'object' ? b.courseId?.title : b.courseName) || '',
        b.status || '',
        b.enrolledStudents || 0,
        d(b.startDate),
      ]);
      filename = 'batches_report.csv';
    }

    const blob = new Blob([toCSV(headerRow, rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusColors = {
    active: 'bg-emerald-500', pending: 'bg-amber-500',
    cancelled: 'bg-red-500', completed: 'bg-blue-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 outfit">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Download & analyze your academy data</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FiCalendar size={14} />
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Quick Download Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enrollments', desc: `${activeEnrollments.length} active students`, icon: FiUsers, color: 'from-teal-500 to-emerald-500', type: 'enrollments' },
          { label: 'Orders', desc: `${orders.length} total orders`, icon: FiDollarSign, color: 'from-amber-500 to-orange-500', type: 'orders' },
          { label: 'Courses', desc: `${courses.length} courses`, icon: FiBook, color: 'from-blue-500 to-indigo-500', type: 'courses' },
          { label: 'Batches', desc: `${batches.length} batches`, icon: FiBarChart2, color: 'from-purple-500 to-pink-500', type: 'batches' },
        ].map(card => (
          <div key={card.type} className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden group hover:shadow-md transition">
            <div className={`h-1.5 bg-gradient-to-r ${card.color}`} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{card.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon size={18} className="text-white" />
                </div>
              </div>
              <button
                onClick={() => downloadCSV(card.type)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-600 font-medium transition border border-slate-200"
              >
                <FiDownload size={14} /> Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</>
        ) : [
          { label: 'Total Revenue', value: `৳${totalRevenue.toLocaleString()}`, icon: FiDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Revenue', value: `৳${pendingRevenue.toLocaleString()}`, icon: FiTrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Active Students', value: activeEnrollments.length, icon: FiUsers, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Pending Orders', value: pendingOrders.length, icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Enrollment Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-700 outfit-semibold">Monthly Enrollments</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months trend</p>
            </div>
            <FiTrendingUp size={18} className="text-teal-500" />
          </div>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-slate-600">{d.count}</span>
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-teal-500 to-teal-300 hover:from-teal-600 hover:to-teal-400 transition-all cursor-default"
                  style={{ height: `${Math.max((d.count / maxMonthly) * 100, 8)}%` }}
                />
                <span className="text-xs text-slate-400">{d.month}</span>
              </div>
            ))}
            {monthlyData.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No data yet</div>
            )}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-700 outfit-semibold">Status Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">Order distribution</p>
            </div>
            <FiPieChart size={18} className="text-purple-500" />
          </div>
          <div className="space-y-3">
            {Object.entries(statusMap).map(([status, count]) => {
              const pct = Math.round((count / enrollments.length) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600 capitalize">{status}</span>
                    <span className="text-sm font-medium text-slate-700">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${statusColors[status] || 'bg-slate-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Course Type */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-3">By Course Type</p>
            <div className="space-y-2">
              {Object.entries(courseTypeMap).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiGlobe size={12} className="text-slate-400" />
                    <span className="text-sm text-slate-600 capitalize">{type}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popular Courses */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-700 outfit-semibold">Top Courses by Enrollment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Most popular courses</p>
          </div>
          <FiBarChart2 size={18} className="text-amber-500" />
        </div>
        <div className="space-y-4">
          {topCourses.map(([title, count], i) => (
            <div key={title} className="flex items-center gap-4">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-50 text-orange-500'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{title}</p>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all"
                    style={{ width: `${(count / maxPop) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-teal-600">{count}</span>
            </div>
          ))}
          {topCourses.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No enrollment data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

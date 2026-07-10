'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiCalendar, FiUsers, FiBook, FiClock, FiCheckCircle, FiRefreshCw,
  FiArrowLeft, FiPlay, FiSearch, FiX, FiChevronRight, FiFolder,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const hdrs = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CAPACITY_OPTIONS = [
  { key: 'all', label: 'All Capacity' },
  { key: 'full', label: 'Almost Full (80%+)' },
  { key: 'half', label: 'Half Filled (50-79%)' },
  { key: 'low', label: 'Low (<50%)' },
  { key: 'empty', label: 'Empty (0%)' },
];

export default function BatchAnalyticsPage() {
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, courseRes] = await Promise.all([
        fetch(`${API}/analytics/batch-overview`, { headers: hdrs() }).then((r) => r.json()),
        fetch(`${API}/courses`).then((r) => r.json()),
      ]);
      if (batchRes.success) setData(batchRes.data);
      setCourses(Array.isArray(courseRes) ? courseRes : (courseRes.data || []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = data?.summary || { total: 0, upcoming: 0, running: 0, completed: 0 };
  const allBatches = [
    ...(data?.running || []).map((b) => ({ ...b, _status: 'active' })),
    ...(data?.upcoming || []).map((b) => ({ ...b, _status: 'upcoming' })),
    ...(data?.completed || []).map((b) => ({ ...b, _status: 'completed' })),
  ];

  const hasActiveFilter = searchQuery || statusFilter !== 'all' || selectedCourse || selectedMonth || capacityFilter !== 'all';
  const filtered = allBatches.filter((b) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (b.name || b.id || '').toLowerCase().includes(q);
      const matchCourse = (b.courseName || b.courseId?.title || '').toLowerCase().includes(q);
      if (!matchName && !matchCourse) return false;
    }
    if (statusFilter !== 'all' && b._status !== statusFilter) return false;
    if (selectedCourse) {
      const cId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
      if (cId !== selectedCourse) return false;
    }
    if (selectedMonth && new Date(b.startDate).getMonth() !== parseInt(selectedMonth)) return false;
    if (capacityFilter !== 'all') {
      const pct = b.seatsFilled || 0;
      if (capacityFilter === 'full' && pct < 80) return false;
      if (capacityFilter === 'half' && (pct < 50 || pct >= 80)) return false;
      if (capacityFilter === 'low' && (pct >= 50 || pct === 0)) return false;
      if (capacityFilter === 'empty' && pct !== 0) return false;
    }
    return true;
  });
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setSelectedCourse(''); setSelectedMonth(''); setCapacityFilter('all'); };

  const cards = [
    { title: 'TOTAL BATCHES', val: summary.total, icon: FiBook, bg: 'from-violet-400 to-violet-600' },
    { title: 'RUNNING', val: summary.running, icon: FiPlay, bg: 'from-emerald-400 to-emerald-600' },
    { title: 'UPCOMING', val: summary.upcoming, icon: FiClock, bg: 'from-blue-400 to-blue-600' },
    { title: 'COMPLETED', val: summary.completed, icon: FiCheckCircle, bg: 'from-slate-400 to-slate-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white"><FiCalendar size={20} /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 outfit">Batch Analytics</h1>
            <p className="text-xs text-slate-400">Select a batch folder to view classes, students, attendance &amp; payment</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition"><FiArrowLeft size={12} /> Dashboard</Link>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition"><FiRefreshCw size={12} /> Reload</button>
          <Link href="/dashboard/admin/batch/create" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition shadow-sm"><FiCalendar size={12} /> New Batch</Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform shrink-0`}><Icon size={20} /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 outfit leading-none">{loading ? <span className="inline-block w-8 h-6 bg-slate-100 animate-pulse rounded" /> : s.val}</p>
                  <p className="text-[10px] font-semibold text-slate-400 tracking-wider mt-1">{s.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 w-48">
            <FiSearch size={13} className="text-slate-400 shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search batches..."
              className="text-sm text-slate-600 outline-none bg-transparent w-full placeholder:text-slate-400" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><FiX size={11} /></button>}
          </div>
          <div className="w-px h-6 bg-slate-200 hidden sm:block" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 transition">
            <option value="all">All Status</option>
            <option value="active">Running</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 transition max-w-[170px]">
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 transition">
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)} className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 transition">
            {CAPACITY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          {hasActiveFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"><FiX size={11} /> Clear</button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {allBatches.length} batches</span>
        </div>
      </div>

      {/* Batch Folder Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-[120px] bg-white border border-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiFolder className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-sm text-slate-500">{hasActiveFilter ? 'No batches match your filters' : 'No batches found'}</p>
          {hasActiveFilter && <button onClick={clearFilters} className="mt-2 text-xs text-violet-600 hover:underline">Clear filters</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((batch) => {
            const c = batch._status === 'active' ? 'emerald' : batch._status === 'upcoming' ? 'blue' : 'slate';
            const seatPct = batch.seatsFilled || 0;
            return (
              <Link key={batch._id} href={`/dashboard/admin/batch-analytics/${batch._id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-violet-200 transition-all group">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${c}-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <FiFolder size={18} className={`text-${c}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-violet-700 transition-colors">{batch.name || batch.id}</h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{batch.courseName || batch.courseId?.title || 'Course'}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><FiUsers size={10} /> {batch.enrolledStudents || 0}/{batch.maxStudents || 50}</span>
                      <span className="flex items-center gap-1"><FiCalendar size={10} /> {formatDate(batch.startDate)}</span>
                    </div>
                    {/* Seats bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${seatPct >= 80 ? 'bg-emerald-500' : seatPct >= 50 ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${Math.min(seatPct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{seatPct}%</span>
                    </div>
                    <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${c}-50 text-${c}-600`}>
                      {batch._status === 'active' ? 'Running' : batch._status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                  </div>
                  <FiChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 mt-1 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

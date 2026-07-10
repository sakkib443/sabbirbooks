'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  FiAward, FiUsers, FiSearch, FiLoader, FiCheck, FiX,
  FiChevronRight, FiArrowLeft, FiClock, FiCheckCircle,
  FiAlertCircle, FiBook, FiCalendar, FiUserCheck,
  FiShield, FiZap, FiRefreshCw, FiChevronDown,
  FiPhone, FiDollarSign, FiPercent, FiFilter, FiEye,
} from 'react-icons/fi';

const CertificateViewer = dynamic(() => import('@/components/certificate/CertificateViewer'), { ssr: false });

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTaka = (n) => `৳${(n || 0).toLocaleString('en-IN')}`;

export default function CertificationPage() {
  const [view, setView] = useState('batches');
  const [tab, setTab] = useState('running');
  const [batches, setBatches] = useState({ running: [], old: [] });
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [batchInfo, setBatchInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [viewCert, setViewCert] = useState(null);

  // Batch filters
  const [batchSearch, setBatchSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  // ─── Load Batches ───────────────────────────────────────────
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, statsRes] = await Promise.all([
        fetch(`${API}/certificate/batches`, { headers: hdrs() }),
        fetch(`${API}/certificate/stats`, { headers: hdrs() }),
      ]);
      const batchData = await batchRes.json();
      const statsData = await statsRes.json();
      if (batchData.success) setBatches(batchData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // ─── Load Students ──────────────────────────────────────────
  const loadStudents = async (batchId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/certificate/batch-students/${batchId}`, { headers: hdrs() });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.students || []);
        setBatchInfo(data.data.batch || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openBatch = (batch) => {
    setSelectedBatch(batch);
    setView('students');
    setSearchQuery('');
    setBulkMode(false);
    setSelectedStudents([]);
    loadStudents(batch.id || batch._id);
  };

  const goBack = () => {
    setView('batches');
    setSelectedBatch(null);
    setStudents([]);
    setBatchInfo(null);
    loadBatches();
  };

  // ─── Toggle Eligibility ─────────────────────────────────────
  const toggleEligibility = async (student) => {
    const newEligible = !student.hasCertificate || student.certificateStatus === 'revoked';
    const batchId = selectedBatch?.id || selectedBatch?._id;
    setActionLoading(prev => ({ ...prev, [student.studentId]: true }));
    try {
      const res = await fetch(`${API}/certificate/toggle-eligibility`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ studentId: student.studentId, batchId, eligible: newEligible }),
      });
      const data = await res.json();
      if (data.success) {
        alert(newEligible
          ? `✅ Certificate granted to ${student.studentName}! Notification sent.`
          : `Certificate revoked for ${student.studentName}.`
        );
        loadStudents(batchId);
      } else {
        alert(data.message || 'Something went wrong');
      }
    } catch (e) {
      alert('Network error');
    }
    setActionLoading(prev => ({ ...prev, [student.studentId]: false }));
  };

  // ─── Bulk Grant ─────────────────────────────────────────────
  const handleBulkGrant = async () => {
    if (selectedStudents.length === 0) return;
    if (!confirm(`Grant certificates to ${selectedStudents.length} student(s)?`)) return;
    const batchId = selectedBatch?.id || selectedBatch?._id;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/certificate/bulk-grant`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ studentIds: selectedStudents, batchId }),
      });
      const data = await res.json();
      if (data.success) {
        const successCount = data.data.filter(r => r.success).length;
        alert(`✅ ${successCount} certificate(s) granted successfully!`);
        setBulkMode(false);
        setSelectedStudents([]);
        loadStudents(batchId);
      }
    } catch (e) {
      alert('Bulk grant failed');
    }
    setBulkLoading(false);
  };

  // ─── Student search (name, email, phone) ────────────────────
  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.studentName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  });

  const toggleSelectAll = () => {
    const uncertified = filteredStudents.filter(s => !s.hasCertificate || s.certificateStatus === 'revoked');
    if (selectedStudents.length === uncertified.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(uncertified.map(s => s.studentId));
    }
  };

  // ─── Batch filtering (search + course) ──────────────────────
  const allCurrentBatches = tab === 'running' ? batches.running : batches.old;

  // Extract unique courses from all batches
  const allBatchesCombined = [...(batches.running || []), ...(batches.old || [])];
  const courseMap = new Map();
  allBatchesCombined.forEach(b => {
    const courseId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
    const courseTitle = b.courseName || b.courseId?.title || '';
    if (courseId && courseTitle) courseMap.set(courseId, courseTitle);
  });
  const courseList = Array.from(courseMap, ([id, title]) => ({ id, title }));

  const currentBatches = allCurrentBatches.filter(batch => {
    // Search filter
    if (batchSearch) {
      const q = batchSearch.toLowerCase();
      const matchName = (batch.courseName || batch.name || '').toLowerCase().includes(q);
      const matchId = (batch.id || '').toLowerCase().includes(q);
      const matchCourse = (batch.courseId?.title || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCourse) return false;
    }
    // Course filter
    if (courseFilter !== 'all') {
      const bCourseId = typeof batch.courseId === 'object' ? batch.courseId?._id : batch.courseId;
      if (bCourseId !== courseFilter) return false;
    }
    return true;
  });

  const hasActiveFilter = batchSearch || courseFilter !== 'all';
  const certifiedCount = students.filter(s => s.hasCertificate && s.certificateStatus === 'active').length;

  const getStatusBadge = (status) => {
    if (status === 'active') return { label: 'Running', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    if (status === 'upcoming') return { label: 'Upcoming', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
    return { label: 'Completed', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  // ═══════════════════════════════════════════════════════════
  // BATCHES VIEW
  // ═══════════════════════════════════════════════════════════
  if (view === 'batches') {
    return (
      <div className="poppins space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
              <FiAward size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 outfit">Certification Management</h1>
              <p className="text-xs text-slate-400">Manage student certificates by batch</p>
            </div>
          </div>
          <button onClick={loadBatches} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
            <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Certificates', value: stats?.total || 0, icon: FiAward, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Pending', value: stats?.pending || 0, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Active', value: stats?.active || 0, icon: FiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Revoked', value: stats?.revoked || 0, icon: FiAlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon size={18} className={s.color} />
                  </div>
                  <div>
                    <p className={`text-xl font-semibold ${s.color}`}>{loading ? '—' : s.value}</p>
                    <p className="text-sm text-slate-400">{s.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters: Search + Course */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-3 text-slate-400" size={16} />
              <input value={batchSearch} onChange={e => setBatchSearch(e.target.value)}
                placeholder="Search batch by name, ID or course..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:border-teal-400 outline-none bg-white shadow-sm" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <FiBook size={13} className="absolute left-2.5 top-[8px] pointer-events-none text-slate-400" />
                <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
                  className={`appearance-none pl-8 pr-7 py-1.5 rounded-lg border text-sm cursor-pointer outline-none transition max-w-[220px] truncate ${courseFilter !== 'all' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                  <option value="all">All Courses</option>
                  {courseList.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <FiChevronDown size={12} className="absolute right-2 top-[9px] pointer-events-none text-slate-300" />
              </div>
              {hasActiveFilter && (
                <button onClick={() => { setBatchSearch(''); setCourseFilter('all'); }}
                  className="px-3 py-1.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50 transition border border-rose-200">
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs + Batch List */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-0">
            <div className="flex items-center gap-1">
              {[
                { key: 'running', label: 'Running Batches', count: batches.running?.length || 0, icon: FiZap, color: 'emerald' },
                { key: 'old', label: 'Completed Batches', count: batches.old?.length || 0, icon: FiCheckCircle, color: 'slate' },
              ].map(t => {
                const Icon = t.icon;
                const isActive = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-medium transition-all border-b-2 ${isActive ? `border-${t.color}-500 text-${t.color}-600 bg-${t.color}-50/50` : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                    <Icon size={13} />
                    {t.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? `bg-${t.color}-100 text-${t.color}-600` : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
                  </button>
                );
              })}
            </div>
            {hasActiveFilter && (
              <span className="text-[10px] text-slate-400 font-medium">
                Showing {currentBatches.length} of {allCurrentBatches.length}
              </span>
            )}
          </div>

          <div className="border-t border-slate-100" />

          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[80px] bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : currentBatches.length === 0 ? (
              <div className="text-center py-12">
                <FiBook size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {hasActiveFilter ? 'No batches match your filters' : tab === 'running' ? 'No running batches found' : 'No completed batches found'}
                </p>
                {hasActiveFilter && (
                  <button onClick={() => { setBatchSearch(''); setCourseFilter('all'); }} className="mt-2 text-xs text-teal-600 hover:underline">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentBatches.map((batch) => {
                  const statusInfo = getStatusBadge(batch.computedStatus);
                  const seatPct = batch.studentCount > 0 ? Math.round((batch.certifiedCount / batch.studentCount) * 100) : 0;

                  return (
                    <div key={batch._id} onClick={() => openBatch(batch)}
                      className="bg-white border border-slate-200/60 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-teal-200 transition-all group">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          {batch.courseId?.image ? (
                            <img src={batch.courseId.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                              {(batch.courseName || 'B')?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-teal-600 transition">
                              {batch.courseName || batch.name}
                            </h3>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mb-2">Batch: {batch.id}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <FiCalendar size={11} className="text-slate-300" />
                              {formatDate(batch.startDate)} — {formatDate(batch.endDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiUsers size={11} className="text-slate-300" />
                              <span className="font-semibold text-slate-600">{batch.studentCount || 0}</span> students
                            </span>
                            {batch.mentorId?.name && (
                              <span className="flex items-center gap-1">
                                <FiUserCheck size={11} className="text-slate-300" />
                                {batch.mentorId.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sm:w-[120px] shrink-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-slate-400 font-medium">Certified</span>
                            <span className={`text-[11px] font-bold ${seatPct >= 80 ? 'text-emerald-600' : seatPct >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {seatPct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${seatPct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : seatPct >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-teal-400 to-teal-500'}`}
                              style={{ width: `${Math.min(seatPct, 100)}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 text-center">{batch.certifiedCount || 0}/{batch.studentCount || 0}</p>
                        </div>
                        <FiChevronRight className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all shrink-0" size={18} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STUDENTS VIEW (with Payment, Exam, Attendance, Phone)
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="poppins space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition shrink-0">
            <FiArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 outfit">{batchInfo?.courseName || selectedBatch?.courseName || 'Batch'}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              <span>Batch: {batchInfo?.batchId || selectedBatch?.id}</span>
              <span>•</span>
              <span>{students.length} Students</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">{certifiedCount} Certified</span>
              {batchInfo?.mentorId?.name && (
                <>
                  <span>•</span>
                  <span>Mentor: {batchInfo.mentorId.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!bulkMode ? (
            <button onClick={() => setBulkMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition shadow-sm">
              <FiZap size={12} /> Bulk Grant
            </button>
          ) : (
            <>
              <button onClick={handleBulkGrant} disabled={selectedStudents.length === 0 || bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm">
                {bulkLoading ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />}
                Grant ({selectedStudents.length})
              </button>
              <button onClick={() => { setBulkMode(false); setSelectedStudents([]); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search (name, email, phone) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-3 text-slate-400" size={16} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/60 text-sm focus:border-teal-400 outline-none bg-white shadow-sm" />
        </div>
        {bulkMode && (
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition">
            {selectedStudents.length === filteredStudents.filter(s => !s.hasCertificate || s.certificateStatus === 'revoked').length ? 'Deselect All' : 'Select All Uncertified'}
          </button>
        )}
        <span className="text-sm text-slate-400 self-center">{filteredStudents.length} of {students.length} students</span>
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-[56px] border-b border-slate-50 bg-slate-50/50 animate-pulse" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-16 text-center shadow-sm">
          <FiUsers className="mx-auto text-slate-300 mb-3" size={36} />
          <h3 className="font-medium text-slate-600 text-base">No Students Found</h3>
          <p className="text-sm text-slate-400 mt-1">No enrolled students in this batch.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {bulkMode && <th className="w-10 px-3 py-3" />}
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500">Student</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500">Contact</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500">Payment</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500">Attendance</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500">Exam</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500">Certificate</th>
                  <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const isCertified = student.hasCertificate && student.certificateStatus === 'active';
                  const isRevoked = student.certificateStatus === 'revoked';
                  const isPending = student.certificateStatus === 'pending';
                  const isLoading = actionLoading[student.studentId];
                  const isSelected = selectedStudents.includes(student.studentId);

                  const att = student.attendance || {};
                  const exam = student.exam || {};
                  const pay = student.payment || {};

                  const certBadgeCls = isCertified ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : isRevoked ? 'bg-red-50 text-red-500 border-red-200'
                    : isPending ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200';
                  const certLabel = isCertified ? 'Certified' : isRevoked ? 'Revoked' : isPending ? 'Pending' : 'Not Issued';

                  const payBadgeCls = pay.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : pay.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200';

                  const attPct = att.percentage || 0;
                  const attColor = attPct >= 75 ? 'text-emerald-600' : attPct >= 50 ? 'text-amber-600' : 'text-red-500';
                  const attBarColor = attPct >= 75 ? 'bg-emerald-500' : attPct >= 50 ? 'bg-amber-500' : 'bg-red-400';

                  const examPct = exam.averagePct || 0;
                  const examColor = examPct >= 80 ? 'text-emerald-600' : examPct >= 50 ? 'text-amber-600' : 'text-red-500';

                  return (
                    <tr key={student.studentId} className={`border-b border-slate-100 hover:bg-slate-50/40 transition ${isSelected ? 'bg-violet-50/50' : ''}`}>
                      {/* Checkbox */}
                      {bulkMode && (
                        <td className="px-3 py-3">
                          {(!isCertified || isRevoked) ? (
                            <button onClick={() => setSelectedStudents(prev => prev.includes(student.studentId) ? prev.filter(id => id !== student.studentId) : [...prev, student.studentId])}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${isSelected ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300 hover:border-violet-400'}`}>
                              {isSelected && <FiCheck size={10} />}
                            </button>
                          ) : <div className="w-4" />}
                        </td>
                      )}

                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCertified ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-br from-teal-400 to-teal-600 text-white'}`}>
                            {student.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 leading-tight truncate max-w-[140px]">{student.studentName}</p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${student.enrollmentStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : student.enrollmentStatus === 'completed' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                              {student.studentStatus || student.enrollmentStatus}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-3 py-3">
                        <p className="text-[11px] text-slate-600 truncate max-w-[160px]">{student.email || '—'}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <FiPhone size={9} /> {student.phone || '—'}
                        </p>
                      </td>

                      {/* Payment */}
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${payBadgeCls}`}>
                          {pay.status === 'paid' ? '✓ Paid' : '⏳ ' + (pay.status || 'Pending')}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatTaka(pay.amount)}</p>
                        {pay.installments?.total > 0 && (
                          <p className="text-[9px] text-slate-400">
                            Inst: {pay.installments.paid}/{pay.installments.total}
                            {pay.installments.due > 0 && <span className="text-red-500 ml-1">({pay.installments.due} due)</span>}
                          </p>
                        )}
                      </td>

                      {/* Attendance */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full transition-all ${attBarColor}`}
                              style={{ width: `${Math.min(attPct, 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold ${attColor}`}>{attPct}%</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          P:{att.present || 0} A:{att.absent || 0} L:{att.late || 0}
                        </p>
                      </td>

                      {/* Exam */}
                      <td className="px-3 py-3 text-center">
                        {exam.totalExams > 0 ? (
                          <>
                            <p className={`text-[11px] font-bold ${examColor}`}>{examPct}%</p>
                            <p className="text-[9px] text-slate-400">
                              {exam.obtainedMarks}/{exam.totalMarks} marks
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {exam.submitted}/{exam.totalExams} exams
                            </p>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400">No exams</span>
                        )}
                      </td>

                      {/* Certificate */}
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${certBadgeCls}`}>
                          {certLabel}
                        </span>
                        {student.certificateId && (
                          <p className="text-[9px] text-emerald-500 font-mono mt-0.5">{student.certificateId}</p>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isCertified && (
                            <button onClick={() => setViewCert({ ...student, id: student.certificateId, courseName: batchInfo?.courseName || selectedBatch?.courseName, batchNumber: batchInfo?.batchId || selectedBatch?.id, startDate: batchInfo?.startDate || selectedBatch?.startDate, endDate: batchInfo?.endDate || selectedBatch?.endDate, issueDate: student.issueDate || new Date() })}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition">
                              <FiEye size={11} /> View
                            </button>
                          )}
                          <button onClick={() => toggleEligibility(student)} disabled={isLoading}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition disabled:opacity-50 ${isLoading ? 'bg-slate-50 text-slate-400 border-slate-200' : isCertified ? 'text-red-500 bg-red-50 hover:bg-red-100 border-red-200' : 'text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm'}`}>
                            {isLoading ? <FiLoader className="animate-spin" size={12} /> : isCertified ? <><FiShield size={12} /> Revoke</> : <><FiCheck size={12} /> Grant</>}
                          </button>
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
      {viewCert && (
        <CertificateViewer certificate={viewCert} onClose={() => setViewCert(null)} />
      )}
    </div>
  );
}

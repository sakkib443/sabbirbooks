'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiUsers, FiSearch, FiBook, FiCheck,
  FiCalendar, FiHash, FiChevronDown, FiFilter,
  FiGlobe, FiBookOpen, FiUserCheck, FiRefreshCw, FiX, FiTrash2, FiVideo,
} from 'react-icons/fi';
import { SkeletonCard, SkeletonRow } from '@/components/shared/Skeleton';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStudentStatus, setFilterStudentStatus] = useState('all');
  const [assigning, setAssigning] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [transferModal, setTransferModal] = useState(null);
  const [transferCourseId, setTransferCourseId] = useState('');
  const [transferBatchId, setTransferBatchId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrollRes, batchRes, courseRes] = await Promise.all([
        fetch(`${API}/enrollments/all?status=active`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/batches`),
        fetch(`${API}/courses`),
      ]);
      const enrollData = await enrollRes.json();
      const batchData = await batchRes.json();
      const courseData = await courseRes.json();
      setEnrollments(enrollData.data || []);
      setAllCourses(courseData.data || []);
      setBatches(batchData.data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAssign = async (enrollmentId, batchId) => {
    setAssigning(enrollmentId);
    try {
      const res = await fetch(`${API}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrollments(prev =>
          prev.map(e => e._id === enrollmentId ? { ...e, batchId: batches.find(b => b._id === batchId) || batchId } : e)
        );
      } else {
        alert(data.message || 'Error');
      }
    } catch (err) {
      alert('Error assigning batch');
    } finally {
      setAssigning(null);
    }
  };

  const handleStatusUpdate = async (enrollmentId, newStatus) => {
    try {
      const res = await fetch(`${API}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ studentStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrollments(prev =>
          prev.map(e => e._id === enrollmentId ? { ...e, studentStatus: newStatus } : e)
        );
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  const getBatchesForCourse = (courseId) => {
    // ONLY show batches that belong to this specific course — no fallback!
    return batches.filter(b => {
      const bCourseId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
      return bCourseId === courseId;
    });
  };

  // ── Transfer Course ────────────────────────────────────────
  const openTransfer = (enrollment) => {
    setTransferModal(enrollment);
    setTransferCourseId('');
    setTransferBatchId('');
  };

  const getBatchesForTransferCourse = (courseId) => {
    return batches.filter(b => {
      const bCourseId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
      return bCourseId === courseId;
    });
  };

  const handleTransfer = async () => {
    if (!transferCourseId) return alert('Select a course');
    if (!confirm(`এই student-কে নতুন course-এ transfer করবেন? পুরানো batch, progress সব reset হয়ে যাবে।`)) return;
    setTransferring(true);
    try {
      const res = await fetch(`${API}/enrollments/${transferModal._id}/transfer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ newCourseId: transferCourseId, newBatchId: transferBatchId || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Transfer successful!');
        setTransferModal(null);
        loadData();
      } else {
        alert('❌ ' + (data.message || 'Transfer failed'));
      }
    } catch (err) { alert('❌ Error'); }
    setTransferring(false);
  };

  const getStudentStatusColor = (s) => ({
    active: 'bg-emerald-50 text-emerald-600 border-emerald-300',
    completed: 'bg-blue-50 text-blue-600 border-blue-300',
    dropout: 'bg-red-50 text-red-500 border-red-300',
    inactive: 'bg-dash-soft2 text-dash-mute border-dash-line-strong',
  }[s] || 'bg-emerald-50 text-emerald-600 border-emerald-300');

  const handleDeleteEnrollment = async (enrollmentId) => {
    if (!confirm('⚠️ এই enrollment ডিলিট করলে Orders পেজে status "Deleted" দেখাবে। আপনি কি নিশ্চিত?')) return;
    setDeleting(enrollmentId);
    try {
      const res = await fetch(`${API}/enrollments/enrollment/${enrollmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setEnrollments(prev => prev.filter(e => e._id !== enrollmentId));
        alert('✅ Enrollment সফলভাবে ডিলিট হয়েছে! Orders ে status "Deleted" দেখাবে।');
      } else {
        alert(data.message || 'Error');
      }
    } catch (err) {
      alert('Error deleting enrollment');
    } finally {
      setDeleting(null);
    }
  };

  const totalEnrolled = enrollments.length;
  const withBatch = enrollments.filter(e => e.batchId).length;
  const withoutBatch = totalEnrolled - withBatch;
  const courseSet = new Map();
  enrollments.forEach(e => { if (e.courseId?._id) courseSet.set(e.courseId._id, e.courseId.title); });
  const courseList = Array.from(courseSet, ([id, title]) => ({ id, title }));

  const filtered = enrollments.filter(e => {
    const matchSearch = !searchTerm ||
      `${e.studentId?.firstName || ''} ${e.studentId?.lastName || ''} ${e.studentId?.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.courseId?.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchBatch = filterBatch === 'all' ||
      (filterBatch === 'unassigned' && !e.batchId) ||
      (filterBatch === 'assigned' && e.batchId);
    const matchType = filterType === 'all' || (e.courseId?.type || '').toLowerCase() === filterType;
    const matchCourse = filterCourse === 'all' || e.courseId?._id === filterCourse;
    const matchStudentStatus = filterStudentStatus === 'all' || (e.studentStatus || 'active') === filterStudentStatus;
    return matchSearch && matchBatch && matchType && matchCourse && matchStudentStatus;
  });


  return (
    <div className="poppins space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dash-ink outfit">Enrollments</h1>
        <p className="text-sm text-dash-mute mt-1">Active students — manage batches & track progress</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>{[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}</>
        ) : [
          { label: 'Total Enrolled', value: totalEnrolled, icon: FiUsers, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Batch Assigned', value: withBatch, icon: FiCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'No Batch', value: withoutBatch, icon: FiHash, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Courses', value: courseSet.size, icon: FiBook, color: 'text-blue-600', bg: 'bg-blue-50' },
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
              placeholder="Search by student or course..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dash-line/60 text-sm focus:border-teal-400 outline-none bg-dash-card shadow-sm" />
          </div>
          <div className="flex gap-1 bg-dash-soft2 rounded-xl p-1">
            {['all', 'unassigned', 'assigned'].map(s => (
              <button key={s} onClick={() => setFilterBatch(s)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition ${filterBatch === s ? 'bg-dash-card text-teal-600 shadow-sm font-medium' : 'text-dash-mute'}`}>
                {s}
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
              className={`appearance-none pl-8 pr-7 py-1.5 rounded-lg border text-sm cursor-pointer outline-none transition ${filterType !== 'all' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-dash-card text-dash-ink4 border-dash-line'
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
              className={`appearance-none pl-8 pr-7 py-1.5 rounded-lg border text-sm cursor-pointer outline-none transition max-w-[220px] truncate ${filterCourse !== 'all' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-dash-card text-dash-ink4 border-dash-line'
                }`}>
              <option value="all">All Courses</option>
              {courseList.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <FiChevronDown size={12} className="absolute right-2 top-[9px] pointer-events-none text-dash-faint" />
          </div>

          {/* Student Status */}
          <div className="relative">
            <FiUserCheck size={13} className="absolute left-2.5 top-[8px] pointer-events-none text-dash-mute2" />
            <select value={filterStudentStatus} onChange={(e) => setFilterStudentStatus(e.target.value)}
              className={`appearance-none pl-8 pr-7 py-1.5 rounded-lg border text-sm cursor-pointer outline-none transition ${filterStudentStatus !== 'all' ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-dash-card text-dash-ink4 border-dash-line'
                }`}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropout">Dropout</option>
              <option value="inactive">Inactive</option>
            </select>
            <FiChevronDown size={12} className="absolute right-2 top-[9px] pointer-events-none text-dash-faint" />
          </div>

          {/* Clear */}
          {(filterBatch !== 'all' || filterType !== 'all' || filterCourse !== 'all' || filterStudentStatus !== 'all' || searchTerm) && (
            <button onClick={() => { setFilterBatch('all'); setFilterType('all'); setFilterCourse('all'); setFilterStudentStatus('all'); setSearchTerm(''); }}
              className="px-3 py-1.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50 transition border border-rose-200">
              ✕ Clear
            </button>
          )}

          <span className="ml-auto text-sm text-dash-mute2">{filtered.length} of {enrollments.length} enrollments</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dash-soft/80 border-b border-dash-line-soft">
                  {['Student', 'Course', 'Enrolled', 'Progress', 'Status', 'Batch'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-sm font-medium text-dash-mute">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-16 text-center shadow-sm">
          <FiUsers className="mx-auto text-dash-faint mb-3" size={36} />
          <h3 className="font-medium text-dash-ink4 text-base">No Enrollments Found</h3>
          <p className="text-sm text-dash-mute2 mt-1">Active enrollments will appear here after orders are approved.</p>
        </div>
      ) : (
        <div className="bg-dash-card rounded-xl border border-dash-line/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dash-soft/80 border-b border-dash-line-soft">
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Student</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Course</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Enrolled</th>
                  <th className="text-center px-5 py-3 text-sm font-medium text-dash-mute">Progress</th>
                  <th className="text-center px-5 py-3 text-sm font-medium text-dash-mute">Status</th>
                  <th className="text-left px-5 py-3 text-sm font-medium text-dash-mute">Batch</th>
                  <th className="text-center px-5 py-3 text-sm font-medium text-dash-mute">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(enrollment => {
                  const student = enrollment.studentId || {};
                  const course = enrollment.courseId || {};
                  const isRecorded = (course.type || '').toLowerCase() === 'recorded';
                  const batch = typeof enrollment.batchId === 'object' ? enrollment.batchId : null;
                  const currentBatchId = batch?._id || (typeof enrollment.batchId === 'string' ? enrollment.batchId : '');
                  const availableBatches = getBatchesForCourse(course._id);
                  const studentName = `${student.firstName || student.name || 'Student'} ${student.lastName || ''}`.trim();
                  const studentStatus = enrollment.studentStatus || 'active';
                  const pct = enrollment.completionPercent || 0;

                  const onBatchChange = (e) => {
                    const newVal = e.target.value;
                    if (!newVal && currentBatchId) {
                      if (!confirm('Remove batch assignment for this student?')) {
                        e.target.value = currentBatchId;
                        return;
                      }
                    } else if (newVal && currentBatchId && newVal !== currentBatchId) {
                      if (!confirm('Change batch for this student?')) {
                        e.target.value = currentBatchId;
                        return;
                      }
                    }
                    handleBatchAssign(enrollment._id, newVal);
                  };

                  return (
                    <tr key={enrollment._id} className="border-b border-dash-line-soft hover:bg-dash-soft/40 transition h-[56px]">
                      {/* Student */}
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/admin/user/${student._id || ''}`} className="flex items-center gap-2.5 group">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-dash-ink3 group-hover:text-teal-600 transition truncate max-w-[150px]">
                              {studentName}
                            </p>
                            <p className="text-xs text-dash-mute2 truncate max-w-[150px]">{student.email}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-3">
                        <p className="text-sm text-dash-ink3 truncate max-w-[180px]">{course.title || 'Course'}</p>
                      </td>

                      {/* Enrolled */}
                      <td className="px-5 py-3">
                        <span className="text-sm text-dash-mute">
                          {new Date(enrollment.enrolledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-dash-soft2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-teal-500' : 'bg-amber-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm text-dash-ink4 w-8">{pct}%</span>
                        </div>
                      </td>

                      {/* Student Status */}
                      <td className="px-5 py-3 text-center">
                        <div className="relative inline-block">
                          <select
                            value={studentStatus}
                            onChange={(e) => handleStatusUpdate(enrollment._id, e.target.value)}
                            className={`appearance-none px-3 py-1.5 pr-7 rounded-md text-xs font-medium border cursor-pointer outline-none ${getStudentStatusColor(studentStatus)}`}
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="dropout">Dropout</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          <FiChevronDown size={10} className="absolute right-2 top-2 pointer-events-none opacity-40" />
                        </div>
                      </td>

                      {/* Batch — Online/Offline only; Recorded needs no batch */}
                      <td className="px-5 py-3">
                        {isRecorded ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-teal-50 text-teal-600 border border-teal-200">
                            <FiVideo size={12} /> Recorded — auto access
                          </span>
                        ) : (
                          <div className="relative inline-block">
                            <select
                              value={currentBatchId}
                              onChange={onBatchChange}
                              disabled={assigning === enrollment._id}
                              className={`appearance-none px-3 py-1.5 pr-7 rounded-md text-sm cursor-pointer outline-none transition disabled:opacity-50 border ${currentBatchId
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-dash-soft text-dash-mute border-dash-line hover:border-teal-300'
                                }`}
                            >
                              <option value="">— Select Batch —</option>
                              {availableBatches.length === 0 ? (
                                <option disabled>No batch for this course</option>
                              ) : availableBatches.map(b => (
                                <option key={b._id} value={b._id}>
                                  {b.name || b.id} — {b.courseName || ''}
                                </option>
                              ))}
                            </select>
                            <FiChevronDown size={10} className="absolute right-2 top-2.5 pointer-events-none opacity-40" />
                            {assigning === enrollment._id && (
                              <FiLoader size={14} className="absolute -right-6 top-1.5 text-teal-500 animate-spin" />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openTransfer(enrollment)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 transition"
                            title="Transfer to another course">
                            <FiRefreshCw size={11} /> Transfer
                          </button>
                          <button
                            onClick={() => handleDeleteEnrollment(enrollment._id)}
                            disabled={deleting === enrollment._id}
                            title="Delete this enrollment"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition disabled:opacity-50"
                          >
                            {deleting === enrollment._id ? <FiLoader size={11} className="animate-spin" /> : <FiTrash2 size={11} />}
                            Delete
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

      {/* ══════ Transfer Modal ══════ */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-dash-card rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-dash-line-soft">
              <h3 className="text-lg font-bold text-dash-ink2">🔄 Course Transfer</h3>
              <button onClick={() => setTransferModal(null)} className="p-2 hover:bg-dash-soft2 rounded-lg"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-dash-soft rounded-lg p-3">
                <p className="text-xs text-dash-mute2">Student</p>
                <p className="text-sm font-bold text-dash-ink3">{`${transferModal.studentId?.firstName || ''} ${transferModal.studentId?.lastName || ''}`.trim()}</p>
                <p className="text-xs text-dash-mute2 mt-1">Current Course: <span className="text-dash-ink4 font-medium">{transferModal.courseId?.title || '—'}</span></p>
              </div>
              <div>
                <label className="text-xs font-bold text-dash-mute mb-1 block">New Course *</label>
                <select value={transferCourseId} onChange={e => { setTransferCourseId(e.target.value); setTransferBatchId(''); }}
                  className="w-full px-3 py-2.5 border border-dash-line rounded-lg text-sm outline-none focus:border-teal-400">
                  <option value="">— Select Course —</option>
                  {allCourses.filter(c => c._id !== transferModal.courseId?._id).map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>
              {transferCourseId && (
                <div>
                  <label className="text-xs font-bold text-dash-mute mb-1 block">New Batch (optional)</label>
                  <select value={transferBatchId} onChange={e => setTransferBatchId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-dash-line rounded-lg text-sm outline-none focus:border-teal-400">
                    <option value="">— Select Batch —</option>
                    {getBatchesForTransferCourse(transferCourseId).map(b => (
                      <option key={b._id} value={b._id}>{b.name || b.id} — {b.courseName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                ⚠️ Transfer করলে student-এর পুরানো batch assignment ও progress reset হয়ে যাবে।
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-dash-line-soft">
              <button onClick={() => setTransferModal(null)} className="px-4 py-2 text-sm text-dash-ink4 hover:bg-dash-soft2 rounded-lg">Cancel</button>
              <button onClick={handleTransfer} disabled={!transferCourseId || transferring}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition">
                {transferring ? <FiLoader className="animate-spin" size={14} /> : <FiRefreshCw size={14} />}
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


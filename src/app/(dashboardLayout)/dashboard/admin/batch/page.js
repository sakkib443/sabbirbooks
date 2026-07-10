'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiLoader, FiTrash2, FiEdit2, FiUsers,
  FiSearch, FiBook, FiHash, FiCheck, FiMapPin, FiX,
} from 'react-icons/fi';
import { BRANCHES, WEEKDAYS, TimeRangePicker } from '@/components/admin/batch/batchShared';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 ' +
  'focus:outline-none focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15 transition';
const modalLabel = 'block text-xs font-semibold text-gray-600 mb-1';

// Status is derived purely from dates (matches the backend) — shown read-only.
const computeBatchStatus = (start, end) => {
  if (!start || !end) return 'upcoming';
  const now = new Date();
  if (now > new Date(end)) return 'completed';
  if (now >= new Date(start)) return 'active';
  return 'upcoming';
};

export default function AllBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [mentors, setMentors] = useState([]);

  // Assign batch modal
  const [assignModal, setAssignModal] = useState(false);
  const [unassigned, setUnassigned] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState('');
  const [selectedBatchForAssign, setSelectedBatchForAssign] = useState('');
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [batchRes, enrollRes, mentorRes] = await Promise.all([
        fetch(`${API}/batches`, { headers: { Authorization: `Bearer ${token}` } }),
        // limit=1000 → /enrollments/all is paginated (default 20); without this the
        // unassigned list & fallback counts would silently miss students past #20.
        fetch(`${API}/enrollments/all?limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/mentors`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const batchData = await batchRes.json();
      const enrollData = await enrollRes.json();
      const mentorData = await mentorRes.json();

      setBatches(batchData.data || []);
      const allEnroll = enrollData.data || [];
      setEnrollments(allEnroll);
      setUnassigned(allEnroll.filter(e => !e.batchId && e.status === 'active'));
      setMentors(Array.isArray(mentorData) ? mentorData : (mentorData.data || []));
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (batchId) => {
    const ok = await confirm({ title: 'Delete this batch?', message: 'This action cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/batches/${batchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('success', 'Batch deleted');
        loadData();
      } else {
        showToast('error', data.message || 'Error deleting batch');
      }
    } catch (err) {
      showToast('error', 'Error deleting batch');
    }
  };

  const handleEdit = async () => {
    if (!editForm.id || !editForm.id.trim()) {
      showToast('error', 'Batch ID cannot be empty');
      return;
    }
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/batches/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...editForm, id: editForm.id.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditModal(null);
        showToast('success', 'Batch updated');
        loadData();
      } else {
        showToast('error', data.message || 'Error updating');
      }
    } catch (err) {
      showToast('error', 'Error updating batch');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (batch) => {
    setEditModal(batch);
    setEditForm({
      id: batch.id || '',
      name: batch.name || '',
      status: batch.status,
      branch: batch.branch || '',
      maxStudents: batch.maxStudents || 50,
      startDate: batch.startDate?.split('T')[0] || '',
      endDate: batch.endDate?.split('T')[0] || '',
      mentorId: (typeof batch.mentorId === 'object' ? batch.mentorId?._id : batch.mentorId) || '',
      classTime: batch.classTime || '',
      classDays: batch.classDays || [],
    });
  };

  const handleAssignBatch = async () => {
    if (!selectedEnrollment || !selectedBatchForAssign) {
      showToast('error', 'Please select both student and batch');
      return;
    }
    // Guard: same course + not full (should already be filtered, but double-check before writing)
    const enroll = unassigned.find(e => e._id === selectedEnrollment);
    const batch = batches.find(b => b._id === selectedBatchForAssign);
    const enrollCourseId = typeof enroll?.courseId === 'object' ? enroll?.courseId?._id : enroll?.courseId;
    const batchCourseId = typeof batch?.courseId === 'object' ? batch?.courseId?._id : batch?.courseId;
    if (enrollCourseId && batchCourseId && enrollCourseId !== batchCourseId) {
      showToast('error', 'This batch is for a different course. Pick a batch of the same course.');
      return;
    }
    if (batch && getStudentCount(batch._id) >= (batch.maxStudents || 50)) {
      showToast('error', `Batch ${batch.id} is full (${batch.maxStudents || 50} seats).`);
      return;
    }
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/enrollments/${selectedEnrollment}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batchId: selectedBatchForAssign }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignModal(false);
        setSelectedEnrollment('');
        setSelectedBatchForAssign('');
        loadData();
        showToast('success', 'Batch assigned successfully!');
      } else {
        showToast('error', data.message || 'Error assigning batch');
      }
    } catch (err) {
      showToast('error', 'Error assigning batch');
    } finally {
      setSaving(false);
    }
  };

  // Prefer the accurate count the backend attaches to each batch (a single
  // aggregation), falling back to counting the loaded enrollments.
  const getStudentCount = (batchId) => {
    const b = batches.find(x => x._id === batchId);
    if (b && typeof b.studentCount === 'number') return b.studentCount;
    return enrollments.filter(e => {
      const eBatch = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
      return eBatch === batchId;
    }).length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'upcoming': return 'bg-[#FEF6E7] text-[#c9871a] border-[#F0DFB4]';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const toggleEditDay = (day) => {
    setEditForm(prev => ({
      ...prev,
      classDays: (prev.classDays || []).includes(day)
        ? (prev.classDays || []).filter(d => d !== day)
        : [...(prev.classDays || []), day],
    }));
  };

  const filteredBatches = batches.filter(b => {
    const matchSearch = b.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-[#F3A522]" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="h-[3px] w-full bg-gradient-to-r from-[#F3A522] via-[#e2941c] to-[#9AA0A8] rounded-full"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 outfit">All Batches</h1>
          <p className="text-sm text-gray-400 mt-0.5 work">{batches.length} batches • {unassigned.length} unassigned students</p>
        </div>
        <div className="flex gap-2">
          {unassigned.length > 0 && (
            <button onClick={() => setAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FEF6E7] text-[#a5680f] border border-[#F0DFB4] text-sm font-semibold hover:bg-[#F5E8CB] transition">
              <FiUsers size={15} /> Assign Students ({unassigned.length})
            </button>
          )}
          <Link href="/dashboard/admin/batch/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold hover:shadow-lg hover:shadow-[#F3A522]/25 transition shadow-sm">
            <FiPlus size={15} /> Create Batch
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-2.5 text-gray-300" size={15} />
          <input type="text" placeholder="Search batches..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 text-sm focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15 outline-none bg-white shadow-sm transition" />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['all', 'active', 'upcoming', 'completed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${filterStatus === s ? 'bg-white text-[#c9871a] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Total Batches', batches.length, 'text-gray-900'],
          ['Active', batches.filter(b => b.status === 'active').length, 'text-emerald-600'],
          ['Upcoming', batches.filter(b => b.status === 'upcoming').length, 'text-[#c9871a]'],
          ['Unassigned Students', unassigned.length, 'text-gray-500'],
        ].map(([label, val, cls]) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className={`text-2xl font-bold outfit ${cls}`}>{val}</p>
            <p className="text-xs text-gray-400 mt-0.5 work">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredBatches.length === 0 ? (
          <div className="p-16 text-center">
            <FiBook className="mx-auto text-gray-200 mb-4" size={40} />
            <h3 className="text-lg font-bold text-gray-700 mb-1 outfit">No Batches Found</h3>
            <p className="text-sm text-gray-400">Create your first batch to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FEF6E7]/40 border-b border-gray-100">
                  {['Batch ID', 'Course', 'Branch', 'Students', 'Duration', 'Status', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${i === 0 || i === 1 ? 'text-left' : 'text-center'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map(batch => {
                  const studentCount = getStudentCount(batch._id);
                  return (
                    <tr key={batch._id} className="border-b border-gray-100 last:border-0 hover:bg-[#FEF6E7]/20 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#FEF6E7] flex items-center justify-center shrink-0">
                            <FiHash size={14} className="text-[#c9871a]" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{batch.id}</p>
                            {batch.name && <p className="text-[11px] text-gray-400 truncate max-w-[150px]">{batch.name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-700 truncate max-w-[200px]">{batch.courseId?.title || batch.courseName}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {batch.branch ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                            <FiMapPin size={11} className="text-[#c9871a]" /> {batch.branch}
                          </span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-700 font-semibold">
                          <FiUsers size={13} className="text-gray-400" /> {studentCount}/{batch.maxStudents || 50}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-gray-500">
                        <div className="text-[11px]">
                          <span>{batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}</span>
                          <span className="mx-1">→</span>
                          <span>{batch.endDate ? new Date(batch.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(batch.status)}`}>{batch.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openEdit(batch)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#c9871a] hover:bg-[#FEF6E7] transition" title="Edit">
                            <FiEdit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(batch.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Delete">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Edit Modal ═══ */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#F3A522] to-[#d88f13]">
              <h2 className="text-base font-bold text-white outfit">Edit Batch: {editModal.id}</h2>
              <button onClick={() => setEditModal(null)} className="text-white/70 hover:text-white transition"><FiX size={20} /></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabel}>Batch ID *</label>
                  <input value={editForm.id || ''} onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                    placeholder="e.g., WEB-01" className={`${inputClass} font-mono uppercase`} />
                </div>
                <div>
                  <label className={modalLabel}>Branch</label>
                  <select value={editForm.branch || ''} onChange={e => setEditForm({ ...editForm, branch: e.target.value })} className={inputClass}>
                    <option value="">Select Branch</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={modalLabel}>Batch Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={modalLabel}>Mentor</label>
                <select value={editForm.mentorId || ''} onChange={e => setEditForm({ ...editForm, mentorId: e.target.value })} className={inputClass}>
                  <option value="">No Mentor</option>
                  {mentors.map(m => <option key={m._id} value={m._id}>{m.name} — {m.designation || m.subject || ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabel}>Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={modalLabel}>End Date</label>
                  <input type="date" value={editForm.endDate} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={modalLabel}>Status <span className="font-normal text-gray-300">(auto from dates)</span></label>
                  <div className={`${inputClass} bg-gray-50 capitalize text-gray-600 flex items-center`}>
                    {computeBatchStatus(editForm.startDate, editForm.endDate)}
                  </div>
                </div>
                <div>
                  <label className={modalLabel}>Max Students</label>
                  <input type="number" value={editForm.maxStudents} onChange={e => setEditForm({ ...editForm, maxStudents: parseInt(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={modalLabel}>Class Time</label>
                <TimeRangePicker value={editForm.classTime || ''} onChange={(v) => setEditForm({ ...editForm, classTime: v })} />
                {editForm.classTime && editForm.classTime.trim() !== '-' && (
                  <p className="text-[11px] text-[#c9871a] mt-1.5 font-medium">{editForm.classTime}</p>
                )}
              </div>
              <div>
                <label className={`${modalLabel} mb-1.5`}>Class Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map(day => {
                    const isSelected = (editForm.classDays || []).includes(day);
                    return (
                      <button key={day} type="button" onClick={() => toggleEditDay(day)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition border ${
                          isSelected ? 'bg-[#F3A522] text-white border-[#F3A522]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#F3A522]/40'
                        }`}>
                        {isSelected && <FiCheck size={10} className="inline mr-0.5" />}
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-[#F3A522]/25 transition">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Assign Batch Modal ═══ */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#F3A522] to-[#d88f13]">
              <div>
                <h2 className="text-base font-bold text-white outfit">Assign Student to Batch</h2>
                <p className="text-xs text-white/80">{unassigned.length} students without a batch</p>
              </div>
              <button onClick={() => setAssignModal(false)} className="text-white/70 hover:text-white transition"><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={modalLabel}>Select Student</label>
                <select value={selectedEnrollment} onChange={e => { setSelectedEnrollment(e.target.value); setSelectedBatchForAssign(''); }} className={inputClass}>
                  <option value="">Choose student...</option>
                  {unassigned.map(e => (
                    <option key={e._id} value={e._id}>
                      {e.studentId?.firstName || e.studentId?.name || 'Student'} — {e.courseId?.title || 'Course'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={modalLabel}>Select Batch</label>
                {(() => {
                  const enroll = unassigned.find(e => e._id === selectedEnrollment);
                  const enrollCourseId = typeof enroll?.courseId === 'object' ? enroll?.courseId?._id : enroll?.courseId;
                  const matching = batches.filter(b => {
                    if (b.status === 'completed') return false;
                    const bCourseId = typeof b.courseId === 'object' ? b.courseId?._id : b.courseId;
                    return !enrollCourseId || bCourseId === enrollCourseId;
                  });
                  return (
                    <>
                      <select value={selectedBatchForAssign} onChange={e => setSelectedBatchForAssign(e.target.value)}
                        disabled={!selectedEnrollment} className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-300`}>
                        <option value="">{selectedEnrollment ? 'Choose batch...' : 'Select a student first'}</option>
                        {matching.map(b => {
                          const count = getStudentCount(b._id);
                          const max = b.maxStudents || 50;
                          const full = count >= max;
                          return (
                            <option key={b._id} value={b._id} disabled={full}>
                              {b.id} — {b.courseId?.title || b.courseName} ({count}/{max}{full ? ' • FULL' : ''}) · {b.status}
                            </option>
                          );
                        })}
                      </select>
                      {selectedEnrollment && matching.length === 0 && (
                        <p className="text-[11px] text-rose-500 mt-1.5 font-medium">No open batch for this student&apos;s course. Create one first.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setAssignModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAssignBatch} disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-[#F3A522]/25 transition">
                {saving ? 'Assigning...' : 'Assign Batch'}
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

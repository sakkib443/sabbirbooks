'use client';

import React, { useState, useEffect } from 'react';
import {
  FiCalendar, FiUsers, FiClock, FiBook, FiLoader, FiChevronDown,
  FiMail, FiPhone, FiMapPin, FiUser, FiCheckCircle, FiSearch, FiX,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

export default function MyBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [batchRes, studentRes] = await Promise.all([
        fetch(`${API}/batches/my-batches`, { headers }).then(r => r.json()),
        fetch(`${API}/enrollments/mentor-students`, { headers }).then(r => r.json()),
      ]);
      setBatches(batchRes.data || []);
      setStudents(studentRes.data || []);
    } catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  const getStudentCount = (batchId) => {
    return students.filter(e => {
      const eBatch = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
      return eBatch === batchId;
    }).length;
  };

  const toggleBatch = async (batchId) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      setBatchStudents([]);
      return;
    }
    setExpandedBatch(batchId);
    setLoadingStudents(true);
    setStudentSearch('');
    try {
      const res = await fetch(`${API}/analytics/batch-details/${batchId}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setBatchStudents(data.data?.students || []);
      } else {
        setBatchStudents([]);
      }
    } catch (err) {
      console.error(err);
      setBatchStudents([]);
    }
    setLoadingStudents(false);
  };

  const filtered = batches.filter(b => filter === 'all' || b.status === filter);
  const statusCounts = {
    all: batches.length,
    active: batches.filter(b => b.status === 'active').length,
    upcoming: batches.filter(b => b.status === 'upcoming').length,
    completed: batches.filter(b => b.status === 'completed').length,
  };

  const statusDot = {
    active: 'bg-emerald-500', upcoming: 'bg-blue-500', completed: 'bg-slate-400',
  };

  // Filter students by search
  const filteredStudents = batchStudents.filter(s => {
    if (!studentSearch) return true;
    const term = studentSearch.toLowerCase();
    return (s.name || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      (s.phone || '').includes(term);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-teal-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 outfit">My Batches</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your assigned batches and enrolled students</p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {Object.entries(statusCounts).map(([key, count]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${filter === key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {key} ({count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiBook className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Batches Found</h3>
          <p className="text-sm text-slate-500">You haven't been assigned to any batches yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(batch => {
            const studentCount = getStudentCount(batch._id);
            const isExpanded = expandedBatch === batch._id;
            return (
              <div key={batch._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                {/* Batch Card Header */}
                <button onClick={() => toggleBatch(batch._id)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                        batch.status === 'active' ? 'from-emerald-500 to-teal-600' :
                        batch.status === 'upcoming' ? 'from-blue-500 to-indigo-600' :
                        'from-slate-400 to-slate-500'
                      } flex items-center justify-center text-white shadow-sm`}>
                        <FiBook size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">{batch.name || batch.courseName}</h3>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            batch.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                            batch.status === 'upcoming' ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>{batch.status}</span>
                          <code className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">{batch.id}</code>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <FiCalendar size={11} className="text-blue-500" />
                            {batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            {' → '}
                            {batch.endDate ? new Date(batch.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                          {batch.classTime && (
                            <span className="flex items-center gap-1">
                              <FiClock size={11} className="text-amber-500" />
                              <strong className="text-amber-700">{batch.classTime}</strong>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FiUsers size={11} className="text-teal-500" />
                            <strong className="text-teal-700">{studentCount}</strong> students
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {batch.classDays?.length > 0 && (
                        <div className="hidden sm:flex gap-1">
                          {batch.classDays.map(day => (
                            <span key={day} className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      )}
                      <FiChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded Student List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30">
                    {loadingStudents ? (
                      <div className="flex items-center justify-center py-12">
                        <FiLoader className="animate-spin text-teal-500" size={22} />
                        <span className="ml-2 text-sm text-slate-400">Loading students...</span>
                      </div>
                    ) : batchStudents.length === 0 ? (
                      <div className="text-center py-12 text-sm text-slate-400">
                        <FiUsers className="mx-auto mb-2" size={28} />
                        No students enrolled in this batch
                      </div>
                    ) : (
                      <div className="p-4">
                        {/* Search + Count */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-600">
                            {filteredStudents.length} Students
                          </span>
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 w-52">
                            <FiSearch size={12} className="text-slate-400" />
                            <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                              placeholder="Search students..."
                              className="text-sm text-slate-600 outline-none bg-transparent w-full placeholder:text-slate-400" />
                            {studentSearch && (
                              <button onClick={() => setStudentSearch('')} className="text-slate-400 hover:text-slate-600">
                                <FiX size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Student Table */}
                        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-3 py-3 text-[13px] font-semibold text-slate-600">#</th>
                                <th className="text-left px-3 py-3 text-[13px] font-semibold text-slate-600">Name</th>
                                <th className="text-left px-3 py-3 text-[13px] font-semibold text-slate-600">Email</th>
                                <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Phone</th>
                                <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Status</th>
                                <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Attendance</th>
                                <th className="text-center px-3 py-3 text-[13px] font-semibold text-slate-600">Assignments</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudents.map((s, i) => (
                                <tr key={s._id || i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                  <td className="px-3 py-3 text-sm text-slate-400 font-mono">{i + 1}</td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {s.name?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                      <span className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">{s.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className="text-sm text-slate-500 truncate block max-w-[200px]">{s.email || '—'}</span>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className="text-sm text-slate-600">{s.phone || '—'}</span>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border
                                      ${s.studentStatus === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                        s.studentStatus === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                        s.studentStatus === 'dropout' ? 'bg-red-50 text-red-500 border-red-200' :
                                        'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                      {s.studentStatus || 'Active'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-slate-100 rounded-full h-2">
                                          <div className={`h-2 rounded-full transition-all ${s.attendancePct >= 75 ? 'bg-emerald-500' : s.attendancePct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                                            style={{ width: `${Math.min(s.attendancePct || 0, 100)}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold ${s.attendancePct >= 75 ? 'text-emerald-600' : s.attendancePct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                          {s.attendancePct || 0}%
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-slate-400">{s.attendancePresent || 0}/{s.attendanceSessions || s.attendanceTotal || 0} classes</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <span className={`text-sm font-semibold ${s.assignmentsTotal > 0 && s.assignmentsSubmitted >= s.assignmentsTotal ? 'text-emerald-600' : s.assignmentsSubmitted > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                      {s.assignmentsSubmitted || 0}/{s.assignmentsTotal || 0}
                                    </span>
                                    <p className="text-[11px] text-slate-400">submitted</p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

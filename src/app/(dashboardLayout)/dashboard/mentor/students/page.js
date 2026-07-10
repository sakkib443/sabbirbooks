'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiSearch, FiMail, FiPhone, FiBook, FiLoader, FiCalendar } from 'react-icons/fi';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

export default function MentorStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API}/enrollments/mentor-students`, { headers });
      const data = await res.json();
      setStudents(data.data || []);
      setBatches(data.batches || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get student count per batch
  const getStudentCount = (batchId) => {
    return students.filter(e => {
      const eBatch = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
      return eBatch === batchId;
    }).length;
  };

  // Apply filters
  const filteredStudents = students.filter(e => {
    const student = e.studentId || {};
    const name = `${student.firstName || ''} ${student.lastName || ''} ${student.name || ''}`.toLowerCase();
    const email = (student.email || '').toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());

    const eBatchId = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
    const matchBatch = selectedBatch === 'all' || eBatchId === selectedBatch;

    return matchSearch && matchBatch;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 outfit">My Students</h1>
          <p className="text-slate-500 text-sm">{students.length} students across {batches.length} batches</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:border-teal-400 outline-none w-56"
            />
          </div>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-teal-400 outline-none bg-white"
          >
            <option value="all">All Batches ({students.length})</option>
            {batches.map(b => {
              const count = getStudentCount(b._id);
              return (
                <option key={b._id} value={b._id}>
                  {b.id || b.name} — {b.courseName || b.courseId?.title || ''} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-teal-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center">
              <FiUsers className="text-lg text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{students.length}</p>
              <p className="text-xs text-slate-500">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
              <FiBook className="text-lg text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{batches.length}</p>
              <p className="text-xs text-slate-500">My Batches</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <FiCalendar className="text-lg text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{students.filter(e => e.status === 'active').length}</p>
              <p className="text-xs text-slate-500">Active Enrollments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-16 text-center">
            <FiUsers className="mx-auto text-slate-300 mb-4" size={40} />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No Students Found</h3>
            <p className="text-sm text-slate-500">
              {students.length === 0
                ? 'No students are enrolled in your batches yet.'
                : 'No students match your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">#</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Student</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Contact</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Batch</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Course</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Status</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((enrollment, idx) => {
                  const student = enrollment.studentId || {};
                  const batch = typeof enrollment.batchId === 'object' ? enrollment.batchId : null;
                  const course = typeof enrollment.courseId === 'object' ? enrollment.courseId : null;
                  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'Unknown';
                  const initial = studentName.charAt(0).toUpperCase();

                  return (
                    <tr key={enrollment._id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3 text-xs text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{studentName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {student.email && (
                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <FiMail size={11} className="text-slate-400" /> {student.email}
                            </p>
                          )}
                          {student.phoneNumber && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <FiPhone size={11} className="text-slate-400" /> {student.phoneNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold text-slate-700">{batch?.id || '—'}</span>
                        {batch?.courseName && (
                          <p className="text-[10px] text-slate-400">{batch.courseName}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-slate-600">{course?.title || '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                          enrollment.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          enrollment.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>{enrollment.status}</span>
                      </td>
                      <td className="px-5 py-3 text-center text-[11px] text-slate-500">
                        {enrollment.createdAt ? new Date(enrollment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

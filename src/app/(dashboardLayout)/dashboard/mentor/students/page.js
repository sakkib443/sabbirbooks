'use client';

import React, { useState, useEffect } from 'react';
import { FiUsers, FiSearch, FiMail, FiPhone, FiBook, FiLoader, FiCalendar } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

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
          <h1 className="text-2xl font-bold text-dash-ink2 outfit">My Students</h1>
          <p className="text-dash-mute text-sm">{students.length} students across {batches.length} batches</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" size={14} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-dash-line rounded-lg text-sm focus:border-teal-400 outline-none w-56"
            />
          </div>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-3 py-2 border border-dash-line rounded-lg text-sm focus:border-teal-400 outline-none bg-dash-card"
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
        <div className="bg-dash-card rounded-xl border border-teal-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center">
              <FiUsers className="text-lg text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dash-ink2">{students.length}</p>
              <p className="text-xs text-dash-mute">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-dash-card rounded-xl border border-emerald-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
              <FiBook className="text-lg text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dash-ink2">{batches.length}</p>
              <p className="text-xs text-dash-mute">My Batches</p>
            </div>
          </div>
        </div>
        <div className="bg-dash-card rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
              <FiCalendar className="text-lg text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dash-ink2">{students.filter(e => e.status === 'active').length}</p>
              <p className="text-xs text-dash-mute">Active Enrollments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-dash-card rounded-xl border border-dash-line overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-16 text-center">
            <FiUsers className="mx-auto text-dash-faint mb-4" size={40} />
            <h3 className="text-lg font-bold text-dash-ink3 mb-1">No Students Found</h3>
            <p className="text-sm text-dash-mute">
              {students.length === 0
                ? 'No students are enrolled in your batches yet.'
                : 'No students match your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dash-soft border-b border-dash-line-soft">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">#</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">Student</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">Contact</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">Batch</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">Course</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">Status</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-dash-mute2 uppercase">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-line-soft">
                {filteredStudents.map((enrollment, idx) => {
                  const student = enrollment.studentId || {};
                  const batch = typeof enrollment.batchId === 'object' ? enrollment.batchId : null;
                  const course = typeof enrollment.courseId === 'object' ? enrollment.courseId : null;
                  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'Unknown';
                  const initial = studentName.charAt(0).toUpperCase();

                  return (
                    <tr key={enrollment._id} className="hover:bg-dash-soft transition">
                      <td className="px-5 py-3 text-xs text-dash-mute2">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-dash-ink2">{studentName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {student.email && (
                            <p className="text-xs text-dash-ink4 flex items-center gap-1">
                              <FiMail size={11} className="text-dash-mute2" /> {student.email}
                            </p>
                          )}
                          {student.phoneNumber && (
                            <p className="text-[11px] text-dash-mute2 flex items-center gap-1">
                              <FiPhone size={11} className="text-dash-mute2" /> {student.phoneNumber}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold text-dash-ink3">{batch?.id || '—'}</span>
                        {batch?.courseName && (
                          <p className="text-[10px] text-dash-mute2">{batch.courseName}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs text-dash-ink4">{course?.title || '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                          enrollment.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          enrollment.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-dash-soft2 text-dash-mute'
                        }`}>{enrollment.status}</span>
                      </td>
                      <td className="px-5 py-3 text-center text-[11px] text-dash-mute">
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

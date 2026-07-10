'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiLoader, FiUsers, FiCalendar, FiArrowRight, FiClock, FiCheckSquare } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [batchRes, studentRes] = await Promise.all([
        fetch(`${API}/batches/my-batches`, { headers }).then(r => r.json()),
        fetch(`${API}/enrollments/mentor-students`, { headers }).then(r => r.json()),
      ]);
      setBatches(batchRes.data || []);
      setStudents(studentRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getStudentCount = (batchId) => students.filter(e => {
    const eBatch = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
    return eBatch === batchId;
  }).length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 outfit flex items-center gap-2">
          <FiCheckSquare size={22} className="text-[#F3A522]" /> Attendance
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Select a batch to take or view attendance</p>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiUsers className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Batches Assigned</h3>
          <p className="text-sm text-slate-500">You haven't been assigned to any batches yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {batches.map(batch => {
            const studentCount = getStudentCount(batch._id);
            const statusColor = batch.status === 'active'
              ? 'from-[#F3A522] to-[#d88f13]'
              : batch.status === 'upcoming' ? 'from-blue-500 to-indigo-600' : 'from-slate-400 to-slate-500';

            return (
              <Link key={batch._id} href={`/dashboard/mentor/attendance/${batch._id}`}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`bg-gradient-to-r ${statusColor} px-5 py-4 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <code className="text-white/70 text-[10px] font-mono">{batch.id}</code>
                      <span className="text-[9px] font-bold uppercase text-white/80 bg-white/20 px-2 py-0.5 rounded">{batch.status}</span>
                    </div>
                    <h3 className="text-white font-bold text-base mt-1.5">{batch.name || batch.courseName}</h3>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-xl bg-[#FEF6E7] flex items-center justify-center mx-auto mb-0.5">
                          <FiUsers size={16} className="text-[#c9871a]" />
                        </div>
                        <p className="text-lg font-bold text-slate-800">{studentCount}</p>
                        <p className="text-[10px] text-slate-400">Students</p>
                      </div>
                      {batch.classTime && (
                        <div className="text-center">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-0.5">
                            <FiClock size={16} className="text-amber-600" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">{batch.classTime}</p>
                          <p className="text-[10px] text-slate-400">Time</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {batch.classDays?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {batch.classDays.map(d => (
                        <span key={d} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{d.slice(0,3)}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1 text-sm font-semibold text-[#c9871a] group-hover:text-[#c9871a] transition pt-2 border-t border-slate-100">
                    Take Attendance <FiArrowRight className="group-hover:translate-x-1 transition-transform" size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

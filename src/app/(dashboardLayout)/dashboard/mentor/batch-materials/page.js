'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiBook, FiFolder, FiArrowRight, FiLoader, FiCalendar, FiClock, FiUsers } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function BatchMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [classCounts, setClassCounts] = useState({});
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
      const batchList = batchRes.data || [];
      setBatches(batchList);
      setStudents(studentRes.data || []);

      // Fetch class count per batch
      const counts = {};
      await Promise.all(batchList.map(async (b) => {
        try {
          const res = await fetch(`${API}/classes/batch/${b._id}`, { headers }).then(r => r.json());
          counts[b._id] = res.data?.length || 0;
        } catch (e) { counts[b._id] = 0; }
      }));
      setClassCounts(counts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getStudentCount = (batchId) => students.filter(e => {
    const eBatch = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
    return eBatch === batchId;
  }).length;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-teal-500" size={28} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 outfit">Batch Materials</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage class materials, meeting links & recordings for each batch</p>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiFolder className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Batches Assigned</h3>
          <p className="text-sm text-slate-500">You haven't been assigned to any batches yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {batches.map(batch => {
            const classCount = classCounts[batch._id] || 0;
            const studentCount = getStudentCount(batch._id);
            const statusColor = batch.status === 'active'
              ? 'from-emerald-500 to-teal-600'
              : batch.status === 'upcoming' ? 'from-blue-500 to-indigo-600' : 'from-slate-400 to-slate-500';

            return (
              <Link key={batch._id} href={`/dashboard/mentor/batch-materials/${batch._id}`}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                {/* Top Banner */}
                <div className={`bg-gradient-to-r ${statusColor} px-5 py-4 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/20" />
                    <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full bg-white/15" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <code className="text-white/70 text-[10px] font-mono">{batch.id}</code>
                      <span className="text-[9px] font-bold uppercase text-white/80 bg-white/20 px-2 py-0.5 rounded">{batch.status}</span>
                    </div>
                    <h3 className="text-white font-bold text-base mt-1.5 group-hover:underline underline-offset-2">{batch.name || batch.courseName}</h3>
                    <p className="text-white/70 text-xs mt-0.5">{batch.courseId?.title || batch.courseName}</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-1">
                        <FiFolder size={16} className="text-teal-600" />
                      </div>
                      <p className="text-lg font-bold text-slate-800">{classCount}</p>
                      <p className="text-[10px] text-slate-400">Classes</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-1">
                        <FiUsers size={16} className="text-blue-600" />
                      </div>
                      <p className="text-lg font-bold text-slate-800">{studentCount}</p>
                      <p className="text-[10px] text-slate-400">Students</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-1">
                        <FiClock size={16} className="text-amber-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">{batch.classTime || '—'}</p>
                      <p className="text-[10px] text-slate-400">Time</p>
                    </div>
                  </div>

                  {batch.classDays?.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {batch.classDays.map(d => (
                        <span key={d} className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{d.slice(0, 3)}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1 text-sm font-semibold text-teal-600 group-hover:text-teal-700 transition pt-2 border-t border-slate-100">
                    Open Materials <FiArrowRight className="group-hover:translate-x-1 transition-transform" size={14} />
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

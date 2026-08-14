'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiFolder, FiSearch, FiCalendar, FiClock,
  FiUser, FiVideo, FiFileText, FiArrowRight, FiHash,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function CourseMaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';

      const enrollRes = await fetch(`${API}/enrollments/my-enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const enrollData = await enrollRes.json();
      const enrollments = (enrollData.data || []).filter(e =>
        e.batchId && (e.status === 'active' || e.status === 'completed')
      );

      // Build batch list with course info
      const groups = enrollments.map(enr => {
        const b = typeof enr.batchId === 'object' ? enr.batchId : null;
        const c = typeof enr.courseId === 'object' ? enr.courseId : null;
        const mentor = b && typeof b.mentorId === 'object' ? b.mentorId : null;
        return {
          batchObjectId: b?._id || enr.batchId,
          batchCode: b?.id || '—',
          batchName: b?.name || '',
          courseTitle: c?.title || 'Course',
          courseImage: c?.image || '',
          courseType: c?.type || '',
          classDays: b?.classDays || [],
          classTime: b?.classTime || '',
          startDate: b?.startDate,
          endDate: b?.endDate,
          mentorName: mentor?.name || '',
          mentorImage: mentor?.image || '',
          status: b?.status || 'active',
        };
      });

      // Get class counts for each batch
      const batchIds = groups.map(g => g.batchObjectId).filter(Boolean);
      if (batchIds.length > 0) {
        try {
          const classRes = await fetch(
            `${API}/classes/student/schedule?batchIds=${batchIds.join(',')}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const classData = await classRes.json();
          const allClasses = classData.success ? classData.data || [] : [];

          const counts = {};
          allClasses.forEach(cls => {
            const bId = typeof cls.batchId === 'object' ? cls.batchId?._id : cls.batchId;
            if (!counts[bId]) counts[bId] = { classes: 0, materials: 0, recordings: 0 };
            counts[bId].classes++;
            counts[bId].materials += (cls.materials?.length || 0);
            counts[bId].recordings += (cls.recordings?.length || (cls.recordingUrl ? 1 : 0));
          });

          groups.forEach(g => {
            const c = counts[g.batchObjectId] || { classes: 0, materials: 0, recordings: 0 };
            g.classCount = c.classes;
            g.materialCount = c.materials;
            g.recordingCount = c.recordings;
          });
        } catch (e) { console.error(e); }
      }

      setBatches(groups);
    } catch (err) {
      console.error('Error loading materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = batches.filter(b => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return b.courseTitle.toLowerCase().includes(t)
        || b.batchCode.toLowerCase().includes(t)
        || b.mentorName.toLowerCase().includes(t);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FiLoader className="animate-spin text-brand mx-auto mb-3" size={28} />
          <p className="text-sm text-dash-mute2">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink">Course Materials</h1>
          <p className="text-dash-mute text-sm mt-1">Open a course folder to see class folders and materials inside</p>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-2.5 text-dash-mute2" size={15} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-dash-line/60 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none w-64 bg-dash-card shadow-sm"
          />
        </div>
      </div>

      {/* Empty state */}
      {batches.length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-16 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-dash-soft2 flex items-center justify-center mx-auto mb-4">
            <FiFolder className="text-dash-faint" size={32} />
          </div>
          <h3 className="text-lg font-bold text-dash-ink3 mb-2">No Course Yet</h3>
          <p className="text-sm text-dash-mute max-w-md mx-auto">
            Once you are enrolled in a batch, your course folders will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dash-line/60 p-12 text-center shadow-sm">
          <p className="text-sm text-dash-mute">No course matches your search.</p>
        </div>
      ) : (
        /* Course Folder Grid */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(b => (
            <Link key={b.batchObjectId}
              href={`/dashboard/user/materials/${b.batchObjectId}`}
              className="group bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-brand-line transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Cover */}
              <div className="relative h-32 overflow-hidden">
                {b.courseImage ? (
                  <img src={b.courseImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand to-brand-hover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Folder icon overlay */}
                <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-dash-card/95 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <FiFolder className="text-brand-ink" size={18} />
                </div>

                {/* Type badge */}
                {b.courseType && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold uppercase px-2 py-1 rounded bg-black/40 text-white backdrop-blur-sm tracking-wider">
                    {b.courseType}
                  </span>
                )}

                {/* Batch code */}
                <div className="absolute bottom-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-dash-card/90 backdrop-blur-sm text-brand-deep text-[10px] font-mono font-bold">
                    <FiHash size={9} /> {b.batchCode}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-dash-ink2 text-sm leading-snug line-clamp-2 group-hover:text-brand-deep transition">
                  {b.courseTitle}
                </h3>

                {/* Schedule */}
                <div className="space-y-1.5 mt-2 text-[11px] text-dash-mute">
                  {b.classDays?.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <FiCalendar size={10} className="text-blue-500 flex-shrink-0" />
                      <span className="truncate">{b.classDays.map(d => d.slice(0, 3)).join(', ')}</span>
                    </div>
                  )}
                  {b.classTime && (
                    <div className="flex items-center gap-1.5">
                      <FiClock size={10} className="text-amber-500 flex-shrink-0" />
                      <span className="truncate">{b.classTime}</span>
                    </div>
                  )}
                  {b.mentorName && (
                    <div className="flex items-center gap-1.5">
                      <FiUser size={10} className="text-violet-500 flex-shrink-0" />
                      <span className="truncate">{b.mentorName}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-3 pt-3 border-t border-dash-line-soft flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3 text-dash-mute">
                    <span className="flex items-center gap-1">
                      <FiFolder size={10} className="text-brand" />
                      <span className="font-bold">{b.classCount || 0}</span> classes
                    </span>
                    {b.recordingCount > 0 && (
                      <span className="flex items-center gap-1">
                        <FiVideo size={10} className="text-blue-500" />
                        <span className="font-bold">{b.recordingCount}</span>
                      </span>
                    )}
                    {b.materialCount > 0 && (
                      <span className="flex items-center gap-1">
                        <FiFileText size={10} className="text-emerald-500" />
                        <span className="font-bold">{b.materialCount}</span>
                      </span>
                    )}
                  </div>
                  <FiArrowRight size={12} className="text-brand group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

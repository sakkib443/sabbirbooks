'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiFolder, FiArrowLeft, FiCalendar, FiClock,
  FiUser, FiVideo, FiFileText, FiSearch, FiHash, FiBookOpen,
  FiMapPin, FiPlay, FiArrowRight,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

// Extract the class number from a title like "Class 03 - Intro" -> "03".
// Falls back to position-based numbering if title has no digits.
const classNumberFrom = (title, fallbackIdx) => {
  if (title) {
    const m = String(title).match(/(\d+)/);
    if (m) return m[1].padStart(2, '0');
  }
  return String((fallbackIdx ?? 0) + 1).padStart(2, '0');
};

export default function BatchClassFoldersPage({ params }) {
  const { batchId } = use(params);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [course, setCourse] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [classes, setClasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { load(); }, [batchId]);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';

      // Load enrollments to find this batch
      const enrollRes = await fetch(`${API}/enrollments/my-enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const enrollData = await enrollRes.json();
      const enrollments = enrollData.data || [];

      const enrollment = enrollments.find(e => {
        const eBatchId = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
        return eBatchId === batchId;
      });

      if (enrollment) {
        const b = typeof enrollment.batchId === 'object' ? enrollment.batchId : null;
        const c = typeof enrollment.courseId === 'object' ? enrollment.courseId : null;
        const m = b && typeof b.mentorId === 'object' ? b.mentorId : null;
        setBatch(b);
        setCourse(c);
        setMentor(m);
      }

      // Load classes for this batch
      const classRes = await fetch(
        `${API}/classes/student/schedule?batchIds=${batchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const classData = await classRes.json();
      const all = classData.success ? classData.data || [] : [];
      // Order by date ascending so Class 01 → 02 → 03
      all.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      setClasses(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = classes.filter(cls => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (cls.title || '').toLowerCase().includes(t)
        || (cls.topic || '').toLowerCase().includes(t);
  });

  const countContents = (cls) => {
    const recs = (cls.recordings?.length || 0) + (cls.recordings?.length ? 0 : (cls.recordingUrl ? 1 : 0));
    return { recs, mats: cls.materials?.length || 0 };
  };

  const totalRecordings = classes.reduce((sum, cls) => sum + countContents(cls).recs, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-[#F3A522]" size={28} />
      </div>
    );
  }

  if (!batch && !course) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/user/materials"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#c9871a]">
          <FiArrowLeft size={14} /> Back to courses
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FiFolder className="mx-auto text-slate-300 mb-3" size={32} />
          <h3 className="text-base font-bold text-slate-700">Batch not found</h3>
          <p className="text-sm text-slate-500 mt-1">You may not be enrolled in this batch.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link href="/dashboard/user/materials"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#c9871a] transition">
        <FiArrowLeft size={14} /> All Courses
      </Link>

      {/* ── Professional Batch Header (no background image) ── */}
      <div className="relative rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Decorative gradient corner accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#F3A522]/10 via-[#d88f13]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-400/8 via-blue-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-7">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Big batch icon block */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#F3A522] via-[#e0941c] to-[#d88f13] flex items-center justify-center text-white shadow-lg shadow-[#F3A522]/20 flex-shrink-0">
              <FiBookOpen size={28} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30 ring-inset" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF6E7] text-[#a5680f] text-[11px] font-mono font-bold border border-[#F0DFB4]">
                  <FiHash size={10} /> {batch?.id}
                </span>
                {course?.type && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100 tracking-wider">
                    {course.type}
                  </span>
                )}
                {batch?.status && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    batch.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : batch.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {batch.status}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{course?.title || 'Course'}</h1>
              {batch?.name && (
                <p className="text-sm text-slate-500 mt-0.5">{batch.name}</p>
              )}
            </div>

            {/* All Recordings CTA — only if there is at least one recording */}
            {totalRecordings > 0 && (
              <Link
                href={`/learn-batch/${batchId}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition flex-shrink-0 group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                  <FiPlay size={13} className="ml-0.5" />
                </div>
                <span>All Class Recordings</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-[11px] font-bold">{totalRecordings}</span>
                <FiArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>

          {/* Schedule + mentor row */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {batch?.classDays?.length > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FiCalendar size={14} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Days</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{batch.classDays.map(d => d.slice(0, 3)).join(', ')}</p>
                </div>
              </div>
            )}
            {batch?.classTime && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <FiClock size={14} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Time</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{batch.classTime}</p>
                </div>
              </div>
            )}
            {mentor?.name && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                  {mentor.image ? (
                    <img src={mentor.image} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <FiUser size={14} className="text-violet-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mentor</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{mentor.name}</p>
                </div>
              </div>
            )}
            {batch?.startDate && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <FiBookOpen size={14} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                  <p className="text-xs font-bold text-slate-700 truncate">
                    {new Date(batch.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {batch?.endDate && ` → ${new Date(batch.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search + count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <FiFolder className="text-[#F3A522]" size={18} />
          Class Folders <span className="text-sm text-slate-400 font-medium">({classes.length})</span>
        </h2>
        {classes.length > 0 && (
          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200/60 text-sm focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/20 outline-none w-64 bg-white shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <FiFolder className="text-slate-300" size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-700">No class folders yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Your mentor will create class folders here. Check back after your next class.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">No class matches your search.</p>
        </div>
      ) : (
        /* Class Folder Grid — 3-4 per row */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((cls, idx) => {
            const classDate = cls.date ? new Date(cls.date) : null;
            const isCompleted = cls.status === 'completed';
            const isOngoing = cls.status === 'ongoing';
            const { recs, mats } = countContents(cls);

            return (
              <Link
                key={cls._id}
                href={`/dashboard/user/materials/${batchId}/${cls._id}`}
                className="group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#F0DFB4] transition-all duration-300 overflow-hidden"
              >
                {/* Top color band */}
                <div className={`h-2 ${
                  isCompleted ? 'bg-gradient-to-r from-[#F3A522] to-[#d88f13]'
                  : isOngoing ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                }`} />

                <div className="p-4">
                  {/* Folder icon + number */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                      isCompleted ? 'bg-gradient-to-br from-[#F3A522] to-[#d88f13]'
                      : isOngoing ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      <FiFolder size={22} className="absolute opacity-20" />
                      <span className="relative">{classNumberFrom(cls.title, idx)}</span>
                    </div>
                    {cls.status && (
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                        isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : isOngoing ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {cls.status}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-[#a5680f] transition mb-1 min-h-[2.5rem]">
                    {cls.title || `Class ${idx + 1}`}
                  </h3>

                  {/* Topic */}
                  {cls.topic && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 min-h-[2rem]">{cls.topic}</p>
                  )}

                  {/* Date + time */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                    {classDate && (
                      <span className="flex items-center gap-1">
                        <FiCalendar size={10} className="text-blue-500" />
                        {classDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                    {cls.startTime && (
                      <span className="flex items-center gap-1">
                        <FiClock size={10} className="text-amber-500" />
                        {cls.startTime}
                      </span>
                    )}
                  </div>

                  {/* Content badges */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-slate-100">
                    {recs > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                        <FiVideo size={10} /> {recs > 1 ? `${recs} videos` : '1 video'}
                      </span>
                    )}
                    {mats > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        <FiFileText size={10} /> {mats > 1 ? `${mats} files` : '1 file'}
                      </span>
                    )}
                    {cls.meetingLink && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[10px] font-bold">
                        meet
                      </span>
                    )}
                    {cls.venue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        <FiMapPin size={9} /> venue
                      </span>
                    )}
                    {recs === 0 && mats === 0 && !cls.meetingLink && !cls.venue && (
                      <span className="text-[10px] text-slate-400 italic">No content yet</span>
                    )}
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

'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  FiArrowLeft, FiLoader, FiClock, FiBookOpen,
  FiAward, FiUser, FiCalendar, FiStar,
  FiUsers, FiCheckCircle, FiVideo,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function CourseDetailsPage({ params }) {
  const { courseId } = use(params);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [batch, setBatch] = useState(null);

  useEffect(() => { load(); }, [courseId]);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';

      // Try fetching course directly (public endpoint)
      try {
        const cRes = await fetch(`${API}/courses/${courseId}`);
        const cData = await cRes.json();
        const c = cData?.data || cData;
        if (c && (c._id || c.title)) setCourse(c);
      } catch { /* fallback below */ }

      // Also load enrollment to find this student's batch for this course
      try {
        const eRes = await fetch(`${API}/enrollments/my-enrollments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eData = await eRes.json();
        const enrollment = (eData.data || []).find(e => {
          const cid = typeof e.courseId === 'object' ? e.courseId?._id : e.courseId;
          return cid === courseId;
        });
        if (enrollment) {
          // If course direct fetch missed, fall back to populated enrollment.courseId
          if (!course && typeof enrollment.courseId === 'object') {
            setCourse(enrollment.courseId);
          }
          if (typeof enrollment.batchId === 'object') setBatch(enrollment.batchId);
        }
      } catch (e) { console.error(e); }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-[#F3A522]" size={28} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/user/courses"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#c9871a]">
          <FiArrowLeft size={14} /> Back to my courses
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FiBookOpen className="mx-auto text-slate-300 mb-3" size={32} />
          <h3 className="text-base font-bold text-slate-700">Course not found</h3>
        </div>
      </div>
    );
  }

  const c = course;
  const m = typeof c.mentor === 'object' ? c.mentor : null;
  const curriculum = Array.isArray(c.curriculum) ? c.curriculum : [];
  const includes = Array.isArray(c.courseIncludes) ? c.courseIncludes : [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Breadcrumb */}
      <Link href="/dashboard/user/courses"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#c9871a] transition">
        <FiArrowLeft size={14} /> Back to my courses
      </Link>

      {/* ── HERO — image-free, brand colors ── */}
      <div className="relative rounded-2xl bg-white border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Decorative gradient accents (no photo) */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#F3A522]/12 via-emerald-400/6 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#F3A522]/8 via-[#F3A522]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-5">
            {/* Course icon block */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#F3A522] via-[#e0941c] to-[#d88f13] flex items-center justify-center text-white shadow-lg shadow-[#F3A522]/25 flex-shrink-0">
              <FiBookOpen size={28} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30 ring-inset" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {c.type && (
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-[#F3A522]/10 text-[#1f7e7a] border border-[#F3A522]/20 tracking-wider">
                    {c.type}
                  </span>
                )}
                {batch?.id && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded bg-[#F3A522] text-white">
                    {batch.id}
                  </span>
                )}
                {c.rating && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-bold">
                    <FiStar size={11} fill="currentColor" /> {c.rating}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {c.title}
              </h1>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600">
            {c.durationMonth ? (
              <span className="flex items-center gap-1.5">
                <FiClock size={14} className="text-[#F3A522]" /> {c.durationMonth} {c.durationMonth === 1 ? 'month' : 'months'}
              </span>
            ) : null}
            {c.lectures ? (
              <span className="flex items-center gap-1.5">
                <FiBookOpen size={14} className="text-[#F3A522]" /> {c.lectures} lectures
              </span>
            ) : null}
            {c.totalExam ? (
              <span className="flex items-center gap-1.5">
                <FiAward size={14} className="text-[#F3A522]" /> {c.totalExam} exams
              </span>
            ) : null}
            {c.totalStudentsEnroll ? (
              <span className="flex items-center gap-1.5">
                <FiUsers size={14} className="text-[#F3A522]" /> {c.totalStudentsEnroll}+ students
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── TWO COLUMN BODY ── */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        {/* LEFT — Course details */}
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {c.durationMonth ? (
              <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                  <FiClock size={16} />
                </div>
                <p className="text-lg font-bold text-slate-800">{c.durationMonth} mo</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Duration</p>
              </div>
            ) : null}
            {c.lectures ? (
              <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                  <FiBookOpen size={16} />
                </div>
                <p className="text-lg font-bold text-slate-800">{c.lectures}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Lectures</p>
              </div>
            ) : null}
            {c.totalExam ? (
              <div className="rounded-2xl bg-white border border-slate-200/60 shadow-sm p-4">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 mb-2">
                  <FiAward size={16} />
                </div>
                <p className="text-lg font-bold text-slate-800">{c.totalExam}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Exams</p>
              </div>
            ) : null}
          </div>

          {/* Overview */}
          {c.courseOverview && (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#F3A522]"></span>
                Course Overview
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.courseOverview}</p>
            </section>
          )}

          {/* Details */}
          {c.details && c.details !== c.courseOverview && (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-blue-500"></span>
                About this course
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.details}</p>
            </section>
          )}

          {/* Curriculum */}
          {curriculum.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#F3A522]"></span>
                Curriculum
                <span className="text-xs text-slate-400 font-medium normal-case">({curriculum.length} modules)</span>
              </h2>
              <ul className="space-y-2">
                {curriculum.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F3A522] to-[#d88f13] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Course includes */}
          {includes.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-amber-500"></span>
                Course Includes
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {includes.map((inc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <FiCheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                    <span>{inc.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.courseStart && (
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FiCalendar className="text-rose-500" size={16} />
                Course Starts
              </h2>
              <p className="text-sm text-slate-700">{c.courseStart}</p>
            </section>
          )}
        </div>

        {/* RIGHT — Mentor + Batch */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          {/* Mentor card — brand teal palette */}
          {m ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              {/* Mentor header with subtle teal gradient backdrop */}
              <div className="relative px-5 pt-6 pb-5 text-center border-b border-slate-100 bg-gradient-to-b from-[#F3A522]/8 to-transparent">
                {/* Decorative accent ring */}
                <div className="absolute top-3 right-3 w-20 h-20 bg-gradient-to-br from-[#F3A522]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                <div className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-[#F3A522] to-[#d88f13] ring-4 ring-white shadow-xl shadow-[#F3A522]/20 mb-4">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
                      {m.name?.charAt(0) || 'M'}
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-[#1f7e7a] uppercase tracking-widest mb-1">Your Mentor</p>
                <h3 className="text-lg font-bold text-slate-800">{m.name}</h3>
                {m.designation && (
                  <p className="text-sm text-slate-500 mt-0.5">{m.designation}</p>
                )}
                {m.subject && (
                  <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-[#F3A522]/12 text-[#1f7e7a] text-[10px] font-bold uppercase tracking-wider border border-[#F3A522]/20">
                    {m.subject}
                  </span>
                )}
              </div>

              {/* Mentor details */}
              <div className="p-5 space-y-4">
                {m.training_experience && (
                  <div className="grid grid-cols-2 gap-2">
                    {m.training_experience.years && (
                      <div className="rounded-xl bg-[#F3A522]/5 border border-[#F3A522]/15 p-3 text-center">
                        <p className="text-lg font-bold text-[#1f7e7a]">{m.training_experience.years}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Years Exp.</p>
                      </div>
                    )}
                    {m.training_experience.students && (
                      <div className="rounded-xl bg-[#F3A522]/5 border border-[#F3A522]/15 p-3 text-center">
                        <p className="text-lg font-bold text-[#1f7e7a]">{m.training_experience.students}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Students</p>
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(m.specialized_area) && m.specialized_area.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Specialized Areas</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {m.specialized_area.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#F3A522]/8 text-[#1f7e7a] text-[11px] font-semibold border border-[#F3A522]/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(m.education_qualification) && m.education_qualification.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Education</h4>
                    <ul className="space-y-1.5">
                      {m.education_qualification.map((e, i) => (
                        <li key={i} className="text-[12px] text-slate-600 flex items-start gap-2 leading-relaxed">
                          <span className="text-[#F3A522] mt-0.5">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(m.work_experience) && m.work_experience.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Work Experience</h4>
                    <ul className="space-y-1.5">
                      {m.work_experience.map((w, i) => (
                        <li key={i} className="text-[12px] text-slate-600 flex items-start gap-2 leading-relaxed">
                          <span className="text-[#F3A522] mt-0.5">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.details && (
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">About</h4>
                    <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">{m.details}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 text-center">
              <FiUser className="text-slate-300 mx-auto mb-2" size={28} />
              <p className="text-sm font-semibold text-slate-600">Mentor not assigned</p>
              <p className="text-xs text-slate-400 mt-1">Mentor info will appear here once assigned.</p>
            </div>
          )}

          {/* Batch info card */}
          {batch && (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your Batch</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#FEF6E7] text-[#a5680f] text-xs font-mono font-bold border border-[#F0DFB4]">
                  {batch.id}
                </span>
                {batch.status && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    batch.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : batch.status === 'upcoming' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {batch.status}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                {batch.classDays?.length > 0 && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FiCalendar size={11} className="text-blue-500" />
                    <span>{batch.classDays.map(d => d.slice(0, 3)).join(', ')}</span>
                  </div>
                )}
                {batch.classTime && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FiClock size={11} className="text-amber-500" />
                    <span>{batch.classTime}</span>
                  </div>
                )}
                {batch.startDate && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FiCalendar size={11} className="text-emerald-500" />
                    <span>
                      {new Date(batch.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {batch.endDate && ` → ${new Date(batch.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </span>
                  </div>
                )}
              </div>
              <Link
                href={`/dashboard/user/materials/${batch._id}`}
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#FEF6E7] text-[#a5680f] text-xs font-bold hover:bg-[#FEF6E7] transition border border-[#F0DFB4]"
              >
                <FiVideo size={12} /> View Materials
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

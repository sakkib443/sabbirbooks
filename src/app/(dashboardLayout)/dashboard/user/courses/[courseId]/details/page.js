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
        <FiLoader className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/user/courses"
          className="inline-flex items-center gap-1 text-sm text-dash-mute hover:text-brand-ink">
          <FiArrowLeft size={14} /> Back to my courses
        </Link>
        <div className="bg-dash-card rounded-2xl border border-dash-line p-12 text-center">
          <FiBookOpen className="mx-auto text-dash-faint mb-3" size={32} />
          <h3 className="text-base font-bold text-dash-ink3">Course not found</h3>
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
        className="inline-flex items-center gap-1 text-sm text-dash-mute hover:text-brand-ink transition">
        <FiArrowLeft size={14} /> Back to my courses
      </Link>

      {/* ── HERO — image-free, brand colors ── */}
      <div className="relative rounded-2xl bg-dash-card border border-dash-line/60 shadow-sm overflow-hidden">
        {/* Decorative gradient accents (no photo) */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-brand/12 via-emerald-400/6 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-brand/8 via-brand/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-5">
            {/* Course icon block */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-brand via-brand-strong to-brand-hover flex items-center justify-center text-white shadow-lg shadow-brand/25 flex-shrink-0">
              <FiBookOpen size={28} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30 ring-inset" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {c.type && (
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-brand/10 text-aqua-deep border border-brand/20 tracking-wider">
                    {c.type}
                  </span>
                )}
                {batch?.id && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 rounded bg-brand text-white">
                    {batch.id}
                  </span>
                )}
                {c.rating && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded font-bold">
                    <FiStar size={11} fill="currentColor" /> {c.rating}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-dash-ink leading-tight">
                {c.title}
              </h1>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="mt-5 pt-5 border-t border-dash-line-soft flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-dash-ink4">
            {c.durationMonth ? (
              <span className="flex items-center gap-1.5">
                <FiClock size={14} className="text-brand" /> {c.durationMonth} {c.durationMonth === 1 ? 'month' : 'months'}
              </span>
            ) : null}
            {c.lectures ? (
              <span className="flex items-center gap-1.5">
                <FiBookOpen size={14} className="text-brand" /> {c.lectures} lectures
              </span>
            ) : null}
            {c.totalExam ? (
              <span className="flex items-center gap-1.5">
                <FiAward size={14} className="text-brand" /> {c.totalExam} exams
              </span>
            ) : null}
            {c.totalStudentsEnroll ? (
              <span className="flex items-center gap-1.5">
                <FiUsers size={14} className="text-brand" /> {c.totalStudentsEnroll}+ students
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
              <div className="rounded-2xl bg-dash-card border border-dash-line/60 shadow-sm p-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                  <FiClock size={16} />
                </div>
                <p className="text-lg font-bold text-dash-ink2">{c.durationMonth} mo</p>
                <p className="text-[10px] text-dash-mute2 uppercase tracking-wider font-bold">Duration</p>
              </div>
            ) : null}
            {c.lectures ? (
              <div className="rounded-2xl bg-dash-card border border-dash-line/60 shadow-sm p-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                  <FiBookOpen size={16} />
                </div>
                <p className="text-lg font-bold text-dash-ink2">{c.lectures}</p>
                <p className="text-[10px] text-dash-mute2 uppercase tracking-wider font-bold">Lectures</p>
              </div>
            ) : null}
            {c.totalExam ? (
              <div className="rounded-2xl bg-dash-card border border-dash-line/60 shadow-sm p-4">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 mb-2">
                  <FiAward size={16} />
                </div>
                <p className="text-lg font-bold text-dash-ink2">{c.totalExam}</p>
                <p className="text-[10px] text-dash-mute2 uppercase tracking-wider font-bold">Exams</p>
              </div>
            ) : null}
          </div>

          {/* Overview */}
          {c.courseOverview && (
            <section className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-dash-ink2 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-brand"></span>
                Course Overview
              </h2>
              <p className="text-sm text-dash-ink4 leading-relaxed whitespace-pre-wrap">{c.courseOverview}</p>
            </section>
          )}

          {/* Details */}
          {c.details && c.details !== c.courseOverview && (
            <section className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-dash-ink2 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-blue-500"></span>
                About this course
              </h2>
              <p className="text-sm text-dash-ink4 leading-relaxed whitespace-pre-wrap">{c.details}</p>
            </section>
          )}

          {/* Curriculum */}
          {curriculum.length > 0 && (
            <section className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-dash-ink2 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-brand"></span>
                Curriculum
                <span className="text-xs text-dash-mute2 font-medium normal-case">({curriculum.length} modules)</span>
              </h2>
              <ul className="space-y-2">
                {curriculum.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-dash-soft/60 border border-dash-line-soft">
                    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-hover text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-dash-ink3 leading-relaxed pt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Course includes */}
          {includes.length > 0 && (
            <section className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-dash-ink2 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-amber-500"></span>
                Course Includes
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {includes.map((inc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-dash-ink3">
                    <FiCheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                    <span>{inc.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {c.courseStart && (
            <section className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-6">
              <h2 className="text-sm font-bold text-dash-ink2 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FiCalendar className="text-rose-500" size={16} />
                Course Starts
              </h2>
              <p className="text-sm text-dash-ink3">{c.courseStart}</p>
            </section>
          )}
        </div>

        {/* RIGHT — Mentor + Batch */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">
          {/* Mentor card — brand teal palette */}
          {m ? (
            <div className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm overflow-hidden">
              {/* Mentor header with subtle teal gradient backdrop */}
              <div className="relative px-5 pt-6 pb-5 text-center border-b border-dash-line-soft bg-gradient-to-b from-brand/8 to-transparent">
                {/* Decorative accent ring */}
                <div className="absolute top-3 right-3 w-20 h-20 bg-gradient-to-br from-brand/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                <div className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-brand to-brand-hover ring-4 ring-white shadow-xl shadow-brand/20 mb-4">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
                      {m.name?.charAt(0) || 'M'}
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-aqua-deep uppercase tracking-widest mb-1">Your Mentor</p>
                <h3 className="text-lg font-bold text-dash-ink2">{m.name}</h3>
                {m.designation && (
                  <p className="text-sm text-dash-mute mt-0.5">{m.designation}</p>
                )}
                {m.subject && (
                  <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-brand/12 text-aqua-deep text-[10px] font-bold uppercase tracking-wider border border-brand/20">
                    {m.subject}
                  </span>
                )}
              </div>

              {/* Mentor details */}
              <div className="p-5 space-y-4">
                {m.training_experience && (
                  <div className="grid grid-cols-2 gap-2">
                    {m.training_experience.years && (
                      <div className="rounded-xl bg-brand/5 border border-brand/15 p-3 text-center">
                        <p className="text-lg font-bold text-aqua-deep">{m.training_experience.years}</p>
                        <p className="text-[10px] text-dash-mute2 uppercase tracking-wider font-bold">Years Exp.</p>
                      </div>
                    )}
                    {m.training_experience.students && (
                      <div className="rounded-xl bg-brand/5 border border-brand/15 p-3 text-center">
                        <p className="text-lg font-bold text-aqua-deep">{m.training_experience.students}</p>
                        <p className="text-[10px] text-dash-mute2 uppercase tracking-wider font-bold">Students</p>
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(m.specialized_area) && m.specialized_area.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-dash-mute uppercase tracking-wider mb-2">Specialized Areas</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {m.specialized_area.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-brand/8 text-aqua-deep text-[11px] font-semibold border border-brand/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(m.education_qualification) && m.education_qualification.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-dash-mute uppercase tracking-wider mb-2">Education</h4>
                    <ul className="space-y-1.5">
                      {m.education_qualification.map((e, i) => (
                        <li key={i} className="text-[12px] text-dash-ink4 flex items-start gap-2 leading-relaxed">
                          <span className="text-brand mt-0.5">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(m.work_experience) && m.work_experience.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-dash-mute uppercase tracking-wider mb-2">Work Experience</h4>
                    <ul className="space-y-1.5">
                      {m.work_experience.map((w, i) => (
                        <li key={i} className="text-[12px] text-dash-ink4 flex items-start gap-2 leading-relaxed">
                          <span className="text-brand mt-0.5">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.details && (
                  <div>
                    <h4 className="text-[10px] font-bold text-dash-mute uppercase tracking-wider mb-2">About</h4>
                    <p className="text-[12px] text-dash-ink4 leading-relaxed whitespace-pre-wrap">{m.details}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-8 text-center">
              <FiUser className="text-dash-faint mx-auto mb-2" size={28} />
              <p className="text-sm font-semibold text-dash-ink4">Mentor not assigned</p>
              <p className="text-xs text-dash-mute2 mt-1">Mentor info will appear here once assigned.</p>
            </div>
          )}

          {/* Batch info card */}
          {batch && (
            <div className="bg-dash-card rounded-2xl border border-dash-line/60 shadow-sm p-5">
              <p className="text-[10px] font-bold text-dash-mute2 uppercase tracking-wider mb-2">Your Batch</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-soft text-brand-deep text-xs font-mono font-bold border border-brand-line">
                  {batch.id}
                </span>
                {batch.status && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    batch.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : batch.status === 'upcoming' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-dash-soft text-dash-ink4 border-dash-line'
                  }`}>
                    {batch.status}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs">
                {batch.classDays?.length > 0 && (
                  <div className="flex items-center gap-2 text-dash-ink4">
                    <FiCalendar size={11} className="text-blue-500" />
                    <span>{batch.classDays.map(d => d.slice(0, 3)).join(', ')}</span>
                  </div>
                )}
                {batch.classTime && (
                  <div className="flex items-center gap-2 text-dash-ink4">
                    <FiClock size={11} className="text-amber-500" />
                    <span>{batch.classTime}</span>
                  </div>
                )}
                {batch.startDate && (
                  <div className="flex items-center gap-2 text-dash-ink4">
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
                className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-soft text-brand-deep text-xs font-bold hover:bg-brand-soft transition border border-brand-line"
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

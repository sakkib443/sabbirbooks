'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FiCalendar, FiClock, FiVideo, FiMapPin,
  FiLoader, FiChevronLeft, FiChevronRight, FiDownload,
  FiUser, FiBookOpen, FiHash,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = { Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

function nextOccurrences(classDays, count = 5, fromDate = new Date()) {
  if (!classDays || classDays.length === 0) return [];
  const targetIdxs = classDays
    .map(d => WEEKDAYS_FULL.indexOf(d))
    .filter(i => i >= 0)
    .sort((a, b) => a - b);
  if (targetIdxs.length === 0) return [];

  const out = [];
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);
  let safety = 0;
  while (out.length < count && safety < 90) {
    if (targetIdxs.includes(cursor.getDay())) {
      out.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }
  return out;
}

export default function StudentSchedulePage() {
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('list');
  const [attendanceSummary, setAttendanceSummary] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const enrollRes = await fetch(`${API}/enrollments/my-enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const enrollData = await enrollRes.json();
      const enrolled = (enrollData.data || []).filter(e => e.batchId);
      setEnrollments(enrolled);

      const batchIds = enrolled.map(e => typeof e.batchId === 'object' ? e.batchId._id : e.batchId);

      if (batchIds.length > 0) {
        const classRes = await fetch(`${API}/classes/student/schedule?batchIds=${batchIds.join(',')}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const classData = await classRes.json();
        setClasses(classData.success ? classData.data || [] : []);
      }

      // attendance
      try {
        const attRes = await fetch(`${API}/attendance/my/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const attData = await attRes.json();
        if (attData.success) setAttendanceSummary(attData.data);
      } catch { /* ignore */ }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayClasses = classes.filter(c => {
    const d = new Date(c.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const upcomingClasses = classes.filter(c => new Date(c.date) > today).slice(0, 10);
  const pastClasses = classes.filter(c => new Date(c.date) < today);

  // Build batch info list with next sessions computed from classDays/classTime
  const batchSchedules = useMemo(() => {
    return enrollments.map(e => {
      const b = typeof e.batchId === 'object' ? e.batchId : null;
      if (!b) return null;
      const next = nextOccurrences(b.classDays || [], 5);
      return {
        enrollmentId: e._id,
        batch: b,
        course: typeof e.courseId === 'object' ? e.courseId : null,
        nextSessions: next,
      };
    }).filter(Boolean);
  }, [enrollments]);

  // Classes per weekday count (across all batches)
  const weeklyClassCount = useMemo(() => {
    const counts = {};
    batchSchedules.forEach(bs => {
      (bs.batch.classDays || []).forEach(d => {
        counts[d] = (counts[d] || 0) + 1;
      });
    });
    return counts;
  }, [batchSchedules]);

  // Calendar
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth]);

  const getRecurringForDay = (day) => {
    if (!day) return [];
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const wd = WEEKDAYS_FULL[date.getDay()];
    return batchSchedules
      .filter(bs => (bs.batch.classDays || []).includes(wd))
      .map(bs => ({
        title: bs.batch.id || bs.batch.name,
        time: bs.batch.classTime,
        courseName: bs.course?.title,
      }));
  };

  const getScheduledClassesForDay = (day) => {
    if (!day) return [];
    return classes.filter(c => {
      const d = new Date(c.date);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
  };

  const isJoinable = (cls) => {
    const classDate = new Date(cls.date);
    const now = new Date();
    const diffMin = (classDate.getTime() - now.getTime()) / (1000 * 60);
    return cls.status !== 'cancelled' && cls.meetingLink && diffMin <= 30 && diffMin >= -120;
  };

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <FiLoader className="animate-spin text-brand" size={30} />
      </div>
    );
  }

  // Empty state — not enrolled in any batch
  if (batchSchedules.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink">My Schedule</h1>
          <p className="text-dash-mute text-sm mt-1">View your class schedule and join live sessions</p>
        </div>
        <div className="bg-dash-card rounded-2xl border border-dash-line p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-dash-soft2 flex items-center justify-center mx-auto mb-4">
            <FiCalendar className="text-dash-mute2" size={22} />
          </div>
          <h3 className="text-lg font-bold text-dash-ink3">No batch assigned yet</h3>
          <p className="text-sm text-dash-mute mt-1 max-w-md mx-auto">
            Once you are enrolled in a batch, your weekly class schedule (days &amp; time) will appear here.
          </p>
        </div>
      </div>
    );
  }

  // Stats: classes per week across all batches + today/upcoming
  const totalPerWeek = batchSchedules.reduce((sum, bs) => sum + (bs.batch.classDays?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dash-ink">My Schedule</h1>
        <p className="text-dash-mute text-sm mt-1">Your weekly class schedule and upcoming sessions</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dash-card rounded-2xl border border-dash-line p-4 shadow-sm">
          <p className="text-[11px] text-dash-mute uppercase tracking-wide">Today</p>
          <p className="text-2xl font-bold text-brand mt-1">{todayClasses.length || (batchSchedules.some(bs => (bs.batch.classDays || []).includes(WEEKDAYS_FULL[new Date().getDay()])) ? '•' : 0)}</p>
          <p className="text-[11px] text-dash-mute2">{todayClasses.length > 0 ? 'scheduled' : (batchSchedules.some(bs => (bs.batch.classDays || []).includes(WEEKDAYS_FULL[new Date().getDay()])) ? 'class day' : 'no class')}</p>
        </div>
        <div className="bg-dash-card rounded-2xl border border-dash-line p-4 shadow-sm">
          <p className="text-[11px] text-dash-mute uppercase tracking-wide">Per Week</p>
          <p className="text-2xl font-bold text-dash-ink mt-1">{totalPerWeek}</p>
          <p className="text-[11px] text-dash-mute2">classes</p>
        </div>
        <div className="bg-dash-card rounded-2xl border border-dash-line p-4 shadow-sm">
          <p className="text-[11px] text-dash-mute uppercase tracking-wide">My Batches</p>
          <p className="text-2xl font-bold text-dash-ink mt-1">{batchSchedules.length}</p>
          <p className="text-[11px] text-dash-mute2">active</p>
        </div>
        {attendanceSummary ? (
          <div className="bg-dash-card rounded-2xl border border-dash-line p-4 shadow-sm">
            <p className="text-[11px] text-dash-mute uppercase tracking-wide">Attendance</p>
            <p className={`text-2xl font-bold mt-1 ${attendanceSummary.rate >= 80 ? 'text-emerald-600' : attendanceSummary.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {attendanceSummary.rate}%
            </p>
            <p className="text-[11px] text-dash-mute2">{attendanceSummary.present}/{attendanceSummary.total} present</p>
          </div>
        ) : (
          <div className="bg-dash-card rounded-2xl border border-dash-line p-4 shadow-sm">
            <p className="text-[11px] text-dash-mute uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-dash-ink mt-1">{pastClasses.length}</p>
            <p className="text-[11px] text-dash-mute2">classes</p>
          </div>
        )}
      </div>

      {/* ── BATCH WEEKLY SCHEDULE — the main fix ── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-dash-ink2 flex items-center gap-2">
          <FiCalendar className="text-brand" size={16} />
          Weekly Class Schedule
        </h2>

        {batchSchedules.map(bs => {
          const days = bs.batch.classDays || [];
          const time = bs.batch.classTime || '';
          const mentor = typeof bs.batch.mentorId === 'object' ? bs.batch.mentorId : null;
          return (
            <div key={bs.enrollmentId} className="bg-dash-card rounded-2xl border border-dash-line shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-brand/8 to-transparent border-b border-dash-line-soft flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FiBookOpen className="text-brand flex-shrink-0" size={15} />
                    <h3 className="font-bold text-dash-ink2 truncate">{bs.course?.title || bs.batch.name || 'Course'}</h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dash-mute flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-soft text-brand-deep font-mono font-bold text-[11px]">
                      <FiHash size={10} /> {bs.batch.id || bs.batch.name}
                    </span>
                    {mentor && (
                      <span className="inline-flex items-center gap-1">
                        <FiUser size={11} /> {mentor.name}
                      </span>
                    )}
                    {bs.course?.type && (
                      <span className="px-1.5 py-0.5 rounded bg-dash-soft2 text-[10px] font-bold uppercase text-dash-mute">{bs.course.type}</span>
                    )}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                  bs.batch.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  bs.batch.status === 'upcoming' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-dash-soft text-dash-ink4 border-dash-line'
                }`}>
                  {bs.batch.status || 'active'}
                </span>
              </div>

              {/* Days + Time */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-dash-mute2 uppercase tracking-wider mb-2">Class Days</p>
                  {days.length === 0 ? (
                    <p className="text-sm text-dash-mute2 italic">Not set yet — please contact admin.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS_FULL.map(d => {
                        const isClassDay = days.includes(d);
                        const isToday = WEEKDAYS_FULL[new Date().getDay()] === d;
                        return (
                          <div key={d} className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition ${
                            isClassDay
                              ? (isToday ? 'bg-brand text-white border-brand shadow-md shadow-brand/30' : 'bg-brand/10 text-aqua-deep border-brand/40')
                              : 'bg-dash-soft text-dash-faint border-dash-line-soft'
                          }`}>
                            <span className="text-[9px] font-bold uppercase opacity-80">{WEEKDAY_SHORT[d]}</span>
                            <span className="text-xs font-bold">{isClassDay ? '✓' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                      <FiClock size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Class Time</p>
                      <p className="text-sm font-bold text-dash-ink2 truncate">{time || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
                      <FiCalendar size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Duration</p>
                      <p className="text-sm font-bold text-dash-ink2 truncate">
                        {bs.batch.startDate ? new Date(bs.batch.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        {bs.batch.endDate ? ` → ${new Date(bs.batch.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next sessions */}
                {bs.nextSessions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-dash-mute2 uppercase tracking-wider mb-2">Next 5 sessions</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {bs.nextSessions.map((d, i) => {
                        const isToday = d.getTime() === today.getTime();
                        return (
                          <div key={i} className={`rounded-lg border p-2.5 text-center ${isToday ? 'bg-brand/10 border-brand/40' : 'bg-dash-soft/60 border-dash-line-soft'}`}>
                            <p className="text-[10px] font-bold text-dash-mute uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                            <p className={`text-lg font-bold ${isToday ? 'text-brand' : 'text-dash-ink2'}`}>{d.getDate()}</p>
                            <p className="text-[10px] text-dash-mute2">{d.toLocaleDateString('en-US', { month: 'short' })}</p>
                            {time && <p className="text-[9px] font-semibold text-amber-600 mt-0.5">{time}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 pt-2">
        <button onClick={() => setView('list')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${view === 'list' ? 'bg-brand text-white' : 'bg-dash-card border text-dash-ink4'}`}>
          List View
        </button>
        <button onClick={() => setView('calendar')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${view === 'calendar' ? 'bg-brand text-white' : 'bg-dash-card border text-dash-ink4'}`}>
          Calendar View
        </button>
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          {/* Today's scheduled classes (live events from mentor) */}
          {todayClasses.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-dash-ink2 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Today&apos;s Live Classes
              </h2>
              <div className="space-y-3">
                {todayClasses.map(cls => (
                  <div key={cls._id} className="bg-dash-card rounded-xl border-2 border-brand/30 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-dash-ink2 text-lg">{cls.title}</h3>
                        <p className="text-sm text-dash-mute">{cls.topic}</p>
                        <div className="flex items-center flex-wrap gap-3 mt-2 text-xs text-dash-mute">
                          <span className="flex items-center gap-1"><FiClock size={12} /> {cls.startTime} - {cls.endTime}</span>
                          {cls.mentorId && <span className="flex items-center gap-1"><FiUser size={12} /> {cls.mentorId.firstName} {cls.mentorId.lastName}</span>}
                          {cls.venue && <span className="flex items-center gap-1"><FiMapPin size={12} /> {cls.venue}</span>}
                        </div>
                      </div>
                      {cls.meetingLink && isJoinable(cls) && (
                        <a href={cls.meetingLink} target="_blank" rel="noopener"
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand to-brand-hover text-white rounded-xl text-sm font-bold hover:shadow-lg animate-pulse">
                          <FiVideo size={16} /> Join Now
                        </a>
                      )}
                    </div>
                    {cls.materials?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {cls.materials.map((m, i) => (
                          <a key={i} href={m.fileUrl} download className="flex items-center gap-1 px-3 py-1 bg-dash-soft border rounded-lg text-xs text-dash-ink4 hover:border-brand">
                            <FiDownload size={10} /> {m.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming live classes */}
          {upcomingClasses.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-dash-ink2 mb-3">Upcoming Live Classes</h2>
              <div className="space-y-2">
                {upcomingClasses.map(cls => (
                  <div key={cls._id} className="bg-dash-card rounded-xl border border-dash-line shadow-sm p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-dash-ink2 text-sm">{cls.title}</h3>
                      <p className="text-xs text-dash-mute">{cls.topic}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dash-mute2">
                        <span><FiCalendar className="inline mr-1" size={10} />{new Date(cls.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        <span><FiClock className="inline mr-1" size={10} />{cls.startTime}</span>
                        {cls.mentorId && <span>{cls.mentorId.firstName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {((cls.recordings?.length > 0) || cls.recordingUrl) && (
                        <a href={cls.recordings?.[0]?.url || cls.recordingUrl} target="_blank" rel="noopener" className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                          Recording{cls.recordings?.length > 1 ? `s (${cls.recordings.length})` : ''}
                        </a>
                      )}
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${cls.type === 'live' ? 'bg-blue-50 text-blue-700' : cls.type === 'offline' ? 'bg-amber-50 text-amber-700' : 'bg-dash-soft text-dash-mute'}`}>
                        {cls.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastClasses.filter(c => (c.recordings?.length > 0) || c.recordingUrl).length > 0 && (
            <div>
              <h2 className="text-base font-bold text-dash-ink2 mb-3">Past Recordings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pastClasses.filter(c => (c.recordings?.length > 0) || c.recordingUrl).map(cls => {
                  const recs = (cls.recordings?.length > 0) ? cls.recordings : (cls.recordingUrl ? [{ title: 'Recording', url: cls.recordingUrl }] : []);
                  return (
                    <div key={cls._id} className="bg-dash-card rounded-xl border border-dash-line p-4">
                      <h3 className="font-bold text-dash-ink2 text-sm">{cls.title}</h3>
                      <p className="text-xs text-dash-mute mb-2">{new Date(cls.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <div className="space-y-1.5">
                        {recs.map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener"
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100">
                            <FiVideo size={14} /> {r.title || `Recording ${i + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {todayClasses.length === 0 && upcomingClasses.length === 0 && (
            <div className="bg-dash-card rounded-2xl border border-dashed border-dash-line p-8 text-center">
              <p className="text-sm text-dash-mute">No individual class sessions scheduled yet. Your regular weekly schedule is shown above.</p>
            </div>
          )}
        </div>
      ) : (
        /* Calendar View — combines recurring batch days + scheduled classes */
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-2 hover:bg-dash-soft2 rounded-lg"><FiChevronLeft /></button>
            <h3 className="text-lg font-bold text-dash-ink2">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-2 hover:bg-dash-soft2 rounded-lg"><FiChevronRight /></button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-bold text-dash-mute2 py-2">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              const recurring = getRecurringForDay(day);
              const scheduled = getScheduledClassesForDay(day);
              const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
              return (
                <div key={i} className={`min-h-[80px] p-1 border rounded-lg ${day ? 'bg-dash-card' : 'bg-dash-soft'} ${isToday ? 'border-brand border-2' : 'border-dash-line-soft'}`}>
                  {day && (
                    <>
                      <span className={`text-xs font-bold ${isToday ? 'text-brand' : 'text-dash-ink4'}`}>{day}</span>
                      {scheduled.map(c => (
                        <div key={c._id} className={`mt-0.5 px-1 py-0.5 rounded text-[9px] font-bold truncate ${c.type === 'live' ? 'bg-blue-100 text-blue-700' : c.type === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-dash-soft2 text-dash-ink4'}`}>
                          {c.startTime} {c.title}
                        </div>
                      ))}
                      {scheduled.length === 0 && recurring.map((r, idx) => (
                        <div key={idx} className="mt-0.5 px-1 py-0.5 rounded text-[9px] font-bold truncate bg-brand/15 text-aqua-deep" title={r.courseName}>
                          {r.time?.split('-')[0]?.trim() || ''} {r.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-dash-mute flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand/15 border border-brand/40"></span> Recurring class day</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Live session</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span> Offline session</span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiBook, FiUsers, FiCalendar, FiArrowRight, FiClock,
  FiLoader, FiCheckCircle, FiClipboard, FiUserCheck,
  FiVideo, FiMapPin, FiExternalLink, FiTrendingUp,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

// same y/m/d as today
const isToday = (d) => {
  if (!d) return false;
  const dt = new Date(d), n = new Date();
  return dt.getFullYear() === n.getFullYear() && dt.getMonth() === n.getMonth() && dt.getDate() === n.getDate();
};

export default function MentorDashboard() {
  const [mentorName, setMentorName] = useState('Mentor');
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try { const u = JSON.parse(user); setMentorName(u.firstName || u.name || 'Mentor'); } catch (e) { }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [batchRes, studentRes, classRes] = await Promise.all([
        fetch(`${API}/batches/my-batches`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/enrollments/mentor-students`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/classes/mentor/my-classes`, { headers }).then(r => r.json()).catch(() => ({})),
      ]);
      setBatches(batchRes.data || []);
      setStudents(studentRes.data || []);
      setClasses(classRes.data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived (real) stats ──
  const activeBatches = batches.filter(b => b.status === 'active');
  const upcomingBatches = batches.filter(b => b.status === 'upcoming');
  const totalStudents = students.length;

  const batchStudentCount = (batchId) => students.filter(e => {
    const eb = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
    return eb === batchId;
  }).length;

  const todaysClasses = classes
    .filter(c => isToday(c.date) && c.status !== 'cancelled')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { title: 'My Batches', value: batches.length, icon: FiBook, color: '#F3A522', bg: 'bg-[#FEF6E7]' },
    { title: 'Total Students', value: totalStudents, icon: FiUsers, color: '#0ea5e9', bg: 'bg-sky-50' },
    { title: 'Active Batches', value: activeBatches.length, icon: FiCheckCircle, color: '#10B981', bg: 'bg-emerald-50' },
    { title: "Today's Classes", value: todaysClasses.length, icon: FiCalendar, color: '#8B5CF6', bg: 'bg-purple-50' },
  ];

  const quickActions = [
    { title: 'My Batches', href: '/dashboard/mentor/my-batches', icon: FiBook, color: '#F3A522' },
    { title: 'My Students', href: '/dashboard/mentor/students', icon: FiUsers, color: '#0ea5e9' },
    { title: 'Schedule', href: '/dashboard/mentor/schedule', icon: FiClock, color: '#8B5CF6' },
    { title: 'Attendance', href: '/dashboard/mentor/attendance', icon: FiUserCheck, color: '#10B981' },
    { title: 'Grading', href: '/dashboard/mentor/grading', icon: FiClipboard, color: '#f59e0b' },
    { title: 'Profile', href: '/dashboard/mentor/profile', icon: FiUsers, color: '#EF4444' },
  ];

  const classTypeBadge = (t) => ({
    live: { label: 'Live', cls: 'bg-rose-50 text-rose-600', icon: <FiVideo size={11} /> },
    offline: { label: 'Offline', cls: 'bg-[#FEF6E7] text-[#a5680f]', icon: <FiMapPin size={11} /> },
    recorded: { label: 'Recorded', cls: 'bg-slate-100 text-slate-600', icon: <FiVideo size={11} /> },
  }[t] || { label: t || 'Class', cls: 'bg-slate-100 text-slate-600', icon: <FiBook size={11} /> });

  return (
    <div className="space-y-6">
      {/* ── Header (plain, no banner) ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 outfit">{greeting}, {mentorName} 👋</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening with your teaching today.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 shadow-sm self-start">
          <FiCalendar className="text-[#F3A522]" size={15} />
          <span>{todayName}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl border border-slate-200/70 p-5 hover:shadow-md hover:border-[#F0DFB4] transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2 outfit">
                    {loading ? <span className="inline-block w-10 h-8 bg-slate-100 animate-pulse rounded" /> : stat.value}
                  </p>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <Icon className="text-xl" style={{ color: stat.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Today's Classes (real schedule) ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-800 outfit">Today's Classes</h2>
              <p className="text-xs text-slate-500">{todaysClasses.length} class{todaysClasses.length !== 1 ? 'es' : ''} scheduled for {todayName}</p>
            </div>
            <Link href="/dashboard/mentor/schedule" className="flex items-center gap-1 text-sm text-[#c9871a] hover:text-[#a5680f] font-medium transition-colors">
              Schedule <FiArrowRight />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-10 text-center"><FiLoader className="mx-auto animate-spin text-[#F3A522]" size={24} /></div>
            ) : todaysClasses.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#FEF6E7] flex items-center justify-center mx-auto mb-3"><FiCalendar className="text-[#e0a53a]" size={26} /></div>
                <p className="text-sm font-medium text-slate-600">No classes scheduled for today</p>
                <Link href="/dashboard/mentor/schedule" className="inline-block mt-2 text-xs font-semibold text-[#c9871a] hover:underline">+ Create a class</Link>
              </div>
            ) : (
              todaysClasses.map(cls => {
                const badge = classTypeBadge(cls.type);
                const bId = typeof cls.batchId === 'object' ? cls.batchId?._id : cls.batchId;
                return (
                  <div key={cls._id} className="flex items-center justify-between p-4 md:p-5 hover:bg-[#FEF6E7]/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white shrink-0">
                        <FiBook size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{cls.title || cls.topic || 'Class'}</h3>
                        <p className="text-xs text-slate-500 truncate">{cls.courseId?.title || cls.topic || '—'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>{badge.icon}{badge.label}</span>
                          <span className="text-[11px] text-slate-400"><FiUsers className="inline mr-0.5" size={10} />{batchStudentCount(bId)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="text-sm font-bold text-slate-700">{cls.startTime || '—'}{cls.endTime ? `–${cls.endTime}` : ''}</p>
                      {cls.type === 'live' && cls.meetingLink ? (
                        <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c9871a] hover:underline mt-0.5">Join <FiExternalLink size={10} /></a>
                      ) : cls.venue ? (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[120px]">{cls.venue}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Quick Actions + Upcoming ── */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 outfit">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} href={action.href}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-xl border border-slate-200 hover:shadow-md hover:border-[#F0DFB4] hover:-translate-y-0.5 transition-all group text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                      <Icon className="text-lg" style={{ color: action.color }} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{action.title}</p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#F3A522] to-[#d88f13] rounded-xl p-5 text-white shadow-lg shadow-[#F3A522]/25">
            <div className="flex items-center gap-2 mb-1"><FiTrendingUp /><span className="text-sm font-medium opacity-90">Upcoming Batches</span></div>
            <p className="text-4xl font-bold outfit">{loading ? '…' : upcomingBatches.length}</p>
            <p className="text-sm opacity-85 mt-1">batch{upcomingBatches.length !== 1 ? 'es' : ''} starting soon</p>
          </div>
        </div>
      </div>

      {/* ── All My Batches table ── */}
      {!loading && batches.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 outfit">All My Batches</h2>
            <Link href="/dashboard/mentor/my-batches" className="text-sm text-[#c9871a] hover:text-[#a5680f] font-medium flex items-center gap-1">View All <FiArrowRight /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Batch</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Course</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Students</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Days</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Time</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const sc = batchStudentCount(b._id);
                  return (
                    <tr key={b._id} className="border-b border-slate-100 last:border-0 hover:bg-[#FEF6E7]/40 transition">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-slate-800">{b.id}</p>
                        <p className="text-[11px] text-slate-400">{b.name}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{b.courseId?.title || b.courseName || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700"><FiUsers size={12} className="text-[#F3A522]" /> {sc}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {(b.classDays || []).map(d => (
                            <span key={d} className="text-[9px] font-bold bg-[#FEF6E7] text-[#a5680f] px-1.5 py-0.5 rounded">{d.slice(0, 3)}</span>
                          ))}
                          {(!b.classDays || b.classDays.length === 0) && <span className="text-slate-400 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-xs font-medium text-[#c9871a]">{b.classTime || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${b.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          b.status === 'upcoming' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                          }`}>{b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when a mentor has no batches at all */}
      {!loading && batches.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF6E7] flex items-center justify-center mx-auto mb-4"><FiBook className="text-[#F3A522]" size={30} /></div>
          <h3 className="text-base font-bold text-slate-800">No batches assigned yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">When an admin assigns you to a batch, your students, classes and schedule will appear here.</p>
        </div>
      )}
    </div>
  );
}

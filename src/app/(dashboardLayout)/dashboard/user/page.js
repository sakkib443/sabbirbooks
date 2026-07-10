'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FiBook, FiAward, FiClock, FiArrowUpRight,
    FiUser, FiMail, FiPhone, FiCalendar,
    FiPlay, FiCheckCircle, FiCreditCard, FiActivity,
    FiFileText, FiChevronRight, FiFolder, FiArrowRight,
} from 'react-icons/fi';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

/* ─── Central navigation logic (shared behaviour with My Courses) ─── */
const courseDest = (enr) => {
    const course = enr.courseId || {};
    const bId = typeof enr.batchId === 'object' ? enr.batchId?._id : enr.batchId;
    const type = (course.type || '').toLowerCase();
    if (enr.status === 'pending') return { pending: true };
    if (type === 'recorded') return { href: `/learn/${course._id}`, label: 'Continue Learning', kind: 'recorded' };
    if (bId) return { href: `/dashboard/user/materials/${bId}`, label: 'Class Materials', kind: 'class' };
    return { href: `/dashboard/user/courses/${course._id}/details`, label: 'Course Details', kind: 'details' };
};

export default function UserDashboard() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        enrolled: 0, active: 0, pending: 0, completed: 0,
    });
    const [recentCourses, setRecentCourses] = useState([]);
    const [totalPaid, setTotalPaid] = useState(0);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { }
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token') || '';
                const res = await fetch(`${API}/enrollments/my-enrollments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success && data.data) {
                    const enrollments = data.data;
                    setStats({
                        enrolled: enrollments.length,
                        active: enrollments.filter(e => e.status === 'active').length,
                        pending: enrollments.filter(e => e.status === 'pending').length,
                        completed: enrollments.filter(e => e.status === 'completed').length,
                    });
                    setRecentCourses(enrollments.slice(0, 4));
                    setTotalPaid(
                        enrollments
                            .filter(e => e.payment?.status === 'paid')
                            .reduce((s, e) => s + (e.payment?.amount || 0), 0)
                    );
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchData();
    }, []);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        if (h < 20) return 'Good Evening';
        return 'Good Night';
    };

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    if (loading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
                        <div className="absolute inset-0 border-[3px] border-transparent border-t-[#F3A522] rounded-full animate-spin" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* ═══════ Header (plain, no banner) ═══════ */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <p className="text-slate-400 text-xs font-medium tracking-wide">{today}</p>
                    <h1 className="outfit text-2xl lg:text-3xl font-bold text-slate-900 mt-1 leading-tight">
                        {greeting()}, <span className="text-[#F3A522]">{user?.firstName || 'Student'}</span> <span className="inline-block">👋</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Here&apos;s what&apos;s happening with your learning journey.</p>
                </div>
                <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F3A522] text-white rounded-xl text-sm font-semibold hover:bg-[#d88f13] shadow-sm transition-all active:scale-[0.98] whitespace-nowrap self-start"
                >
                    <FiBook size={15} />
                    Explore Courses
                    <FiArrowUpRight size={14} />
                </Link>
            </div>

            {/* ═══════ Stat Cards ═══════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    {
                        label: 'Total Enrolled',
                        value: stats.enrolled,
                        icon: FiBook,
                        iconBg: 'bg-blue-100',
                        iconColor: 'text-blue-600',
                        bar: 'from-blue-400 to-blue-500',
                        trend: stats.active > 0 ? `${stats.active} active now` : 'Start learning',
                        trendColor: 'text-blue-600',
                    },
                    {
                        label: 'Active Courses',
                        value: stats.active,
                        icon: FiActivity,
                        iconBg: 'bg-emerald-100',
                        iconColor: 'text-emerald-600',
                        bar: 'from-emerald-400 to-emerald-500',
                        trend: stats.active > 0 ? 'In progress' : 'None active',
                        trendColor: 'text-emerald-600',
                    },
                    {
                        label: 'Pending',
                        value: stats.pending,
                        icon: FiClock,
                        iconBg: 'bg-amber-100',
                        iconColor: 'text-amber-600',
                        bar: 'from-amber-400 to-amber-500',
                        trend: stats.pending > 0 ? 'Awaiting approval' : 'All clear',
                        trendColor: 'text-amber-600',
                    },
                    {
                        label: 'Completed',
                        value: stats.completed,
                        icon: FiCheckCircle,
                        iconBg: 'bg-violet-100',
                        iconColor: 'text-violet-600',
                        bar: 'from-violet-400 to-violet-500',
                        trend: stats.completed > 0 ? 'Great work!' : 'Keep going',
                        trendColor: 'text-violet-600',
                    },
                ].map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className="group relative bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${card.bar} opacity-70`} />
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                                    <Icon size={18} className={card.iconColor} />
                                </div>
                            </div>
                            <div className="mt-3">
                                <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{card.value}</p>
                                <p className="text-sm text-slate-500 font-medium mt-1.5">{card.label}</p>
                            </div>
                            <p className={`text-[11px] font-medium mt-2 ${card.trendColor}`}>
                                {card.trend}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* ═══════ Main Content Grid ═══════ */}
            <div className="grid lg:grid-cols-12 gap-5">
                {/* ─── Recent Courses ─── */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1.5 h-5 bg-gradient-to-b from-[#F3A522] to-[#d88f13] rounded-full" />
                                <h2 className="outfit font-bold text-slate-800 text-base">Recent Courses</h2>
                            </div>
                            <Link
                                href="/dashboard/user/courses"
                                className="text-sm font-semibold text-[#c9871a] hover:text-[#c9871a] flex items-center gap-1 transition"
                            >
                                View all <FiChevronRight size={13} />
                            </Link>
                        </div>

                        {recentCourses.length === 0 ? (
                            <div className="py-16 px-6 text-center">
                                <div className="w-16 h-16 bg-[#FEF6E7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FiBook size={24} className="text-[#e0a53a]" />
                                </div>
                                <h3 className="font-semibold text-slate-700 text-base mb-1">No courses enrolled</h3>
                                <p className="text-sm text-slate-400 mb-5">Start your learning journey by enrolling in a course.</p>
                                <Link
                                    href="/courses"
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e0941c] text-white text-sm font-semibold rounded-xl hover:bg-[#e0941c] shadow-sm transition"
                                >
                                    <FiBook size={14} /> Browse Courses
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentCourses.map((enrollment) => {
                                    const course = enrollment.courseId || {};
                                    const percent = enrollment.completionPercent || 0;
                                    const isPending = enrollment.status === 'pending';
                                    const isCompleted = enrollment.status === 'completed' || percent >= 100;
                                    const dest = courseDest(enrollment);
                                    const type = (course.type || '').toLowerCase();
                                    const typeLabel = course.type || 'Course';

                                    const DestIcon = dest.kind === 'recorded' ? FiPlay : dest.kind === 'class' ? FiFolder : FiBook;

                                    return (
                                        <div
                                            key={enrollment._id}
                                            className="flex items-center gap-4 p-4 hover:bg-slate-50/70 transition group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-[76px] h-[54px] rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/60 shadow-sm">
                                                {course.image ? (
                                                    <img src={course.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center">
                                                        <FiBook className="text-white" size={18} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-[15px] font-semibold text-slate-800 truncate">{course.title || 'Course'}</h4>
                                                    <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                                                        {typeLabel}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    {isPending ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                                            <FiClock size={10} /> Pending
                                                        </span>
                                                    ) : isCompleted ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                            <FiCheckCircle size={10} /> Completed
                                                        </span>
                                                    ) : type === 'recorded' ? (
                                                        <div className="flex items-center gap-2 flex-1 max-w-[220px]">
                                                            <div className="flex-1 h-[6px] bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-[#F3A522] to-[#d88f13] rounded-full transition-all duration-500"
                                                                    style={{ width: `${Math.max(percent, 2)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-slate-500 tabular-nums w-8">{percent}%</span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#a5680f] bg-[#FEF6E7] px-2 py-0.5 rounded-md border border-[#F0DFB4]">
                                                            <FiActivity size={10} /> Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action */}
                                            {isPending ? (
                                                <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200/70 flex-shrink-0 cursor-default">
                                                    <FiClock size={12} />
                                                    Awaiting Approval
                                                </span>
                                            ) : (
                                                <Link
                                                    href={dest.href}
                                                    className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-[#e0941c] hover:text-white transition-all flex-shrink-0"
                                                >
                                                    <DestIcon size={12} />
                                                    {dest.label}
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Right Column ─── */}
                <div className="lg:col-span-4 space-y-5">
                    {/* Profile Summary Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm">
                        <div className="flex items-center gap-3.5 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white text-lg font-bold shadow-md shadow-[#F3A522]/25">
                                {user?.firstName?.charAt(0) || 'S'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-slate-800 truncate">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs text-slate-400 truncate">Student</p>
                            </div>
                        </div>

                        <div className="space-y-2.5 pt-1">
                            {[
                                { icon: FiMail, value: user?.email || '—' },
                                { icon: FiPhone, value: user?.phoneNumber || 'Not added' },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                                            <Icon size={12} className="text-slate-400" />
                                        </div>
                                        <span className="text-slate-500 truncate text-xs">{item.value}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <Link
                            href="/dashboard/user/profile"
                            className="flex items-center justify-center gap-2 mt-4 w-full py-2.5 text-xs font-semibold text-[#a5680f] bg-[#FEF6E7] rounded-xl hover:bg-[#FEF6E7] transition"
                        >
                            <FiUser size={12} /> Edit Profile
                        </Link>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Quick Actions</p>
                        <div className="space-y-1">
                            {[
                                { title: 'My Courses', href: '/dashboard/user/courses', icon: FiBook, color: 'text-[#c9871a] bg-[#FEF6E7]' },
                                { title: 'Payments', href: '/dashboard/user/payments', icon: FiCreditCard, color: 'text-emerald-600 bg-emerald-50' },
                                { title: 'Schedule', href: '/dashboard/user/schedule', icon: FiCalendar, color: 'text-violet-600 bg-violet-50' },
                                { title: 'Certificates', href: '/dashboard/user/certificates', icon: FiAward, color: 'text-amber-600 bg-amber-50' },
                                { title: 'Exams', href: '/dashboard/user/exams', icon: FiFileText, color: 'text-rose-600 bg-rose-50' },
                            ].map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition group"
                                    >
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${link.color} flex-shrink-0`}>
                                            <Icon size={15} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 flex-1">{link.title}</span>
                                        <FiChevronRight size={15} className="text-slate-300 group-hover:text-[#F3A522] group-hover:translate-x-0.5 transition" />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment Summary */}
                    {totalPaid > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-sm">
                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#F3A522]/10 blur-2xl" />
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                        <FiCreditCard size={15} className="text-emerald-400" />
                                    </div>
                                    <span className="text-xs font-medium text-slate-300">Total Invested</span>
                                </div>
                                <p className="text-2xl font-bold tabular-nums">
                                    ৳{totalPaid.toLocaleString()}
                                </p>
                                <div className="flex items-center justify-between mt-3">
                                    <p className="text-[11px] text-slate-400">
                                        Across {stats.enrolled} course{stats.enrolled > 1 ? 's' : ''}
                                    </p>
                                    <Link href="/dashboard/user/payments" className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition">
                                        Details <FiArrowRight size={11} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

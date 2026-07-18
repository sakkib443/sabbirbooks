'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FiBook, FiClock, FiPlay, FiSearch,
    FiArrowRight, FiCheckCircle,
    FiAlertCircle, FiFolder, FiLayers, FiFileText, FiUser,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

/* ─── Central navigation logic (shared behaviour with dashboard home) ─── */
const courseDest = (enr) => {
    const course = enr.courseId || {};
    const bId = typeof enr.batchId === 'object' ? enr.batchId?._id : enr.batchId;
    const type = (course.type || '').toLowerCase();
    if (enr.status === 'pending') return { pending: true };
    if (type === 'recorded') return { href: `/learn/${course._id}`, label: 'Continue Learning', kind: 'recorded' };
    if (bId) return { href: `/dashboard/user/materials/${bId}`, label: 'Class Materials', kind: 'class' };
    return { href: `/dashboard/user/courses/${course._id}/details`, label: 'Course Details', kind: 'details' };
};

export default function UserCoursesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courseProgress, setCourseProgress] = useState({});
    const [filter, setFilter] = useState('all');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) { }
        }
    }, []);

    // Fetch enrolled courses & all courses
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token') || '';

                // Fetch enrolled courses
                const enrollRes = await fetch(`${API}/enrollments/my-enrollments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const enrollData = await enrollRes.json();
                const enrollments = enrollData.success ? (enrollData.data || []) : [];
                setEnrolledCourses(enrollments);

                // Fetch progress for each enrolled course
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (storedUser._id && enrollments.length > 0) {
                    const progressPromises = enrollments.map(async (enrollment) => {
                        const courseId = enrollment.courseId?._id || enrollment.courseId;
                        try {
                            const progRes = await fetch(`${API}/lessons/progress/${courseId}/${storedUser._id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            const progData = await progRes.json();
                            return {
                                courseId,
                                progress: progData.success ? progData.data : null,
                            };
                        } catch {
                            return { courseId, progress: null };
                        }
                    });
                    const progressResults = await Promise.all(progressPromises);
                    const progMap = {};
                    progressResults.forEach(r => {
                        if (r.progress) progMap[r.courseId] = r.progress;
                    });
                    setCourseProgress(progMap);
                }

                // Fetch all available courses
                const coursesRes = await fetch(`${API}/courses`);
                const coursesData = await coursesRes.json();
                setAvailableCourses(
                    Array.isArray(coursesData) ? coursesData : coursesData.data || []
                );
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredEnrolled = enrolledCourses.filter(e => {
        const course = e.courseId || {};
        const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase());
        if (filter === 'active') return e.status === 'active' && matchesSearch;
        if (filter === 'pending') return e.status === 'pending' && matchesSearch;
        if (filter === 'completed') return (e.status === 'completed' || (courseProgress[course._id]?.overallPercent === 100)) && matchesSearch;
        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-[3px] border-slate-100 rounded-full" />
                        <div className="absolute inset-0 border-[3px] border-transparent border-t-[#F3A522] rounded-full animate-spin" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Loading your courses...</p>
                </div>
            </div>
        );
    }

    const completedCount = Object.values(courseProgress).filter(p => p.overallPercent === 100).length;

    const statCards = [
        { label: 'Enrolled', value: enrolledCourses.length, icon: FiBook, iconBg: 'bg-[#FEF6E7]', iconColor: 'text-[#F3A522]', bar: 'from-[#F3A522] to-[#d88f13]' },
        { label: 'In Progress', value: enrolledCourses.filter(e => e.status === 'active').length, icon: FiPlay, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', bar: 'from-blue-400 to-blue-500' },
        { label: 'Completed', value: completedCount, icon: FiCheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', bar: 'from-emerald-400 to-emerald-500' },
        { label: 'Pending', value: enrolledCourses.filter(e => e.status === 'pending').length, icon: FiAlertCircle, iconBg: 'bg-orange-50', iconColor: 'text-orange-500', bar: 'from-amber-400 to-orange-500' },
    ];

    return (
        <div className="space-y-6 max-w-[1400px]">
            {/* ═══════ Header ═══════ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="outfit text-2xl lg:text-3xl font-bold text-slate-900">My Courses</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and continue your learning journey</p>
                </div>
                <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e0941c] text-white rounded-xl text-sm font-semibold hover:bg-[#e0941c] shadow-sm hover:shadow-md hover:shadow-[#F3A522]/20 transition-all active:scale-[0.98] whitespace-nowrap"
                >
                    <FiSearch size={15} />
                    Browse Catalog
                </Link>
            </div>

            {/* ═══════ Stats ═══════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {statCards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.label}
                            className="group relative bg-white rounded-2xl border border-slate-200/70 p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${card.bar} opacity-70`} />
                            <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={card.iconColor} size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-2xl font-bold text-slate-900 outfit tabular-nums leading-none">{card.value}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">{card.label}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══════ Enrolled Courses ═══════ */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 sm:p-6 shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <h2 className="outfit text-lg font-bold text-slate-800 flex items-center gap-2.5">
                        <div className="w-1.5 h-5 bg-gradient-to-b from-[#F3A522] to-[#d88f13] rounded-full" />
                        Enrolled Courses
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredEnrolled.length}</span>
                    </h2>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 sm:w-56">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search courses..."
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#F3A522] focus:ring-2 focus:ring-[#F0DFB4] outline-none transition placeholder:text-slate-400"
                            />
                        </div>

                        {/* Filter tabs */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'active', label: 'Active' },
                                { id: 'pending', label: 'Pending' },
                                { id: 'completed', label: 'Done' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === tab.id
                                        ? 'bg-white text-[#F3A522] shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {filteredEnrolled.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-[#FEF6E7] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FiBook className="text-3xl text-[#e0a53a]" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Courses Found</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
                            {filter !== 'all' || searchTerm
                                ? 'No courses match your current filter or search.'
                                : "You haven't enrolled in any courses yet. Browse our catalog and start your learning journey!"}
                        </p>
                        <Link
                            href="/courses"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#F3A522]/20 transition"
                        >
                            <FiSearch size={18} />
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredEnrolled.map((enrollment) => {
                            const course = enrollment.courseId || {};
                            const progress = courseProgress[course._id];
                            const percent = progress?.overallPercent || enrollment.completionPercent || 0;
                            const isComplete = percent === 100 || enrollment.status === 'completed';
                            const isPending = enrollment.status === 'pending';
                            const courseType = (course.type || '').toLowerCase();
                            const isRecorded = courseType === 'recorded';
                            const mentor = typeof course.mentor === 'object' ? course.mentor : null;
                            const dest = courseDest(enrollment);
                            const DestIcon = dest.kind === 'recorded' ? FiPlay : dest.kind === 'class' ? FiFolder : FiBook;
                            const recordedLabel = isComplete ? 'Review Course' : percent > 0 ? 'Continue Learning' : 'Start Course';

                            return (
                                <div key={enrollment._id} className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                                    {/* Thumbnail with overlay */}
                                    <div className="h-36 relative overflow-hidden">
                                        {course.image ? (
                                            <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center">
                                                <FiBook className="text-white/70" size={30} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                                        {/* Status badge */}
                                        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md shadow-sm ${isComplete
                                            ? 'bg-emerald-500/90 text-white'
                                            : isPending
                                                ? 'bg-orange-500/90 text-white'
                                                : 'bg-white/90 text-slate-700'
                                            }`}>
                                            {isComplete ? '✓ Completed' : isPending ? '⏳ Pending' : '● Active'}
                                        </div>

                                        {/* Type badge */}
                                        {course.type && (
                                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-black/40 text-white/90 backdrop-blur-md tracking-wider">
                                                {course.type}
                                            </div>
                                        )}

                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 drop-shadow-md">
                                                {course.title || 'Course'}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Info Section */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        {isRecorded ? (
                                            /* ── RECORDED: progress + Continue/Start/Review ── */
                                            <>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                                                    {course.durationMonth ? (
                                                        <span className="flex items-center gap-1">
                                                            <FiClock size={11} /> {course.durationMonth} mo
                                                        </span>
                                                    ) : null}
                                                    {progress ? (
                                                        <span className="flex items-center gap-1 text-[#c9871a]">
                                                            <FiCheckCircle size={11} /> {progress.completedLessons}/{progress.totalLessons} lessons
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-[11px] mb-1.5">
                                                        <span className="text-slate-400 font-medium">Progress</span>
                                                        <span className={`font-bold ${isComplete ? 'text-emerald-500' : 'text-[#c9871a]'}`}>{percent}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ease-out ${isComplete
                                                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                                : 'bg-gradient-to-r from-[#F3A522] to-[#d88f13]'
                                                                }`}
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-auto">
                                                    {isPending ? (
                                                        <div className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-orange-50 text-orange-500 border border-orange-200/60">
                                                            <FiAlertCircle size={13} />
                                                            Awaiting Approval
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            href={dest.href}
                                                            className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${isComplete
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                                                                : 'bg-[#FEF6E7] text-[#c9871a] border border-[#F0DFB4]/60 hover:bg-gradient-to-r hover:from-[#F3A522] hover:to-[#d88f13] hover:text-white hover:border-[#F3A522]'
                                                                }`}
                                                        >
                                                            <FiPlay size={12} />
                                                            {recordedLabel}
                                                            <FiArrowRight size={12} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            /* ── ONLINE / OFFLINE: meta + mentor + Class Materials ── */
                                            <>
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    {course.durationMonth ? (
                                                        <div className="rounded-lg bg-slate-50/70 border border-slate-100 p-2.5">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Duration</p>
                                                            <p className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                                                                <FiClock size={11} className="text-slate-400" />
                                                                {course.durationMonth} {course.durationMonth === 1 ? 'month' : 'months'}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {course.lectures ? (
                                                        <div className="rounded-lg bg-slate-50/70 border border-slate-100 p-2.5">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lectures</p>
                                                            <p className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                                                                <FiLayers size={11} className="text-slate-400" />
                                                                {course.lectures}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                    {course.totalExam ? (
                                                        <div className="rounded-lg bg-slate-50/70 border border-slate-100 p-2.5">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Exams</p>
                                                            <p className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                                                                <FiFileText size={11} className="text-slate-400" />
                                                                {course.totalExam}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                </div>

                                                {mentor && (
                                                    <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[#FEF6E7]/50 border border-[#F0DFB4]/70">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex-shrink-0 flex items-center justify-center">
                                                            {mentor.image ? (
                                                                <img src={mentor.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-white font-bold text-[10px]">
                                                                    {mentor.name?.charAt(0) || <FiUser size={12} />}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Mentor</p>
                                                            <p className="text-[11px] font-bold text-slate-700 truncate">{mentor.name}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-auto">
                                                    {isPending ? (
                                                        <div className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl bg-orange-50 text-orange-500 border border-orange-200/60">
                                                            <FiAlertCircle size={13} />
                                                            Awaiting Approval
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            href={dest.href}
                                                            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 bg-[#FEF6E7] text-[#c9871a] border border-[#F0DFB4]/60 hover:bg-gradient-to-r hover:from-[#F3A522] hover:to-[#d88f13] hover:text-white hover:border-[#F3A522]"
                                                        >
                                                            <DestIcon size={12} />
                                                            {dest.label}
                                                            <FiArrowRight size={12} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

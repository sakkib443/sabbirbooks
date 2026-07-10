'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight,
    FiVideo, FiFileText, FiPlay, FiLock, FiCheck, FiCheckCircle,
    FiDownload, FiLoader, FiArrowLeft, FiMenu, FiX,
    FiBook, FiClock, FiLayers, FiList, FiMaximize, FiMinimize,
} from 'react-icons/fi';
import { MdOutlineQuiz, MdOutlineAssignment } from 'react-icons/md';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';

// Helper: Convert YouTube URL to embed URL
function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = null;
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) {
            videoId = u.searchParams.get('v');
        } else if (u.hostname.includes('youtu.be')) {
            videoId = u.pathname.replace('/', '');
        }
    } catch { }
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
}

export default function CoursePlayerPage() {
    const { courseId } = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const videoRef = useRef(null);
    const progressTimer = useRef(null);

    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [allLessons, setAllLessons] = useState([]);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [expandedModules, setExpandedModules] = useState({});
    const [lessonProgress, setLessonProgress] = useState({});
    const [overallProgress, setOverallProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('content');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) setUser(JSON.parse(stored));
        } catch { }
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const token = getToken();
                const accessRes = await fetch(`${API}/enrollments/check-access/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const accessData = await accessRes.json();
                if (!accessData.success || !accessData.data?.hasAccess) {
                    router.push(`/courses/${courseId}`);
                    return;
                }

                const [courseRes, modRes] = await Promise.all([
                    fetch(`${API}/courses/${courseId}`),
                    fetch(`${API}/modules/course/${courseId}`),
                ]);
                const courseData = await courseRes.json();
                const modData = await modRes.json();
                const courseInfo = courseData.data || courseData;
                const mods = modData.data || [];
                setCourse(courseInfo);
                setModules(mods);

                const lessonPromises = mods.map(async (mod) => {
                    const res = await fetch(`${API}/lessons/module/${mod._id}`);
                    const data = await res.json();
                    return (data.data || []).map(l => ({ ...l, moduleTitle: mod.title, moduleId: mod._id }));
                });
                const lessonResults = await Promise.all(lessonPromises);
                const flatLessons = lessonResults.flat();
                setAllLessons(flatLessons);

                const expanded = {};
                mods.forEach(m => { expanded[m._id] = true; });
                setExpandedModules(expanded);

                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (storedUser._id) {
                    const progRes = await fetch(`${API}/lessons/progress/${courseId}/${storedUser._id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const progData = await progRes.json();
                    if (progData.success && progData.data) {
                        const progMap = {};
                        (progData.data.progress || []).forEach(p => {
                            progMap[p.lessonId] = p;
                        });
                        setLessonProgress(progMap);
                        setOverallProgress(progData.data.overallPercent || 0);
                    }
                }

                const lessonParam = searchParams.get('lesson');
                if (lessonParam && flatLessons.length > 0) {
                    const found = flatLessons.find(l => l._id === lessonParam);
                    setCurrentLesson(found || flatLessons[0]);
                } else if (flatLessons.length > 0) {
                    setCurrentLesson(flatLessons[0]);
                }
            } catch (err) {
                console.error('Failed to load course:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [courseId, router, searchParams]);

    // Progress tracking
    const saveProgress = useCallback(async () => {
        if (!videoRef.current || !currentLesson || currentLesson.type !== 'video') return;
        const video = videoRef.current;
        if (!video.duration || video.duration === 0) return;
        const watchedPercent = Math.round((video.currentTime / video.duration) * 100);
        const lastPosition = Math.round(video.currentTime);
        try {
            const token = getToken();
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            await fetch(`${API}/lessons/${currentLesson._id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ courseId, studentId: storedUser._id, watchedPercent, lastPosition }),
            });
            setLessonProgress(prev => ({
                ...prev,
                [currentLesson._id]: { ...prev[currentLesson._id], watchedPercent, lastPosition, isCompleted: watchedPercent >= 90 },
            }));
            if (watchedPercent >= 90) {
                const progRes = await fetch(`${API}/lessons/progress/${courseId}/${storedUser._id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const progData = await progRes.json();
                if (progData.success) setOverallProgress(progData.data.overallPercent || 0);
            }
        } catch { }
    }, [currentLesson, courseId]);

    useEffect(() => {
        if (currentLesson?.type === 'video' && !getYouTubeEmbedUrl(currentLesson.videoUrl)) {
            progressTimer.current = setInterval(saveProgress, 15000);
            return () => clearInterval(progressTimer.current);
        }
    }, [currentLesson, saveProgress]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const h = () => saveProgress();
        video.addEventListener('pause', h);
        video.addEventListener('ended', h);
        return () => { video.removeEventListener('pause', h); video.removeEventListener('ended', h); };
    }, [saveProgress]);

    useEffect(() => {
        if (!currentLesson || !videoRef.current) return;
        const progress = lessonProgress[currentLesson._id];
        if (progress?.lastPosition && progress.lastPosition > 0 && !progress.isCompleted) {
            videoRef.current.currentTime = progress.lastPosition;
        }
    }, [currentLesson, lessonProgress]);

    const currentIndex = allLessons.findIndex(l => l._id === currentLesson?._id);
    const goToLesson = (lesson) => { saveProgress(); setCurrentLesson(lesson); };
    const goNext = () => { if (currentIndex < allLessons.length - 1) goToLesson(allLessons[currentIndex + 1]); };
    const goPrev = () => { if (currentIndex > 0) goToLesson(allLessons[currentIndex - 1]); };

    const completedCount = Object.values(lessonProgress).filter(p => p.isCompleted).length;

    // ─── Loading ─────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-[3px] border-slate-800 rounded-full" />
                        <div className="absolute inset-0 border-[3px] border-transparent border-t-[#F3A522] rounded-full animate-spin" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Loading course...</p>
                </div>
            </div>
        );
    }

    if (!course || allLessons.length === 0) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white">
                <FiBook size={48} className="text-slate-700 mb-4" />
                <h2 className="text-xl font-bold mb-2">No Lessons Available</h2>
                <p className="text-slate-500 mb-6">This course doesn&apos;t have any lessons yet.</p>
                <Link href="/dashboard/user/courses" className="px-5 py-2.5 bg-[#e0941c] rounded-xl text-sm font-bold hover:bg-[#e0941c] transition">
                    Back to Courses
                </Link>
            </div>
        );
    }

    const groupedByModule = modules.map(mod => ({
        ...mod,
        lessons: allLessons.filter(l => l.moduleId === mod._id),
    }));

    const youtubeUrl = getYouTubeEmbedUrl(currentLesson?.videoUrl);

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col h-screen overflow-hidden">
            {/* ═══════ Top Navigation Bar ═══════ */}
            <header className="bg-[#181818] border-b border-[#282828] h-14 flex items-center px-4 gap-3 flex-shrink-0 z-30">
                <Link
                    href="/dashboard/user/courses"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium"
                >
                    <FiArrowLeft size={18} />
                    <span className="hidden sm:inline">Back</span>
                </Link>

                <div className="w-px h-6 bg-[#333]" />

                <div className="flex-1 min-w-0 flex items-center gap-4">
                    <h1 className="text-white font-semibold text-sm truncate max-w-[300px] lg:max-w-[500px]">
                        {course.title}
                    </h1>
                </div>

                {/* Progress */}
                <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-32 h-1.5 bg-[#333] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#F3A522] rounded-full transition-all duration-700"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                        <span className="text-xs text-slate-400 font-semibold tabular-nums min-w-[36px]">
                            {overallProgress}%
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                        {completedCount}/{allLessons.length} lessons
                    </span>
                </div>

                {/* Sidebar Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#282828] transition"
                    title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
                >
                    <FiList size={18} />
                </button>
            </header>

            {/* ═══════ Main Area ═══════ */}
            <div className="flex flex-1 overflow-hidden">
                {/* ─── Video + Info Area ─── */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                    {/* Video Player */}
                    <div className="bg-black flex-shrink-0">
                        {currentLesson?.type === 'video' && youtubeUrl ? (
                            <div className="aspect-video w-full max-h-[calc(100vh-300px)]">
                                <iframe
                                    key={currentLesson._id}
                                    src={youtubeUrl}
                                    title={currentLesson.title}
                                    className="w-full h-full"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    frameBorder="0"
                                />
                            </div>
                        ) : currentLesson?.type === 'video' && currentLesson.videoUrl ? (
                            <div className="aspect-video w-full max-h-[calc(100vh-300px)]">
                                <video
                                    ref={videoRef}
                                    key={currentLesson._id}
                                    src={currentLesson.videoUrl}
                                    controls
                                    controlsList="nodownload noremoteplayback"
                                    disablePictureInPicture
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="w-full h-full"
                                    autoPlay
                                />
                            </div>
                        ) : currentLesson?.type === 'text' ? (
                            <div className="bg-[#181818] p-8 lg:p-12 min-h-[40vh]">
                                <div className="max-w-3xl mx-auto prose prose-invert">
                                    <div className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap">
                                        {currentLesson.textContent || 'No content available.'}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#181818] p-12 min-h-[40vh] flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-[#282828] rounded-2xl flex items-center justify-center mb-4">
                                    <FiFileText className="text-slate-500" size={28} />
                                </div>
                                <h3 className="text-white text-lg font-bold mb-1">{currentLesson?.title}</h3>
                                <p className="text-slate-500 text-sm">{currentLesson?.type === 'quiz' ? 'Quiz' : 'Assignment'} coming soon</p>
                            </div>
                        )}
                    </div>

                    {/* ─── Below Video Area ─── */}
                    <div className="flex-1 bg-[#0f0f0f]">
                        {/* Lesson Title + Navigation */}
                        <div className="px-5 lg:px-8 py-5 border-b border-[#1e1e1e]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[#F3A522] text-xs font-semibold uppercase tracking-wider mb-1">
                                        {currentLesson?.moduleTitle}
                                    </p>
                                    <h2 className="text-white text-xl font-bold">{currentLesson?.title}</h2>
                                    {currentLesson?.description && (
                                        <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-2xl">
                                            {currentLesson.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={goPrev}
                                        disabled={currentIndex === 0}
                                        className="w-10 h-10 rounded-lg bg-[#1e1e1e] text-slate-400 flex items-center justify-center hover:bg-[#282828] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <FiChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={goNext}
                                        disabled={currentIndex === allLessons.length - 1}
                                        className="w-10 h-10 rounded-lg bg-[#e0941c] text-white flex items-center justify-center hover:bg-[#e0941c] disabled:opacity-30 disabled:cursor-not-allowed transition"
                                    >
                                        <FiChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Lesson Counter */}
                            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <FiPlay size={11} /> Lesson {currentIndex + 1} of {allLessons.length}
                                </span>
                                {currentLesson?.videoDuration && (
                                    <span className="flex items-center gap-1.5">
                                        <FiClock size={11} /> {Math.round(currentLesson.videoDuration / 60)} min
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Tabs: Overview / Materials */}
                        <div className="px-5 lg:px-8 border-b border-[#1e1e1e]">
                            <div className="flex gap-0">
                                {['Overview', 'Materials'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab.toLowerCase())}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.toLowerCase()
                                            ? 'text-[#e0a53a] border-[#F3A522]'
                                            : 'text-slate-500 border-transparent hover:text-slate-300'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="px-5 lg:px-8 py-5">
                            {activeTab === 'overview' && (
                                <div className="max-w-3xl">
                                    <h3 className="text-white font-semibold mb-3">About this lesson</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        {currentLesson?.description || 'No description available for this lesson.'}
                                    </p>
                                </div>
                            )}
                            {activeTab === 'materials' && (
                                <div>
                                    {(currentLesson?.materials?.length > 0) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                                            {currentLesson.materials.map((mat, idx) => (
                                                <a
                                                    key={idx}
                                                    href={mat.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-4 bg-[#1e1e1e] rounded-xl hover:bg-[#282828] transition group"
                                                >
                                                    <div className="w-10 h-10 bg-[#282828] rounded-lg flex items-center justify-center group-hover:bg-[#F3A522]/20 transition">
                                                        <FiFileText className="text-slate-400 group-hover:text-[#e0a53a]" size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-slate-300 truncate font-medium">{mat.title}</p>
                                                        <p className="text-xs text-slate-500 uppercase">{mat.fileType}</p>
                                                    </div>
                                                    <FiDownload className="text-slate-600 group-hover:text-[#e0a53a]" size={14} />
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No materials available for this lesson.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* ═══════ Sidebar — Course Content ═══════ */}
                <aside className={`${sidebarOpen ? 'w-[360px]' : 'w-0'} bg-[#181818] border-l border-[#282828] flex-shrink-0 overflow-hidden transition-all duration-300 flex flex-col fixed lg:relative right-0 top-0 h-full z-20`}>
                    {/* Sidebar Header */}
                    <div className="h-14 px-4 flex items-center justify-between border-b border-[#282828] flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <FiBook size={15} className="text-[#F3A522]" />
                            <h3 className="text-white font-semibold text-sm">Course Content</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-medium">
                                {completedCount}/{allLessons.length}
                            </span>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#282828]"
                            >
                                <FiX size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Module/Lesson List */}
                    <div className="flex-1 overflow-y-auto course-sidebar-scroll">
                        {groupedByModule.map((mod, modIdx) => {
                            const modLessons = mod.lessons || [];
                            const modCompleted = modLessons.filter(l => lessonProgress[l._id]?.isCompleted).length;

                            return (
                                <div key={mod._id} className="border-b border-[#222]">
                                    {/* Module Header */}
                                    <button
                                        onClick={() => setExpandedModules(prev => ({ ...prev, [mod._id]: !prev[mod._id] }))}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#1e1e1e] transition text-left group"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                                                    {String(modIdx + 1).padStart(2, '0')}
                                                </span>
                                                <p className="text-[13px] text-slate-200 font-semibold truncate">
                                                    {mod.title?.replace(/Module \d+:\s*/, '')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 ml-7">
                                                <span className="text-[11px] text-slate-500">{modLessons.length} lessons</span>
                                                {modCompleted > 0 && (
                                                    <>
                                                        <span className="text-[11px] text-slate-600">·</span>
                                                        <span className="text-[11px] text-[#F3A522] font-medium">{modCompleted} done</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {expandedModules[mod._id] ? (
                                            <FiChevronUp className="text-slate-500" size={14} />
                                        ) : (
                                            <FiChevronDown className="text-slate-500" size={14} />
                                        )}
                                    </button>

                                    {/* Lessons */}
                                    {expandedModules[mod._id] && (
                                        <div className="bg-[#141414]">
                                            {modLessons.map((lesson, lesIdx) => {
                                                const isActive = currentLesson?._id === lesson._id;
                                                const progress = lessonProgress[lesson._id];
                                                const isCompleted = progress?.isCompleted;

                                                return (
                                                    <button
                                                        key={lesson._id}
                                                        onClick={() => { goToLesson(lesson); setSidebarOpen(window.innerWidth >= 1024); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all group
                                                            ${isActive
                                                                ? 'bg-[#F3A522]/10 border-l-[3px] border-[#F3A522]'
                                                                : 'hover:bg-[#1a1a1a] border-l-[3px] border-transparent'
                                                            }`}
                                                    >
                                                        {/* Status Icon */}
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition
                                                            ${isCompleted
                                                                ? 'bg-[#F3A522]/20 text-[#e0a53a]'
                                                                : isActive
                                                                    ? 'bg-[#F3A522] text-white'
                                                                    : 'bg-[#222] text-slate-500 group-hover:bg-[#2a2a2a]'
                                                            }`}>
                                                            {isCompleted ? <FiCheck size={13} /> : isActive ? <FiPlay size={11} /> : lesIdx + 1}
                                                        </div>

                                                        {/* Lesson Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-[13px] truncate ${isActive ? 'text-white font-semibold' : isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>
                                                                {lesson.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <FiVideo size={10} className="text-slate-600" />
                                                                <span className="text-[11px] text-slate-600">
                                                                    {lesson.videoDuration ? `${Math.round(lesson.videoDuration / 60)} min` : 'Video'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Progress */}
                                                        {isCompleted && (
                                                            <FiCheckCircle size={14} className="text-[#F3A522] flex-shrink-0" />
                                                        )}
                                                        {progress && !isCompleted && progress.watchedPercent > 0 && (
                                                            <div className="w-6 h-6 relative flex-shrink-0">
                                                                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                                                                    <circle cx="12" cy="12" r="10" fill="none" stroke="#333" strokeWidth="2" />
                                                                    <circle cx="12" cy="12" r="10" fill="none" stroke="#d88f13" strokeWidth="2"
                                                                        strokeDasharray={`${progress.watchedPercent * 0.628} 62.8`}
                                                                        strokeLinecap="round" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 lg:hidden z-10"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </div>

            <style jsx global>{`
                .course-sidebar-scroll::-webkit-scrollbar { width: 4px; }
                .course-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
                .course-sidebar-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
                .course-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #444; }
            `}</style>
        </div>
    );
}

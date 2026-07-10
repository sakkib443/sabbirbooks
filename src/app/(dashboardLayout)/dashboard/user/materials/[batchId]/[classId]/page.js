'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiArrowLeft, FiCalendar, FiClock, FiVideo,
  FiFileText, FiLink, FiMapPin, FiUser, FiPlay, FiX,
  FiMaximize2, FiMinimize2, FiDownload, FiExternalLink,
  FiHash, FiFolder, FiBookOpen,
} from 'react-icons/fi';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

/* ─── URL helpers ─── */
const getDriveEmbedUrl = (url) => {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`;
  return null;
};
const getYouTubeEmbedUrl = (url) => {
  let videoId = null;
  const m1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m1) videoId = m1[1];
  const m2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m2) videoId = m2[1];
  const m3 = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (m3) videoId = m3[1];
  if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  return null;
};
const getContentType = (url) => {
  if (!url) return 'unknown';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('drive.google.com')) return 'gdrive';
  if (lower.endsWith('.pdf') || lower.includes('.pdf?')) return 'pdf';
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg')) return 'video';
  if (lower.endsWith('.mp3') || lower.endsWith('.wav')) return 'audio';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp')) return 'image';
  if (lower.includes('cloudinary') && (lower.includes('/video/') || lower.includes('.mp4'))) return 'video';
  if (lower.includes('cloudinary') && lower.includes('.pdf')) return 'pdf';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return 'link';
};
const getEmbedUrl = (url) => {
  const t = getContentType(url);
  if (t === 'youtube') return getYouTubeEmbedUrl(url);
  if (t === 'gdrive') return getDriveEmbedUrl(url);
  if (t === 'vimeo') {
    const m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
  }
  return url;
};
const getFileLabel = (url) => {
  const t = getContentType(url);
  return { youtube: 'YouTube', gdrive: 'Google Drive', pdf: 'PDF', video: 'Video', vimeo: 'Vimeo', image: 'Image', audio: 'Audio', link: 'Link' }[t] || 'File';
};

/**
 * Build a URL that will reliably render a PDF inside an <iframe>.
 *
 * - If the URL already has a `.pdf` extension, use it directly.
 * - Cloudinary raw uploads strip the extension but still serve PDF
 *   bytes; appending `.pdf` to the raw URL makes the browser treat it
 *   as a PDF.
 * - For everything else, fall back to Google Docs Viewer, which can
 *   render any public PDF URL.
 */
const getPdfRenderUrl = (url) => {
  if (!url) return url;
  const lower = url.toLowerCase();
  if (lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('.pdf#')) return url;
  if (lower.includes('res.cloudinary.com') && lower.includes('/raw/upload/')) return url + '.pdf';
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
};

// Extract the class number from a title like "Class 03" -> "03".
// Falls back to position-based numbering if title has no digits.
const classNumberFrom = (title, fallbackIdx) => {
  if (title) {
    const m = String(title).match(/(\d+)/);
    if (m) return m[1].padStart(2, '0');
  }
  return String((fallbackIdx ?? 0) + 1).padStart(2, '0');
};

export default function ClassDetailPage({ params }) {
  const { batchId, classId } = use(params);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [course, setCourse] = useState(null);
  const [classData, setClassData] = useState(null);
  const [classes, setClasses] = useState([]); // for sibling nav

  const [viewer, setViewer] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => { load(); }, [batchId, classId]);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';

      // Verify enrollment + get batch/course
      const enrollRes = await fetch(`${API}/enrollments/my-enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const enrollData = await enrollRes.json();
      const enrollment = (enrollData.data || []).find(e => {
        const id = typeof e.batchId === 'object' ? e.batchId?._id : e.batchId;
        return id === batchId;
      });

      if (enrollment) {
        setBatch(typeof enrollment.batchId === 'object' ? enrollment.batchId : null);
        setCourse(typeof enrollment.courseId === 'object' ? enrollment.courseId : null);
      }

      // Fetch all classes in batch (so we can do prev/next and find this one)
      const classRes = await fetch(
        `${API}/classes/student/schedule?batchIds=${batchId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cData = await classRes.json();
      const all = cData.success ? cData.data || [] : [];
      all.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      setClasses(all);
      setClassData(all.find(c => c._id === classId) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openViewer = (url, title, hint) => {
    // Prefer explicit hint (eg. material.fileType === 'pdf') over URL sniffing
    let type = getContentType(url);
    if (hint) {
      const h = String(hint).toLowerCase();
      if (h === 'pdf') type = 'pdf';
      else if (['video', 'mp4'].includes(h)) type = 'video';
      else if (['image', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(h)) type = 'image';
      else if (['audio', 'mp3', 'wav'].includes(h)) type = 'audio';
    }
    setViewer({ url, title, type });
    setIsFullscreen(false);
  };
  const closeViewer = () => { setViewer(null); setIsFullscreen(false); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-[#F3A522]" size={28} />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="space-y-4">
        <Link href={`/dashboard/user/materials/${batchId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#c9871a]">
          <FiArrowLeft size={14} /> Back to class folders
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FiFolder className="mx-auto text-slate-300 mb-3" size={32} />
          <h3 className="text-base font-bold text-slate-700">Class not found</h3>
          <p className="text-sm text-slate-500 mt-1">This class may have been removed or you don&apos;t have access.</p>
        </div>
      </div>
    );
  }

  const recs = classData.recordings?.length > 0
    ? classData.recordings
    : (classData.recordingUrl ? [{ title: 'Recording', url: classData.recordingUrl }] : []);
  const mats = classData.materials || [];

  const idx = classes.findIndex(c => c._id === classId);
  const prevClass = idx > 0 ? classes[idx - 1] : null;
  const nextClass = idx >= 0 && idx < classes.length - 1 ? classes[idx + 1] : null;

  const classDate = classData.date ? new Date(classData.date) : null;
  const isCompleted = classData.status === 'completed';
  const isOngoing = classData.status === 'ongoing';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
        <Link href="/dashboard/user/materials" className="hover:text-[#c9871a] transition">All Courses</Link>
        <span className="text-slate-300">/</span>
        <Link href={`/dashboard/user/materials/${batchId}`} className="hover:text-[#c9871a] transition truncate max-w-[200px]">
          {course?.title || 'Course'}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-semibold truncate max-w-[200px]">{classData.title}</span>
      </div>

      {/* Top Prev/Next class navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {prevClass ? (
          <Link href={`/dashboard/user/materials/${batchId}/${prevClass._id}`}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#F0DFB4] hover:bg-[#FEF6E7]/50 transition text-sm group max-w-[45%]">
            <FiArrowLeft size={14} className="text-slate-400 group-hover:text-[#c9871a] group-hover:-translate-x-1 transition flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Previous Class</p>
              <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-[#a5680f]">
                <span className="text-[#c9871a] font-mono mr-1">{classNumberFrom(prevClass.title, classes.indexOf(prevClass))}</span>
                {prevClass.title}
              </p>
            </div>
          </Link>
        ) : (
          <span className="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 max-w-[45%]">
            ◁ No previous class
          </span>
        )}
        <span className="text-[11px] text-slate-400 font-semibold tabular-nums hidden sm:inline">
          {idx >= 0 ? idx + 1 : 1} / {classes.length}
        </span>
        {nextClass ? (
          <Link href={`/dashboard/user/materials/${batchId}/${nextClass._id}`}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#F0DFB4] hover:bg-[#FEF6E7]/50 transition text-sm group max-w-[45%]">
            <div className="text-right min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Next Class</p>
              <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-[#a5680f]">
                <span className="text-[#c9871a] font-mono mr-1">{classNumberFrom(nextClass.title, classes.indexOf(nextClass))}</span>
                {nextClass.title}
              </p>
            </div>
            <FiArrowLeft size={14} className="text-slate-400 group-hover:text-[#c9871a] rotate-180 group-hover:translate-x-1 transition flex-shrink-0" />
          </Link>
        ) : (
          <span className="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 max-w-[45%]">
            No next class ▷
          </span>
        )}
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4 flex-wrap">
          {/* Class number badge */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md flex-shrink-0 ${
            isCompleted ? 'bg-gradient-to-br from-[#F3A522] to-[#d88f13]'
            : isOngoing ? 'bg-gradient-to-br from-amber-500 to-orange-600'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            {classNumberFrom(classData.title, idx)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF6E7] text-[#a5680f] text-[11px] font-mono font-bold border border-[#F0DFB4]">
                <FiHash size={10} /> {batch?.id}
              </span>
              {classData.status && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : isOngoing ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                  {classData.status}
                </span>
              )}
              {classData.type && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  classData.type === 'live' ? 'bg-red-50 text-red-600 border border-red-200'
                  : classData.type === 'offline' ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-violet-50 text-violet-600 border border-violet-200'
                }`}>
                  {classData.type === 'live' ? '🔴 Live' : classData.type === 'offline' ? '📍 Offline' : '📹 Recorded'}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{classData.title}</h1>
            {classData.topic && (
              <p className="text-sm text-slate-600 mt-1">{classData.topic}</p>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 bg-slate-50/40">
          {classDate && (
            <span className="flex items-center gap-1.5">
              <FiCalendar size={12} className="text-blue-500" />
              {classDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          )}
          {(classData.startTime || classData.endTime) && (
            <span className="flex items-center gap-1.5">
              <FiClock size={12} className="text-amber-500" />
              {classData.startTime}{classData.endTime ? ` - ${classData.endTime}` : ''}
            </span>
          )}
          {classData.mentorId?.firstName && (
            <span className="flex items-center gap-1.5">
              <FiUser size={12} className="text-violet-500" />
              {classData.mentorId.firstName} {classData.mentorId.lastName || ''}
            </span>
          )}
          {course?.title && (
            <span className="flex items-center gap-1.5">
              <FiBookOpen size={12} className="text-emerald-500" />
              {course.title}
            </span>
          )}
        </div>
      </div>

      {/* Meeting link + venue (banner) */}
      {(classData.meetingLink || classData.venue) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {classData.meetingLink && (
            <a href={classData.meetingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-200/60 hover:border-blue-400 hover:shadow-md transition group">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FiLink size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">
                  {classData.meetingPlatform === 'zoom' ? 'Zoom' : classData.meetingPlatform === 'meet' ? 'Google Meet' : classData.meetingPlatform === 'teams' ? 'MS Teams' : 'Meeting'} Link
                </p>
                <p className="text-[11px] text-slate-400 truncate">{classData.meetingLink}</p>
              </div>
              <FiExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 transition" />
            </a>
          )}
          {classData.venue && (
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200/60">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <FiMapPin size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Venue</p>
                <p className="text-xs text-slate-500">{classData.venue}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recordings ── */}
      {recs.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FiVideo className="text-blue-500" size={16} />
            Class Recordings <span className="text-xs text-slate-400 font-medium">({recs.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map((r, i) => (
              <button key={i} onClick={() => openViewer(r.url, r.title || `Recording ${i + 1}`)}
                className="text-left bg-white rounded-xl border border-blue-200/60 hover:border-blue-400 hover:shadow-md transition group overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-blue-500 to-indigo-700 relative flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <FiPlay size={20} className="text-blue-600 ml-1" />
                  </div>
                  <span className="absolute bottom-2 right-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/40 text-white backdrop-blur-sm">
                    {getFileLabel(r.url)}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition truncate">
                    {r.title || `Recording ${i + 1}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click to watch</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Materials ── */}
      {mats.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FiFileText className="text-emerald-500" size={16} />
            Materials &amp; Documents <span className="text-xs text-slate-400 font-medium">({mats.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mats.map((m, i) => {
              const t = getContentType(m.fileUrl);
              const iconBg = t === 'pdf' ? 'bg-red-50 text-red-600'
                : ['youtube','gdrive','video','vimeo'].includes(t) ? 'bg-blue-50 text-blue-600'
                : t === 'image' ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-50 text-slate-500';
              return (
                <button key={i} onClick={() => openViewer(m.fileUrl, m.title || `Material ${i + 1}`, m.fileType)}
                  className="text-left bg-white rounded-xl border border-slate-200/60 hover:border-[#F0DFB4] hover:shadow-md transition group p-4 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <FiFileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 group-hover:text-[#c9871a] transition truncate">
                      {m.title || `Material ${i + 1}`}
                    </p>
                    <p className="text-[11px] text-slate-400">{getFileLabel(m.fileUrl)} • Open</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Notes ── */}
      {classData.notes && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            📝 Notes / Instructions
          </h2>
          <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{classData.notes}</p>
          </div>
        </section>
      )}

      {/* No content */}
      {recs.length === 0 && mats.length === 0 && !classData.meetingLink && !classData.venue && !classData.notes && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <FiFolder className="text-slate-300" size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-600">Nothing here yet</p>
          <p className="text-xs text-slate-400 mt-1">Your mentor will add recordings &amp; materials after class.</p>
        </div>
      )}

      {/* Prev / Next nav */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        {prevClass ? (
          <Link href={`/dashboard/user/materials/${batchId}/${prevClass._id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#F0DFB4] hover:bg-[#FEF6E7]/50 transition text-sm group">
            <FiArrowLeft size={14} className="text-slate-400 group-hover:text-[#c9871a] group-hover:-translate-x-1 transition" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Previous</p>
              <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{prevClass.title}</p>
            </div>
          </Link>
        ) : <span />}
        {nextClass ? (
          <Link href={`/dashboard/user/materials/${batchId}/${nextClass._id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#F0DFB4] hover:bg-[#FEF6E7]/50 transition text-sm group ml-auto">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Next</p>
              <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{nextClass.title}</p>
            </div>
            <FiArrowLeft size={14} className="text-slate-400 group-hover:text-[#c9871a] rotate-180 group-hover:translate-x-1 transition" />
          </Link>
        ) : <span className="ml-auto" />}
      </div>

      {/* ═══ INLINE VIEWER MODAL ═══ */}
      {viewer && (() => {
        const { url, title, type } = viewer;
        const embedUrl = getEmbedUrl(url);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeViewer(); }}>
            <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
              isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl max-h-[92vh]'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ['youtube','gdrive','video','vimeo'].includes(type) ? 'bg-blue-50' : type === 'pdf' ? 'bg-red-50' : 'bg-slate-50'
                  }`}>
                    {['youtube','gdrive','video','vimeo'].includes(type)
                      ? <FiVideo size={16} className="text-blue-500" />
                      : <FiFileText size={16} className="text-slate-500" />
                    }
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>
                    <p className="text-[11px] text-slate-400">{getFileLabel(url)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a href={url} download target="_blank" rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-[#c9871a] hover:bg-[#FEF6E7] rounded-lg transition"
                    onClick={(e) => e.stopPropagation()}>
                    <FiDownload size={13} /> Open
                  </a>
                  <button onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600">
                    {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                  </button>
                  <button onClick={closeViewer}
                    className="p-2 hover:bg-rose-50 rounded-lg transition text-slate-400 hover:text-rose-500">
                    <FiX size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 bg-slate-900 relative overflow-hidden" style={{ minHeight: isFullscreen ? 'calc(100vh - 60px)' : '65vh' }}>
                {['youtube', 'gdrive', 'vimeo'].includes(type) && (
                  <iframe src={embedUrl} className="w-full h-full absolute inset-0" frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen title={title} />
                )}
                {type === 'video' && (
                  <video src={url} controls controlsList="nodownload noremoteplayback" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} autoPlay className="w-full h-full absolute inset-0 object-contain bg-black" title={title} />
                )}
                {type === 'audio' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-4">
                    <FiPlay size={48} className="text-blue-400" />
                    <audio src={url} controls autoPlay className="w-full max-w-md" />
                  </div>
                )}
                {type === 'pdf' && (
                  <iframe
                    src={getPdfRenderUrl(url)}
                    className="w-full h-full absolute inset-0 bg-white"
                    frameBorder="0"
                    title={title}
                  />
                )}
                {type === 'image' && (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img src={url} alt={title} className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                )}
                {(type === 'link' || type === 'unknown') && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                    <FiLink size={32} className="text-slate-400" />
                    <p className="text-white/90 text-base font-bold">{title}</p>
                    <p className="text-white/50 text-sm text-center max-w-md">
                      Trying inline preview — if it doesn&apos;t load, use Open above.
                    </p>
                    <iframe src={url} className="w-full flex-1 rounded-xl border border-slate-700 mt-2" frameBorder="0"
                      title={title} sandbox="allow-same-origin allow-scripts allow-popups" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

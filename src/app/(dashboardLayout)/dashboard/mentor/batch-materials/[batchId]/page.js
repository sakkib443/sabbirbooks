'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiEdit3, FiVideo, FiLink, FiFileText, FiTrash2, FiLoader,
  FiClock, FiSave, FiX, FiExternalLink, FiUpload, FiSend, FiCheck,
  FiArrowLeft, FiFolder, FiCalendar, FiMapPin,
  FiPlay, FiEye, FiMaximize2, FiMinimize2, FiDownload,
} from 'react-icons/fi';

/* ─── URL helpers for inline embedding ─── */
const getDriveEmbedUrl = (url) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2) return `https://drive.google.com/file/d/${match2[1]}/preview`;
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
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp')) return 'image';
  if (lower.includes('cloudinary') && lower.includes('/video/')) return 'video';
  if (lower.includes('cloudinary') && lower.includes('.pdf')) return 'pdf';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return 'link';
};

const getEmbedUrl = (url) => {
  const type = getContentType(url);
  if (type === 'youtube') return getYouTubeEmbedUrl(url);
  if (type === 'gdrive') return getDriveEmbedUrl(url);
  if (type === 'vimeo') {
    const m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
  }
  return url;
};

const getFileTypeLabel = (url) => {
  const type = getContentType(url);
  const map = { youtube: 'YouTube', gdrive: 'Google Drive', pdf: 'PDF', video: 'Video', vimeo: 'Vimeo', image: 'Image', link: 'Link' };
  return map[type] || 'File';
};

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

export default function BatchMaterialDetailPage({ params }) {
  const { batchId } = use(params);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedClass, setExpandedClass] = useState(null);
  const [error, setError] = useState('');
  // Inline viewer
  const [viewer, setViewer] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const openViewer = (url, title) => {
    setViewer({ url, title, type: getContentType(url) });
    setIsFullscreen(false);
  };
  const closeViewer = () => { setViewer(null); setIsFullscreen(false); };

  // Full form state with all fields
  const defaultForm = {
    title: '', topic: '', date: '', startTime: '20:00', endTime: '22:00',
    type: 'live', meetingLink: '', meetingPlatform: 'zoom',
    venue: '', notes: '',
    recordings: [], // [{title, url}]
    materials: [],  // [{title, fileUrl, fileType}]
  };
  const [form, setForm] = useState(defaultForm);
  const [newMaterial, setNewMaterial] = useState({ title: '', fileUrl: '', fileType: 'pdf' });
  const [newRecording, setNewRecording] = useState({ title: '', url: '' });
  const [uploading, setUploading] = useState(false);

  // Normalize: if a class only has legacy recordingUrl, build recordings[] from it
  const normalizeRecordings = (cls) => {
    if (Array.isArray(cls.recordings) && cls.recordings.length > 0) return cls.recordings;
    if (cls.recordingUrl) return [{ title: 'Recording', url: cls.recordingUrl }];
    return [];
  };

  const addRecordingToForm = () => {
    const url = newRecording.url.trim();
    if (!url) return;
    setForm(prev => ({
      ...prev,
      recordings: [...prev.recordings, { title: (newRecording.title || `Recording ${prev.recordings.length + 1}`).trim(), url }],
    }));
    setNewRecording({ title: '', url: '' });
  };

  const removeRecordingFromForm = (idx) => {
    setForm(prev => ({ ...prev, recordings: prev.recordings.filter((_, i) => i !== idx) }));
  };

  useEffect(() => { fetchData(); }, [batchId]);

  const fetchData = async () => {
    try {
      const headers = getHeaders();
      const [batchRes, classRes] = await Promise.all([
        fetch(`${API}/batches/my-batches`, { headers }).then(r => r.json()),
        fetch(`${API}/classes/batch/${batchId}`, { headers }).then(r => r.json()),
      ]);
      const found = (batchRes.data || []).find(b => b._id === batchId);
      setBatch(found || null);
      setClasses(classRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    const nextNum = classes.length + 1;
    setForm({
      ...defaultForm,
      title: `Class ${String(nextNum).padStart(2, '0')}`,
      startTime: batch?.classTime?.split(' - ')[0]?.replace(/\s?(AM|PM)/i, '')?.trim() || '20:00',
      endTime: batch?.classTime?.split(' - ')[1]?.replace(/\s?(AM|PM)/i, '')?.trim() || '22:00',
    });
    setEditingClass(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (cls) => {
    setForm({
      title: cls.title || '', topic: cls.topic || '',
      date: cls.date ? new Date(cls.date).toISOString().split('T')[0] : '',
      startTime: cls.startTime || '20:00', endTime: cls.endTime || '22:00',
      type: cls.type || 'live', meetingLink: cls.meetingLink || '',
      meetingPlatform: cls.meetingPlatform || 'zoom',
      venue: cls.venue || '', notes: cls.notes || '',
      recordings: normalizeRecordings(cls),
      materials: cls.materials || [],
    });
    setNewRecording({ title: '', url: '' });
    setNewMaterial({ title: '', fileUrl: '', fileType: 'pdf' });
    setEditingClass(cls);
    setError('');
    setShowModal(true);
  };

  // Add material to form (inline)
  const addMaterialToForm = () => {
    if (!newMaterial.title || !newMaterial.fileUrl) return;
    setForm({ ...form, materials: [...form.materials, { ...newMaterial }] });
    setNewMaterial({ title: '', fileUrl: '', fileType: 'pdf' });
  };

  const removeMaterialFromForm = (idx) => {
    const arr = [...form.materials];
    arr.splice(idx, 1);
    setForm({ ...form, materials: arr });
  };

  // Upload file to Cloudinary
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/classes/upload-material`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const mat = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileUrl: data.data.fileUrl,
          fileType: data.data.fileType || 'pdf',
        };
        setForm(prev => ({ ...prev, materials: [...prev.materials, mat] }));
      } else {
        alert('Upload failed: ' + (data.message || 'Error'));
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    }
    setUploading(false);
    e.target.value = ''; // reset input
  };

  const handleSave = async () => {
    if (!form.title || !form.topic || !form.date) {
      setError('Title, Topic এবং Date আবশ্যক');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const headers = getHeaders();
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      // Build body — courseId from batch
      const courseId = batch?.courseId?._id || batch?.courseId || '';

      // Auto-flush: if user typed a recording URL but forgot to click "Add"
      let recordings = [...form.recordings];
      const pendingUrl = newRecording.url.trim();
      if (pendingUrl) {
        recordings.push({
          title: (newRecording.title || `Recording ${recordings.length + 1}`).trim(),
          url: pendingUrl,
        });
      }

      // Same for materials
      let materials = [...form.materials];
      if (newMaterial.title.trim() && newMaterial.fileUrl.trim()) {
        materials.push({ ...newMaterial });
      }

      // Common editable fields
      const common = {
        title: form.title,
        topic: form.topic,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        meetingLink: form.meetingLink || '',
        meetingPlatform: form.meetingPlatform || 'zoom',
        venue: form.venue || '',
        notes: form.notes || '',
        recordings,
        // legacy single-URL field — keep for back-compat readers
        recordingUrl: recordings[0]?.url || '',
        materials,
      };

      let res, data;
      try {
        if (editingClass?._id) {
          // PATCH — only send editable fields; never overwrite ownership/parent refs
          res = await fetch(`${API}/classes/${editingClass._id}`, {
            method: 'PATCH', headers, body: JSON.stringify(common),
          });
        } else {
          // POST — include batch / course / mentor for new records
          res = await fetch(`${API}/classes`, {
            method: 'POST', headers,
            body: JSON.stringify({
              ...common,
              batchId: batchId,
              courseId: courseId,
              mentorId: user._id,
            }),
          });
        }
        data = await res.json();
      } catch (netErr) {
        console.error('Save network error:', netErr);
        setError('Network error — check your connection and try again.');
        setSaving(false);
        return;
      }

      if (!res.ok || !data?.success) {
        console.error('Save failed:', { status: res?.status, data });
        setError(data?.message || `Save failed (HTTP ${res?.status || '?'})`);
        setSaving(false);
        return;
      }

      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError('Unexpected error: ' + (err?.message || 'try again'));
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this class folder?')) return;
    await fetch(`${API}/classes/${id}`, { method: 'DELETE', headers: getHeaders() });
    fetchData();
  };

  // Quick actions on existing classes (outside modal)
  const handleQuickAddMaterial = async (classId) => {
    const title = prompt('Material Title:');
    if (!title) return;
    const fileUrl = prompt('File/Link URL:');
    if (!fileUrl) return;
    const fileType = prompt('Type (pdf/ppt/doc/zip/link/video):', 'pdf') || 'pdf';
    await fetch(`${API}/classes/${classId}/material`, {
      method: 'POST', headers: getHeaders(),
      body: JSON.stringify({ title, fileUrl, fileType }),
    });
    fetchData();
  };

  const handleRemoveMaterial = async (classId, idx) => {
    if (!confirm('Remove this material?')) return;
    await fetch(`${API}/classes/${classId}/material/${idx}`, { method: 'DELETE', headers: getHeaders() });
    fetchData();
  };

  const handleSendToStudents = async (classId) => {
    if (!confirm('এই ক্লাসের মেটেরিয়াল সব enrolled students-কে পাঠাবেন? তারা নোটিফিকেশন পাবে।')) return;
    try {
      const res = await fetch(`${API}/classes/${classId}/send-to-students`, {
        method: 'PATCH', headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Students-দের কাছে পাঠানো হয়েছে!');
        fetchData();
      } else {
        alert('❌ ' + (data.message || 'Failed'));
      }
    } catch (err) { alert('❌ Error'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-teal-500" size={28} /></div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/mentor/batch-materials"
            className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 outfit">{batch?.name || batch?.courseName || 'Batch'}</h1>
              <code className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{batch?.id}</code>
            </div>
            <p className="text-sm text-slate-500">{batch?.courseId?.title || batch?.courseName} • {classes.length} class folders</p>
          </div>
        </div>
        <Link href={`/dashboard/mentor/batch-materials/${batchId}/create`}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-white rounded-lg text-sm font-semibold hover:bg-teal-600 transition shadow-sm shadow-teal-500/20">
          <FiPlus size={14} /> Create Class Folder
        </Link>
      </div>

      {/* Batch Info */}
      {batch && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-6 text-sm text-slate-600">
          <span className="flex items-center gap-1.5"><FiCalendar size={13} className="text-blue-500" />
            {batch.startDate ? new Date(batch.startDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
            → {batch.endDate ? new Date(batch.endDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
          </span>
          {batch.classTime && <span className="flex items-center gap-1.5"><FiClock size={13} className="text-amber-500" /> {batch.classTime}</span>}
          {batch.classDays?.length > 0 && (
            <div className="flex gap-1">
              {batch.classDays.map(d => <span key={d} className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{d.slice(0,3)}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Class Folders List */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiFolder className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700 mb-1">No Class Folders Yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first class folder to add materials, links & recordings.</p>
          <Link href={`/dashboard/mentor/batch-materials/${batchId}/create`} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600 transition">
            <FiPlus className="inline mr-1" /> Create Class Folder
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls, idx) => {
            const isExpanded = expandedClass === cls._id;
            return (
              <div key={cls._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition">
                {/* Folder Header */}
                <button onClick={() => setExpandedClass(isExpanded ? null : cls._id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                      cls.status === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                      cls.status === 'scheduled' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' :
                      'bg-gradient-to-br from-amber-500 to-orange-600'
                    }`}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{cls.title}</h3>
                        {cls.sentToStudents && (
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                            <FiCheck size={9} /> Sent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{cls.topic}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-medium text-slate-600">
                        {cls.date ? new Date(cls.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—'}
                      </p>
                      <p className="text-[10px] text-slate-400">{cls.startTime} - {cls.endTime}</p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      {cls.meetingLink && <FiLink size={12} className="text-blue-500" />}
                      {((cls.recordings?.length > 0) || cls.recordingUrl) && (
                        <span className="inline-flex items-center gap-0.5 text-violet-500">
                          <FiVideo size={12} />
                          {cls.recordings?.length > 1 && <span className="text-[10px] font-bold">{cls.recordings.length}</span>}
                        </span>
                      )}
                      {cls.materials?.length > 0 && <span className="text-[10px] font-bold bg-teal-50 text-teal-600 px-1.5 rounded">{cls.materials.length}</span>}
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/30">
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><FiCalendar size={11} className="text-blue-500" />
                        {cls.date ? new Date(cls.date).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : '—'}
                      </span>
                      <span className="flex items-center gap-1"><FiClock size={11} className="text-amber-500" /> {cls.startTime} - {cls.endTime}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cls.type === 'live' ? 'bg-red-50 text-red-600' : cls.type === 'offline' ? 'bg-slate-100 text-slate-600' : 'bg-violet-50 text-violet-600'
                      }`}>{cls.type === 'live' ? '🔴 Live' : cls.type === 'offline' ? '📍 Offline' : '📹 Recorded'}</span>
                    </div>

                    {cls.meetingLink && (
                      <a href={cls.meetingLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition border border-blue-200">
                        <FiLink size={11} /> {cls.meetingPlatform || 'Meeting'} Link <FiExternalLink size={10} />
                      </a>
                    )}

                    {cls.venue && <p className="text-xs text-slate-600 flex items-center gap-1.5"><FiMapPin size={12} /> {cls.venue}</p>}

                    {(() => {
                      const recs = Array.isArray(cls.recordings) && cls.recordings.length > 0
                        ? cls.recordings
                        : (cls.recordingUrl ? [{ title: 'Recording', url: cls.recordingUrl }] : []);
                      if (recs.length === 0) return null;
                      return (
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recordings ({recs.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {recs.map((r, i) => (
                              <button key={i} onClick={() => openViewer(r.url, `${cls.title} — ${r.title || 'Recording'}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-100 transition border border-violet-200 cursor-pointer">
                                <FiPlay size={11} /> {r.title || `Recording ${i + 1}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {cls.notes && (
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notes / Instructions</p>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{cls.notes}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Materials ({cls.materials?.length || 0})</p>
                      {cls.materials?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {cls.materials.map((m, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 group hover:border-teal-300 transition">
                              <FiFileText size={12} className="text-teal-500" />
                              <button onClick={() => openViewer(m.fileUrl, m.title)} className="text-xs text-slate-700 font-medium hover:text-teal-600 cursor-pointer">{m.title}</button>
                              <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">{m.fileType}</span>
                              <button onClick={() => openViewer(m.fileUrl, m.title)}
                                className="text-blue-400 hover:text-blue-600 transition" title="Preview"><FiEye size={11} /></button>
                              <button onClick={() => handleRemoveMaterial(cls._id, i)}
                                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition"><FiTrash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-slate-400 italic">No materials added yet.</p>}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                      <button onClick={() => openEdit(cls)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                        <FiEdit3 size={12} /> Edit
                      </button>
                      <button onClick={() => handleQuickAddMaterial(cls._id)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition">
                        <FiFileText size={12} /> Quick Add Material
                      </button>
                      {!cls.sentToStudents ? (
                        <button onClick={() => handleSendToStudents(cls._id)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg text-xs font-bold hover:shadow-md transition shadow-sm">
                          <FiSend size={12} /> Send to Students
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
                          <FiCheck size={12} /> Sent {cls.sentAt ? new Date(cls.sentAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : ''}
                        </span>
                      )}
                      <button onClick={() => handleDelete(cls._id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-50 transition ml-auto">
                        <FiTrash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ CREATE / EDIT MODAL — ALL FIELDS ═══════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-800">
                {editingClass ? '✏️ Edit Class Folder' : '📁 Create Class Folder'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><FiX size={18} /></button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">❌ {error}</div>
              )}

              {/* Section 1: Basic Info */}
              <div>
                <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiFolder size={12} /> Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Class Title *</label>
                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Class 01 - Introduction" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Date *</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Topics / What will be taught *</label>
                  <textarea value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} rows={2}
                    placeholder="e.g. HTML Structure, CSS Selectors, Flexbox Layout, Responsive Design..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 resize-none" />
                </div>
              </div>

              {/* Section 2: Schedule */}
              <div>
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiClock size={12} /> Schedule & Type
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Start Time</label>
                    <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">End Time</label>
                    <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Class Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400">
                      <option value="live">🔴 Live Online</option>
                      <option value="offline">📍 Offline</option>
                      <option value="recorded">📹 Pre-Recorded</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Meeting & Venue */}
              <div>
                <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiLink size={12} /> Meeting Link & Venue (optional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Meeting / Zoom Link</label>
                    <input type="url" value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                      placeholder="https://zoom.us/j/..." className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Platform</label>
                    <select value={form.meetingPlatform} onChange={e => setForm({ ...form, meetingPlatform: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400">
                      <option value="zoom">Zoom</option>
                      <option value="meet">Google Meet</option>
                      <option value="teams">MS Teams</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Venue (for offline class)</label>
                  <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                    placeholder="Room 301, Aptech Learning HQ" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
                </div>
              </div>

              {/* Section 4: Recordings (multi) */}
              <div>
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiVideo size={12} /> Class Recordings (optional, multiple supported)
                </h4>

                {/* Existing recordings */}
                {form.recordings.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {form.recordings.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <FiVideo size={12} className="text-red-500 flex-shrink-0" />
                        <span className="text-xs text-slate-700 font-medium flex-1 truncate">{r.title}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[180px]" title={r.url}>{r.url}</span>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><FiExternalLink size={11} /></a>
                        <button onClick={() => removeRecordingFromForm(i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new recording */}
                <div className="bg-rose-50/30 border border-dashed border-rose-200 rounded-lg p-3">
                  <label className="text-[10px] font-bold text-rose-600 uppercase mb-2 block">Add recording link</label>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
                    <input type="text" value={newRecording.title}
                      onChange={e => setNewRecording({ ...newRecording, title: e.target.value })}
                      placeholder="Title (e.g. Part 1)"
                      className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-rose-400 bg-white" />
                    <input type="url" value={newRecording.url}
                      onChange={e => setNewRecording({ ...newRecording, url: e.target.value })}
                      placeholder="https://youtube.com/... or drive.google.com link"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecordingToForm(); } }}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-rose-400 bg-white" />
                    <button type="button" onClick={addRecordingToForm}
                      className="px-3 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition flex items-center justify-center gap-1">
                      <FiPlus size={12} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Materials */}
              <div>
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FiFileText size={12} /> Materials & Documents (optional)
                </h4>

                {/* Existing materials */}
                {form.materials.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {form.materials.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <FiFileText size={12} className="text-teal-500" />
                        <span className="text-xs text-slate-700 font-medium flex-1">{m.title}</span>
                        <span className="text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">{m.fileType}</span>
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><FiExternalLink size={11} /></a>
                        <button onClick={() => removeMaterialFromForm(i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={11} /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new material - Upload or Link */}
                <div className="bg-slate-50 rounded-lg border border-dashed border-slate-300 p-4 space-y-4">
                  {/* File Upload */}
                  <div>
                    <label className="text-[10px] font-bold text-teal-600 uppercase mb-2 block">📤 Upload File (PDF, PPT, DOC, ZIP)</label>
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${uploading ? 'border-amber-300 bg-amber-50' : 'border-teal-300 bg-white hover:bg-teal-50 hover:border-teal-400'}`}>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.xlsx" disabled={uploading} />
                      {uploading ? (
                        <><FiLoader className="animate-spin text-amber-500" size={16} /> <span className="text-xs font-medium text-amber-600">Uploading to Cloudinary...</span></>
                      ) : (
                        <><FiUpload size={16} className="text-teal-500" /> <span className="text-xs font-medium text-teal-700">Click to upload file</span></>
                      )}
                    </label>
                  </div>

                  {/* OR Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">or add by link</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Link-based add */}
                  <div>
                    <label className="text-[10px] font-bold text-blue-600 uppercase mb-2 block">🔗 Add Link (Google Drive, GitHub, etc.)</label>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" value={newMaterial.title} onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                        placeholder="Title (e.g. Slides)" className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-400 bg-white" />
                      <input type="url" value={newMaterial.fileUrl} onChange={e => setNewMaterial({ ...newMaterial, fileUrl: e.target.value })}
                        placeholder="URL (drive, github, etc)" className="px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-400 bg-white" />
                      <div className="flex gap-2">
                        <select value={newMaterial.fileType} onChange={e => setNewMaterial({ ...newMaterial, fileType: e.target.value })}
                          className="flex-1 px-2 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-400 bg-white">
                          <option value="pdf">PDF</option><option value="ppt">PPT</option><option value="doc">DOC</option>
                          <option value="zip">ZIP</option><option value="link">Link</option><option value="video">Video</option>
                        </select>
                        <button onClick={addMaterialToForm}
                          className="px-3 py-2 bg-teal-500 text-white rounded-lg text-xs font-bold hover:bg-teal-600 transition flex-shrink-0">
                          <FiPlus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: Notes */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  📝 Notes / Instructions (optional)
                </h4>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  placeholder="Prerequisites, homework, preparation, guidelines, additional instructions..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg text-sm font-bold hover:shadow-lg disabled:opacity-50 transition shadow-sm">
                {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                {editingClass ? 'Update Class Folder' : 'Create Class Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ INLINE VIEWER MODAL ═══ */}
      {viewer && (() => {
        const { url, title, type } = viewer;
        const embedUrl = getEmbedUrl(url);
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeViewer(); }}>
            <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
              isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl max-h-[90vh]'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ['youtube','gdrive','video','vimeo'].includes(type) ? 'bg-blue-50' : type === 'pdf' ? 'bg-red-50' : 'bg-slate-50'
                  }`}>
                    {['youtube','gdrive','video','vimeo'].includes(type)
                      ? <FiVideo size={16} className="text-blue-500" />
                      : type === 'pdf' ? <FiFileText size={16} className="text-red-500" />
                      : <FiFileText size={16} className="text-slate-500" />
                    }
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>
                    <p className="text-[11px] text-slate-400">{getFileTypeLabel(url)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={url} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                    onClick={(e) => e.stopPropagation()}>
                    <FiDownload size={13} /> Download
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
                  <video src={url} controls autoPlay className="w-full h-full absolute inset-0 object-contain bg-black" title={title} />
                )}
                {type === 'pdf' && (
                  <iframe src={url} className="w-full h-full absolute inset-0 bg-white" frameBorder="0" title={title} />
                )}
                {type === 'image' && (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img src={url} alt={title} className="max-w-full max-h-full object-contain rounded-lg" />
                  </div>
                )}
                {type === 'link' && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                    <FiLink size={32} className="text-slate-400" />
                    <p className="text-white/90 text-base font-bold">{title}</p>
                    <p className="text-white/50 text-sm">Trying to load inline preview...</p>
                    <iframe src={url} className="w-full flex-1 rounded-xl border border-slate-700 mt-2" frameBorder="0" title={title}
                      sandbox="allow-same-origin allow-scripts allow-popups" />
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

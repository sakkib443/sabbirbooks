'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSave, FiLoader, FiFolder, FiClock, FiLink, FiVideo,
  FiFileText, FiPlus, FiTrash2, FiExternalLink, FiUpload, FiMapPin,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

/**
 * Convert a human-readable time string to 24h HH:MM for <input type="time">.
 * Accepts: "6.30PM", "6:30 PM", "06:30", "18:30", "9.30 PM" etc.
 */
function to24h(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  // Match: hour separator(.,:) minute optional space AM/PM
  const m = s.match(/^(\d{1,2})\s*[.:]\s*(\d{2})\s*(AM|PM)?$/i)
         || s.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = (m[2] && /^\d{2}$/.test(m[2])) ? m[2] : '00';
  const ampm = (m[3] || m[2] || '').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (h < 0 || h > 23) return '';
  return `${String(h).padStart(2, '0')}:${min}`;
}

/**
 * Parse a "Start - End" range string into [start24h, end24h].
 * Tolerates separators: "-", "–", "to" with surrounding whitespace.
 */
function parseTimeRange(range) {
  if (!range) return ['', ''];
  const parts = String(range).split(/\s*(?:-|–|to)\s*/i).filter(Boolean);
  if (parts.length < 2) return ['', ''];
  return [to24h(parts[0]), to24h(parts[1])];
}

export default function CreateClassPage({ params }) {
  const { batchId } = use(params);
  const router = useRouter();
  const [batch, setBatch] = useState(null);
  const [classCount, setClassCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '', topic: '', date: '', startTime: '20:00', endTime: '22:00',
    type: 'live', meetingLink: '', meetingPlatform: 'zoom',
    venue: '', notes: '',
    recordings: [], // [{ title, url }]
    materials: [],  // [{ title, fileUrl, fileType }]
  });
  const [newMaterial, setNewMaterial] = useState({ title: '', fileUrl: '', fileType: 'pdf' });
  const [newRecording, setNewRecording] = useState({ title: '', url: '' });

  const addRecording = () => {
    const url = newRecording.url.trim();
    if (!url) return;
    setForm(prev => ({
      ...prev,
      recordings: [...prev.recordings, { title: (newRecording.title || `Recording ${prev.recordings.length + 1}`).trim(), url }],
    }));
    setNewRecording({ title: '', url: '' });
  };

  const removeRecording = (idx) => {
    setForm(prev => ({ ...prev, recordings: prev.recordings.filter((_, i) => i !== idx) }));
  };

  useEffect(() => {
    const fetchBatch = async () => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [batchRes, classRes] = await Promise.all([
        fetch(`${API}/batches/my-batches`, { headers }).then(r => r.json()),
        fetch(`${API}/classes/batch/${batchId}`, { headers }).then(r => r.json()),
      ]);
      const found = (batchRes.data || []).find(b => b._id === batchId);
      setBatch(found || null);
      const count = classRes.data?.length || 0;
      setClassCount(count);
      const nextNum = count + 1;

      const [parsedStart, parsedEnd] = parseTimeRange(found?.classTime);
      setForm(f => ({
        ...f,
        title: `Class ${String(nextNum).padStart(2, '0')}`,
        startTime: parsedStart || '20:00',
        endTime: parsedEnd || '22:00',
      }));
    };
    fetchBatch();
  }, [batchId]);

  // File upload to Cloudinary
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/classes/upload-material`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setForm(prev => ({
          ...prev,
          materials: [...prev.materials, {
            title: file.name.replace(/\.[^/.]+$/, ''),
            fileUrl: data.data.fileUrl,
            fileType: data.data.fileType || 'pdf',
          }],
        }));
      } else {
        alert('Upload failed: ' + (data.message || ''));
      }
    } catch (err) { alert('Upload error'); }
    setUploading(false);
    e.target.value = '';
  };

  const addMaterialLink = () => {
    if (!newMaterial.title || !newMaterial.fileUrl) return;
    setForm(prev => ({ ...prev, materials: [...prev.materials, { ...newMaterial }] }));
    setNewMaterial({ title: '', fileUrl: '', fileType: 'pdf' });
  };

  const removeMaterial = (idx) => {
    setForm(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!form.title || !form.topic || !form.date) {
      setError('Title, Topic এবং Date আবশ্যক');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const courseId = batch?.courseId?._id || batch?.courseId || '';

      // Auto-flush: if the user typed a recording URL but forgot to click
      // "Add", include it anyway so it doesn't get lost.
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

      const body = {
        title: form.title,
        topic: form.topic,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        type: form.type,
        batchId,
        courseId: courseId || undefined,
        meetingLink: form.meetingLink || undefined,
        meetingPlatform: form.meetingPlatform || undefined,
        venue: form.venue || undefined,
        notes: form.notes || undefined,
        recordings,
        // legacy single-URL field — keep for back-compat readers
        recordingUrl: recordings[0]?.url || undefined,
        materials,
      };

      const res = await fetch(`${API}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/mentor/batch-materials/${batchId}`);
      } else {
        setError(data.message || 'Failed to create');
      }
    } catch (err) {
      setError('Network error');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/mentor/batch-materials/${batchId}`}
          className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition">
          <FiArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800 outfit">Create Class Folder</h1>
          <p className="text-sm text-slate-500">{batch?.name || batch?.courseName || 'Batch'} <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{batch?.id}</code></p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium">❌ {error}</div>
      )}

      {/* Full Page Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Section 1: Basic Info */}
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
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
            <label className="text-xs font-bold text-slate-500 mb-1 block">Topics / কি কি শেখানো হবে *</label>
            <textarea value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} rows={2}
              placeholder="e.g. HTML Structure, CSS Selectors, Flexbox Layout, Responsive Design..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 resize-none" />
          </div>
        </div>

        {/* Section 2: Schedule */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <FiClock size={12} /> Schedule & Class Type
            </h4>
            {batch?.classTime && (
              <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                Batch default: <span className="font-bold text-slate-700">{batch.classTime}</span>
              </span>
            )}
          </div>
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

        {/* Section 3: Meeting Link */}
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
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
            <label className="text-xs font-bold text-slate-500 mb-1 block">Venue (Offline ক্লাসের জন্য)</label>
            <input type="text" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
              placeholder="Room 301, Aptech Learning HQ" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400" />
          </div>
        </div>

        {/* Section 4: Recordings (multi) */}
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <FiVideo size={12} /> Class Recordings (optional, multiple supported)
          </h4>

          {/* Existing recordings */}
          {form.recordings.length > 0 && (
            <div className="space-y-2 mb-4">
              {form.recordings.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <FiVideo size={13} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-medium flex-1 truncate">{r.title}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={r.url}>{r.url}</span>
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><FiExternalLink size={12} /></a>
                  <button type="button" onClick={() => removeRecording(i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={12} /></button>
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
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-rose-400 bg-white" />
              <input type="url" value={newRecording.url}
                onChange={e => setNewRecording({ ...newRecording, url: e.target.value })}
                placeholder="https://youtube.com/... or drive.google.com link"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecording(); } }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-rose-400 bg-white" />
              <button type="button" onClick={addRecording}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition flex items-center justify-center gap-1">
                <FiPlus size={14} /> Add
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">ক্লাস শেষে একাধিক recording link এখানে যোগ করুন (YouTube, Drive, ইত্যাদি)। পরে edit করেও যোগ করা যাবে।</p>
          </div>
        </div>

        {/* Section 5: Materials — Upload + Link */}
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <FiFileText size={12} /> Materials & Documents (optional)
          </h4>

          {/* Uploaded materials list */}
          {form.materials.length > 0 && (
            <div className="space-y-2 mb-4">
              {form.materials.map((m, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <FiFileText size={13} className="text-teal-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 font-medium flex-1 truncate">{m.title}</span>
                  <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">{m.fileType}</span>
                  <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><FiExternalLink size={12} /></a>
                  <button onClick={() => removeMaterial(i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {/* Upload File */}
            <div>
              <label className="text-[11px] font-bold text-teal-600 mb-2 block">📤 Upload File (PDF, PPT, DOC, ZIP — max 50MB)</label>
              <label className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                uploading ? 'border-amber-300 bg-amber-50' : 'border-teal-300 bg-teal-50/30 hover:bg-teal-50 hover:border-teal-400'
              }`}>
                <input type="file" className="hidden" onChange={handleFileUpload}
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.xlsx" disabled={uploading} />
                {uploading ? (
                  <><FiLoader className="animate-spin text-amber-500" size={18} /> <span className="text-sm font-medium text-amber-600">Uploading to Cloudinary...</span></>
                ) : (
                  <><FiUpload size={18} className="text-teal-500" /> <span className="text-sm font-medium text-teal-700">Click to upload file</span></>
                )}
              </label>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">or add by link</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Add by Link */}
            <div>
              <label className="text-[11px] font-bold text-blue-600 mb-2 block">🔗 Add Link (Google Drive, GitHub, etc.)</label>
              <div className="grid grid-cols-3 gap-3">
                <input type="text" value={newMaterial.title} onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  placeholder="Title (e.g. Slides)" className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 bg-white" />
                <input type="url" value={newMaterial.fileUrl} onChange={e => setNewMaterial({ ...newMaterial, fileUrl: e.target.value })}
                  placeholder="URL (drive, github, etc)" className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 bg-white" />
                <div className="flex gap-2">
                  <select value={newMaterial.fileType} onChange={e => setNewMaterial({ ...newMaterial, fileType: e.target.value })}
                    className="flex-1 px-2 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 bg-white">
                    <option value="pdf">PDF</option><option value="ppt">PPT</option><option value="doc">DOC</option>
                    <option value="zip">ZIP</option><option value="link">Link</option><option value="video">Video</option>
                  </select>
                  <button onClick={addMaterialLink}
                    className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600 transition">
                    <FiPlus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Notes */}
        <div className="p-6 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">📝 Notes / Instructions (optional)</h4>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
            placeholder="Prerequisites, homework, preparation, guidelines..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 resize-none" />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 bg-slate-50">
          <Link href={`/dashboard/mentor/batch-materials/${batchId}`}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
            Cancel
          </Link>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:shadow-lg disabled:opacity-50 transition shadow-md">
            {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
            Create Class Folder
          </button>
        </div>
      </div>
    </div>
  );
}

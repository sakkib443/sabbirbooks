'use client';

/**
 * Modules & Lessons manager for Recorded courses.
 * Rendered inside CourseForm's "Modules & Lessons" tab (edit mode).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FiPlus, FiTrash2, FiLoader, FiChevronDown, FiChevronUp, FiEdit2, FiX,
  FiVideo, FiFileText, FiLock, FiUnlock, FiEye, FiEyeOff, FiCheck,
} from 'react-icons/fi';
import { LuLayers } from 'react-icons/lu';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const getToken = () => {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 ' +
  'placeholder:text-gray-300 focus:outline-none focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15 transition-all';

// ═══════════════════════════════════════════════════════════════
// MODULE & LESSON MANAGER
// ═══════════════════════════════════════════════════════════════
const ModuleLessonManager = ({ courseId }) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState(null);
  const [moduleLessons, setModuleLessons] = useState({}); // { moduleId: [lessons] }

  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [activeModuleForLesson, setActiveModuleForLesson] = useState(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/modules/course/${courseId}`);
      const data = await res.json();
      setModules(data.data || []);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const fetchLessons = async (moduleId) => {
    try {
      const res = await fetch(`${API}/lessons/module/${moduleId}`);
      const data = await res.json();
      setModuleLessons(prev => ({ ...prev, [moduleId]: data.data || [] }));
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  };

  const toggleModule = (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      if (!moduleLessons[moduleId]) fetchLessons(moduleId);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    try {
      await fetch(`${API}/modules/${moduleId}`, { method: 'DELETE', headers: authHeaders() });
      fetchModules();
    } catch {
      alert('Failed to delete module');
    }
  };

  const handleDeleteLesson = async (lessonId, moduleId) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await fetch(`${API}/lessons/${lessonId}`, { method: 'DELETE', headers: authHeaders() });
      fetchLessons(moduleId);
    } catch {
      alert('Failed to delete lesson');
    }
  };

  const getLessonIcon = (type) => {
    switch (type) {
      case 'video': return <FiVideo className="text-blue-500" />;
      case 'text': return <FiFileText className="text-green-500" />;
      case 'quiz': return <FiCheck className="text-purple-500" />;
      case 'assignment': return <FiEdit2 className="text-[#c9871a]" />;
      default: return <FiVideo className="text-gray-400" />;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <FiLoader className="animate-spin text-[#F3A522]" size={28} />
      <p className="ml-3 text-sm text-gray-400 work">Loading modules...</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-gray-800 outfit flex items-center gap-2">
            <LuLayers className="text-[#F3A522]" />
            Course Modules ({modules.length})
          </h2>
          <p className="text-[11px] text-gray-400 work mt-0.5">Build the recorded curriculum — modules contain video, text, quiz and assignment lessons</p>
        </div>
        <button
          onClick={() => { setEditingModule(null); setShowModuleModal(true); }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-[#F3A522]/25 hover:shadow-xl transition-all"
        >
          <FiPlus /> Add Module
        </button>
      </div>

      {/* Empty state */}
      {modules.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-14 text-center bg-[#faf9f6]">
          <div className="w-16 h-16 bg-[#FEF6E7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LuLayers className="text-2xl text-[#F3A522]" />
          </div>
          <h3 className="text-base font-bold text-gray-700 outfit mb-1.5">No modules yet</h3>
          <p className="text-xs text-gray-400 work mb-5 max-w-sm mx-auto">
            Start by adding the first module — then fill it with video, text, quiz or assignment lessons.
          </p>
          <button
            onClick={() => { setEditingModule(null); setShowModuleModal(true); }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white px-6 py-3 rounded-lg font-bold text-sm shadow-lg shadow-[#F3A522]/25 hover:shadow-xl transition-all"
          >
            <FiPlus /> Create First Module
          </button>
        </div>
      )}

      {/* Modules list */}
      <div className="space-y-3">
        {modules.map((mod, idx) => (
          <div key={mod._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Module header */}
            <div
              className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[#faf9f6] transition-colors"
              onClick={() => toggleModule(mod._id)}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-[#F3A522] to-[#d88f13] text-white rounded-lg flex items-center justify-center font-bold text-sm outfit shrink-0">
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 outfit text-sm truncate">{mod.title}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  {mod.titleBn && <span className="text-[11px] text-gray-400 hind-siliguri">{mod.titleBn}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mod.isPublished ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    {mod.isPublished ? '✓ Published' : '◌ Draft'}
                  </span>
                  {moduleLessons[mod._id] && (
                    <span className="text-[10px] text-gray-400">{moduleLessons[mod._id].length} lessons</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setEditingModule(mod); setShowModuleModal(true); }}
                  className="p-2 text-[#c9871a] hover:bg-[#FEF6E7] rounded-lg transition"
                  title="Edit Module"
                >
                  <FiEdit2 size={15} />
                </button>
                <button
                  onClick={() => handleDeleteModule(mod._id)}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                  title="Delete Module"
                >
                  <FiTrash2 size={15} />
                </button>
                <button
                  onClick={() => { setActiveModuleForLesson(mod._id); setEditingLesson(null); setShowLessonModal(true); }}
                  className="p-2 text-[#F3A522] hover:bg-[#FEF6E7] rounded-lg transition"
                  title="Add Lesson"
                >
                  <FiPlus size={15} />
                </button>
              </div>

              {expandedModule === mod._id ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
            </div>

            {/* Lessons (expanded) */}
            {expandedModule === mod._id && (
              <div className="border-t border-gray-100 bg-[#faf9f6]/60">
                {!moduleLessons[mod._id] ? (
                  <div className="py-6 text-center text-gray-400 text-sm">
                    <FiLoader className="animate-spin mx-auto mb-2" size={18} />
                    Loading lessons...
                  </div>
                ) : moduleLessons[mod._id].length === 0 ? (
                  <div className="py-7 text-center">
                    <p className="text-xs text-gray-400 work mb-2.5">No lessons yet</p>
                    <button
                      onClick={() => { setActiveModuleForLesson(mod._id); setEditingLesson(null); setShowLessonModal(true); }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#c9871a] hover:underline"
                    >
                      <FiPlus size={13} /> Add first lesson
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {moduleLessons[mod._id].map((lesson, lesIdx) => (
                      <div key={lesson._id} className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-colors group">
                        <span className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">
                          {lesIdx + 1}
                        </span>
                        {getLessonIcon(lesson.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{lesson.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase font-bold text-gray-400">{lesson.type}</span>
                            {lesson.videoDuration ? (
                              <span className="text-[10px] text-gray-400">{Math.round(lesson.videoDuration / 60)} min</span>
                            ) : null}
                            {lesson.isFree && (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">FREE</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {lesson.isPublished
                            ? <span className="text-green-500" title="Published"><FiEye size={14} /></span>
                            : <span className="text-gray-300" title="Draft"><FiEyeOff size={14} /></span>}
                          {lesson.isLocked
                            ? <span className="text-[#c9871a]" title="Locked"><FiLock size={14} /></span>
                            : <span className="text-gray-300" title="Unlocked"><FiUnlock size={14} /></span>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setActiveModuleForLesson(mod._id); setEditingLesson(lesson); setShowLessonModal(true); }}
                            className="p-1.5 text-[#c9871a] hover:bg-[#FEF6E7] rounded transition"
                          >
                            <FiEdit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson._id, mod._id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded transition"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {moduleLessons[mod._id]?.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button
                      onClick={() => { setActiveModuleForLesson(mod._id); setEditingLesson(null); setShowLessonModal(true); }}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#c9871a] hover:text-[#a5680f] transition"
                    >
                      <FiPlus size={13} /> Add Lesson
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showModuleModal && (
        <ModuleModal
          courseId={courseId}
          module={editingModule}
          onClose={() => setShowModuleModal(false)}
          onSave={() => { setShowModuleModal(false); fetchModules(); }}
        />
      )}
      {showLessonModal && (
        <LessonModal
          moduleId={activeModuleForLesson}
          lesson={editingLesson}
          onClose={() => setShowLessonModal(false)}
          onSave={() => { setShowLessonModal(false); fetchLessons(activeModuleForLesson); }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MODULE MODAL
// ═══════════════════════════════════════════════════════════════
const ModuleModal = ({ courseId, module, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: module?.title || '',
    titleBn: module?.titleBn || '',
    description: module?.description || '',
    isPublished: module?.isPublished || false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Module title is required');
    setSaving(true);
    try {
      const url = module ? `${API}/modules/${module._id}` : `${API}/modules/create`;
      const res = await fetch(url, {
        method: module ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ...formData, courseId }),
      });
      const data = await res.json();
      if (data.success) onSave();
      else alert(data.message || 'Failed to save module');
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#F3A522] to-[#d88f13]">
          <h3 className="text-white font-bold text-base outfit">{module ? 'Edit Module' : 'Add New Module'}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition"><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Module Title (English) *</label>
            <input
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Introduction to Photoshop"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Module Title (Bangla)</label>
            <input
              value={formData.titleBn}
              onChange={e => setFormData(prev => ({ ...prev, titleBn: e.target.value }))}
              className={`${inputClass} hind-siliguri`}
              placeholder="e.g. ফটোশপ পরিচিতি"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={inputClass}
              rows={3}
              placeholder="Brief description of this module..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.isPublished}
                onChange={e => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#F3A522]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#F3A522] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
            <span className="text-sm text-gray-600 work">Published</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white font-bold text-sm shadow-lg shadow-[#F3A522]/25 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : module ? 'Update Module' : 'Create Module'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// LESSON MODAL
// ═══════════════════════════════════════════════════════════════
const LessonModal = ({ moduleId, lesson, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    titleBn: lesson?.titleBn || '',
    description: lesson?.description || '',
    type: lesson?.type || 'video',
    videoUrl: lesson?.videoUrl || '',
    videoDuration: lesson?.videoDuration || '',
    textContent: lesson?.textContent || '',
    isFree: lesson?.isFree || false,
    isLocked: lesson?.isLocked ?? true,
    isPublished: lesson?.isPublished || false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Lesson title is required');
    setSaving(true);
    try {
      const url = lesson ? `${API}/lessons/${lesson._id}` : `${API}/lessons/create`;
      const payload = {
        ...formData,
        moduleId,
        videoDuration: formData.videoDuration ? Number(formData.videoDuration) : undefined,
      };
      const res = await fetch(url, {
        method: lesson ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) onSave();
      else alert(data.message || 'Failed to save lesson');
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#F3A522] to-[#d88f13] shrink-0">
          <h3 className="text-white font-bold text-base outfit">{lesson ? 'Edit Lesson' : 'Add New Lesson'}</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition"><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Lesson Title (English) *</label>
              <input
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Setup Development Environment"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Title (Bangla)</label>
              <input
                value={formData.titleBn}
                onChange={e => setFormData(prev => ({ ...prev, titleBn: e.target.value }))}
                className={`${inputClass} hind-siliguri`}
                placeholder="e.g. ডেভেলপমেন্ট পরিবেশ সেটআপ"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Lesson Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['video', 'text', 'quiz', 'assignment'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type }))}
                  className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${formData.type === type
                    ? 'bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white shadow'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {formData.type === 'video' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#FEF6E7]/50 rounded-xl border border-[#F0DFB4]">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-[#a5680f] uppercase tracking-wider mb-1.5 block">Video URL</label>
                <input
                  value={formData.videoUrl}
                  onChange={e => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className={inputClass}
                  placeholder="https://... or Cloudinary URL"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#a5680f] uppercase tracking-wider mb-1.5 block">Duration (seconds)</label>
                <input
                  type="number"
                  value={formData.videoDuration}
                  onChange={e => setFormData(prev => ({ ...prev, videoDuration: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. 600"
                />
              </div>
            </div>
          )}

          {formData.type === 'text' && (
            <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
              <label className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-1.5 block">Text Content</label>
              <textarea
                value={formData.textContent}
                onChange={e => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                className={inputClass}
                rows={5}
                placeholder="Write the lesson content here..."
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={inputClass}
              rows={2}
              placeholder="Brief description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-[#faf9f6] rounded-xl border border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFree}
                onChange={e => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                className="w-4 h-4 accent-[#F3A522] rounded"
              />
              <span className="text-xs font-medium text-gray-600">Free Preview</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isLocked}
                onChange={e => setFormData(prev => ({ ...prev, isLocked: e.target.checked }))}
                className="w-4 h-4 accent-[#F3A522] rounded"
              />
              <span className="text-xs font-medium text-gray-600">Locked</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={e => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                className="w-4 h-4 accent-green-500 rounded"
              />
              <span className="text-xs font-medium text-gray-600">Published</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white font-bold text-sm shadow-lg shadow-[#F3A522]/25 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : lesson ? 'Update Lesson' : 'Create Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModuleLessonManager;

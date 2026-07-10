'use client';

/**
 * Shared Course Form — used by BOTH Create and Edit pages.
 *
 * Course type drives the interface:
 *  - Online / Offline (Live)  → courseStart, durationMonth, curriculum topics
 *  - Recorded (Self-paced)    → no curriculum; "Modules & Lessons" tab instead
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSave, FiLoader, FiTrash2, FiPlus, FiX,
  FiUploadCloud, FiLink, FiAlertCircle, FiCheckCircle, FiImage,
} from 'react-icons/fi';
import {
  LuMonitor, LuMapPin, LuVideo, LuFileText, LuLayers, LuInfo,
  LuBookOpen, LuTag, LuListChecks, LuBriefcase, LuSettings2, LuSparkles,
} from 'react-icons/lu';
import { RiLiveLine } from 'react-icons/ri';
import { MdOutlineAssignment, MdOutlineQuiz } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';
import ModuleLessonManager from './ModuleLessonManager';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';

// New course defaults (shown on the public details page as e.g. "260+ students enrolled · 4.7 (28 ratings)")
const DEFAULT_RATING = 4.7;
const DEFAULT_TOTAL_RATING = 28;
const DEFAULT_STUDENTS = 260;

const getToken = () => {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
};

// Icons the public details page knows how to render (renderIcon)
const ICON_OPTIONS = [
  { value: 'RiLiveLine', label: 'Live Class', Icon: RiLiveLine },
  { value: 'LuVideo', label: 'Video Content', Icon: LuVideo },
  { value: 'LuMonitor', label: 'Hands-on Practice', Icon: LuMonitor },
  { value: 'LuFileText', label: 'Notes & Resources', Icon: LuFileText },
  { value: 'MdOutlineAssignment', label: 'Assignment', Icon: MdOutlineAssignment },
  { value: 'MdOutlineQuiz', label: 'Quiz / Exam', Icon: MdOutlineQuiz },
  { value: 'FaCheckCircle', label: 'General Benefit', Icon: FaCheckCircle },
];

const COURSE_TYPES = [
  { key: 'Online', label: 'Online', desc: 'Live classes over the internet', Icon: LuMonitor },
  { key: 'Offline', label: 'Offline', desc: 'In-person classes at branch', Icon: LuMapPin },
  { key: 'Recorded', label: 'Recorded', desc: 'Self-paced video course', Icon: LuVideo },
];

const slugify = (str = '') =>
  str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// ─── Validation (mirrors backend course.validation.ts) ───────
const courseSchema = z.object({
  id: z.coerce.number().min(1, 'ID is required'),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  category: z.string().min(1, 'Select a category'),
  mentor: z.string().min(1, 'Select a mentor'),
  type: z.enum(['Online', 'Offline', 'Recorded']),
  status: z.enum(['draft', 'published', 'archived']),
  image: z.string().url('Upload an image or paste a valid image URL'),
  fee: z.string().min(1, 'Course fee is required'),
  offerPrice: z.string().optional().or(z.literal('')),
  admissionFee: z.coerce.number().min(0).optional(),
  technology: z.string().min(1, 'Add at least one technology'),
  courseStart: z.string().optional().or(z.literal('')),
  durationMonth: z.coerce.number().optional(),
  lectures: z.coerce.number().min(0),
  totalExam: z.coerce.number().min(0),
  totalProject: z.coerce.number().min(0),
  courseOverview: z.string().min(1, 'A short overview is required'),
  details: z.string().min(1, 'Full details are required'),
  curriculum: z.array(z.string()).optional(),
  courseIncludes: z.array(z.object({
    icon: z.string().min(1),
    text: z.string().min(1, 'Benefit text is required'),
  })).min(1, 'Add at least one item'),
  softwareYoullLearn: z.array(z.string().min(1)).min(1, 'Add at least one software / tool'),
  jobPositions: z.array(z.string().min(1)).min(1, 'Add at least one job position'),
}).superRefine((d, ctx) => {
  if (d.type !== 'Recorded') {
    if (!d.courseStart || !d.courseStart.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['courseStart'], message: 'Start date is required for Online/Offline courses' });
    }
    if (!d.durationMonth || d.durationMonth < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durationMonth'], message: 'Duration (months) is required for Online/Offline courses' });
    }
    if (!(d.curriculum || []).filter(c => c && c.trim()).length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['curriculum'], message: 'Add at least one curriculum topic for Online/Offline courses' });
    }
  }
});

// ─── Small UI helpers ────────────────────────────────────────
const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 ' +
  'placeholder:text-gray-300 focus:outline-none focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15 transition-all';
const labelClass = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5';

const FieldError = ({ msg }) => msg
  ? <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1"><FiAlertCircle size={11} /> {msg}</p>
  : null;

const SectionTitle = ({ icon: Icon, title, hint }) => (
  <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
    <div className="w-9 h-9 rounded-lg bg-[#FEF6E7] flex items-center justify-center shrink-0">
      <Icon className="text-[#c9871a]" size={16} />
    </div>
    <div>
      <h2 className="text-sm font-bold text-gray-800 outfit leading-tight">{title}</h2>
      {hint && <p className="text-[11px] text-gray-400 work mt-0.5">{hint}</p>}
    </div>
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>{children}</div>
);

// Tag-style input for string arrays (type + Enter to add)
const ChipsInput = ({ value = [], onChange, placeholder, invalid }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div
      className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border bg-white min-h-[46px] transition-all
        focus-within:border-[#F3A522] focus-within:ring-2 focus-within:ring-[#F3A522]/15
        ${invalid ? 'border-red-300' : 'border-gray-200'}`}
    >
      {value.map(chip => (
        <span key={chip} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#FEF6E7] border border-[#F0DFB4] rounded-md text-xs font-semibold text-[#a5680f]">
          {chip}
          <button
            type="button"
            onClick={() => onChange(value.filter(c => c !== chip))}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#F3A522]/20 text-[#c9871a]"
          >
            <FiX size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[120px] py-1 text-sm outline-none placeholder:text-gray-300 bg-transparent"
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN FORM
// ═══════════════════════════════════════════════════════════════
const CourseForm = ({ mode = 'create', courseId = null }) => {
  const isEdit = mode === 'edit';
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [fetching, setFetching] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [courseDoc, setCourseDoc] = useState(null); // fetched course (edit mode)
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'modules'
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const slugTouched = useRef(false);
  const fileInputRef = useRef(null);

  const showToast = (type, msg) => setToast({ type, msg });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const {
    register, control, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      id: '', title: '', slug: '', category: '', mentor: '',
      type: 'Online', status: 'published',
      image: '', fee: '', offerPrice: '', admissionFee: '', technology: '',
      courseStart: '', durationMonth: '', lectures: '',
      totalExam: 0, totalProject: 0,
      courseOverview: '', details: '',
      curriculum: [''],
      courseIncludes: [{ icon: 'RiLiveLine', text: '' }],
      softwareYoullLearn: [], jobPositions: [],
    },
  });

  const curriculums = useFieldArray({ control, name: 'curriculum' });
  const includes = useFieldArray({ control, name: 'courseIncludes' });

  const type = watch('type');
  const isRecorded = type === 'Recorded';
  const imageUrl = watch('image');
  const titleValue = watch('title');

  // Auto-slug from title (create mode, until manually edited)
  useEffect(() => {
    if (!isEdit && !slugTouched.current) setValue('slug', slugify(titleValue));
  }, [titleValue, isEdit, setValue]);

  // Recorded selected → modules tab exists; Live selected → force back to info
  useEffect(() => {
    if (!isRecorded && activeTab === 'modules') setActiveTab('info');
  }, [isRecorded, activeTab]);

  // Edit mode: open modules tab via ?tab=modules
  // (runs after the course is fetched — otherwise the default 'Online' type
  //  would immediately force the tab back to 'info')
  useEffect(() => {
    if (!isEdit || fetching || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('tab') === 'modules') {
      setActiveTab('modules');
    }
  }, [isEdit, fetching]);

  // ─── Initial data ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [catRes, mentorRes] = await Promise.all([
          fetch(`${API}/categories`),
          fetch(`${API}/mentors`),
        ]);
        const catData = await catRes.json();
        const mentorData = await mentorRes.json();
        setCategories(catData.data || catData || []);
        setMentors(mentorData.data || mentorData || []);

        if (isEdit && courseId) {
          const res = await fetch(`${API}/courses/${courseId}`);
          const cData = await res.json();
          const c = cData.data || cData;
          if (!c || !c._id) throw new Error('Course not found');
          setCourseDoc(c);
          reset({
            id: c.id, title: c.title || '', slug: c.slug || '',
            category: c.category?._id || c.category || '',
            mentor: c.mentor?._id || c.mentor || '',
            type: ['Online', 'Offline', 'Recorded'].includes(c.type) ? c.type : 'Online',
            status: c.status || 'published',
            image: c.image || '', fee: c.fee || '',
            offerPrice: c.offerPrice || '',
            admissionFee: c.admissionFee ?? '',
            technology: c.technology || '',
            courseStart: c.courseStart || '',
            durationMonth: c.durationMonth ?? '',
            lectures: c.lectures ?? 0,
            totalExam: c.totalExam ?? 0, totalProject: c.totalProject ?? 0,
            courseOverview: c.courseOverview || '', details: c.details || '',
            curriculum: c.curriculum?.length ? c.curriculum : [''],
            courseIncludes: c.courseIncludes?.length
              ? c.courseIncludes.map(({ icon, text }) => ({ icon, text }))
              : [{ icon: 'RiLiveLine', text: '' }],
            softwareYoullLearn: c.softwareYoullLearn || [],
            jobPositions: c.jobPositions || [],
          });
          slugTouched.current = true;
        } else {
          // Create mode: auto numeric ID (max existing + 1)
          try {
            const res = await fetch(`${API}/courses?status=all&limit=500`);
            const data = await res.json();
            const list = data.data || [];
            const maxId = list.reduce((m, c) => Math.max(m, Number(c.id) || 0), 1000);
            setValue('id', maxId + 1);
          } catch {
            setValue('id', Math.floor(Date.now() / 1000) % 1000000);
          }
        }
      } catch (err) {
        console.error(err);
        showToast('error', 'Failed to load data. Refresh the page.');
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [isEdit, courseId, reset, setValue]);

  // ─── Image upload (Cloudinary via backend) ────────────────
  const handleImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('error', 'Only image files are allowed');
    if (file.size > 5 * 1024 * 1024) return showToast('error', 'Image must be under 5MB');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${API}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.url) {
        setValue('image', data.data.url, { shouldValidate: true });
        showToast('success', 'Image uploaded successfully');
      } else {
        showToast('error', data.message || 'Image upload failed');
      }
    } catch {
      showToast('error', 'Network error while uploading image');
    } finally {
      setUploading(false);
    }
  };

  // ─── Submit ────────────────────────────────────────────────
  const buildPayload = (data) => {
    const rec = data.type === 'Recorded';
    const payload = {
      id: data.id,
      title: data.title.trim(),
      slug: data.slug.trim(),
      category: data.category,
      mentor: data.mentor,
      type: data.type,
      status: data.status,
      image: data.image.trim(),
      fee: String(data.fee).trim(),
      technology: data.technology.trim(),
      lectures: data.lectures || 0,
      totalExam: data.totalExam || 0,
      totalProject: data.totalProject || 0,
      details: data.details.trim(),
      courseOverview: data.courseOverview.trim(),
      courseIncludes: data.courseIncludes.map(({ icon, text }) => ({ icon, text: text.trim() })),
      softwareYoullLearn: data.softwareYoullLearn,
      jobPositions: data.jobPositions,
      curriculum: rec ? [] : (data.curriculum || []).map(c => c.trim()).filter(Boolean),
    };
    if (data.offerPrice && data.offerPrice.trim()) payload.offerPrice = data.offerPrice.trim();
    payload.admissionFee = Number(data.admissionFee) || 0;
    if (!rec) {
      payload.courseStart = data.courseStart.trim();
      payload.durationMonth = data.durationMonth;
    }
    if (!isEdit) {
      payload.rating = DEFAULT_RATING;
      payload.totalRating = DEFAULT_TOTAL_RATING;
      payload.totalStudentsEnroll = DEFAULT_STUDENTS;
    }
    return payload;
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = buildPayload(data);
      const url = isEdit ? `${API}/courses/${courseDoc._id}` : `${API}/courses/create-course`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        showToast('error', result.message || 'Failed to save course');
        return;
      }
      if (isEdit) {
        showToast('success', 'Course updated successfully');
      } else if (data.type === 'Recorded') {
        // Recorded: course created → go straight to Modules & Lessons
        const created = result.data;
        router.push(`/dashboard/admin/course/edit/${created._id}?tab=modules`);
      } else {
        router.push('/dashboard/admin/course');
      }
    } catch {
      showToast('error', 'Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  const errorList = useMemo(() => {
    const list = [];
    const walk = (obj, prefix = '') => {
      Object.entries(obj || {}).forEach(([key, val]) => {
        if (!val) return;
        if (val.message) list.push({ field: prefix + key, message: val.message });
        else if (typeof val === 'object') walk(val, `${prefix}${key}.`);
      });
    };
    walk(errors);
    return list;
  }, [errors]);

  if (fetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f6] gap-3">
        <FiLoader className="animate-spin text-[#F3A522]" size={34} />
        <p className="text-sm text-gray-400 work">Loading course form...</p>
      </div>
    );
  }

  const saveLabel = saving
    ? 'Saving...'
    : isEdit ? 'Save Changes' : (isRecorded ? 'Save & Add Modules' : 'Publish Course');

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24">
      {/* ─── Sticky Top Bar ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#F3A522] via-[#e2941c] to-[#9AA0A8]"></div>
        <div className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard/admin/course"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-[#c9871a] transition-colors"
            >
              <FiArrowLeft size={12} /> Courses
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 outfit truncate">
              {isEdit ? (
                <>Edit Course{courseDoc?.title ? <span className="text-[#c9871a]">: {courseDoc.title}</span> : ''}</>
              ) : 'Create New Course'}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              <select {...register('status')} className="px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 focus:outline-none focus:border-[#F3A522] cursor-pointer">
                <option value="published">✓ Published</option>
                <option value="draft">◌ Draft</option>
                <option value="archived">⊘ Archived</option>
              </select>
            </div>
            {activeTab === 'info' && (
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={saving || uploading}
                className="flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/25 hover:shadow-xl hover:shadow-[#F3A522]/30 disabled:opacity-50 transition-all"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                <span className="hidden sm:inline">{saveLabel}</span>
                <span className="sm:hidden">Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 pt-6 space-y-6">

        {/* ─── Course Type Selector ──────────────────────────── */}
        <Card>
          <SectionTitle
            icon={LuSparkles}
            title="Course Type"
            hint="The form adapts automatically — Recorded courses use Modules & Lessons instead of a topic curriculum"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COURSE_TYPES.map(({ key, label, desc, Icon }) => {
              const active = type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setValue('type', key, { shouldValidate: true })}
                  className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-300
                    ${active
                      ? 'border-[#F3A522] bg-[#FEF6E7] shadow-md shadow-[#F3A522]/10'
                      : 'border-gray-100 bg-white hover:border-[#F3A522]/40'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                    ${active ? 'bg-[#F3A522] text-white' : 'bg-gray-50 text-gray-400'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold outfit ${active ? 'text-[#a5680f]' : 'text-gray-700'}`}>{label}</p>
                    <p className="text-[11px] text-gray-400 work leading-snug mt-0.5">{desc}</p>
                  </div>
                  {active && (
                    <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#F3A522] text-white flex items-center justify-center">
                      <FiCheckCircle size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ─── Tabs (Recorded only) ──────────────────────────── */}
        {isRecorded && (
          <div className="flex bg-white rounded-xl border border-gray-100 p-1.5 shadow-sm">
            {[
              { id: 'info', label: 'Course Info', Icon: LuInfo },
              { id: 'modules', label: 'Modules & Lessons', Icon: LuLayers },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all
                  ${activeTab === id
                    ? 'bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white shadow-md shadow-[#F3A522]/20'
                    : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Icon size={16} /> {label}
                {id === 'modules' && !isEdit && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/25">AFTER SAVE</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ═══ TAB: MODULES & LESSONS (Recorded) ═══════════════ */}
        {isRecorded && activeTab === 'modules' && (
          isEdit && courseDoc ? (
            <Card>
              <ModuleLessonManager courseId={courseDoc._id} />
            </Card>
          ) : (
            <Card className="text-center py-16">
              <div className="w-20 h-20 bg-[#FEF6E7] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <LuLayers className="text-3xl text-[#F3A522]" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 outfit mb-2">Save the course first</h3>
              <p className="text-sm text-gray-400 work max-w-md mx-auto mb-6">
                Fill in the course info and hit <span className="font-bold text-[#c9871a]">Save &amp; Add Modules</span> —
                you will land right here to build modules and lessons.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/25 hover:shadow-xl transition-all"
              >
                <FiArrowLeft /> Back to Course Info
              </button>
            </Card>
          )
        )}

        {/* ═══ TAB: COURSE INFO ════════════════════════════════ */}
        {activeTab === 'info' && (
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>

            {/* Validation summary */}
            {errorList.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="flex items-center gap-2 text-xs font-bold text-red-600 mb-1.5">
                  <FiAlertCircle /> Please fix the following:
                </p>
                <ul className="space-y-0.5">
                  {errorList.slice(0, 6).map(e => (
                    <li key={e.field} className="text-[11px] text-red-500 work">• {e.message}</li>
                  ))}
                  {errorList.length > 6 && (
                    <li className="text-[11px] text-red-400 work">…and {errorList.length - 6} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

              {/* ══ LEFT (main) ══ */}
              <div className="lg:col-span-2 space-y-6">

                {/* Basic Information */}
                <Card>
                  <SectionTitle icon={LuBookOpen} title="Basic Information" hint="Title, category and the mentor who teaches this course" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Course Title *</label>
                      <input {...register('title')} className={inputClass} placeholder="e.g. Professional Graphic Design Masterclass" />
                      <FieldError msg={errors.title?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Slug (URL)</label>
                      <input
                        {...register('slug')}
                        onChange={(e) => { slugTouched.current = true; register('slug').onChange(e); }}
                        className={inputClass}
                        placeholder="auto-generated-from-title"
                      />
                      <FieldError msg={errors.slug?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Course ID</label>
                      <input {...register('id')} readOnly className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`} />
                    </div>
                    <div>
                      <label className={labelClass}>Category *</label>
                      <select {...register('category')} className={inputClass}>
                        <option value="">Select category</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                      <FieldError msg={errors.category?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Mentor *</label>
                      <select {...register('mentor')} className={inputClass}>
                        <option value="">Select mentor</option>
                        {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                      <FieldError msg={errors.mentor?.message} />
                    </div>
                  </div>
                </Card>

                {/* Description */}
                <Card>
                  <SectionTitle icon={LuFileText} title="Description" hint="Shown on the public course page" />
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Short Overview *</label>
                      <textarea {...register('courseOverview')} rows={2} className={inputClass} placeholder="One or two lines shown at the top of the course page..." />
                      <FieldError msg={errors.courseOverview?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Full Details *</label>
                      <textarea {...register('details')} rows={5} className={inputClass} placeholder="Full course description — what students will learn, who this is for..." />
                      <FieldError msg={errors.details?.message} />
                    </div>
                  </div>
                </Card>

                {/* Curriculum — LIVE (Online/Offline) ONLY */}
                {!isRecorded && (
                  <Card>
                    <SectionTitle icon={LuListChecks} title="Curriculum Topics" hint="The topic list shown on the course page (Online/Offline courses)" />
                    <div className="space-y-2.5">
                      {curriculums.fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-[#FEF6E7] text-[#c9871a] text-xs font-bold outfit flex items-center justify-center shrink-0">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <input {...register(`curriculum.${index}`)} className={inputClass} placeholder={`Topic ${index + 1} — e.g. Introduction & Fundamentals`} />
                          <button
                            type="button"
                            onClick={() => curriculums.remove(index)}
                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <FieldError msg={errors.curriculum?.message || errors.curriculum?.root?.message} />
                    <button
                      type="button"
                      onClick={() => curriculums.append('')}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#c9871a] hover:text-[#a5680f] transition-colors"
                    >
                      <FiPlus size={14} /> Add Topic
                    </button>
                  </Card>
                )}

                {/* Recorded note instead of curriculum */}
                {isRecorded && (
                  <div className="flex items-start gap-3 p-4 bg-[#FEF6E7]/60 border border-[#F0DFB4] rounded-2xl">
                    <LuLayers className="text-[#c9871a] mt-0.5 shrink-0" size={18} />
                    <p className="text-xs text-[#7a5210] work leading-relaxed">
                      <span className="font-bold">Recorded course</span> — the curriculum is built from
                      <span className="font-bold"> Modules &amp; Lessons</span> (videos, quizzes, assignments).
                      {isEdit
                        ? ' Use the tab above to manage them.'
                        : ' Save the course info first, then you will add them in the Modules & Lessons tab.'}
                    </p>
                  </div>
                )}

                {/* What's Included */}
                <Card>
                  <SectionTitle icon={FiCheckCircle} title="What Students Get" hint="Benefit cards shown on the course page (pick an icon + write the benefit)" />
                  <div className="space-y-2.5">
                    {includes.fields.map((field, index) => {
                      const iconVal = watch(`courseIncludes.${index}.icon`);
                      const Ic = (ICON_OPTIONS.find(o => o.value === iconVal) || ICON_OPTIONS[6]).Icon;
                      return (
                        <div key={field.id} className="flex items-center gap-2">
                          <span className="w-9 h-9 rounded-lg bg-[#FEF6E7] text-[#c9871a] flex items-center justify-center shrink-0">
                            <Ic size={16} />
                          </span>
                          <select {...register(`courseIncludes.${index}.icon`)} className={`${inputClass} w-44 shrink-0`}>
                            {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <input {...register(`courseIncludes.${index}.text`)} className={inputClass} placeholder="e.g. 24 Live Classes with Recording Access" />
                          <button
                            type="button"
                            onClick={() => includes.remove(index)}
                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <FieldError msg={errors.courseIncludes?.message || errors.courseIncludes?.root?.message} />
                  <button
                    type="button"
                    onClick={() => includes.append({ icon: 'FaCheckCircle', text: '' })}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#c9871a] hover:text-[#a5680f] transition-colors"
                  >
                    <FiPlus size={14} /> Add Benefit
                  </button>
                </Card>

                {/* Skills & Career */}
                <Card>
                  <SectionTitle icon={LuBriefcase} title="Skills & Career" hint="Type a value and press Enter to add it as a tag" />
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Technologies *</label>
                      <Controller
                        control={control}
                        name="technology"
                        render={({ field }) => (
                          <ChipsInput
                            value={field.value ? field.value.split(',').map(s => s.trim()).filter(Boolean) : []}
                            onChange={arr => field.onChange(arr.join(', '))}
                            placeholder="e.g. Photoshop — press Enter"
                            invalid={!!errors.technology}
                          />
                        )}
                      />
                      <FieldError msg={errors.technology?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Software You Will Learn *</label>
                      <Controller
                        control={control}
                        name="softwareYoullLearn"
                        render={({ field }) => (
                          <ChipsInput
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder="e.g. Adobe Illustrator — press Enter"
                            invalid={!!errors.softwareYoullLearn}
                          />
                        )}
                      />
                      <FieldError msg={errors.softwareYoullLearn?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Job Positions *</label>
                      <Controller
                        control={control}
                        name="jobPositions"
                        render={({ field }) => (
                          <ChipsInput
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder="e.g. UI Designer — press Enter"
                            invalid={!!errors.jobPositions}
                          />
                        )}
                      />
                      <FieldError msg={errors.jobPositions?.message} />
                    </div>
                  </div>
                </Card>
              </div>

              {/* ══ RIGHT (sidebar) ══ */}
              <div className="space-y-6">

                {/* Course Image */}
                <Card>
                  <SectionTitle icon={FiImage} title="Course Image" hint="JPG / PNG / WebP — max 5MB" />

                  {/* Preview / Dropzone */}
                  <div
                    onClick={() => !uploading && imageMode === 'upload' && fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleImageFile(e.dataTransfer.files?.[0]); }}
                    className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed transition-all
                      ${errors.image ? 'border-red-300' : 'border-gray-200 hover:border-[#F3A522]/60'}
                      ${imageMode === 'upload' ? 'cursor-pointer' : ''} bg-gray-50 group`}
                  >
                    {imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Course preview" className="w-full h-full object-cover" />
                        {imageMode === 'upload' && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-white text-xs font-bold flex items-center gap-2">
                              <FiUploadCloud /> Replace Image
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
                        {uploading
                          ? <FiLoader className="animate-spin text-[#F3A522]" size={26} />
                          : <FiUploadCloud size={26} />}
                        <p className="text-[11px] font-bold work text-gray-400">
                          {uploading ? 'Uploading...' : 'Click or drop an image here'}
                        </p>
                      </div>
                    )}
                    {uploading && imageUrl && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <FiLoader className="animate-spin text-[#F3A522]" size={26} />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { handleImageFile(e.target.files?.[0]); e.target.value = ''; }}
                  />

                  {/* Mode toggle + URL input */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all
                        ${imageMode === 'upload' ? 'bg-[#FEF6E7] text-[#a5680f] border border-[#F0DFB4]' : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'}`}
                    >
                      <FiUploadCloud size={13} /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all
                        ${imageMode === 'url' ? 'bg-[#FEF6E7] text-[#a5680f] border border-[#F0DFB4]' : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'}`}
                    >
                      <FiLink size={13} /> Use URL
                    </button>
                  </div>
                  {imageMode === 'url' && (
                    <input {...register('image')} className={`${inputClass} mt-2`} placeholder="https://..." />
                  )}
                  <FieldError msg={errors.image?.message} />
                </Card>

                {/* Pricing */}
                <Card>
                  <SectionTitle icon={LuTag} title="Pricing" hint="Offer price shows a discount badge on the course page" />
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Regular Fee (BDT) *</label>
                      <input {...register('fee')} className={inputClass} placeholder="e.g. 12000" />
                      <FieldError msg={errors.fee?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Offer Price (optional)</label>
                      <input {...register('offerPrice')} className={inputClass} placeholder="e.g. 8500" />
                      <p className="text-[10px] text-gray-300 work mt-1">Leave empty for no discount</p>
                    </div>
                    <div>
                      <label className={labelClass}>Admission Fee (optional)</label>
                      <input type="number" min="0" {...register('admissionFee')} className={inputClass} placeholder="e.g. 2000" />
                      <p className="text-[10px] text-gray-300 work mt-1">
                        ভর্তি নিশ্চিত করতে student এই minimum টাকা দিলেই হবে, বাকিটা installment-এ। ০ = পুরো টাকা দিতে হবে।
                      </p>
                      <FieldError msg={errors.admissionFee?.message} />
                    </div>
                  </div>
                </Card>

                {/* Schedule & Metrics */}
                <Card>
                  <SectionTitle
                    icon={LuSettings2}
                    title={isRecorded ? 'Course Metrics' : 'Schedule & Metrics'}
                    hint={isRecorded ? 'Self-paced — no start date needed' : 'Batch schedule and course numbers'}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    {!isRecorded && (
                      <>
                        <div className="col-span-2">
                          <label className={labelClass}>Course Start *</label>
                          <input {...register('courseStart')} className={inputClass} placeholder="e.g. 15 March 2026" />
                          <FieldError msg={errors.courseStart?.message} />
                        </div>
                        <div>
                          <label className={labelClass}>Duration (Months) *</label>
                          <input type="number" min="0" {...register('durationMonth')} className={inputClass} placeholder="6" />
                          <FieldError msg={errors.durationMonth?.message} />
                        </div>
                      </>
                    )}
                    <div>
                      <label className={labelClass}>{isRecorded ? 'Total Lessons' : 'Lectures'}</label>
                      <input type="number" min="0" {...register('lectures')} className={inputClass} placeholder="48" />
                      <FieldError msg={errors.lectures?.message} />
                    </div>
                    <div>
                      <label className={labelClass}>Total Exams</label>
                      <input type="number" min="0" {...register('totalExam')} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Total Projects</label>
                      <input type="number" min="0" {...register('totalProject')} className={inputClass} />
                    </div>
                  </div>
                </Card>

                {/* Status (mobile) */}
                <Card className="sm:hidden">
                  <label className={labelClass}>Status</label>
                  <select {...register('status')} className={inputClass}>
                    <option value="published">✓ Published</option>
                    <option value="draft">◌ Draft</option>
                    <option value="archived">⊘ Archived</option>
                  </select>
                </Card>
              </div>
            </div>

            {/* Bottom save (long forms) */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex items-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/25 hover:shadow-xl disabled:opacity-50 transition-all"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiSave />} {saveLabel}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ─── Toast ───────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 pl-4 pr-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold work
          ${toast.type === 'success' ? 'bg-[#14100c] text-white' : 'bg-red-600 text-white'}`}
        >
          {toast.type === 'success'
            ? <FiCheckCircle className="text-[#F3A522]" size={18} />
            : <FiAlertCircle size={18} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default CourseForm;

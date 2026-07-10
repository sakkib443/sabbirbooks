'use client';

/**
 * Shared Mentor Form — used by BOTH Create and Edit pages.
 * Matches the website admin design (gold/teal) and supports Cloudinary
 * image upload — same pattern as the Course image upload.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiArrowLeft, FiSave, FiLoader, FiX, FiUploadCloud, FiLink,
  FiAlertCircle, FiCheckCircle, FiImage,
} from 'react-icons/fi';
import {
  LuUser, LuBriefcase, LuFileText, LuAward, LuGlobe, LuKeyRound, LuCopy,
} from 'react-icons/lu';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
};

// ─── Validation (mirrors backend mentor.validation.ts) ───────
const mentorSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  phone: z.string().min(1, 'Phone is required'),
  designation: z.string().min(1, 'Designation is required'),
  subject: z.string().min(1, 'Subject is required'),
  image: z.string().url('Upload an image or paste a valid image URL'),
  training_experience: z.object({
    years: z.string().min(1, 'Years is required'),
    students: z.string().min(1, 'Students count is required'),
  }),
  specialized_area: z.array(z.string().min(1)).min(1, 'Add at least one specialized area'),
  education_qualification: z.array(z.string().min(1)).min(1, 'Add at least one qualification'),
  work_experience: z.array(z.string().min(1)).min(1, 'Add at least one work experience'),
  details: z.string().min(1, 'Details are required'),
  lifeJourney: z.string().min(1, 'Life journey is required'),
  // Optional login password for the auto-created mentor account (create only)
  password: z.string().optional().or(z.literal('')),
  // Whether this mentor shows on the public website
  isPublished: z.boolean().optional(),
});

// ─── Small UI helpers (match CourseForm) ─────────────────────
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
        className="flex-1 min-w-[140px] py-1 text-sm outline-none placeholder:text-gray-300 bg-transparent"
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
const MentorForm = ({ mode = 'create', mentorId = null }) => {
  const isEdit = mode === 'edit';
  const router = useRouter();

  const [fetching, setFetching] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [toast, setToast] = useState(null);
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
    resolver: zodResolver(mentorSchema),
    defaultValues: {
      id: '', name: '', email: '', phone: '',
      designation: '', subject: '', image: '',
      training_experience: { years: '', students: '' },
      specialized_area: [], education_qualification: [], work_experience: [],
      details: '', lifeJourney: '',
      password: '', isPublished: true,
    },
  });

  const imageUrl = watch('image');
  const isPublished = watch('isPublished');
  const [createdCreds, setCreatedCreds] = useState(null); // login creds to show after create

  // Coming from "Add Staff → Mentor" (?unpublished=1) → default to hidden-from-website
  useEffect(() => {
    if (isEdit || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('unpublished') === '1') {
      setValue('isPublished', false);
    }
  }, [isEdit, setValue]);

  // ─── Edit mode: load existing mentor ───────────────────────
  useEffect(() => {
    if (!isEdit || !mentorId) return;
    const load = async () => {
      try {
        const res = await fetch(`${API}/mentors/${mentorId}`);
        const data = await res.json();
        const m = data.data || data;
        if (!m || !m._id) throw new Error('Mentor not found');
        reset({
          id: m.id || '', name: m.name || '', email: m.email || '', phone: m.phone || '',
          designation: m.designation || '', subject: m.subject || '', image: m.image || '',
          training_experience: {
            years: m.training_experience?.years || '',
            students: m.training_experience?.students || '',
          },
          specialized_area: m.specialized_area || [],
          education_qualification: m.education_qualification || [],
          work_experience: m.work_experience || [],
          details: m.details || '', lifeJourney: m.lifeJourney || '',
          password: '', isPublished: m.isPublished !== false,
        });
      } catch (err) {
        showToast('error', 'Failed to load mentor. Redirecting...');
        setTimeout(() => router.push('/dashboard/admin/mentor'), 1200);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [isEdit, mentorId, reset, router]);

  // ─── Image upload (Cloudinary via backend) ─────────────────
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
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        name: data.name.trim(),
        specialized_area: data.specialized_area.map(s => s.trim()).filter(Boolean),
        education_qualification: data.education_qualification.map(s => s.trim()).filter(Boolean),
        work_experience: data.work_experience.map(s => s.trim()).filter(Boolean),
      };
      const url = isEdit ? `${API}/mentors/${mentorId}` : `${API}/mentors/create-mentor`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || result.success === false) {
        showToast('error', result.message || 'Failed to save mentor');
        return;
      }
      // On create, surface the auto-created login credentials so the admin can
      // share them with the mentor (shown once — password isn't retrievable later).
      if (!isEdit && result.credentials?.userCreated && result.credentials?.password) {
        setCreatedCreds(result.credentials);
        return;
      }
      showToast('success', isEdit ? 'Mentor updated successfully' : 'Mentor created successfully');
      setTimeout(() => router.push('/dashboard/admin/mentor'), 800);
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
        <p className="text-sm text-gray-400 work">Loading mentor...</p>
      </div>
    );
  }

  const saveLabel = saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Mentor';

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24">
      {/* ─── Sticky Top Bar ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#F3A522] via-[#e2941c] to-[#9AA0A8]"></div>
        <div className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard/admin/mentor"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-[#c9871a] transition-colors"
            >
              <FiArrowLeft size={12} /> Mentors
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 outfit truncate">
              {isEdit ? 'Edit Mentor' : 'Create New Mentor'}
            </h1>
          </div>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving || uploading}
            className="flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/25 hover:shadow-xl hover:shadow-[#F3A522]/30 disabled:opacity-50 transition-all"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
            <span className="hidden sm:inline">{saveLabel}</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 pt-6">
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
                <SectionTitle icon={LuUser} title="Basic Information" hint="Name, contact and role shown on the public mentor page" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Mentor Name *</label>
                    <input {...register('name')} className={inputClass} placeholder="e.g. Rahim Uddin" />
                    <FieldError msg={errors.name?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Mentor ID *</label>
                    <input
                      {...register('id')}
                      readOnly={isEdit}
                      className={`${inputClass} ${isEdit ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                      placeholder="e.g. MNT-001"
                    />
                    <FieldError msg={errors.id?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input {...register('email')} className={inputClass} placeholder="email@domain.com" />
                    <FieldError msg={errors.email?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone *</label>
                    <input {...register('phone')} className={inputClass} placeholder="+8801XXXXXXXXX" />
                    <FieldError msg={errors.phone?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Designation *</label>
                    <input {...register('designation')} className={inputClass} placeholder="e.g. Lead Instructor" />
                    <FieldError msg={errors.designation?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Main Subject *</label>
                    <input {...register('subject')} className={inputClass} placeholder="e.g. Graphic Design" />
                    <FieldError msg={errors.subject?.message} />
                  </div>
                </div>
              </Card>

              {/* Expertise */}
              <Card>
                <SectionTitle icon={LuBriefcase} title="Expertise & Background" hint="Type a value and press Enter to add it as a tag" />
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Specialized Areas *</label>
                    <Controller
                      control={control}
                      name="specialized_area"
                      render={({ field }) => (
                        <ChipsInput value={field.value || []} onChange={field.onChange}
                          placeholder="e.g. UI/UX Design — press Enter" invalid={!!errors.specialized_area} />
                      )}
                    />
                    <FieldError msg={errors.specialized_area?.message || errors.specialized_area?.root?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Education Qualification *</label>
                    <Controller
                      control={control}
                      name="education_qualification"
                      render={({ field }) => (
                        <ChipsInput value={field.value || []} onChange={field.onChange}
                          placeholder="e.g. B.Sc in CSE — press Enter" invalid={!!errors.education_qualification} />
                      )}
                    />
                    <FieldError msg={errors.education_qualification?.message || errors.education_qualification?.root?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Work Experience *</label>
                    <Controller
                      control={control}
                      name="work_experience"
                      render={({ field }) => (
                        <ChipsInput value={field.value || []} onChange={field.onChange}
                          placeholder="e.g. Senior Dev at Google — press Enter" invalid={!!errors.work_experience} />
                      )}
                    />
                    <FieldError msg={errors.work_experience?.message || errors.work_experience?.root?.message} />
                  </div>
                </div>
              </Card>

              {/* Biography */}
              <Card>
                <SectionTitle icon={LuFileText} title="Biography" hint="Shown on the public mentor detail page" />
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Detailed Description *</label>
                    <textarea {...register('details')} rows={4} className={inputClass} placeholder="Full professional details about the mentor..." />
                    <FieldError msg={errors.details?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Life Journey *</label>
                    <textarea {...register('lifeJourney')} rows={4} className={inputClass} placeholder="The story of their professional path..." />
                    <FieldError msg={errors.lifeJourney?.message} />
                  </div>
                </div>
              </Card>
            </div>

            {/* ══ RIGHT (sidebar) ══ */}
            <div className="space-y-6">

              {/* Profile Image */}
              <Card>
                <SectionTitle icon={FiImage} title="Profile Image" hint="JPG / PNG / WebP — max 5MB" />
                <div
                  onClick={() => !uploading && imageMode === 'upload' && fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageFile(e.dataTransfer.files?.[0]); }}
                  className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed transition-all
                    ${errors.image ? 'border-red-300' : 'border-gray-200 hover:border-[#F3A522]/60'}
                    ${imageMode === 'upload' ? 'cursor-pointer' : ''} bg-gray-50 group`}
                >
                  {imageUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Mentor preview" className="w-full h-full object-cover" />
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
                        {uploading ? 'Uploading...' : 'Click or drop a photo here'}
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

              {/* Experience Metrics */}
              <Card>
                <SectionTitle icon={LuAward} title="Experience Metrics" hint="Shown as stats on the profile" />
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Years of Experience *</label>
                    <input {...register('training_experience.years')} className={inputClass} placeholder="e.g. 8" />
                    <FieldError msg={errors.training_experience?.years?.message} />
                  </div>
                  <div>
                    <label className={labelClass}>Students Trained *</label>
                    <input {...register('training_experience.students')} className={inputClass} placeholder="e.g. 1500" />
                    <FieldError msg={errors.training_experience?.students?.message} />
                  </div>
                </div>
              </Card>

              {/* Website visibility + login access */}
              <Card>
                <SectionTitle icon={LuGlobe} title="Website & Login" hint="Public visibility + auto-created mentor login" />
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setValue('isPublished', !isPublished)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${isPublished ? 'border-[#F0DFB4] bg-[#FEF6E7]/50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800">{isPublished ? 'Shown on website' : 'Hidden from website'}</p>
                      <p className="text-[11px] text-gray-400">{isPublished ? 'Appears on the public Mentors page' : 'Created but not shown publicly'}</p>
                    </div>
                    <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPublished ? 'bg-[#F3A522]' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isPublished ? 'left-[22px]' : 'left-0.5'}`} />
                    </span>
                  </button>

                  {!isEdit && (
                    <div>
                      <label className={labelClass}>Login Password</label>
                      <input {...register('password')} className={inputClass} placeholder="Leave blank → Mentor@123456" />
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <LuKeyRound size={11} /> A <b className="text-[#c9871a] mx-0.5">mentor</b>-role login is auto-created with this email.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Bottom save */}
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

      {/* ─── Login credentials (shown once after create) ───────── */}
      {createdCreds && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white">
              <h3 className="font-bold outfit flex items-center gap-2"><FiCheckCircle /> Mentor account created</h3>
              <p className="text-white/80 text-xs mt-0.5">Share these login details with the mentor</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</p>
                  <p className="font-mono text-sm text-gray-800 break-all">{createdCreds.email}</p>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Password</p>
                  <p className="font-mono text-sm text-gray-800">{createdCreds.password}</p>
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</p>
                  <p className="text-sm font-semibold text-[#c9871a] capitalize">mentor · dashboard access</p>
                </div>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                ⚠ The password won&apos;t be shown again — copy it now.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { try { navigator.clipboard?.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`); showToast('success', 'Copied to clipboard'); } catch { } }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  <LuCopy size={14} /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/admin/mentor')}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold hover:shadow-lg transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorForm;

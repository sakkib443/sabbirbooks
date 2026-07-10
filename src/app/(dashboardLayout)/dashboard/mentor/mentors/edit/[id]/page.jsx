'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiLoader } from 'react-icons/fi';
import Link from 'next/link';

// Zod Schema
const mentorValidationSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(1, 'Phone number is required'),
    designation: z.string().min(1, 'Designation is required'),
    subject: z.string().min(1, 'Subject is required'),
    specialized_area: z.array(z.string().min(1)).nonempty('At least one specialized area is required'),
    education_qualification: z.array(z.string().min(1)).nonempty('At least one education qualification is required'),
    work_experience: z.array(z.string().min(1)).nonempty('At least one work experience is required'),
    training_experience: z.object({
        years: z.string().min(1, 'Years is required'),
        students: z.string().min(1, 'Students count is required'),
    }),
    image: z.string().url('Valid image URL is required'),
    details: z.string().min(1, 'Details is required'),
    lifeJourney: z.string().min(1, 'Life journey is required'),
});

const MentorEditMentor = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const router = useRouter();
    const { id } = useParams();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm({
        resolver: zodResolver(mentorValidationSchema),
    });

    // Dynamic field helpers
    const specFields = useFieldArray({ control, name: 'specialized_area' });
    const eduFields = useFieldArray({ control, name: 'education_qualification' });
    const workFields = useFieldArray({ control, name: 'work_experience' });

    // Fetch Existing Mentor Data
    useEffect(() => {
        const fetchMentor = async () => {
            try {
                setFetching(true);
                const res = await fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/mentors/${id}`);
                const result = await res.json();

                if (res.ok) {
                    reset(result.data || result);
                } else {
                    alert("Mentor not found!");
                    router.push('/dashboard/mentor/mentors');
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setFetching(false);
            }
        };
        if (id) fetchMentor();
    }, [id, reset, router]);

    // Submit Handler
    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const response = await fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/mentors/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert('Mentor profile updated successfully! ✨');
                router.push('/dashboard/mentor/mentors');
            } else {
                alert('Failed to update mentor');
            }
        } catch (error) {
            alert('Network error!');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none text-[13px] transition-all bg-white";
    const labelClass = "block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider";
    const errorClass = "text-red-500 text-[10px] mt-1 font-medium";

    if (fetching) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <FiLoader className="animate-spin text-[#41bfb8]" size={35} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-poppins">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/dashboard/mentor/mentors" className="flex items-center gap-2 text-slate-500 hover:text-[#41bfb8] text-xs mb-2">
                            <FiArrowLeft /> Cancel Editing
                        </Link>
                        <h1 className="text-2xl font-outfit font-bold text-slate-900">Update Mentor Details</h1>
                    </div>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-[#41bfb8] text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-[#38a89d] shadow-lg disabled:bg-slate-300 transition-all"
                    >
                        {loading ? 'Updating...' : <><FiSave /> Save Changes</>}
                    </button>
                </div>

                <form className="space-y-6">
                    {/* Card 1: Core Information */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2 text-[11px] font-extrabold border-b pb-2 uppercase tracking-[2px] text-[#41bfb8]">Core Identity & Contact</div>

                        <div className="space-y-1">
                            <label className={labelClass}>Mentor Unique ID</label>
                            <input {...register('id')} className={inputClass} readOnly />
                        </div>

                        <div className="space-y-1">
                            <label className={labelClass}>Mentor Name</label>
                            <input {...register('name')} className={inputClass} placeholder="Full Name" />
                            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className={labelClass}>Email Address</label>
                            <input {...register('email')} className={inputClass} placeholder="Email" />
                            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className={labelClass}>Phone Number</label>
                            <input {...register('phone')} className={inputClass} placeholder="Phone" />
                            {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className={labelClass}>Designation</label>
                            <input {...register('designation')} className={inputClass} placeholder="e.g. Senior Instructor" />
                            {errors.designation && <p className={errorClass}>{errors.designation.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className={labelClass}>Main Subject</label>
                            <input {...register('subject')} className={inputClass} placeholder="Subject Name" />
                            {errors.subject && <p className={errorClass}>{errors.subject.message}</p>}
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <label className={labelClass}>Profile Image URL</label>
                            <input {...register('image')} className={inputClass} placeholder="https://..." />
                            {errors.image && <p className={errorClass}>{errors.image.message}</p>}
                        </div>
                    </div>

                    {/* Card 2: Training Stats */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-[11px] font-extrabold border-b pb-2 mb-5 uppercase tracking-[2px] text-[#41bfb8]">Experience Metrics</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className={labelClass}>Years of Experience</label>
                                <input {...register('training_experience.years')} className={inputClass} />
                                {errors.training_experience?.years && <p className={errorClass}>{errors.training_experience.years.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>Total Students Trained</label>
                                <input {...register('training_experience.students')} className={inputClass} />
                                {errors.training_experience?.students && <p className={errorClass}>{errors.training_experience.students.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Dynamic List Sections (Arrays) */}
                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { title: 'Specialized Areas', fields: specFields, name: 'specialized_area', ph: 'Skill...' },
                            { title: 'Education Background', fields: eduFields, name: 'education_qualification', ph: 'Degree...' },
                            { title: 'Professional Work History', fields: workFields, name: 'work_experience', ph: 'Company/Role...' }
                        ].map((section) => (
                            <div key={section.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-[11px] font-extrabold uppercase tracking-[2px] text-[#41bfb8]">{section.title}</label>
                                    <button
                                        type="button"
                                        onClick={() => section.fields.append('')}
                                        className="text-[10px] flex items-center gap-1 font-black text-[#9AA0A8] hover:bg-orange-50 px-2 py-1 rounded"
                                    >
                                        <FiPlus /> ADD NEW
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {section.fields.fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-2 group">
                                            <input
                                                {...register(`${section.name}.${index}`)}
                                                className={inputClass}
                                                placeholder={section.ph}
                                            />
                                            {section.fields.fields.length > 1 && (
                                                <button type="button" onClick={() => section.fields.remove(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <FiTrash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {errors[section.name] && <p className={errorClass}>{errors[section.name]?.message}</p>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Card 3: Narrative Bio */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                        <div className="text-[11px] font-extrabold border-b pb-2 uppercase tracking-[2px] text-[#41bfb8]">Biography & Professional Story</div>
                        <div className="space-y-1">
                            <label className={labelClass}>Detailed Profile Description</label>
                            <textarea {...register('details')} rows={4} className={inputClass} placeholder="About the mentor..." />
                            {errors.details && <p className={errorClass}>{errors.details.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className={labelClass}>The Life Journey</label>
                            <textarea {...register('lifeJourney')} rows={4} className={inputClass} placeholder="Career path and milestones..." />
                            {errors.lifeJourney && <p className={errorClass}>{errors.lifeJourney.message}</p>}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MentorEditMentor;

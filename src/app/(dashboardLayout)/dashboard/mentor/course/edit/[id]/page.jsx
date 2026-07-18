'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft, FiLoader } from 'react-icons/fi';
import Link from 'next/link';

// Zod Schema — simplified: only `title` required, everything else optional.
const courseValidationSchema = z.object({
    id: z.coerce.number().optional(),
    title: z.string().min(1, "Title is required"),
    slug: z.string().optional().or(z.literal("")),
    category: z.string().optional().or(z.literal("")),
    type: z.string().optional().or(z.literal("")),
    image: z.string().optional().or(z.literal("")),
    fee: z.string().optional().or(z.literal("")),
    rating: z.coerce.number().optional(),
    totalRating: z.coerce.number().optional(),
    totalStudentsEnroll: z.coerce.number().optional(),
    mentor: z.string().optional().or(z.literal("")),
    courseStart: z.string().optional().or(z.literal("")),
    durationMonth: z.coerce.number().optional(),
    lectures: z.coerce.number().optional(),
    totalExam: z.coerce.number().optional(),
    details: z.string().optional().or(z.literal("")),
    courseOverview: z.string().optional().or(z.literal("")),
    curriculum: z.array(z.string()).optional(),
});

const MentorEditCourse = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [categories, setCategories] = useState([]);
    const [mentors, setMentors] = useState([]);

    const router = useRouter();
    const { id } = useParams();

    const inputClass = "w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none text-[13px] bg-white transition-all";
    const labelClass = "block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-widest";

    const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(courseValidationSchema),
        defaultValues: {
            curriculum: []
        }
    });

    const curriculums = useFieldArray({ control, name: 'curriculum' });

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setFetching(true);

                const [catRes, mentorRes, courseRes] = await Promise.all([
                    fetch(((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api/categories'),
                    fetch(((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api/mentors'),
                    fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/courses/${id}`)
                ]);

                const catData = await catRes.json();
                const mentorData = await mentorRes.json();
                const courseData = await courseRes.json();

                setCategories(catData.data || []);
                setMentors(mentorData.data || []);

                const fetchedCourse = courseData.data || courseData;

                if (fetchedCourse) {
                    const formattedData = {
                        ...fetchedCourse,
                        category: fetchedCourse.category?._id || fetchedCourse.category,
                        mentor: fetchedCourse.mentor?._id || fetchedCourse.mentor,
                        curriculum: fetchedCourse.curriculum || [],
                    };

                    reset(formattedData);
                }
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setFetching(false);
            }
        };

        fetchData();
    }, [id, reset]);

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            const response = await fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/courses/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert('Course Updated Successfully! ✅');
                router.push('/dashboard/mentor/course');
            } else {
                const result = await response.json();
                alert(`Update Failed: ${result.message}`);
            }
        } catch (error) {
            alert('Network error!');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <FiLoader className="animate-spin text-[#41bfb8]" size={35} />
            <p className="ml-2 text-sm text-slate-500 font-medium uppercase tracking-widest">Loading Course Data...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-poppins text-slate-700">
            <div className="max-w-5xl mx-auto pb-20">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/dashboard/mentor/course" className="text-slate-500 flex items-center gap-2 text-xs font-bold hover:text-[#41bfb8] transition-all">
                            <FiArrowLeft /> Back to Courses
                        </Link>
                        <h1 className="text-2xl font-black text-slate-900 mt-2 outfit">Edit Course</h1>
                    </div>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={loading}
                        className="bg-[#41bfb8] text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-[#38a89d] disabled:bg-slate-300 transition-all flex items-center gap-2"
                    >
                        <FiSave /> {loading ? 'Processing...' : 'Save Changes'}
                    </button>
                </div>

                <form className="space-y-6">
                    {/* Card 1 - Identity */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5">
                        <h2 className="md:col-span-3 text-[10px] font-black uppercase border-b pb-2 tracking-[2px] text-[#41bfb8]">1. Identity & Classification</h2>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Course Title</label>
                            <input {...register('title')} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Numeric ID</label>
                            <input {...register('id')} className={inputClass} readOnly />
                        </div>
                        <div>
                            <label className={labelClass}>Category</label>
                            <select {...register('category')} className={inputClass}>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Mentor</label>
                            <select {...register('mentor')} className={inputClass}>
                                <option value="">Select Mentor</option>
                                {mentors.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Delivery Type</label>
                            <select {...register('type')} className={inputClass}>
                                <option value="Online">Online</option>
                                <option value="Offline">Offline</option>
                                <option value="Recorded">Recorded</option>
                            </select>
                        </div>
                    </div>

                    {/* Card 2 - Metrics */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-5">
                        <h2 className="md:col-span-4 text-[10px] font-black uppercase border-b pb-2 tracking-[2px] text-[#41bfb8]">2. Metrics</h2>
                        <div><label className={labelClass}>Fee</label><input {...register('fee')} className={inputClass} /></div>
                        <div><label className={labelClass}>Duration (Months)</label><input type="number" {...register('durationMonth')} className={inputClass} /></div>
                        <div><label className={labelClass}>Lectures</label><input type="number" {...register('lectures')} className={inputClass} /></div>
                        <div><label className={labelClass}>Rating</label><input type="number" step="0.1" {...register('rating')} className={inputClass} /></div>
                        <div className="md:col-span-4"><label className={labelClass}>Image URL</label><input {...register('image')} className={inputClass} /></div>
                    </div>

                    {/* Card 3: Dynamic Arrays */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#41bfb8]">Curriculum</label>
                                <button type="button" onClick={() => curriculums.append('')} className="text-[10px] font-black text-[#9AA0A8] underline">+ ADD MODULE</button>
                            </div>
                            <div className="space-y-2">
                                {curriculums.fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <input {...register(`curriculum.${index}`)} className={inputClass} />
                                        <button type="button" onClick={() => curriculums.remove(index)} className="text-red-400 p-2"><FiTrash2 /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Section 4 - Narratives */}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <h2 className="text-[10px] font-black uppercase border-b pb-2 tracking-[2px] text-[#41bfb8]">3. Narratives</h2>
                        <div><label className={labelClass}>Course Overview</label><textarea {...register('courseOverview')} rows={2} className={inputClass} /></div>
                        <div><label className={labelClass}>Detailed Info</label><textarea {...register('details')} rows={4} className={inputClass} /></div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MentorEditCourse;

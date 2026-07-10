'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FiEdit2,
    FiEye,
    FiSearch,
    FiMail,
    FiPhone,
    FiUsers,
    FiGrid,
    FiList,
} from 'react-icons/fi';

export default function MentorMentorsPage() {
    const [mentors, setMentors] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/mentors');
                const data = await res.json();
                setMentors(Array.isArray(data) ? data : data.data || []);
            } catch (error) {
                console.error("Error fetching mentors:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = mentors.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
    );

    // Loading Skeleton
    const MentorSkeleton = () => (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="h-48 bg-slate-200 animate-pulse"></div>
            <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2"></div>
                <div className="flex gap-2 pt-2">
                    <div className="h-6 bg-slate-200 rounded animate-pulse flex-1"></div>
                    <div className="h-6 bg-slate-200 rounded animate-pulse flex-1"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 outfit">Mentor Management</h1>
                    <p className="text-slate-500 text-sm work">View and edit instructor profiles</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                {/* Search */}
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        placeholder="Search mentors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none text-sm transition-all"
                    />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#41bfb8]' : 'text-slate-500'}`}
                    >
                        <FiGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#41bfb8]' : 'text-slate-500'}`}
                    >
                        <FiList size={18} />
                    </button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <FiUsers className="text-[#41bfb8]" />
                    <span className="text-sm font-medium text-slate-700">{mentors.length} Mentors</span>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <MentorSkeleton key={i} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <FiUsers className="mx-auto text-4xl text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No Mentors Found</h3>
                    <p className="text-slate-500 text-sm mt-1">Try adjusting your search</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((mentor) => (
                        <div key={mentor._id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300">
                            {/* Image */}
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={mentor.image}
                                    alt={mentor.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-3 left-3 right-3">
                                    <h3 className="text-white font-bold text-sm truncate">{mentor.name}</h3>
                                    <p className="text-white/80 text-xs">{mentor.designation}</p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {/* Contact */}
                                <div className="space-y-2 mb-3">
                                    {mentor.email && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <FiMail className="text-[#41bfb8] shrink-0" size={12} />
                                            <span className="truncate">{mentor.email}</span>
                                        </div>
                                    )}
                                    {mentor.phone && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <FiPhone className="text-[#9AA0A8] shrink-0" size={12} />
                                            <span>{mentor.phone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Subject */}
                                <div className="text-xs text-slate-700 mb-3">
                                    <span className="font-semibold text-slate-800">Subject:</span> {mentor.subject}
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {mentor.specialized_area?.slice(0, 2).map((item, i) => (
                                        <span key={i} className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                            {item}
                                        </span>
                                    ))}
                                    {mentor.specialized_area?.length > 2 && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                                            +{mentor.specialized_area.length - 2}
                                        </span>
                                    )}
                                </div>

                                {/* Experience */}
                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase">Experience</p>
                                        <p className="font-bold text-slate-800">{mentor.training_experience?.years} Years</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-400 text-[10px] uppercase">Students</p>
                                        <p className="font-bold text-slate-800">{mentor.training_experience?.students}+</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions - View & Edit only (no delete for mentor) */}
                            <div className="flex border-t border-slate-100">
                                <Link
                                    href={`/mentors/${mentor._id}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 text-[#41bfb8] hover:bg-[#41bfb8]/10 text-xs font-bold transition-colors"
                                >
                                    <FiEye size={14} /> View
                                </Link>
                                <Link
                                    href={`/dashboard/mentor/mentors/edit/${mentor._id}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 text-amber-600 hover:bg-amber-50 text-xs font-bold transition-colors border-l border-slate-100"
                                >
                                    <FiEdit2 size={14} /> Edit
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {filtered.map((mentor) => (
                        <div key={mentor._id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                            <img src={mentor.image} alt={mentor.name} className="w-14 h-14 object-cover rounded-xl" />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-800">{mentor.name}</h3>
                                <p className="text-xs text-slate-500">{mentor.designation} � {mentor.subject}</p>
                            </div>
                            <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
                                <span>{mentor.training_experience?.years} Yrs Exp</span>
                                <span>{mentor.training_experience?.students}+ Students</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/mentors/${mentor._id}`}
                                    className="p-2 text-[#41bfb8] hover:bg-[#41bfb8]/10 rounded-lg transition-colors"
                                >
                                    <FiEye size={16} />
                                </Link>
                                <Link
                                    href={`/dashboard/mentor/mentors/edit/${mentor._id}`}
                                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                >
                                    <FiEdit2 size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

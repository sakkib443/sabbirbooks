'use client';

import React, { useEffect, useState } from 'react';
import { FiEdit3, FiLoader, FiCheck, FiX, FiGrid, FiSearch, FiEye } from 'react-icons/fi';
import Link from 'next/link';

const MentorCategoryPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState('');

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch(((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api/categories');
            const result = await res.json();
            setCategories(result.data || result);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, ''))}/api/categories/${editData._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: Number(editData.id), name: editData.name }),
            });
            if (res.ok) {
                setEditData(null);
                fetchCategories();
            }
        } catch (err) { alert("Update failed"); }
    };

    const filtered = categories.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase())
    );

    const categoryColors = ['#41bfb8', '#9AA0A8', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981'];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 outfit">Category Management</h1>
                    <p className="text-slate-500 text-sm work">View and edit course categories</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        placeholder="Search categories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8] outline-none text-sm transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                    <FiGrid className="text-[#8B5CF6]" />
                    <span className="text-sm font-medium text-slate-700">{categories.length} Categories</span>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <FiLoader className="animate-spin text-[#41bfb8]" size={35} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <FiGrid className="mx-auto text-4xl text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800">No Categories Found</h3>
                    <p className="text-slate-500 text-sm mt-1">No categories match your search</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map((cat, idx) => {
                        const color = categoryColors[idx % categoryColors.length];
                        return (
                            <div
                                key={cat._id}
                                className="group bg-white p-5 rounded-xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                                        style={{ backgroundColor: color }}
                                    >
                                        {cat.id}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-slate-800 truncate">{cat.name}</h3>
                                        <p className="text-xs text-slate-400 mt-1">ID: {cat.id}</p>
                                    </div>
                                </div>

                                {/* Actions - View & Edit only (no delete for mentor) */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                                    <Link
                                        href={`/courses?category=${cat.id}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-[#41bfb8] hover:bg-[#41bfb8]/10 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <FiEye size={14} /> View
                                    </Link>
                                    <button
                                        onClick={() => setEditData(cat)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-bold transition-colors"
                                    >
                                        <FiEdit3 size={14} /> Edit
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit Modal */}
            {editData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 outfit">Edit Category</h3>
                            <button onClick={() => setEditData(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <FiX />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Category ID</label>
                                <input
                                    type="number"
                                    value={editData.id}
                                    onChange={(e) => setEditData({ ...editData, id: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8]"
                                    placeholder="Category ID"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Category Name</label>
                                <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#41bfb8]/20 focus:border-[#41bfb8]"
                                    placeholder="Category Name"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-[#41bfb8] hover:bg-[#38a89d] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <FiCheck /> Update Category
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorCategoryPage;

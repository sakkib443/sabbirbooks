'use client';

import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit3, FiTrash2, FiLoader, FiCheck, FiX, FiGrid, FiSearch } from 'react-icons/fi';
import Link from 'next/link';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api/categories');
      const result = await res.json();
      setCategories(result.data || result);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleDelete = async (mongoId) => {
    const ok = await confirm({ title: 'Delete this category?', message: 'This action cannot be undone.', confirmText: 'Delete' });
    if (!ok) return;
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/api/categories/${mongoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setCategories(prev => prev.filter(c => c._id !== mongoId));
        showToast('success', 'Category deleted');
      } else {
        showToast('error', result.message || 'Delete failed');
      }
    } catch (err) { showToast('error', 'Delete failed'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')}/api/categories/${editData._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ name: editData.name }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setEditData(null);
        fetchCategories();
        showToast('success', 'Category updated');
      } else {
        showToast('error', result.message || 'Update failed');
      }
    } catch (err) { showToast('error', 'Update failed'); }
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
          <p className="text-slate-500 text-sm work">Organize your courses into categories</p>
        </div>
        <Link href="/dashboard/admin/category/create">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4fe0] text-white font-medium text-sm rounded-xl shadow-lg shadow-purple-200 transition-all hover:scale-105">
            <FiPlus size={16} />
            Add Category
          </button>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] outline-none text-sm transition-all"
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
          <p className="text-slate-500 text-sm mt-1">Create your first category</p>
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

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setEditData(cat)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-bold transition-colors"
                  >
                    <FiEdit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors"
                  >
                    <FiTrash2 size={14} /> Delete
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
                  readOnly
                  disabled
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-slate-50 text-slate-400 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">* ID is auto-assigned and cannot be changed.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Category Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]"
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

      {toastNode}
      {confirmNode}
    </div>
  );
};

export default CategoryPage;

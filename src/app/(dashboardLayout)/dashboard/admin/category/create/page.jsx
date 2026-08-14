'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiLoader, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link';
import { useToast } from '@/components/shared/Toast';

const CreateCategory = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api/categories/create-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ name }), // id backend-এ অটো সিরিয়ালি তৈরি হয়
      });

      const result = await response.json();

      if (response.ok) {
        showToast('success', 'Category created successfully!');
        setTimeout(() => router.push('/dashboard/admin/category'), 900);
      } else {
        showToast('error', result.message || 'Failed to create category');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('error', 'Network error! Please check your server.');
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-dash-line focus:ring-2 focus:ring-[#f79952]/20 focus:border-[#f79952] outline-none text-sm transition-all bg-dash-card font-medium";
  const labelClass = "block text-[11px] font-bold text-dash-mute mb-2 uppercase tracking-widest";

  return (
    <div className="min-h-screen bg-dash-soft p-6 md:p-12 font-poppins">
      <div className="max-w-xl mx-auto">

        {/* Navigation */}
        <Link href="/dashboard/admin/category" className="flex items-center gap-2 text-dash-mute hover:text-[#f79952] text-xs mb-6 transition-colors font-semibold">
          <FiArrowLeft /> Back to Categories
        </Link>

        {/* Card */}
        <div className="bg-dash-card rounded-[32px] shadow-xl shadow-dash-line/50 border border-dash-line-soft overflow-hidden">
          <div className="h-2 w-full bg-[#f79952]"></div>

          <div className="p-8 md:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-dash-ink2 tracking-tight">Create <span className="text-aqua">Category</span></h1>
              <p className="text-dash-mute2 text-xs mt-1">Just type a name — the ID is assigned automatically.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Name */}
              <div>
                <label className={labelClass}>Category Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Graphic Design"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[10px] text-dash-mute2 mt-2 italic">* A sequential ID (1, 2, 3 …) is generated automatically.</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${loading ? 'bg-dash-faint' : 'bg-aqua hover:bg-aqua-hover shadow-teal-100 active:scale-95'}`}
              >
                {loading ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <><FiCheckCircle size={18} /> Create Category</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Summary Info */}
        <div className="mt-8 p-4 bg-[#f79952]/5 rounded-2xl border border-[#f79952]/10">
          <p className="text-[11px] text-[#f79952] font-bold text-center uppercase tracking-tighter">
            Note: Categories are used as references in the Course Creation process.
          </p>
        </div>
      </div>
      {toastNode}
    </div>
  );
};

export default CreateCategory;

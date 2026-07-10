'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiStar, FiTrash2, FiRefreshCw, FiEye, FiEyeOff, FiSearch } from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const authHeader = () => ({
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`,
});

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reviews/all`);
      const data = await res.json();
      if (data.success) setReviews(data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete this review?',
      message: 'This review will be permanently removed. This action cannot be undone.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/reviews/${id}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReviews((prev) => prev.filter((r) => r._id !== id));
        showToast('success', 'Review deleted');
      } else {
        showToast('error', data.message || 'Delete failed');
      }
    } catch {
      showToast('error', 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (review) => {
    const next = review.status === 'approved' ? 'rejected' : 'approved';
    setBusyId(review._id);
    try {
      const res = await fetch(`${API_URL}/api/reviews/${review._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReviews((prev) => prev.map((r) => (r._id === review._id ? { ...r, status: next } : r)));
        showToast('success', next === 'approved' ? 'Review shown on website' : 'Review hidden');
      } else {
        showToast('error', data.message || 'Update failed');
      }
    } catch {
      showToast('error', 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = reviews.filter((r) => {
    const matchesSearch =
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.text?.toLowerCase().includes(search.toLowerCase()) ||
      r.courseTag?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const approvedCount = reviews.filter((r) => r.status === 'approved').length;

  return (
    <div className="p-4 lg:p-8 lg:pl-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Student Reviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {reviews.length} total · {approvedCount} shown on website
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, course or text..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-slate-400 py-16">Loading reviews...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-16">No reviews found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((review) => (
            <div
              key={review._id}
              className={`bg-white border rounded-xl p-5 transition-all ${
                review.status === 'rejected' ? 'border-slate-200 opacity-60' : 'border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {review.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.image} alt={review.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {(review.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{review.name}</p>
                    {review.role && <p className="text-xs text-slate-400 truncate">{review.role}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <FiStar
                      key={i}
                      size={13}
                      className={i <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-4">&ldquo;{review.text}&rdquo;</p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {review.courseTag && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600 whitespace-nowrap">
                      {review.courseTag}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                      review.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {review.status === 'approved' ? 'Shown' : 'Hidden'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleStatus(review)}
                    disabled={busyId === review._id}
                    title={review.status === 'approved' ? 'Hide from website' : 'Show on website'}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    {review.status === 'approved' ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                  <button
                    onClick={() => handleDelete(review._id)}
                    disabled={busyId === review._id}
                    title="Delete review"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toastNode}
      {confirmNode}
    </div>
  );
}

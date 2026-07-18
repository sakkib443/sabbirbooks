'use client';

/**
 * Admin — Books catalog management.
 * Lists every book (all statuses via ?status=all), with search + format/status
 * filters, and edit / delete actions. Create lives at /books/create, edit at
 * /books/edit/[id]. Delete hits DELETE /api/books/:id (admin, bearer token).
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiLoader, FiBook, FiStar,
  FiRefreshCw, FiAlertCircle, FiBox, FiDownload,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const bdt = (v) => (typeof v === 'number' ? '৳' + v.toLocaleString('en-US') : '—');

const STATUS_STYLES = {
  published: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  draft: 'bg-amber-50 text-amber-600 border-amber-200',
  archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function AdminBooksPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  // Accepts the status so the filter dropdown can refetch with the new value
  // immediately (state updates are async and wouldn't be visible in the same tick).
  const fetchBooks = async (status = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/books?status=${status}&limit=500`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load books');
      setBooks(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = (status) => {
    setStatusFilter(status);
    fetchBooks(status);
  };

  useEffect(() => { fetchBooks(); }, []); // initial load

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (formatFilter !== 'all' && b.format !== formatFilter) return false;
      if (!q) return true;
      return (
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q)
      );
    });
  }, [books, search, formatFilter]);

  const stats = useMemo(() => ({
    total: books.length,
    published: books.filter((b) => b.status === 'published').length,
    printed: books.filter((b) => b.format === 'printed').length,
    digital: books.filter((b) => b.format === 'digital').length,
  }), [books]);

  const handleDelete = async (book) => {
    const ok = await confirm({
      title: 'Delete this book?',
      message: `“${book.title}” will be permanently removed from the catalog. This cannot be undone.`,
      confirmText: 'Delete',
    });
    if (!ok) return;
    setDeletingId(book._id);
    try {
      const res = await fetch(`${API}/books/${book._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Delete failed');
      setBooks((prev) => prev.filter((b) => b._id !== book._id));
      showToast('success', 'Book deleted');
    } catch (err) {
      showToast('error', err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FiBook className="text-[#F3A522]" /> Books
          </h1>
          <p className="text-slate-500 text-sm">Manage your store catalog — add, edit and remove books.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBooks}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/dashboard/admin/books/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F3A522] text-white font-semibold rounded-lg hover:bg-[#d88f13] transition-all shadow-lg shadow-[#F3A522]/20"
          >
            <FiPlus /> Add Book
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total books" value={stats.total} icon={FiBook} tone="bg-[#FEF6E7] text-[#F3A522]" />
        <StatCard label="Published" value={stats.published} icon={FiStar} tone="bg-emerald-50 text-emerald-500" />
        <StatCard label="Printed" value={stats.printed} icon={FiBox} tone="bg-sky-50 text-sky-500" />
        <StatCard label="Digital" value={stats.digital} icon={FiDownload} tone="bg-violet-50 text-violet-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, author or category…"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/25 focus:border-[#F3A522] outline-none"
          />
        </div>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/25 focus:border-[#F3A522] outline-none text-slate-600"
        >
          <option value="all">All formats</option>
          <option value="printed">Printed</option>
          <option value="digital">Digital</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => changeStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/25 focus:border-[#F3A522] outline-none text-slate-600"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <FiLoader className="animate-spin mr-2" /> Loading books…
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <FiBook className="mx-auto text-slate-300" size={40} />
          <p className="text-slate-500 mt-3 font-medium">No books found</p>
          <p className="text-slate-400 text-sm">
            {books.length === 0 ? 'Add your first book to get started.' : 'Try adjusting the filters.'}
          </p>
          {books.length === 0 && (
            <Link
              href="/dashboard/admin/books/create"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#F3A522] text-white rounded-lg font-medium hover:bg-[#d88f13] transition"
            >
              <FiPlus /> Add Book
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Book</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Format</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <div className="w-10 h-14 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {b.coverImage && (
                            <img src={b.coverImage} alt="" className="w-full h-full object-cover"
                              onError={(e) => (e.target.style.display = 'none')} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 truncate flex items-center gap-1.5">
                            {b.isFeatured && <FiStar className="text-[#F3A522] shrink-0" size={13} title="Featured" />}
                            {b.title}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{b.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${b.format === 'digital' ? 'bg-violet-50 text-violet-600 border-violet-200' : 'bg-sky-50 text-sky-600 border-sky-200'}`}>
                        {b.format}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {typeof b.offerPrice === 'number' && b.offerPrice > 0 && b.offerPrice < b.price ? (
                        <div className="leading-tight">
                          <span className="font-semibold text-slate-700">{bdt(b.offerPrice)}</span>
                          <span className="text-xs text-slate-400 line-through ml-1">{bdt(b.price)}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">{bdt(b.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {b.format === 'printed' ? (
                        <span className={b.stock > 0 ? '' : 'text-red-500 font-medium'}>{b.stock ?? 0}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${STATUS_STYLES[b.status] || STATUS_STYLES.draft}`}>
                        {b.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/admin/books/edit/${b._id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-[#F3A522] hover:bg-[#FEF6E7] transition"
                          title="Edit"
                        >
                          <FiEdit2 size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(b)}
                          disabled={deletingId === b._id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === b._id ? <FiLoader size={15} className="animate-spin" /> : <FiTrash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">
            Showing {filtered.length} of {books.length} book{books.length === 1 ? '' : 's'}
          </div>
        </div>
      )}

      {toastNode}
      {confirmNode}
    </div>
  );
}

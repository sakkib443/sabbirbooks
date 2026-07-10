'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FiDollarSign, FiSearch, FiX, FiLoader, FiRefreshCw,
  FiArrowLeft, FiBook, FiCalendar, FiUsers, FiChevronRight,
  FiFolder,
} from 'react-icons/fi';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';
const hdrs = () => ({ Authorization: `Bearer ${getToken()}` });

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PaymentProgressPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/analytics/batch-overview`, { headers: hdrs() });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const allBatches = [
    ...(data?.running || []).map(b => ({ ...b, _status: 'active' })),
    ...(data?.upcoming || []).map(b => ({ ...b, _status: 'upcoming' })),
    ...(data?.completed || []).map(b => ({ ...b, _status: 'completed' })),
  ];

  const filteredBatches = allBatches.filter(b => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(b.name || '').toLowerCase().includes(q) && !(b.courseName || '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && b._status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-teal-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 outfit">Payment Progress</h1>
          <p className="text-xs text-slate-400 mt-0.5">Select a batch to view student payment details</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            <FiArrowLeft size={12} /> Dashboard
          </Link>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            <FiRefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 w-56">
          <FiSearch size={13} className="text-slate-400 shrink-0" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search batches..."
            className="text-sm text-slate-600 outline-none bg-transparent w-full" />
          {searchQuery && <button onClick={() => setSearchQuery('')}><FiX size={12} className="text-slate-400" /></button>}
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none">
          <option value="all">All Status</option>
          <option value="active">Running</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filteredBatches.length} batches</span>
      </div>

      {/* Batch Folder Grid */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <FiFolder className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-sm text-slate-500">No batches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBatches.map(batch => {
            const statusColor = batch._status === 'active' ? 'emerald' : batch._status === 'upcoming' ? 'blue' : 'slate';
            return (
              <Link key={batch._id} href={`/dashboard/admin/payment-progress/${batch._id}`}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-teal-200 transition-all group">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-${statusColor}-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                    <FiFolder size={18} className={`text-${statusColor}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-teal-700 transition-colors">
                      {batch.name || batch.courseName}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{batch.courseName}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><FiUsers size={10} /> {batch.enrolledStudents || 0}</span>
                      <span className="flex items-center gap-1"><FiCalendar size={10} /> {formatDate(batch.startDate)}</span>
                    </div>
                    <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-${statusColor}-50 text-${statusColor}-600`}>
                      {batch._status === 'active' ? 'Running' : batch._status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                  </div>
                  <FiChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 mt-1 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

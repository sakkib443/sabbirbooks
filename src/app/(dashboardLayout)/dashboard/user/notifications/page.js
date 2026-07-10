'use client';

import React, { useState, useEffect } from 'react';
import { FiBell, FiLoader, FiCheck, FiTrash2, FiCheckCircle, FiX } from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const getToken = () => localStorage.getItem('token') || '';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const typeIcons = {
  payment: '💳', enrollment: '🎉', class: '📅', exam: '📝',
  assignment: '📋', certificate: '🎓', system: '📢', reminder: '⏰',
};

const typeColors = {
  payment: 'bg-emerald-50 border-emerald-200',
  enrollment: 'bg-blue-50 border-blue-200',
  class: 'bg-purple-50 border-purple-200',
  exam: 'bg-amber-50 border-amber-200',
  assignment: 'bg-cyan-50 border-cyan-200',
  certificate: 'bg-green-50 border-green-200',
  system: 'bg-slate-50 border-slate-200',
  reminder: 'bg-red-50 border-red-200',
};

export default function NotificationsPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadNotifications(); }, [page]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications/my?page=${page}&limit=30`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnread(data.data.unread);
        setTotal(data.data.total);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: headers() });
    setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnread(Math.max(0, unread - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: headers() });
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const removeOne = async (id) => {
    await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: headers() });
    setNotifications(notifications.filter(n => n._id !== id));
  };

  const clearAll = async () => {
    if (!(await confirm({ title: 'Clear all notifications?', message: 'সব notification মুছে যাবে। এটা ফেরানো যাবে না।', confirmText: 'Clear All', danger: true }))) return;
    try {
      await fetch(`${API}/notifications/clear-all`, { method: 'DELETE', headers: headers() });
      setNotifications([]);
      setUnread(0);
      showToast('success', 'সব notification মুছে ফেলা হয়েছে');
    } catch { showToast('error', 'Network error'); }
  };

  const filtered = filter === 'all' ? notifications
    : filter === 'unread' ? notifications.filter(n => !n.isRead)
    : notifications.filter(n => n.type === filter);

  if (loading) return <div className="p-6 min-h-screen bg-slate-50 flex items-center justify-center"><FiLoader className="animate-spin text-[#F3A522]" size={30} /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">{unread} unread of {total} total</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F3A522]/10 text-[#F3A522] rounded-xl text-xs font-bold hover:bg-[#F3A522]/20">
              <FiCheckCircle size={14} /> Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">
              <FiTrash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        {['all', 'unread', 'payment', 'class', 'exam', 'assignment', 'certificate', 'system'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
              filter === f ? 'bg-white shadow text-[#F3A522]' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unread})` : `${typeIcons[f] || ''} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border p-16 text-center">
            <FiBell className="mx-auto text-4xl text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-700">No notifications</h3>
            <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
          </div>
        ) : filtered.map(n => (
          <div key={n._id}
            className={`bg-white rounded-xl border p-4 transition hover:shadow-sm cursor-pointer ${
              !n.isRead ? 'border-l-4 border-l-[#F3A522]' : ''
            }`}
            onClick={() => { if (!n.isRead) markRead(n._id); if (n.link) window.location.href = n.link; }}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${typeColors[n.type] || 'bg-slate-50'}`}>
                {typeIcons[n.type] || '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 bg-[#F3A522] rounded-full flex-shrink-0" />}
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full ml-auto">{n.type}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.isRead && (
                  <button onClick={(e) => { e.stopPropagation(); markRead(n._id); }}
                    className="p-1.5 text-[#F3A522] hover:bg-[#FEF6E7] rounded-lg" title="Mark as read"><FiCheck size={14} /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); removeOne(n._id); }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><FiTrash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-50">Previous</button>
          <span className="px-4 py-2 text-sm text-slate-600">Page {page}</span>
          <button disabled={page * 30 >= total} onClick={() => setPage(page + 1)}
            className="px-4 py-2 bg-white border rounded-lg text-sm disabled:opacity-50">Next</button>
        </div>
      )}
      {toastNode}{confirmNode}
    </div>
  );
}

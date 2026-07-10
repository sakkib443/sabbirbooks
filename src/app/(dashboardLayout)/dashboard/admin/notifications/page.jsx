'use client';

import React, { useState, useEffect } from 'react';
import {
  FiSend, FiBell, FiCheck, FiCheckCircle, FiTrash2,
  FiExternalLink, FiLoader, FiSearch, FiX, FiPlus, FiFilter,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const typeConfig = {
  payment:     { icon: '💳', bg: 'bg-emerald-50', label: 'Payment' },
  enrollment:  { icon: '🛒', bg: 'bg-teal-50', label: 'Enrollment' },
  class:       { icon: '📅', bg: 'bg-blue-50', label: 'Class' },
  exam:        { icon: '📝', bg: 'bg-violet-50', label: 'Exam' },
  assignment:  { icon: '📋', bg: 'bg-amber-50', label: 'Assignment' },
  certificate: { icon: '🎓', bg: 'bg-yellow-50', label: 'Certificate' },
  system:      { icon: '📢', bg: 'bg-slate-50', label: 'System' },
  reminder:    { icon: '⏰', bg: 'bg-rose-50', label: 'Reminder' },
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all'); // all, unread, read
  const [showSendForm, setShowSendForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'system', role: 'student' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications/my?limit=100`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnread(data.data.unread || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: headers() });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnread(Math.max(0, unread - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: headers() });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const removeOne = async (id) => {
    await fetch(`${API}/notifications/${id}`, { method: 'DELETE', headers: headers() });
    const n = notifications.find(x => x._id === id);
    if (n && !n.isRead) setUnread(Math.max(0, unread - 1));
    setNotifications(prev => prev.filter(x => x._id !== id));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/notifications/send`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: data.message || 'Notification sent successfully!' });
        setForm({ ...form, title: '', message: '' });
      } else setResult({ success: false, message: data.message });
    } catch { setResult({ success: false, message: 'Error sending notification' }); }
    finally { setSending(false); }
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Filtered notifications
  const filtered = notifications.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'unread' && n.isRead) return false;
    if (filterRead === 'read' && !n.isRead) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (n.title || '').toLowerCase().includes(term) ||
        (n.message || '').toLowerCase().includes(term);
    }
    return true;
  });

  const getConfig = (type) => typeConfig[type] || typeConfig.system;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 outfit">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unread > 0 ? `${unread} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition">
              <FiCheckCircle size={13} /> Mark All Read
            </button>
          )}
          <button onClick={() => setShowSendForm(!showSendForm)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              showSendForm
                ? 'text-slate-600 bg-slate-100 border border-slate-200'
                : 'text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-sm hover:shadow-md'
            }`}>
            {showSendForm ? <><FiX size={13} /> Close</> : <><FiPlus size={13} /> Send Notification</>}
          </button>
        </div>
      </div>

      {/* Send Notification Form */}
      {showSendForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FiSend size={16} className="text-teal-500" /> Send New Notification
          </h3>
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none">
                <option value="system">📢 System Announcement</option>
                <option value="reminder">⏰ Reminder</option>
                <option value="class">📅 Class Update</option>
                <option value="exam">📝 Exam Update</option>
                <option value="payment">💳 Payment Notice</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Send To</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none">
                <option value="student">👨‍🎓 All Students</option>
                <option value="mentor">👨‍🏫 All Mentors</option>
                <option value="admin">👤 All Admins</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                placeholder="e.g. Important Announcement"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Message *</label>
              <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} required
                placeholder="Write your notification message..."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:border-teal-400 outline-none" />
            </div>
            {result && (
              <div className={`md:col-span-2 p-3 rounded-xl text-sm font-semibold ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {result.success ? <FiCheck className="inline mr-1" /> : '⚠️'} {result.message}
              </div>
            )}
            <div className="md:col-span-2">
              <button type="submit" disabled={sending}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-lg disabled:opacity-50 transition">
                {sending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : (
                  <><FiSend size={14} /> Send Notification</>
                )}
              </button>
            </div>
          </form>

          {/* Quick Templates */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {[
                { title: '📢 Platform Maintenance', msg: 'The platform will be under maintenance on Sunday from 2-4 AM.' },
                { title: '🎉 New Course Available', msg: 'A new course has been added. Check it out!' },
                { title: '⏰ Exam Reminder', msg: 'Your upcoming exam is scheduled for next week.' },
                { title: '🎓 Certificates Ready', msg: 'Certificates for completed courses are now ready.' },
              ].map((t, i) => (
                <button key={i} onClick={() => setForm({...form, title: t.title, message: t.msg})}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition text-xs font-medium text-slate-600">
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: `Unread (${unread})` },
            { key: 'read', label: 'Read' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterRead(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterRead === f.key ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 max-w-xs">
          <FiSearch size={13} className="text-slate-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search notifications..."
            className="text-sm text-slate-600 outline-none bg-transparent w-full placeholder:text-slate-400" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
              <FiX size={12} />
            </button>
          )}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 outline-none bg-white">
          <option value="all">All Types</option>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <FiLoader className="animate-spin text-teal-500" size={24} />
            <span className="ml-2 text-sm text-slate-400">Loading notifications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <FiBell className="text-slate-300" size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm ? 'Try a different search term' : filterRead === 'unread' ? 'All notifications are read!' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((n) => {
              const config = getConfig(n.type);
              return (
                <div key={n._id}
                  className={`group relative flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50/50 cursor-pointer ${!n.isRead ? config.bg : ''}`}
                  onClick={() => { if (!n.isRead) markRead(n._id); }}>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${!n.isRead ? 'bg-white shadow-sm border border-slate-100' : 'bg-slate-100'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className="text-lg">{config.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${!n.isRead ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                      {n.link && (
                        <a href={n.link} onClick={e => e.stopPropagation()}
                          className="text-[11px] text-teal-500 flex items-center gap-0.5 hover:text-teal-600">
                          <FiExternalLink size={10} /> Open
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                    {!n.isRead && (
                      <button onClick={(e) => { e.stopPropagation(); markRead(n._id); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition" title="Mark as read">
                        <FiCheckCircle size={14} />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); removeOne(n._id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

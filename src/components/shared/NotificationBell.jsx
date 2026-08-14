'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheckCircle, FiTrash2, FiX, FiExternalLink } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => localStorage.getItem('token') || '';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

const typeConfig = {
  payment:     { icon: '💳', bg: 'bg-emerald-50',  accent: 'border-l-emerald-400' },
  enrollment:  { icon: '🛒', bg: 'bg-teal-50',     accent: 'border-l-teal-400' },
  class:       { icon: '📅', bg: 'bg-blue-50',     accent: 'border-l-blue-400' },
  exam:        { icon: '📝', bg: 'bg-violet-50',   accent: 'border-l-violet-400' },
  assignment:  { icon: '📋', bg: 'bg-amber-50',    accent: 'border-l-amber-400' },
  certificate: { icon: '🎓', bg: 'bg-yellow-50',   accent: 'border-l-yellow-400' },
  system:      { icon: '👤', bg: 'bg-dash-soft',    accent: 'border-l-slate-400' },
  reminder:    { icon: '⏰', bg: 'bg-rose-50',     accent: 'border-l-rose-400' },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [prevUnread, setPrevUnread] = useState(0);
  const [shake, setShake] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Poll unread count every 8s
  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 8000);
    return () => clearInterval(interval);
  }, []);

  // Shake animation when new notification arrives
  useEffect(() => {
    if (unread > prevUnread && prevUnread >= 0) {
      setShake(true);
      setTimeout(() => setShake(false), 800);
    }
    setPrevUnread(unread);
  }, [unread]);

  const loadUnread = async () => {
    try {
      const res = await fetch(`${API}/notifications/unread-count`, { headers: headers() });
      const data = await res.json();
      if (data.success) setUnread(data.data.unread);
    } catch { }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/notifications/my?limit=20`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
        setUnread(data.data.unread);
      }
    } catch { }
    finally { setLoading(false); }
  };

  const toggleOpen = () => {
    if (!open) loadNotifications();
    setOpen(!open);
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

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'এইমাত্র';
    if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} দিন আগে`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const getConfig = (type) => typeConfig[type] || typeConfig.system;

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className={`relative p-2.5 rounded-xl transition-all duration-200 
          ${open ? 'bg-teal-50 text-teal-600' : 'text-dash-mute hover:bg-dash-soft2 hover:text-dash-ink3'}
          ${shake ? 'animate-[bell-shake_0.5s_ease-in-out]' : ''}
        `}
        style={{ animation: shake ? 'bell-shake 0.5s ease-in-out' : 'none' }}
      >
        <FiBell size={19} strokeWidth={2.2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Shake animation keyframes */}
      <style jsx>{`
        @keyframes bell-shake {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-[360px] sm:w-[400px] bg-dash-card rounded-2xl shadow-2xl shadow-dash-line-strong/40 z-50 overflow-hidden border border-dash-line-soft">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-dash-soft to-dash-card border-b border-dash-line-soft/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-sm shadow-teal-500/20">
                <FiBell size={14} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-dash-ink2 text-sm leading-tight">Notifications</h3>
                {unread > 0 && <p className="text-[10px] text-teal-600 font-medium">{unread} unread</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-[11px] text-teal-600 font-semibold hover:text-teal-700 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 transition flex items-center gap-1">
                  <FiCheckCircle size={12} /> সব পড়া হয়েছে
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-dash-soft2 transition">
                <FiX size={15} className="text-dash-mute2" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center">
                <div className="inline-block w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-dash-mute2 mt-2">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-dash-soft2 flex items-center justify-center mx-auto mb-3">
                  <FiBell className="text-dash-faint" size={24} />
                </div>
                <p className="text-sm font-medium text-dash-mute">No notifications yet</p>
                <p className="text-xs text-dash-mute2 mt-1">নতুন নোটিফিকেশন এখানে দেখাবে</p>
              </div>
            ) : (
              notifications.map((n, idx) => {
                const config = getConfig(n.type);
                return (
                  <div key={n._id}
                    className={`group relative px-4 py-3 border-l-[3px] transition-all duration-200 cursor-pointer
                      ${!n.isRead
                        ? `${config.accent} ${config.bg} hover:brightness-[0.97]`
                        : 'border-l-transparent hover:bg-dash-soft/80'
                      }
                      ${idx < notifications.length - 1 ? 'border-b border-dash-line-soft/60' : ''}
                    `}
                    onClick={() => {
                      if (!n.isRead) markRead(n._id);
                      if (n.link) window.location.href = n.link;
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl ${!n.isRead ? 'bg-dash-card shadow-sm' : 'bg-dash-soft2'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <span className="text-base">{config.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] leading-snug ${!n.isRead ? 'font-semibold text-dash-ink' : 'text-dash-ink4'}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[12px] text-dash-mute mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-dash-mute2 font-medium">{timeAgo(n.createdAt)}</span>
                          {n.link && (
                            <span className="text-[10px] text-teal-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                              <FiExternalLink size={9} /> দেখুন
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeOne(n._id); }}
                        className="absolute right-3 top-3 p-1.5 rounded-lg text-dash-faint hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-dash-line-soft/80 bg-gradient-to-r from-dash-soft/80 to-dash-card flex items-center justify-between">
              <a href={(() => {
                  try {
                    const u = JSON.parse(localStorage.getItem('user') || '{}');
                    if (u.role === 'mentor') return '/dashboard/mentor/messages';
                    if (u.role === 'student') return '/dashboard/user/notifications';
                    return '/dashboard/admin/notifications';
                  } catch { return '/dashboard/admin/notifications'; }
                })()}
                className="text-xs text-teal-600 font-semibold hover:text-teal-700 transition">
                সব নোটিফিকেশন দেখুন →
              </a>
              <span className="text-[10px] text-dash-mute2">{notifications.length} টি দেখাচ্ছে</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

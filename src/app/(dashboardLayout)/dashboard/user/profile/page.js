'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiEdit3, FiSave, FiLoader, FiShield,
  FiLock, FiX, FiEye, FiEyeOff, FiImage, FiBook, FiAward,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
const authHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

export default function UserProfilePage() {
  const { showToast, toastNode } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ courses: 0, certificates: 0 });
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', location: '', image: '' });

  // password
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwShow, setPwShow] = useState({ cur: false, next: false, conf: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const fill = (u) => setForm({
    firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '',
    phoneNumber: u.phoneNumber || '', location: u.location || '', image: u.image || '',
  });

  useEffect(() => {
    (async () => {
      // seed from localStorage first (fast), then refresh from server
      try { const su = JSON.parse(localStorage.getItem('user') || 'null'); if (su) { setUser(su); fill(su); } } catch { }
      try {
        const r = await fetch(`${API}/auth/me`, { headers: authHdr() });
        const d = await r.json();
        const u = d?.data || d?.user;
        if (u) { setUser(u); fill(u); }
      } catch { }
      // stats
      try {
        const [en, ce] = await Promise.all([
          fetch(`${API}/enrollments/my-enrollments`, { headers: authHdr() }).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/certificate/my`, { headers: authHdr() }).then(r => r.json()).catch(() => ({})),
        ]);
        setStats({ courses: (en.data || []).length, certificates: (ce.data || []).length });
      } catch { }
      setLoading(false);
    })();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!form.firstName.trim()) return showToast('error', 'First name দিন');
    setSaving(true);
    try {
      const res = await fetch(`${API}/user/profile`, {
        method: 'PATCH', headers: authHdr(),
        body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phoneNumber: form.phoneNumber, location: form.location, image: form.image }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        const merged = { ...(user || {}), firstName: form.firstName, lastName: form.lastName, phoneNumber: form.phoneNumber, location: form.location, image: form.image };
        setUser(merged);
        try { const su = JSON.parse(localStorage.getItem('user') || '{}'); localStorage.setItem('user', JSON.stringify({ ...su, firstName: form.firstName, lastName: form.lastName })); } catch { }
        setIsEditing(false);
        showToast('success', 'প্রোফাইল আপডেট হয়েছে');
      } else showToast('error', data.message || 'সেভ করা যায়নি');
    } catch { showToast('error', 'Network error'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!pw.currentPassword || !pw.newPassword) return showToast('error', 'বর্তমান ও নতুন পাসওয়ার্ড দিন');
    if (pw.newPassword.length < 6) return showToast('error', 'নতুন পাসওয়ার্ড অন্তত ৬ অক্ষর');
    if (pw.newPassword !== pw.confirmPassword) return showToast('error', 'নতুন পাসওয়ার্ড দুটি মিলছে না');
    setPwSaving(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST', headers: authHdr(),
        body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'পাসওয়ার্ড পরিবর্তন হয়েছে');
        setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPwOpen(false);
      } else showToast('error', data.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ');
    } catch { showToast('error', 'Network error'); }
    finally { setPwSaving(false); }
  };

  const inp = 'w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/20 outline-none disabled:bg-slate-50 disabled:text-slate-600';

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 outfit">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal information and account settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] overflow-hidden flex items-center justify-center text-white text-4xl font-bold mx-auto">
              {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : (user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'S')}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-4">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-[#FEF6E7] text-[#a5680f] text-xs font-semibold rounded-full uppercase">{user?.role || 'Student'}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-6">
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-1"><FiBook size={16} className="text-[#c9871a]" />{stats.courses}</p>
              <p className="text-xs text-slate-500">Courses</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl">
              <p className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-1"><FiAward size={16} className="text-[#c9871a]" />{stats.certificates}</p>
              <p className="text-xs text-slate-500">Certificates</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <FiShield className="text-emerald-600" size={20} />
              <div>
                <p className="font-medium text-emerald-900 text-sm">Account Active</p>
                <p className="text-xs text-emerald-700">Status: {user?.status || 'Active'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FiUser className="text-[#F3A522]" /> Personal Information</h2>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#c9871a] hover:bg-[#F3A522]/10 rounded-lg transition">
                <FiEdit3 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsEditing(false); fill(user || {}); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"><FiX size={16} /> Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#F3A522] text-white rounded-lg hover:bg-[#d88f13] disabled:opacity-50 transition">
                  {saving ? <FiLoader className="animate-spin" size={16} /> : <FiSave size={16} />} Save
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
              <div className="relative"><FiUser className="absolute left-3 top-3 text-slate-400" size={18} /><input type="text" name="firstName" value={form.firstName} onChange={handleChange} disabled={!isEditing} className={inp} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
              <div className="relative"><FiUser className="absolute left-3 top-3 text-slate-400" size={18} /><input type="text" name="lastName" value={form.lastName} onChange={handleChange} disabled={!isEditing} className={inp} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative"><FiMail className="absolute left-3 top-3 text-slate-400" size={18} /><input type="email" value={form.email} disabled className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600" /></div>
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <div className="relative"><FiPhone className="absolute left-3 top-3 text-slate-400" size={18} /><input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} disabled={!isEditing} placeholder={isEditing ? '01XXXXXXXXX' : 'Not provided'} className={inp} /></div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <div className="relative"><FiMapPin className="absolute left-3 top-3 text-slate-400" size={18} /><input type="text" name="location" value={form.location} onChange={handleChange} disabled={!isEditing} placeholder={isEditing ? 'Enter your address' : 'Not provided'} className={inp} /></div>
            </div>
            {isEditing && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Image URL <span className="text-slate-400 font-normal">(optional)</span></label>
                <div className="relative"><FiImage className="absolute left-3 top-3 text-slate-400" size={18} /><input type="url" name="image" value={form.image} onChange={handleChange} placeholder="https://..." className={inp} /></div>
              </div>
            )}
          </div>

          {/* Security */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FiLock className="text-[#F3A522]" /> Security</h3>
              {!pwOpen && (
                <button onClick={() => setPwOpen(true)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:border-[#F3A522] hover:text-[#c9871a] transition">Change Password</button>
              )}
            </div>
            {pwOpen && (
              <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 max-w-md">
                {[
                  { k: 'currentPassword', sk: 'cur', label: 'Current Password' },
                  { k: 'newPassword', sk: 'next', label: 'New Password (min 6)' },
                  { k: 'confirmPassword', sk: 'conf', label: 'Confirm New Password' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{f.label}</label>
                    <div className="relative">
                      <input type={pwShow[f.sk] ? 'text' : 'password'} value={pw[f.k]} onChange={e => setPw({ ...pw, [f.k]: e.target.value })} autoComplete="new-password"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/20 outline-none" />
                      <button type="button" onClick={() => setPwShow(s => ({ ...s, [f.sk]: !s[f.sk] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{pwShow[f.sk] ? <FiEyeOff size={15} /> : <FiEye size={15} />}</button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={pwSaving} className="flex items-center gap-2 px-5 py-2.5 bg-[#F3A522] text-white rounded-lg text-sm font-bold hover:bg-[#d88f13] disabled:opacity-50 transition">
                    {pwSaving ? <FiLoader className="animate-spin" size={14} /> : <FiLock size={14} />} Update Password
                  </button>
                  <button type="button" onClick={() => { setPwOpen(false); setPw({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}

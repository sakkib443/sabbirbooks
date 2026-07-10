'use client';

import React, { useState, useEffect } from 'react';
import {
  FiUser, FiMail, FiPhone, FiSave, FiLoader, FiLock, FiBook, FiAward,
  FiEdit3, FiX, FiBriefcase, FiMapPin, FiFileText, FiPlus, FiTrash2,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

export default function MentorProfilePage() {
  const { showToast, toastNode } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mentor, setMentor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  // Password
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mentors/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMentor(data.data);
        setForm(data.data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/mentors/me/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          designation: form.designation,
          subject: form.subject,
          specialized_area: form.specialized_area,
          education_qualification: form.education_qualification,
          work_experience: form.work_experience,
          training_experience: form.training_experience,
          image: form.image,
          details: form.details,
          lifeJourney: form.lifeJourney,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMentor(data.data);
        setForm(data.data);
        setEditing(false);
        showToast('success', 'প্রোফাইল আপডেট হয়েছে');
      } else {
        showToast('error', data.message || 'সেভ করা যায়নি');
      }
    } catch (err) {
      showToast('error', 'Network error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('error', 'নতুন পাসওয়ার্ড দুটি মিলছে না');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      showToast('error', 'পাসওয়ার্ড অন্তত ৬ অক্ষর');
      return;
    }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'পাসওয়ার্ড পরিবর্তন হয়েছে');
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast('error', data.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ');
      }
    } catch (err) {
      showToast('error', 'Network error');
    } finally {
      setPwSaving(false);
    }
  };

  // Array field helpers
  const addArrayItem = (field) => {
    setForm({ ...form, [field]: [...(form[field] || []), ''] });
  };
  const updateArrayItem = (field, idx, val) => {
    const arr = [...(form[field] || [])];
    arr[idx] = val;
    setForm({ ...form, [field]: arr });
  };
  const removeArrayItem = (field, idx) => {
    const arr = [...(form[field] || [])];
    arr.splice(idx, 1);
    setForm({ ...form, [field]: arr });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <FiLoader className="animate-spin text-[#F3A522]" size={28} />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FiUser className="mx-auto text-slate-300 mb-4" size={40} />
          <h3 className="text-lg font-bold text-slate-700">Mentor Profile Not Found</h3>
          <p className="text-sm text-slate-500 mt-1">Your profile has not been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 outfit">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and manage your profile information</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F3A522] text-white rounded-lg text-sm font-semibold hover:bg-[#e0941c] transition shadow-sm shadow-[#F3A522]/20">
            <FiEdit3 size={14} /> Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditing(false); setForm(mentor); }}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition">
              <FiX size={14} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F3A522] text-white rounded-lg text-sm font-semibold hover:bg-[#e0941c] disabled:opacity-50 transition shadow-sm">
              {saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Top Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {editing ? (
              <div className="space-y-2">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-200">
                  {form.image ? (
                    <img src={form.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><FiUser size={32} /></div>
                  )}
                </div>
                <input type="text" value={form.image || ''} onChange={e => setForm({ ...form, image: e.target.value })}
                  placeholder="Image URL" className="w-full text-[11px] px-2 py-1.5 border border-slate-200 rounded text-slate-600" />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] overflow-hidden shadow-lg shadow-[#F3A522]/20">
                {mentor.image ? (
                  <img src={mentor.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                    {mentor.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                  <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Designation</label>
                    <input type="text" value={form.designation || ''} onChange={e => setForm({ ...form, designation: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                    <input type="text" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phone</label>
                  <input type="text" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none" />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-800">{mentor.name}</h2>
                <p className="text-sm text-[#c9871a] font-medium">{mentor.designation}</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <FiMail size={14} className="text-slate-400" />
                    <span>{mentor.email || mentor.userId?.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <FiPhone size={14} className="text-slate-400" />
                    <span>{mentor.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <FiBook size={14} className="text-slate-400" />
                    <span>{mentor.subject}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <FiAward size={14} className="text-slate-400" />
                    <span>{mentor.training_experience?.years || '—'} years, {mentor.training_experience?.students || '—'} students trained</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Specializations */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FiBriefcase size={14} className="text-[#c9871a]" />
            <h3 className="text-sm font-bold text-slate-700">Specialized Areas</h3>
          </div>
          <div className="p-5">
            {editing ? (
              <div className="space-y-2">
                {(form.specialized_area || []).map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={s} onChange={e => updateArrayItem('specialized_area', i, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-[#F3A522] outline-none" />
                    <button onClick={() => removeArrayItem('specialized_area', i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('specialized_area')}
                  className="flex items-center gap-1 text-xs text-[#c9871a] font-medium hover:text-[#c9871a]"><FiPlus size={12} /> Add</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(mentor.specialized_area || []).map((s, i) => (
                  <span key={i} className="text-xs bg-[#FEF6E7] text-[#c9871a] px-2.5 py-1 rounded-lg border border-[#F0DFB4] font-medium">{s}</span>
                ))}
                {(!mentor.specialized_area || mentor.specialized_area.length === 0) && <p className="text-xs text-slate-400">No specializations added</p>}
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FiAward size={14} className="text-violet-600" />
            <h3 className="text-sm font-bold text-slate-700">Education</h3>
          </div>
          <div className="p-5">
            {editing ? (
              <div className="space-y-2">
                {(form.education_qualification || []).map((eq, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={eq} onChange={e => updateArrayItem('education_qualification', i, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-[#F3A522] outline-none" />
                    <button onClick={() => removeArrayItem('education_qualification', i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('education_qualification')}
                  className="flex items-center gap-1 text-xs text-[#c9871a] font-medium hover:text-[#c9871a]"><FiPlus size={12} /> Add</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(mentor.education_qualification || []).map((eq, i) => (
                  <p key={i} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" /> {eq}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Work Experience */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FiBriefcase size={14} className="text-amber-600" />
            <h3 className="text-sm font-bold text-slate-700">Work Experience</h3>
          </div>
          <div className="p-5">
            {editing ? (
              <div className="space-y-2">
                {(form.work_experience || []).map((we, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={we} onChange={e => updateArrayItem('work_experience', i, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-[#F3A522] outline-none" />
                    <button onClick={() => removeArrayItem('work_experience', i)} className="text-rose-400 hover:text-rose-600"><FiTrash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addArrayItem('work_experience')}
                  className="flex items-center gap-1 text-xs text-[#c9871a] font-medium hover:text-[#c9871a]"><FiPlus size={12} /> Add</button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(mentor.work_experience || []).map((we, i) => (
                  <p key={i} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" /> {we}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Training Experience */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FiAward size={14} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-700">Training Experience</h3>
          </div>
          <div className="p-5">
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Years</label>
                  <input type="text" value={form.training_experience?.years || ''} onChange={e => setForm({ ...form, training_experience: { ...form.training_experience, years: e.target.value } })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-[#F3A522] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Students Trained</label>
                  <input type="text" value={form.training_experience?.students || ''} onChange={e => setForm({ ...form, training_experience: { ...form.training_experience, students: e.target.value } })}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-[#F3A522] outline-none" />
                </div>
              </div>
            ) : (
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{mentor.training_experience?.years || '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Years</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{mentor.training_experience?.students || '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Students</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* About & Life Journey */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FiFileText size={14} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-700">About</h3>
          </div>
          <div className="p-5">
            {editing ? (
              <textarea value={form.details || ''} onChange={e => setForm({ ...form, details: e.target.value })} rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none resize-none" />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed">{mentor.details || 'No details added.'}</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FiMapPin size={14} className="text-rose-500" />
            <h3 className="text-sm font-bold text-slate-700">Life Journey</h3>
          </div>
          <div className="p-5">
            {editing ? (
              <textarea value={form.lifeJourney || ''} onChange={e => setForm({ ...form, lifeJourney: e.target.value })} rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-[#F3A522] outline-none resize-none" />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed">{mentor.lifeJourney || 'No journey details.'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <FiLock size={14} className="text-rose-500" />
          <h3 className="text-sm font-bold text-slate-700">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password</label>
            <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/20 outline-none" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/20 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm Password</label>
              <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/20 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={pwSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F3A522] text-white rounded-lg text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50 transition">
            {pwSaving ? <FiLoader className="animate-spin" size={14} /> : <FiLock size={14} />}
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
      {toastNode}
    </div>
  );
}

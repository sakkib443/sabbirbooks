'use client';

import React, { useState, useEffect } from 'react';
import { FiSettings, FiSave, FiRefreshCw, FiUser, FiLock, FiGlobe, FiEye, FiEyeOff, FiLoader, FiShield, FiUploadCloud } from 'react-icons/fi';
import { LuGlobe, LuPhone, LuMail, LuMapPin, LuFacebook, LuYoutube, LuLinkedin } from 'react-icons/lu';
import { useToast } from '@/components/shared/Toast';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '');
const stored = () => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } };
const authHdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const roleLabel = (r) => ({ superAdmin: 'Super Admin', trainingManager: 'Manager' }[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'User'));

const TABS = [
  { key: 'profile', label: 'My Profile', icon: FiUser },
  { key: 'password', label: 'Password', icon: FiLock },
  { key: 'site', label: 'Site Settings', icon: FiGlobe },
];

const SettingsPage = () => {
  const { showToast, toastNode } = useToast();
  const [tab, setTab] = useState('profile');

  // Managers don't get the global Site Settings tab (admin/superAdmin only).
  const role = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').role || 'admin'; } catch { return 'admin'; } })();
  const tabs = TABS.filter(t => !(t.key === 'site' && role === 'trainingManager'));

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 outfit flex items-center gap-3">
          <FiSettings className="text-[#F3A522]" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">নিজের প্রোফাইল, পাসওয়ার্ড এবং ওয়েবসাইট সেটিংস পরিচালনা করুন</p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200">
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg -mb-px border-b-2 transition ${active ? 'border-[#F3A522] text-[#c9871a] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <t.icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'profile' && <ProfileTab showToast={showToast} />}
      {tab === 'password' && <PasswordTab showToast={showToast} />}
      {tab === 'site' && <SiteSettingsTab showToast={showToast} />}

      {toastNode}
    </div>
  );
};

/* ───────────────────────── My Profile ───────────────────────── */
const ProfileTab = ({ showToast }) => {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', role: '', id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const me = stored();
      if (!me?.id) { setLoading(false); return; }
      try {
        const res = await fetch(`${API_URL}/api/user/${me.id}`, { headers: authHdr(), cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.data) {
          const u = data.data;
          setProfile({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phoneNumber: u.phoneNumber || '', role: u.role || me.role || '', id: u.id || me.id });
        }
      } catch { showToast('error', 'প্রোফাইল লোড করা যায়নি'); }
      finally { setLoading(false); }
    })();
  }, [showToast]);

  const save = async (e) => {
    e.preventDefault();
    if (!profile.firstName.trim()) return showToast('error', 'First name দিন');
    setSaving(true);
    try {
      const me = stored();
      const res = await fetch(`${API_URL}/api/user/${me.id}`, {
        method: 'PATCH', headers: authHdr(),
        body: JSON.stringify({ firstName: profile.firstName, lastName: profile.lastName, phoneNumber: profile.phoneNumber }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        // keep the cached user (sidebar name) fresh
        try { localStorage.setItem('user', JSON.stringify({ ...me, firstName: profile.firstName, lastName: profile.lastName })); } catch { }
        showToast('success', 'প্রোফাইল আপডেট হয়েছে');
      } else showToast('error', data.message || 'সেভ করা যায়নি');
    } catch { showToast('error', 'Network error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><FiLoader className="animate-spin text-[#F3A522]" size={28} /></div>;

  const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/20 focus:border-[#F3A522] outline-none text-sm';

  return (
    <form onSubmit={save} className="max-w-2xl">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {/* identity strip */}
        <div className="flex items-center gap-4 pb-5 mb-5 border-b border-slate-100">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white font-bold text-lg shrink-0">
            {(profile.firstName?.[0] || 'U')}{profile.lastName?.[0] || ''}
          </div>
          <div>
            <p className="font-bold text-slate-800">{profile.firstName} {profile.lastName}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#c9871a] bg-[#FEF6E7] px-2 py-0.5 rounded-full mt-1"><FiShield size={11} /> {roleLabel(profile.role)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
            <input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input value={profile.phoneNumber} onChange={e => setProfile(p => ({ ...p, phoneNumber: e.target.value }))} className={inp} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(login — locked)</span></label>
            <input value={profile.email} readOnly disabled className={`${inp} bg-slate-50 text-slate-500 cursor-not-allowed`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
            <input value={profile.id} readOnly disabled className={`${inp} bg-slate-50 text-slate-500 cursor-not-allowed font-mono`} />
          </div>
        </div>

        <div className="mt-6">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F3A522] hover:bg-[#e0941c] text-white font-semibold rounded-lg transition disabled:opacity-50">
            {saving ? <><FiLoader className="animate-spin" size={16} /> Saving...</> : <><FiSave size={16} /> Save Profile</>}
          </button>
        </div>
      </div>
    </form>
  );
};

/* ───────────────────────── Password ───────────────────────── */
const PasswordTab = ({ showToast }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ cur: false, next: false, conf: false });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) return showToast('error', 'বর্তমান ও নতুন পাসওয়ার্ড দিন');
    if (form.newPassword.length < 6) return showToast('error', 'নতুন পাসওয়ার্ড অন্তত ৬ অক্ষর');
    if (form.newPassword !== form.confirmPassword) return showToast('error', 'নতুন পাসওয়ার্ড দুটি মিলছে না');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST', headers: authHdr(),
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', 'পাসওয়ার্ড পরিবর্তন হয়েছে');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else showToast('error', data.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ');
    } catch { showToast('error', 'Network error'); }
    finally { setSaving(false); }
  };

  const inp = 'w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/20 focus:border-[#F3A522] outline-none text-sm';
  const Row = ({ label, k, sk, ph }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input type={show[sk] ? 'text' : 'password'} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className={inp} placeholder={ph} autoComplete="new-password" />
        <button type="button" onClick={() => setShow(s => ({ ...s, [sk]: !s[sk] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show[sk] ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="max-w-md">
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <FiLock className="text-[#F3A522]" />
          <h2 className="font-semibold text-slate-800">Change Password</h2>
        </div>
        <Row label="Current Password" k="currentPassword" sk="cur" ph="বর্তমান পাসওয়ার্ড" />
        <Row label="New Password" k="newPassword" sk="next" ph="নতুন পাসওয়ার্ড (min ৬)" />
        <Row label="Confirm New Password" k="confirmPassword" sk="conf" ph="আবার লিখুন" />
        <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#F3A522] hover:bg-[#e0941c] text-white font-semibold rounded-lg transition disabled:opacity-50">
          {saving ? <><FiLoader className="animate-spin" size={16} /> Updating...</> : <><FiLock size={16} /> Update Password</>}
        </button>
      </div>
    </form>
  );
};

/* ───────────────────────── Site Settings (existing) ───────────────────────── */
const SiteSettingsTab = ({ showToast }) => {
  const [settings, setSettings] = useState({
    brandName: '', brandNameBn: '', websiteUrl: '',
    heroBadge: '', heroHeading1: '', heroHeading2: '', heroHeadingWith: '', heroAcademyName: '', heroDescription: '',
    heroBadgeBn: '', heroHeading1Bn: '', heroHeading2Bn: '', heroHeadingWithBn: '', heroAcademyNameBn: '', heroDescriptionBn: '',
    phoneNumber: '', whatsappNumber: '', email: '', address: '', addressBn: '',
    facebookUrl: '', youtubeUrl: '', linkedinUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch(`${API_URL}/api/settings/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, logo: data.data.url }));
        showToast('success', 'Logo uploaded — নিচে Save চাপুন');
      } else showToast('error', data.message || 'Upload failed');
    } catch { showToast('error', 'Upload failed'); }
    finally { setUploadingLogo(false); e.target.value = ''; }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/settings`, { cache: 'no-store' });
      const data = await response.json();
      if (data.success) setSettings(data.data);
    } catch (error) { console.error('Error fetching settings:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'PATCH', headers: authHdr(), body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (data.success) showToast('success', 'Settings saved successfully!');
      else showToast('error', data.message || 'Failed to save settings');
    } catch (error) { console.error('Error saving settings:', error); showToast('error', 'Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#41bfb8] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-3">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand / Identity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <LuGlobe className="text-[#41bfb8]" />
            <h2 className="text-lg font-semibold text-gray-800">Brand / Identity</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name (English)</label>
              <input type="text" name="brandName" value={settings.brandName} onChange={handleChange} placeholder="Aptech Learning" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ব্র্যান্ডের নাম (বাংলা)</label>
              <input type="text" name="brandNameBn" value={settings.brandNameBn} onChange={handleChange} placeholder="অ্যাপটেক লার্নিং" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input type="url" name="websiteUrl" value={settings.websiteUrl} onChange={handleChange} placeholder="https://aptechlearning.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
          </div>

          {/* Site Logo — admin can change the website logo anytime */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Logo</label>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Preview on a dark strip (site header is dark) */}
              <div className="h-14 px-4 rounded-lg bg-slate-800 flex items-center justify-center min-w-[150px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.logo || '/images/aptech-learning-logo.svg'}
                  alt="Logo preview"
                  className={`h-9 w-auto ${settings.logo ? '' : 'brightness-0 invert'}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#41bfb8] text-white text-sm font-semibold cursor-pointer hover:bg-[#38a89d] transition ${uploadingLogo ? 'opacity-60 pointer-events-none' : ''}`}>
                  {uploadingLogo ? <FiLoader className="animate-spin" size={15} /> : <FiUploadCloud size={15} />}
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" disabled={uploadingLogo} />
                </label>
                {settings.logo && (
                  <button type="button" onClick={() => setSettings(prev => ({ ...prev, logo: '' }))}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition">
                    Reset to default
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">PNG / SVG সুপারিশ করা হয় (transparent background)। আপলোডের পর নিচে <b>Save Settings</b> চাপুন। খালি রাখলে ডিফল্ট লোগো দেখাবে।</p>
          </div>
        </div>

        {/* Hero Section - English */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuGlobe className="text-[#41bfb8]" />
            <h2 className="text-lg font-semibold text-gray-800">Hero Section (English)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
              <input type="text" name="heroBadge" value={settings.heroBadge} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading 1</label>
                <input type="text" name="heroHeading1" value={settings.heroHeading1} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading 2</label>
                <input type="text" name="heroHeading2" value={settings.heroHeading2} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">"With" Text</label>
                <input type="text" name="heroHeadingWith" value={settings.heroHeadingWith} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academy Name</label>
                <input type="text" name="heroAcademyName" value={settings.heroAcademyName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="heroDescription" value={settings.heroDescription} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm resize-none" />
            </div>
          </div>
        </div>

        {/* Hero Section - Bengali */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuGlobe className="text-[#9AA0A8]" />
            <h2 className="text-lg font-semibold text-gray-800">Hero Section (বাংলা)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ব্যাজ টেক্সট</label>
              <input type="text" name="heroBadgeBn" value={settings.heroBadgeBn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">শিরোনাম ১</label>
                <input type="text" name="heroHeading1Bn" value={settings.heroHeading1Bn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">শিরোনাম ২</label>
                <input type="text" name="heroHeading2Bn" value={settings.heroHeading2Bn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">"সাথে" টেক্সট</label>
                <input type="text" name="heroHeadingWithBn" value={settings.heroHeadingWithBn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">একাডেমির নাম</label>
                <input type="text" name="heroAcademyNameBn" value={settings.heroAcademyNameBn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">বিবরণ</label>
              <textarea name="heroDescriptionBn" value={settings.heroDescriptionBn} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm resize-none" />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuPhone className="text-[#41bfb8]" />
            <h2 className="text-lg font-semibold text-gray-800">Contact Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuPhone className="inline mr-1" /> Phone Number</label>
              <input type="text" name="phoneNumber" value={settings.phoneNumber} onChange={handleChange} placeholder="+880 1711-946614" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <span className="p-1 bg-green-100 rounded text-green-600">
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.7 69.4 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.1 0-65.6-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.5-11.3 2.5-2.5 5.6-6.5 8.3-9.8 2.8-3.2 3.7-5.6 5.5-9.3 1.9-3.7.9-6.9-.5-9.8-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 14.1 4.5 26.9 3.9 37 2.4 11.3-1.7 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"></path></svg>
                </span>
                WhatsApp Number
              </label>
              <input type="text" name="whatsappNumber" value={settings.whatsappNumber} onChange={(e) => { const value = e.target.value.replace(/[^0-9]/g, ''); setSettings(prev => ({ ...prev, whatsappNumber: value })); }} placeholder="8801711946614" maxLength={15} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-green-50 focus:border-green-400 outline-none text-lg font-mono transition-all" />
              <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><span>📝</span> সঠিক ফরম্যাট:</h4>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span><code className="bg-white px-2 py-0.5 rounded border">8801711946614</code><span className="text-gray-400">- Country code সহ, শুধু সংখ্যা</span></li>
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span><code className="bg-red-50 px-2 py-0.5 rounded border border-red-200 line-through">+8801711946614</code><span className="text-gray-400">- প্লাস চিহ্ন দেবেন না</span></li>
                  <li className="flex items-center gap-2"><span className="text-red-500">✗</span><code className="bg-red-50 px-2 py-0.5 rounded border border-red-200 line-through">880-132-123-1802</code><span className="text-gray-400">- ড্যাশ বা স্পেস দেবেন না</span></li>
                </ul>
                <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">🔗 Live Preview:</span>
                  <a href={`https://wa.me/${settings.whatsappNumber || ''}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-green-600 bg-white px-3 py-1 rounded-full border border-green-200 hover:bg-green-100 transition-colors">wa.me/{settings.whatsappNumber || 'your_number'}</a>
                </div>
              </div>
              {settings.whatsappNumber && settings.whatsappNumber.length < 10 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1 bg-red-50 p-2 rounded-lg"><span>⚠️</span> নম্বরটি সম্পূর্ণ মনে হচ্ছে না। Country code (88) সহ সম্পূর্ণ নম্বর দিন।</p>
              )}
              {settings.whatsappNumber && settings.whatsappNumber.length >= 10 && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1 bg-green-50 p-2 rounded-lg"><span>✅</span> নম্বরটি সঠিক মনে হচ্ছে! WhatsApp বাটনে ক্লিক করে টেস্ট করুন।</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuMail className="inline mr-1" /> Email</label>
              <input type="email" name="email" value={settings.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuMapPin className="inline mr-1" /> Address (English)</label>
              <input type="text" name="address" value={settings.address} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuMapPin className="inline mr-1" /> ঠিকানা (বাংলা)</label>
              <input type="text" name="addressBn" value={settings.addressBn} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuGlobe className="text-[#41bfb8]" />
            <h2 className="text-lg font-semibold text-gray-800">Social Links</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuFacebook className="inline mr-1 text-blue-600" /> Facebook URL</label>
              <input type="url" name="facebookUrl" value={settings.facebookUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuYoutube className="inline mr-1 text-red-600" /> YouTube URL</label>
              <input type="url" name="youtubeUrl" value={settings.youtubeUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1"><LuLinkedin className="inline mr-1 text-blue-700" /> LinkedIn URL</label>
              <input type="url" name="linkedinUrl" value={settings.linkedinUrl} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#41bfb8] focus:border-[#41bfb8] outline-none text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-[#41bfb8] hover:bg-[#38a89d] text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {saving ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving...</>) : (<><FiSave /> Save Settings</>)}
        </button>
        <button type="button" onClick={fetchSettings} className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
          <FiRefreshCw /> Reset
        </button>
      </div>
    </form>
  );
};

export default SettingsPage;

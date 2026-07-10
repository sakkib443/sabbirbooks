'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiSearch, FiTrash2, FiMail, FiPhone, FiLoader, FiShield, FiUser, FiUsers,
  FiCheck, FiX, FiClock, FiChevronDown, FiPlus, FiUserPlus, FiCopy, FiArrowRight, FiKey,
  FiEdit2, FiEye, FiEyeOff, FiLock,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const jhdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const GROUPS = {
  staff: { roles: ['superAdmin', 'admin', 'trainingManager', 'mentor'], title: 'Team & Staff', subtitle: 'Admins, training managers and mentors — your internal team.' },
  students: { roles: ['student', 'user'], title: 'Students & Users', subtitle: 'Learners and normal users of the platform.' },
};

const roleStyle = (role) => ({
  superAdmin: { bg: 'bg-gradient-to-r from-yellow-500 to-amber-600', icon: <FiShield size={12} /> },
  admin: { bg: 'bg-gradient-to-r from-red-500 to-rose-600', icon: <FiShield size={12} /> },
  trainingManager: { bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', icon: <FiUsers size={12} /> },
  mentor: { bg: 'bg-gradient-to-r from-purple-500 to-violet-600', icon: <FiUsers size={12} /> },
  student: { bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', icon: <FiUser size={12} /> },
  user: { bg: 'bg-gradient-to-r from-emerald-500 to-teal-600', icon: <FiUser size={12} /> },
}[role] || { bg: 'bg-slate-300', icon: <FiUser size={12} /> });

const statusColor = (s) => ({
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  blocked: 'bg-red-50 text-red-700 border-red-200',
}[s] || 'bg-slate-50 text-slate-600 border-slate-200');

const label = (r) => ({ superAdmin: 'Super Admin', trainingManager: 'Manager' }[r] || (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'User'));

export default function UsersManager({ group = 'students' }) {
  const cfg = GROUPS[group] || GROUPS.students;
  const router = useRouter();
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [roleDropdown, setRoleDropdown] = useState(null);
  const [statusDropdown, setStatusDropdown] = useState(null);
  const [busyRole, setBusyRole] = useState(null);
  const [busyStatus, setBusyStatus] = useState(null);

  // Add-staff state
  const [addOpen, setAddOpen] = useState(false);
  const [staffRole, setStaffRole] = useState('trainingManager');
  const [staffForm, setStaffForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  // Add-student state
  const [studentOpen, setStudentOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' });
  const [savingStudent, setSavingStudent] = useState(false);

  // Edit-user (details + password reset) state
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', newPassword: '' });
  const [showEditPw, setShowEditPw] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const isSuperAdmin = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').role) === 'superAdmin'; } catch { return false; }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/user`, { headers: hdr() });
      const data = await res.json();
      if (data.success) setUsers((data.data || []).filter(u => !u.isDeleted));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const inGroup = (u) => cfg.roles.includes(u.role);

  const patch = async (u, body, kind) => {
    const setter = kind === 'role' ? setBusyRole : setBusyStatus;
    setter(u._id);
    try {
      const res = await fetch(`${API}/user/${u.id}`, { method: 'PATCH', headers: jhdr(), body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setUsers(prev => prev.map(x => x._id === u._id ? { ...x, ...body } : x));
        showToast('success', `Updated`);
      } else showToast('error', data.message || 'Failed');
    } catch { showToast('error', 'Network error'); }
    finally { setter(null); setRoleDropdown(null); setStatusDropdown(null); }
  };

  const del = async (u) => {
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
    if (!(await confirm({ title: `Delete ${name}?`, message: 'This account and its access will be removed. This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    try {
      const res = await fetch(`${API}/user/${u.id}`, { method: 'DELETE', headers: hdr() });
      const data = await res.json();
      if (res.ok && data.success !== false) { setUsers(prev => prev.filter(x => x._id !== u._id)); showToast('success', 'Deleted'); }
      else showToast('error', data.message || 'Failed to delete');
    } catch { showToast('error', 'Network error'); }
  };

  // ── Add staff ──
  const openAdd = () => { setStaffRole('trainingManager'); setStaffForm({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' }); setAddOpen(true); };

  const submitStaff = async () => {
    if (staffRole === 'mentor') {
      // Mentors carry a full public profile → use the Mentor form (created UNPUBLISHED).
      router.push('/dashboard/admin/mentor/create?unpublished=1');
      return;
    }
    if (!staffForm.firstName.trim() || !staffForm.email.trim() || !staffForm.password) return showToast('error', 'Name, email ও password দিন');
    if (staffForm.password.length < 6) return showToast('error', 'Password অন্তত ৬ অক্ষর');
    setSaving(true);
    try {
      const res = await fetch(`${API}/user/create-staff`, { method: 'POST', headers: jhdr(), body: JSON.stringify({ ...staffForm, role: staffRole }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddOpen(false);
        setCreatedCreds(data.credentials);
        fetchUsers();
      } else showToast('error', data.message || 'Failed to create');
    } catch { showToast('error', 'Network error'); } finally { setSaving(false); }
  };

  // ── Edit user (details + optional password reset) ──
  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phoneNumber: u.phoneNumber || '', newPassword: '' });
    setShowEditPw(false);
  };

  const submitEdit = async () => {
    if (!editForm.firstName.trim() || !editForm.email.trim()) return showToast('error', 'Name ও email দিন');
    if (editForm.newPassword && editForm.newPassword.length < 6) return showToast('error', 'Password অন্তত ৬ অক্ষর');
    setSavingEdit(true);
    try {
      const body = { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, phoneNumber: editForm.phoneNumber };
      if (editForm.newPassword) body.password = editForm.newPassword;
      const res = await fetch(`${API}/user/${editUser.id}`, { method: 'PATCH', headers: jhdr(), body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setUsers(prev => prev.map(x => x._id === editUser._id ? { ...x, firstName: body.firstName, lastName: body.lastName, email: body.email, phoneNumber: body.phoneNumber } : x));
        showToast('success', editForm.newPassword ? 'ডিটেলস + নতুন পাসওয়ার্ড সেট হয়েছে' : 'ডিটেলস আপডেট হয়েছে');
        setEditUser(null);
      } else showToast('error', data.message || 'Failed to update');
    } catch { showToast('error', 'Network error'); }
    finally { setSavingEdit(false); }
  };

  // ── Add student (admin / superAdmin / trainingManager) ──
  const openAddStudent = () => { setStudentForm({ firstName: '', lastName: '', email: '', phoneNumber: '', password: '' }); setStudentOpen(true); };

  const submitStudent = async () => {
    if (!studentForm.firstName.trim() || !studentForm.email.trim() || !studentForm.password) return showToast('error', 'Name, email ও password দিন');
    if (studentForm.password.length < 6) return showToast('error', 'Password অন্তত ৬ অক্ষর');
    setSavingStudent(true);
    try {
      const res = await fetch(`${API}/user/create-student`, { method: 'POST', headers: jhdr(), body: JSON.stringify(studentForm) });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudentOpen(false);
        setCreatedCreds(data.credentials);
        fetchUsers();
      } else showToast('error', data.message || 'Failed to create');
    } catch { showToast('error', 'Network error'); } finally { setSavingStudent(false); }
  };

  const list = useMemo(() => users.filter(u => {
    if (!inGroup(u)) return false;
    const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const ms = !search || name.includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id?.toLowerCase().includes(search.toLowerCase());
    const mr = filterRole === 'all' || u.role === filterRole;
    return ms && mr;
  }), [users, search, filterRole, group]);

  const count = (r) => users.filter(u => u.role === r).length;

  // stat cards per group
  const stats = group === 'staff'
    ? [
      { label: 'Total Staff', value: users.filter(inGroup).length, icon: FiUsers, c: 'text-slate-700', b: 'bg-slate-100' },
      { label: 'Admins', value: count('admin') + count('superAdmin'), icon: FiShield, c: 'text-red-600', b: 'bg-red-50' },
      { label: 'Training Managers', value: count('trainingManager'), icon: FiUsers, c: 'text-blue-600', b: 'bg-blue-50' },
      { label: 'Mentors', value: count('mentor'), icon: FiUsers, c: 'text-purple-600', b: 'bg-purple-50' },
    ]
    : [
      { label: 'Total Users', value: users.filter(inGroup).length, icon: FiUsers, c: 'text-slate-700', b: 'bg-slate-100' },
      { label: 'Students', value: count('student') + count('user'), icon: FiUser, c: 'text-emerald-600', b: 'bg-emerald-50' },
      { label: 'Active', value: users.filter(u => inGroup(u) && u.status === 'active').length, icon: FiCheck, c: 'text-green-600', b: 'bg-green-50' },
      { label: 'Pending', value: users.filter(u => inGroup(u) && u.status === 'pending').length, icon: FiClock, c: 'text-amber-600', b: 'bg-amber-50' },
    ];

  const roleOpts = group === 'staff' ? ['admin', 'trainingManager', 'mentor'] : ['student'];
  const statusOpts = ['active', 'pending', 'blocked'];

  return (
    <div className="p-6 lg:p-8 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 outfit">{cfg.title}</h1>
          <p className="text-slate-500 text-sm mt-1">{cfg.subtitle}</p>
        </div>
        {group === 'staff' && (
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/20 hover:shadow-xl transition">
            <FiUserPlus size={16} /> Add Staff
          </button>
        )}
        {group === 'students' && (
          <button onClick={openAddStudent} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold shadow-lg shadow-[#F3A522]/20 hover:shadow-xl transition">
            <FiUserPlus size={16} /> Add Student
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.b} flex items-center justify-center`}><s.icon className={s.c} size={18} /></div>
            <div><p className="text-2xl font-bold text-slate-900">{loading ? '—' : s.value}</p><p className="text-[11px] text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white shadow-sm focus:outline-none focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white shadow-sm focus:outline-none focus:border-[#F3A522]">
          <option value="all">All roles</option>
          {cfg.roles.map(r => <option key={r} value={r}>{label(r)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><FiLoader className="animate-spin text-[#F3A522]" size={30} /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">User</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-center">Status</th><th className="px-5 py-3 text-center">Change Role</th>
                  <th className="px-5 py-3 text-center">Change Status</th><th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {list.map(u => {
                  const rs = roleStyle(u.role);
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(u.firstName?.[0] || 'U')}{u.lastName?.[0] || ''}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{u.firstName || ''} {u.lastName || ''}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{u.id || u._id?.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="flex items-center gap-1.5 text-xs text-slate-600"><FiMail size={12} className="text-[#c9871a]" /><span className="truncate max-w-[180px]">{u.email}</span></p>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><FiPhone size={12} />{u.phoneNumber || '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white ${rs.bg}`}>{rs.icon}{label(u.role)}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border capitalize ${statusColor(u.status)}`}>{u.status}</span>
                      </td>
                      {/* change role */}
                      <td className="px-5 py-3 text-center">
                        <div className="relative inline-block">
                          <button onClick={() => setRoleDropdown(roleDropdown === u._id ? null : u._id)} disabled={busyRole === u._id || u.role === 'superAdmin'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 text-slate-500 hover:border-[#F3A522] hover:text-[#c9871a] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                            {busyRole === u._id ? <FiLoader className="animate-spin" size={13} /> : <>Role <FiChevronDown size={12} /></>}
                          </button>
                          {roleDropdown === u._id && (
                            <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5">
                              {roleOpts.map(r => {
                                const disabledAdmin = (r === 'admin') && !isSuperAdmin;
                                return (
                                  <button key={r} disabled={u.role === r || disabledAdmin}
                                    onClick={() => patch(u, { role: r }, 'role')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${u.role === r || disabledAdmin ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span className={`w-6 h-6 rounded ${roleStyle(r).bg} text-white flex items-center justify-center`}>{roleStyle(r).icon}</span>
                                    {label(r)} {disabledAdmin && <FiKey size={10} className="ml-auto text-slate-300" title="superAdmin only" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* change status */}
                      <td className="px-5 py-3 text-center">
                        <div className="relative inline-block">
                          <button onClick={() => setStatusDropdown(statusDropdown === u._id ? null : u._id)} disabled={busyStatus === u._id || u.role === 'superAdmin'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 text-slate-500 hover:border-amber-500 hover:text-amber-600 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                            {busyStatus === u._id ? <FiLoader className="animate-spin" size={13} /> : <>Status <FiChevronDown size={12} /></>}
                          </button>
                          {statusDropdown === u._id && (
                            <div className="absolute right-0 top-full mt-1 z-30 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5">
                              {statusOpts.map(st => (
                                <button key={st} disabled={u.status === st} onClick={() => patch(u, { status: st }, 'status')}
                                  className={`w-full px-3 py-2 text-left text-sm capitalize ${u.status === st ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50'}`}>{st}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openEdit(u)} disabled={u.role === 'superAdmin' && !isSuperAdmin}
                            title={u.role === 'superAdmin' && !isSuperAdmin ? 'Super Admin protected' : 'Edit details / reset password'}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#c9871a] transition disabled:opacity-30 disabled:cursor-not-allowed"><FiEdit2 size={15} /></button>
                          <button onClick={() => del(u)} disabled={u.role === 'superAdmin'} title={u.role === 'superAdmin' ? 'Super Admin protected' : 'Delete'}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition disabled:opacity-30 disabled:cursor-not-allowed"><FiTrash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {list.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3"><FiUsers className="text-xl text-slate-300" /></div>
              <p className="text-slate-600 font-semibold">No {group === 'staff' ? 'staff' : 'users'} found</p>
              {group === 'staff' && <button onClick={openAdd} className="mt-3 text-sm font-bold text-[#c9871a] hover:underline">+ Add your first staff member</button>}
              {group === 'students' && <button onClick={openAddStudent} className="mt-3 text-sm font-bold text-[#c9871a] hover:underline">+ Add your first student</button>}
            </div>
          )}
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">Showing {list.length} of {users.filter(inGroup).length}</div>
        </div>
      )}

      {(roleDropdown || statusDropdown) && <div className="fixed inset-0 z-20" onClick={() => { setRoleDropdown(null); setStatusDropdown(null); }} />}

      {/* ── Add Staff Modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setAddOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white">
              <h3 className="font-bold text-lg outfit flex items-center gap-2"><FiUserPlus /> Add Staff</h3>
              <button onClick={() => setAddOpen(false)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* role picker */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { r: 'admin', label: 'Admin', only: !isSuperAdmin },
                    { r: 'trainingManager', label: 'Manager' },
                    { r: 'mentor', label: 'Mentor' },
                  ].map(o => (
                    <button key={o.r} type="button" disabled={o.only} onClick={() => setStaffRole(o.r)}
                      className={`px-2 py-2.5 rounded-xl border-2 text-xs font-bold transition relative ${staffRole === o.r ? 'border-[#F3A522] bg-[#FEF6E7] text-[#a5680f]' : o.only ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {o.label}{o.only && <FiKey size={9} className="absolute top-1 right-1" />}
                    </button>
                  ))}
                </div>
                {!isSuperAdmin && <p className="text-[10px] text-slate-400 mt-1">Admin accounts can only be created by a Super Admin.</p>}
              </div>

              {staffRole === 'mentor' ? (
                <div className="rounded-xl bg-[#FEF6E7]/60 border border-[#F0DFB4] p-4 text-sm text-[#7a5210]">
                  Mentors need a full public profile (photo, bio, expertise). Continue to the <b>Mentor form</b> — the mentor will be created <b>unpublished</b> (not shown on the website until you publish).
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label><input value={staffForm.firstName} onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Last Name</label><input value={staffForm.lastName} onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
                  </div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email *</label><input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" placeholder="staff@aptechlearning.com" /></div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone</label><input value={staffForm.phoneNumber} onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
                  <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Login Password *</label><input value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522] font-mono" placeholder="min 6 chars" /></div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setAddOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={submitStaff} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50">
                {saving ? <FiLoader className="animate-spin" size={15} /> : staffRole === 'mentor' ? <>Continue <FiArrowRight size={14} /></> : <><FiPlus size={15} /> Create</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Student Modal ── */}
      {studentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !savingStudent && setStudentOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white">
              <h3 className="font-bold text-lg outfit flex items-center gap-2"><FiUserPlus /> Add Student</h3>
              <button onClick={() => setStudentOpen(false)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label><input value={studentForm.firstName} onChange={e => setStudentForm({ ...studentForm, firstName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Last Name</label><input value={studentForm.lastName} onChange={e => setStudentForm({ ...studentForm, lastName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email *</label><input type="email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" placeholder="student@email.com" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone</label><input value={studentForm.phoneNumber} onChange={e => setStudentForm({ ...studentForm, phoneNumber: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Login Password *</label><input value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522] font-mono" placeholder="min 6 chars" /></div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setStudentOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={submitStudent} disabled={savingStudent} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50">
                {savingStudent ? <FiLoader className="animate-spin" size={15} /> : <><FiPlus size={15} /> Create</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials Modal ── */}
      {createdCreds && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white">
              <h3 className="font-bold outfit flex items-center gap-2"><FiCheck /> {label(createdCreds.role)} account created</h3>
              <p className="text-white/80 text-xs mt-0.5">Share these login details</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-mono text-sm text-slate-800 break-all">{createdCreds.email}</p></div>
                <div className="border-t border-slate-100 pt-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Password</p><p className="font-mono text-sm text-slate-800">{createdCreds.password}</p></div>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2.5">⚠ The password won&apos;t be shown again — copy it now.</p>
              <div className="flex gap-2">
                <button onClick={() => { try { navigator.clipboard?.writeText(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`); showToast('success', 'Copied'); } catch { } }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"><FiCopy size={14} /> Copy</button>
                <button onClick={() => setCreatedCreds(null)} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white text-sm font-bold">Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal (details + password reset) ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !savingEdit && setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white">
              <h3 className="font-bold text-lg outfit flex items-center gap-2"><FiEdit2 /> Edit {label(editUser.role)}</h3>
              <button onClick={() => setEditUser(null)}><FiX size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">First Name *</label><input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Last Name</label><input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email *</label><input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone</label><input value={editForm.phoneNumber} onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522]" /></div>

              {/* password reset */}
              <div className="rounded-xl border border-[#F0DFB4] bg-[#FEF6E7]/50 p-3">
                <label className="text-[10px] font-bold text-[#a5680f] uppercase flex items-center gap-1.5 mb-1.5"><FiLock size={11} /> Reset Password <span className="text-slate-400 font-medium normal-case">(ফাঁকা রাখলে অপরিবর্তিত)</span></label>
                <div className="relative">
                  <input type={showEditPw ? 'text' : 'password'} value={editForm.newPassword} onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })} placeholder="নতুন পাসওয়ার্ড (min ৬)" autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#F3A522] font-mono bg-white" />
                  <button type="button" onClick={() => setShowEditPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showEditPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setEditUser(null)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={submitEdit} disabled={savingEdit} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F3A522] text-white text-sm font-bold hover:bg-[#e0941c] disabled:opacity-50">
                {savingEdit ? <FiLoader className="animate-spin" size={15} /> : <><FiCheck size={15} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
      {confirmNode}
    </div>
  );
}

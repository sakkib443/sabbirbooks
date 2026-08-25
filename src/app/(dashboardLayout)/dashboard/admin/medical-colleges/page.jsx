'use client';

/**
 * Admin — Medical College directory.
 *
 * This is the reference list behind the signup dropdown, so nothing here is
 * ever hard-deleted: DELETE /api/medical-colleges/:id retires a row, keeping
 * the profiles of students who already named that college resolvable.
 *
 * Rows flagged `needsReview` came out of the source PDF with a field that could
 * not be recovered. They sort to the top and are painted amber because finding
 * them is the whole reason an admin opens this screen.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiSearch, FiLoader, FiRefreshCw, FiAlertCircle, FiAlertTriangle, FiPlus, FiX,
  FiEdit2, FiEyeOff, FiRotateCcw, FiMapPin, FiCheck, FiHome,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

const TYPES = ['government', 'private', 'army'];
const TYPE_LABEL = { government: 'Government', private: 'Private', army: 'Army' };
const TYPE_STYLE = {
  government: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  private: 'bg-sky-50 text-sky-700 border-sky-200',
  army: 'bg-violet-50 text-violet-700 border-violet-200',
};

const EMPTY_FORM = {
  name: '', type: 'government', division: '', district: '', area: '',
  established: '', seats: '', isActive: true, needsReview: false,
};

const uniq = (values) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, 'bn'));

const inputCls =
  'w-full px-3 py-2 text-sm border border-dash-line rounded-lg bg-dash-card text-dash-ink3 focus:outline-none focus:border-brand';
const selectCls =
  'px-4 py-2.5 border border-dash-line rounded-lg bg-dash-card text-dash-ink4 focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none';

const Field = ({ label, hint, children }) => (
  <div>
    <label className="text-[10px] font-bold text-dash-mute uppercase block mb-1">
      {label} {hint && <span className="text-dash-mute2 font-medium normal-case">{hint}</span>}
    </label>
    {children}
  </div>
);

export default function MedicalCollegesPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();

  const [rows, setRows] = useState([]);
  const [regions, setRegions] = useState({ divisions: [], districts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | retired | review

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', row? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // /regions is public and only reflects ACTIVE rows — it feeds the form's
      // suggestion lists, not the table filters (see divisionOpts below).
      const [listRes, regionRes] = await Promise.all([
        fetch(`${API}/medical-colleges/all`, { headers: authHeaders() }),
        fetch(`${API}/medical-colleges/regions`),
      ]);
      const listJson = await listRes.json().catch(() => ({}));
      if (!listRes.ok || listJson.success === false) {
        throw new Error(listJson.message || 'Failed to load colleges');
      }
      setRows(Array.isArray(listJson.data) ? listJson.data : []);

      const regionJson = await regionRes.json().catch(() => ({}));
      if (regionJson?.data) {
        setRegions({
          divisions: regionJson.data.divisions || [],
          districts: regionJson.data.districts || [],
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    government: rows.filter((r) => r.type === 'government').length,
    private: rows.filter((r) => r.type === 'private').length,
    army: rows.filter((r) => r.type === 'army').length,
    review: rows.filter((r) => r.needsReview).length,
    retired: rows.filter((r) => r.isActive === false).length,
  }), [rows]);

  // Filter menus come from the loaded rows rather than /regions: a retired
  // college may be the only one in its district, and it still has to be
  // reachable from this screen.
  const divisionOpts = useMemo(() => uniq(rows.map((r) => r.division)), [rows]);
  const districtOpts = useMemo(
    () => uniq(rows.filter((r) => divisionFilter === 'all' || r.division === divisionFilter).map((r) => r.district)),
    [rows, divisionFilter],
  );

  // The form accepts any division/district string, so these are suggestions
  // only — the active-only /regions list plus whatever the table already holds.
  const divisionSuggestions = useMemo(
    () => uniq([...regions.divisions, ...rows.map((r) => r.division)]),
    [regions, rows],
  );
  const districtSuggestions = useMemo(
    () => uniq([...regions.districts, ...rows.map((r) => r.district)]),
    [regions, rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      const hit = !q || [r.name, r.division, r.district, r.area]
        .some((v) => String(v || '').toLowerCase().includes(q));
      const mt = typeFilter === 'all' || r.type === typeFilter;
      const mv = divisionFilter === 'all' || r.division === divisionFilter;
      const md = districtFilter === 'all' || r.district === districtFilter;
      const ms = statusFilter === 'all'
        || (statusFilter === 'active' && r.isActive !== false)
        || (statusFilter === 'retired' && r.isActive === false)
        || (statusFilter === 'review' && !!r.needsReview);
      return hit && mt && mv && md && ms;
    });
    // Flagged rows first — an admin opening this screen is usually hunting for
    // exactly those, and they must not sink under a page of A-names.
    return out.sort((a, b) =>
      (b.needsReview ? 1 : 0) - (a.needsReview ? 1 : 0)
      || String(a.type).localeCompare(String(b.type))
      || String(a.name || '').localeCompare(String(b.name || ''), 'bn'));
  }, [rows, search, typeFilter, divisionFilter, districtFilter, statusFilter]);

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setModal({ mode: 'create' }); };

  const openEdit = (row) => {
    setForm({
      name: row.name || '',
      type: row.type || 'government',
      division: row.division || '',
      district: row.district || '',
      area: row.area || '',
      established: row.established ?? '',
      seats: row.seats ?? '',
      isActive: row.isActive !== false,
      needsReview: !!row.needsReview,
    });
    setModal({ mode: 'edit', row });
  };

  const save = async () => {
    const name = form.name.trim();
    if (name.length < 2) return showToast('error', 'কলেজের নাম দিন');
    if (!form.division.trim() || !form.district.trim()) return showToast('error', 'বিভাগ ও জেলা দুটোই দিন');

    const body = {
      name,
      type: form.type,
      division: form.division.trim(),
      district: form.district.trim(),
      area: form.area.trim(),
      isActive: form.isActive,
    };
    // The server's zod schema wants an integer or nothing at all, so an empty
    // box has to be omitted rather than sent as NaN.
    if (String(form.established).trim() !== '') {
      const year = Number(form.established);
      if (!Number.isInteger(year) || year < 1800 || year > 2100) return showToast('error', 'প্রতিষ্ঠার সাল সঠিক নয়');
      body.established = year;
    }
    if (String(form.seats).trim() === '') {
      body.seats = null;
    } else {
      const seats = Number(form.seats);
      if (!Number.isInteger(seats) || seats < 0) return showToast('error', 'সিট সংখ্যা সঠিক নয়');
      body.seats = seats;
    }
    // Saving a name is what clears the review flag on the server, so the field
    // is sent ONLY when the admin deliberately keeps the row flagged — always
    // sending it would silently disable that auto-clear.
    if (form.needsReview) body.needsReview = true;

    const editing = modal.mode === 'edit';
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `${API}/medical-colleges/${modal.row._id}` : `${API}/medical-colleges`,
        { method: editing ? 'PATCH' : 'POST', headers: jsonHeaders(), body: JSON.stringify(body) },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Save failed');
      const saved = json.data;
      setRows((prev) => (editing
        ? prev.map((r) => (r._id === saved._id ? { ...r, ...saved } : r))
        : [...prev, saved]));
      showToast('success', editing ? 'কলেজ আপডেট হয়েছে' : 'নতুন কলেজ যোগ হয়েছে');
      setModal(null);
    } catch (err) {
      showToast('error', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const retire = async (row) => {
    const ok = await confirm({
      title: `Retire "${row.name}"?`,
      message: 'সাইনআপের তালিকা থেকে লুকিয়ে যাবে, মুছবে না — আগে এই কলেজ বেছে নেওয়া শিক্ষার্থীদের প্রোফাইল ঠিক থাকবে। পরে আবার Active করা যাবে।',
      confirmText: 'Retire',
      danger: true,
    });
    if (!ok) return;
    setBusyId(row._id);
    try {
      const res = await fetch(`${API}/medical-colleges/${row._id}`, { method: 'DELETE', headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to retire');
      setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, ...(json.data || { isActive: false }) } : r)));
      showToast('success', 'সাইনআপ তালিকা থেকে সরানো হয়েছে');
    } catch (err) {
      showToast('error', err.message || 'Failed to retire');
    } finally {
      setBusyId(null);
    }
  };

  // Only isActive goes over the wire: including `name` would ALSO clear the
  // review flag server-side, and putting a row back on the list is not the same
  // as confirming its name is right.
  const restore = async (row) => {
    setBusyId(row._id);
    try {
      const res = await fetch(`${API}/medical-colleges/${row._id}`, {
        method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ isActive: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to restore');
      setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, ...(json.data || { isActive: true }) } : r)));
      showToast('success', 'আবার সাইনআপ তালিকায় যোগ হয়েছে');
    } catch (err) {
      showToast('error', err.message || 'Failed to restore');
    } finally {
      setBusyId(null);
    }
  };

  const statCards = [
    { label: 'Total colleges', value: stats.total, cls: 'text-dash-ink2' },
    { label: 'Government', value: stats.government, cls: 'text-emerald-600' },
    { label: 'Private', value: stats.private, cls: 'text-sky-600' },
    { label: 'Army', value: stats.army, cls: 'text-violet-600' },
    { label: 'Needs review', value: stats.review, cls: 'text-amber-600' },
    { label: 'Retired', value: stats.retired, cls: 'text-dash-mute' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2 flex items-center gap-2.5">
            <FiHome className="text-brand" /> Medical Colleges
          </h1>
          <p className="text-dash-mute text-sm">সাইনআপ ফর্মের কলেজ তালিকা — এখান থেকেই যোগ, সংশোধন ও বাদ দেওয়া হয়।</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-brand to-brand-hover text-white text-sm font-bold shadow-lg shadow-brand/20 hover:shadow-xl transition"
          >
            <FiPlus size={16} /> Add College
          </button>
        </div>
      </div>

      {/* The one thing an admin is most likely here to fix. */}
      {!loading && stats.review > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{stats.review}টি এন্ট্রি যাচাই করা দরকার</p>
            <p className="text-amber-700 mt-0.5 leading-relaxed">
              সোর্স PDF থেকে এই সারির নাম উদ্ধার করা যায়নি। সঠিক নাম বসিয়ে সেভ করলেই ফ্ল্যাগ চলে যাবে —
              সাইনআপ তালিকায় দেখাতে হলে <b>Active</b>-ও করে দিন।
            </p>
            {statusFilter !== 'review' && (
              <button
                onClick={() => setStatusFilter('review')}
                className="mt-1.5 text-xs font-bold underline hover:no-underline"
              >
                শুধু এই সারিগুলো দেখান
              </button>
            )}
          </div>
        </div>
      )}

      {/* Counts per type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-dash-card rounded-xl border border-dash-line p-4">
            <p className={`text-xl font-bold ${s.cls}`}>{loading ? '—' : s.value}</p>
            <p className="text-xs text-dash-mute2 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
        <div className="relative flex-1 lg:min-w-[240px]">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, বিভাগ, জেলা বা এলাকা দিয়ে খুঁজুন…"
            className="w-full pl-10 pr-4 py-2.5 border border-dash-line rounded-lg bg-dash-card text-dash-ink3 focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="all">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <select
          value={divisionFilter}
          onChange={(e) => { setDivisionFilter(e.target.value); setDistrictFilter('all'); }}
          className={selectCls}
        >
          <option value="all">All divisions</option>
          {divisionOpts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className={selectCls}>
          <option value="all">All districts</option>
          {districtOpts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
          <option value="all">All rows</option>
          <option value="active">Active only</option>
          <option value="retired">Retired only</option>
          <option value="review">Needs review</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-dash-mute2">
          <FiLoader className="animate-spin mr-2" /> Loading colleges…
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-dash-card rounded-xl border border-dashed border-dash-line">
          <FiHome className="mx-auto text-dash-faint" size={40} />
          <p className="text-dash-mute mt-3 font-medium">No colleges found</p>
          <p className="text-dash-mute2 text-sm">
            {rows.length === 0 ? 'তালিকাটি এখনও খালি — প্রথম কলেজটি যোগ করুন।' : 'ফিল্টার বদলে দেখুন।'}
          </p>
        </div>
      ) : (
        <div className="bg-dash-card rounded-xl border border-dash-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-dash-soft border-b border-dash-line text-left text-[10px] font-black text-dash-mute uppercase tracking-wider">
                  <th className="px-5 py-3">College</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3 text-center">Established</th>
                  <th className="px-5 py-3 text-center">Seats</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-soft">
                {filtered.map((r) => {
                  const retired = r.isActive === false;
                  const busy = busyId === r._id;
                  return (
                    <tr
                      key={r._id}
                      className={`transition ${r.needsReview ? 'bg-amber-50 hover:bg-amber-100/70' : 'hover:bg-dash-soft/50'}`}
                    >
                      <td className={`px-5 py-3 ${r.needsReview ? 'border-l-4 border-amber-400' : ''}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-semibold text-sm ${retired ? 'text-dash-mute' : 'text-dash-ink2'}`}>{r.name}</p>
                          {r.needsReview && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-100 text-amber-800 border-amber-300">
                              <FiAlertTriangle size={10} /> Needs review
                            </span>
                          )}
                        </div>
                        {r.area && <p className="text-[11px] text-dash-mute2 mt-0.5">{r.area}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${TYPE_STYLE[r.type] || 'bg-dash-soft text-dash-ink4 border-dash-line'}`}>
                          {TYPE_LABEL[r.type] || r.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="flex items-center gap-1.5 text-xs text-dash-ink4">
                          <FiMapPin size={11} className="text-dash-mute2" />{r.district || '—'}
                        </p>
                        <p className="text-[11px] text-dash-mute2 mt-0.5 pl-[18px]">{r.division || '—'}</p>
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-dash-ink4">
                        {r.established || <span className="text-dash-faint">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-dash-ink4">
                        {typeof r.seats === 'number' ? r.seats : <span className="text-dash-faint">—</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${retired
                          ? 'bg-dash-soft text-dash-mute border-dash-line'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {retired ? 'Retired' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            title="Edit"
                            className="p-2 rounded-lg text-dash-mute hover:bg-dash-soft2 hover:text-brand-ink transition"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          {retired ? (
                            <button
                              onClick={() => restore(r)}
                              disabled={busy}
                              title="সাইনআপ তালিকায় ফিরিয়ে আনুন"
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                            >
                              {busy ? <FiLoader className="animate-spin" size={15} /> : <FiRotateCcw size={15} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => retire(r)}
                              disabled={busy}
                              title="Retire — সাইনআপ তালিকা থেকে লুকান"
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition disabled:opacity-40"
                            >
                              {busy ? <FiLoader className="animate-spin" size={15} /> : <FiEyeOff size={15} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-dash-line-soft text-xs text-dash-mute">
            Showing {filtered.length} of {rows.length}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !saving && setModal(null)}
        >
          <div
            className="bg-dash-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-brand to-brand-hover text-white sticky top-0">
              <h3 className="font-bold text-lg outfit flex items-center gap-2">
                {modal.mode === 'edit' ? <FiEdit2 /> : <FiPlus />}
                {modal.mode === 'edit' ? 'Edit College' : 'Add College'}
              </h3>
              <button onClick={() => setModal(null)}><FiX size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              {modal.mode === 'edit' && modal.row?.needsReview && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800 leading-relaxed">
                  এই সারিটি যাচাইয়ের জন্য চিহ্নিত। সঠিক নাম বসিয়ে সেভ করলেই ফ্ল্যাগ মুছে যাবে।
                </div>
              )}

              <Field label="College Name *">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Dhaka Medical College"
                  className={inputCls}
                />
              </Field>

              <Field label="Type *">
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`px-2 py-2.5 rounded-xl border-2 text-xs font-bold transition ${form.type === t
                        ? 'border-brand bg-brand-soft text-brand-deep'
                        : 'border-dash-line text-dash-mute hover:border-dash-line-strong'}`}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Division *">
                  <input
                    list="mc-divisions"
                    value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="District *">
                  <input
                    list="mc-districts"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <datalist id="mc-divisions">
                {divisionSuggestions.map((d) => <option key={d} value={d} />)}
              </datalist>
              <datalist id="mc-districts">
                {districtSuggestions.map((d) => <option key={d} value={d} />)}
              </datalist>

              <Field label="Area" hint="(উপজেলা / এলাকা — ঐচ্ছিক)">
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Established" hint="(সাল)">
                  <input
                    type="number"
                    value={form.established}
                    onChange={(e) => setForm({ ...form, established: e.target.value })}
                    placeholder="1946"
                    className={inputCls}
                  />
                </Field>
                <Field label="Seats" hint="(ফাঁকা = অজানা)">
                  <input
                    type="number"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: e.target.value })}
                    placeholder="100"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-dash-line-soft bg-dash-soft p-3 space-y-2.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className="text-xs text-dash-ink4">
                    <b className="text-dash-ink3">Active</b> — সাইনআপ ফর্মের ড্রপডাউনে দেখাবে
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer border-t border-dash-line-soft pt-2.5">
                  <input
                    type="checkbox"
                    checked={form.needsReview}
                    onChange={(e) => setForm({ ...form, needsReview: e.target.checked })}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className="text-xs text-dash-ink4">
                    <b className="text-dash-ink3">Needs review</b> — টিক দিলে সেভ করার পরেও চিহ্নিত থাকবে; না দিলে ফ্ল্যাগ মুছে যাবে
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-dash-line-soft">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-lg border border-dash-line text-dash-ink4 text-sm font-semibold hover:bg-dash-soft"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-strong disabled:opacity-50"
              >
                {saving ? <FiLoader className="animate-spin" size={15} /> : <><FiCheck size={15} /> Save</>}
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

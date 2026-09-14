'use client';

/**
 * Admin — Delivery charges.
 *
 * Two kinds of rate on one screen, because they are one decision:
 *   - the standard charge, with the cash-on-delivery surcharge and the
 *     free-delivery threshold that sit on top of it
 *   - a medical college's own rate, for campuses the shop can deliver to for
 *     less (sometimes by hand)
 *
 * A college's rate applies only when the parcel goes to that college's own
 * district AND upazila (order.service → collegeRateApplies; the checkout
 * mirrors it). That is why the upazila is edited here too: a rate whose
 * college has no upazila, or the wrong one, never applies to anyone.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiSearch, FiLoader, FiRefreshCw, FiAlertCircle, FiCheck, FiTruck, FiInfo, FiMapPin,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { upazilasOf } from '@/components/checkout/bdGeoData';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

const TYPE_LABEL = { government: 'সরকারি', private: 'বেসরকারি', army: 'সামরিক' };
const TYPE_STYLE = {
  government: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  private: 'bg-sky-50 text-sky-700 border-sky-200',
  army: 'bg-violet-50 text-violet-700 border-violet-200',
};

const tk = (n) => `৳${Number(n || 0).toLocaleString('en-US')}`;
const hasRate = (v) => v !== null && v !== undefined && v !== '';

const inputCls =
  'w-full px-3 py-2 text-sm border border-dash-line rounded-lg bg-dash-card text-dash-ink3 focus:outline-none focus:border-brand';

export default function DeliveryChargesPage() {
  const { showToast, toastNode } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── The standard charge ──────────────────────────────────────────────────
  const [general, setGeneral] = useState({ deliveryCharge: '', codExtraCharge: '', freeDeliveryAbove: '' });
  const [savedGeneral, setSavedGeneral] = useState(null);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // ── Colleges ─────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  // Edits not yet saved, per college id: { deliveryCharge: string, upazila: string }.
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | rated | missing

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsRes, collegesRes] = await Promise.all([
        fetch(`${API}/settings`, { cache: 'no-store' }),
        fetch(`${API}/medical-colleges/delivery`, { headers: authHeaders(), cache: 'no-store' }),
      ]);
      const settingsJson = await settingsRes.json().catch(() => ({}));
      const s = settingsJson?.data || {};
      const g = {
        deliveryCharge: String(s.deliveryCharge ?? 120),
        codExtraCharge: String(s.codExtraCharge ?? 0),
        freeDeliveryAbove: String(s.freeDeliveryAbove ?? 0),
      };
      setGeneral(g);
      setSavedGeneral(g);

      const collegesJson = await collegesRes.json().catch(() => ({}));
      if (!collegesRes.ok || collegesJson.success === false) {
        throw new Error(collegesJson.message || 'কলেজের তালিকা আনা যায়নি');
      }
      setRows(Array.isArray(collegesJson.data) ? collegesJson.data : []);
      setDrafts({});
    } catch (err) {
      setError(err.message || 'লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const generalDirty =
    !!savedGeneral && Object.keys(general).some((k) => String(general[k]).trim() !== String(savedGeneral[k]).trim());

  const saveGeneral = async () => {
    const values = {};
    for (const [k, v] of Object.entries(general)) {
      const raw = String(v).trim();
      if (!/^\d+$/.test(raw)) {
        showToast('error', 'চার্জ শুধু পূর্ণ সংখ্যায় লিখুন (যেমন 120)');
        return;
      }
      values[k] = Number(raw);
    }
    setSavingGeneral(true);
    try {
      // Only these three fields — never the whole settings document, so this
      // screen cannot overwrite anything the Settings page owns.
      const res = await fetch(`${API}/settings`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'সেভ হয়নি');
      const g = {
        deliveryCharge: String(values.deliveryCharge),
        codExtraCharge: String(values.codExtraCharge),
        freeDeliveryAbove: String(values.freeDeliveryAbove),
      };
      setGeneral(g);
      setSavedGeneral(g);
      showToast('success', 'সাধারণ ডেলিভারি চার্জ সেভ হয়েছে');
    } catch (err) {
      showToast('error', err.message || 'সেভ হয়নি');
    } finally {
      setSavingGeneral(false);
    }
  };

  const draftOf = (row) =>
    drafts[row._id] || {
      deliveryCharge: hasRate(row.deliveryCharge) ? String(row.deliveryCharge) : '',
      upazila: row.upazila || '',
    };

  const isDirty = (row) => {
    const d = draftOf(row);
    const savedRate = hasRate(row.deliveryCharge) ? String(row.deliveryCharge) : '';
    return String(d.deliveryCharge).trim() !== savedRate || d.upazila !== (row.upazila || '');
  };

  const setDraft = (row, patch) =>
    setDrafts((prev) => ({ ...prev, [row._id]: { ...draftOf(row), ...patch } }));

  const saveRow = async (row) => {
    const d = draftOf(row);
    const raw = String(d.deliveryCharge).trim();
    if (raw !== '' && !/^\d+$/.test(raw)) {
      showToast('error', 'চার্জ শুধু পূর্ণ সংখ্যায় লিখুন, অথবা ফাঁকা রাখুন');
      return;
    }
    setSavingId(row._id);
    try {
      const res = await fetch(`${API}/medical-colleges/${row._id}/delivery`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ deliveryCharge: raw === '' ? null : Number(raw), upazila: d.upazila }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'সেভ হয়নি');
      setRows((prev) => prev.map((r) => (r._id === row._id ? { ...r, ...json.data } : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row._id];
        return next;
      });
      if (raw !== '' && !d.upazila) {
        showToast('error', `${row.name}: উপজেলা ছাড়া বিশেষ চার্জ কারও জন্য কাজ করবে না — উপজেলা বেছে দিন`);
      } else {
        showToast('success', `${row.name} — সেভ হয়েছে`);
      }
    } catch (err) {
      showToast('error', err.message || 'সেভ হয়নি');
    } finally {
      setSavingId(null);
    }
  };

  const stats = useMemo(() => ({
    rated: rows.filter((r) => hasRate(r.deliveryCharge)).length,
    missing: rows.filter((r) => r.isActive !== false && !r.upazila).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'rated' && !hasRate(r.deliveryCharge)) return false;
      if (filter === 'missing' && r.upazila) return false;
      if (!q) return true;
      return (
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.district || '').includes(search.trim()) ||
        String(r.upazila || '').includes(search.trim())
      );
    });
  }, [rows, search, filter]);

  const standard = Number(savedGeneral?.deliveryCharge || 0);

  return (
    <div className="space-y-6">
      {toastNode}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2 flex items-center gap-2">
            <FiTruck className="text-brand" /> ডেলিভারি চার্জ
          </h1>
          <p className="text-sm text-dash-mute mt-1">
            সারা দেশের সাধারণ চার্জ, আর যেসব মেডিকেল কলেজে কম চার্জে বই পাঠানো যায় তাদের আলাদা চার্জ।
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-dash-line rounded-lg text-dash-ink3 hover:bg-dash-soft"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> রিফ্রেশ
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <FiAlertCircle /> {error}
        </div>
      )}

      {/* ── The standard charge ── */}
      <div className="bg-dash-card rounded-xl border border-dash-line p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-dash-ink2">সাধারণ চার্জ</h2>
        <p className="text-sm text-dash-mute mt-1 mb-4">
          যেকোনো অর্ডারে এটাই লাগে, যদি না নিচের কোনো কলেজের বিশেষ চার্জ প্রযোজ্য হয়। অর্ডার করার সময় যে চার্জ ছিল সেটাই
          ওই অর্ডারে থাকে — পরে বদলালে পুরোনো অর্ডার বদলায় না।
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { key: 'deliveryCharge', label: 'সাধারণ ডেলিভারি চার্জ (৳)', hint: 'সারা দেশে' },
            { key: 'codExtraCharge', label: 'ক্যাশ অন ডেলিভারিতে বাড়তি (৳)', hint: '0 = বাড়তি নেই' },
            { key: 'freeDeliveryAbove', label: 'এর বেশি অর্ডারে ফ্রি ডেলিভারি (৳)', hint: '0 = কখনো না' },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="block text-sm font-medium text-dash-ink3 mb-1">{f.label}</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={general[f.key]}
                onChange={(e) => setGeneral((g) => ({ ...g, [f.key]: e.target.value }))}
                className={inputCls}
                disabled={loading}
              />
              <span className="block text-xs text-dash-mute mt-1">{f.hint}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={saveGeneral}
            disabled={!generalDirty || savingGeneral}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-50"
          >
            {savingGeneral ? <FiLoader className="animate-spin" /> : <FiCheck />} সেভ করুন
          </button>
        </div>
      </div>

      {/* ── College rates ── */}
      <div className="bg-dash-card rounded-xl border border-dash-line p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-dash-ink2">মেডিকেল কলেজ অনুযায়ী চার্জ</h2>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <FiInfo className="mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p>
              কলেজের বিশেষ চার্জ তখনই লাগবে, যখন অর্ডারের <b>জেলা আর উপজেলা দুটোই</b> ওই কলেজের জেলা-উপজেলার সাথে মিলবে।
              যেমন: রাজশাহী মেডিকেলের ছাত্র নড়াইলের ঠিকানায় পাঠালে সাধারণ চার্জই লাগবে।
            </p>
            <p>চার্জ ফাঁকা রাখলে সাধারণ চার্জ। 0 দিলে পুরো ফ্রি — ক্যাশ অন ডেলিভারির বাড়তি চার্জও লাগবে না।</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="কলেজ, জেলা বা উপজেলা খুঁজুন…"
              className={`${inputCls} pl-9`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: `সব (${rows.length})` },
              { key: 'rated', label: `বিশেষ চার্জ আছে (${stats.rated})` },
              { key: 'missing', label: `উপজেলা নেই (${stats.missing})` },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${
                  filter === f.key
                    ? 'bg-brand text-white border-brand'
                    : 'bg-dash-card text-dash-ink3 border-dash-line hover:bg-dash-soft'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-dash-mute">
            <FiLoader className="animate-spin mr-2" /> লোড হচ্ছে…
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-dash-line">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-dash-soft text-dash-mute text-xs">
                <tr>
                  <th className="text-left font-semibold px-3 py-2.5">কলেজ</th>
                  <th className="text-left font-semibold px-3 py-2.5">জেলা</th>
                  <th className="text-left font-semibold px-3 py-2.5">উপজেলা / থানা</th>
                  <th className="text-left font-semibold px-3 py-2.5">বিশেষ চার্জ (৳)</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const d = draftOf(row);
                  const options = upazilasOf(row.division || '', row.district || '');
                  // A stored upazila the list does not have (typed by hand in an
                  // older version) stays selectable, marked, so saving the row
                  // does not silently throw it away.
                  const unlisted = d.upazila && !options.includes(d.upazila);
                  const dirty = isDirty(row);
                  const rateWithoutPlace = hasRate(d.deliveryCharge) && !d.upazila;
                  return (
                    <tr key={row._id} className={`border-t border-dash-line ${row.isActive === false ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-medium text-dash-ink2">{row.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${TYPE_STYLE[row.type] || ''}`}>
                            {TYPE_LABEL[row.type] || row.type}
                          </span>
                          {row.isActive === false && (
                            <span className="inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold bg-gray-50 text-gray-600 border-gray-200">
                              তালিকা থেকে সরানো
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top text-dash-ink3">{row.district || '—'}</td>
                      <td className="px-3 py-2.5 align-top">
                        <select
                          value={d.upazila}
                          onChange={(e) => setDraft(row, { upazila: e.target.value })}
                          className={`${inputCls} ${!d.upazila ? 'border-amber-300' : ''}`}
                        >
                          <option value="">— উপজেলা বেছে নিন —</option>
                          {unlisted && <option value={d.upazila}>{d.upazila} (তালিকায় নেই)</option>}
                          {options.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        {rateWithoutPlace && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
                            <FiMapPin /> উপজেলা ছাড়া চার্জটা কাজ করবে না
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={d.deliveryCharge}
                          onChange={(e) => setDraft(row, { deliveryCharge: e.target.value })}
                          placeholder={`সাধারণ (${tk(standard)})`}
                          className={inputCls}
                        />
                        {hasRate(d.deliveryCharge) && String(d.deliveryCharge).trim() === '0' && (
                          <p className="mt-1 text-[11px] text-emerald-700">ফ্রি ডেলিভারি</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-right">
                        <button
                          type="button"
                          onClick={() => saveRow(row)}
                          disabled={!dirty || savingId === row._id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-40"
                        >
                          {savingId === row._id ? <FiLoader className="animate-spin" /> : <FiCheck />} সেভ
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-dash-mute">কোনো কলেজ মেলেনি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

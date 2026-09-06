'use client';

/**
 * Every discount code the shop has, plain ones and affiliates' alike.
 *
 * They share a collection, so they share this list — but not their editing.
 * A plain coupon is edited here. An affiliate's code is only the instrument of
 * someone's earnings, so its row links to that person instead, where the code,
 * their sales and what they are owed are all in one place. The rows say which
 * kind they are rather than looking identical and behaving differently.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiTag, FiEdit2, FiTrash2, FiLoader, FiAlertCircle,
  FiDollarSign, FiCheckCircle, FiXCircle, FiUsers, FiExternalLink,
} from 'react-icons/fi';
import { listCoupons, removeCoupon, saveCoupon, formatTk } from '@/components/admin/bookCoupon/couponApi';

const discountText = (c) => {
  const parts = [];
  if (Number(c.discountValue) > 0) {
    parts.push(c.discountType === 'fixed' ? formatTk(c.discountValue) + ' off' : `${c.discountValue}% off`);
    // The cap belongs beside the percentage it caps — read apart they are two
    // numbers, read together they are the offer as the buyer will see it.
    if (c.discountType === 'percent' && Number(c.maxDiscount) > 0) {
      parts[parts.length - 1] += ` (max ${formatTk(c.maxDiscount)})`;
    }
  }
  if (c.freeDelivery) parts.push('free delivery');
  return parts.length ? parts.join(' + ') : '—';
};

/**
 * The limits, as short chips — only the ones actually set.
 *
 * A coupon with none of them shows nothing, which is the point: the list's
 * job is to make a restricted code visibly different from an open one at a
 * glance, not to print every field on every row.
 */
const limitChips = (c) => {
  const out = [];
  const d = (v) =>
    new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (c.validFrom && c.validUntil) out.push(`${d(c.validFrom)}–${d(c.validUntil)}`);
  else if (c.validUntil) out.push(`until ${d(c.validUntil)}`);
  else if (c.validFrom) out.push(`from ${d(c.validFrom)}`);
  if (Number(c.maxUsesPerBuyer) > 0)
    out.push(Number(c.maxUsesPerBuyer) === 1 ? '1 per buyer' : `${c.maxUsesPerBuyer} per buyer`);
  if (Number(c.minPurchase) > 0) out.push(`min ${formatTk(c.minPurchase)}`);
  if (c.appliesTo === 'cod') out.push('COD only');
  if (c.appliesTo === 'online') out.push('online only');
  return out;
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'plain', label: 'Shop coupons' },
  { id: 'affiliate', label: 'Affiliate codes' },
];

export default function BookCouponsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [busyId, setBusyId] = useState('');
  const [kind, setKind] = useState('all');

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const rows = await listCoupons();
      setState({ loading: false, error: '', rows: Array.isArray(rows) ? rows : [] });
    } catch (e) {
      setState({ loading: false, error: e.message || 'Failed to load coupons', rows: [] });
    }
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (c) => {
    setBusyId(c._id);
    try {
      await saveCoupon(c._id, { isActive: !c.isActive });
      setState((s) => ({ ...s, rows: s.rows.map((r) => (r._id === c._id ? { ...r, isActive: !r.isActive } : r)) }));
    } catch (e) {
      alert(e.message || 'Could not update');
    } finally { setBusyId(''); }
  };

  const rows = useMemo(() => {
    if (kind === 'plain') return state.rows.filter((c) => !c.affiliate);
    if (kind === 'affiliate') return state.rows.filter((c) => c.affiliate);
    return state.rows;
  }, [state.rows, kind]);

  const del = async (c) => {
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    setBusyId(c._id);
    try {
      await removeCoupon(c._id);
      setState((s) => ({ ...s, rows: s.rows.filter((r) => r._id !== c._id) }));
    } catch (e) {
      alert(e.message || 'Could not delete');
    } finally { setBusyId(''); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
            <FiTag className="text-brand" /> Book Coupons
          </h1>
          <p className="text-dash-mute text-sm">Discount codes buyers type at book checkout.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/affiliates"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dash-line text-dash-ink3 font-medium hover:bg-dash-soft transition-colors"
          >
            <FiUsers /> Affiliates
          </Link>
          <Link
            href="/dashboard/admin/book-coupons/payouts"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dash-line text-dash-ink3 font-medium hover:bg-dash-soft transition-colors"
          >
            <FiDollarSign /> Payouts
          </Link>
          <Link
            href="/dashboard/admin/book-coupons/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-lg shadow-brand/20"
          >
            <FiPlus /> Add Coupon
          </Link>
        </div>
      </div>

      {!state.loading && !state.error && state.rows.some((c) => c.affiliate) && (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setKind(f.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                kind === f.id
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-70">
                {f.id === 'all'
                  ? state.rows.length
                  : f.id === 'plain'
                    ? state.rows.filter((c) => !c.affiliate).length
                    : state.rows.filter((c) => c.affiliate).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {state.loading ? (
        <div className="flex items-center justify-center h-[40vh] text-dash-mute2">
          <FiLoader className="animate-spin mr-2" /> Loading coupons…
        </div>
      ) : state.error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {state.error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dash-line p-12 text-center">
          <FiTag className="mx-auto mb-3 text-3xl text-dash-mute2" />
          <p className="text-dash-ink3 font-medium">No coupons yet</p>
          <p className="text-dash-mute2 text-sm mt-1">Create one to start giving discounts and tracking payouts.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-dash-line bg-dash-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dash-line text-left text-dash-mute2">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Kind</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold text-center">Used</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-dash-ink2">{c.code}</span>
                    {c.name && <span className="block text-[11px] text-dash-mute2">{c.name}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.affiliate ? (
                      <Link
                        href="/dashboard/admin/affiliates"
                        className="inline-flex items-center gap-1.5 text-dash-ink3 hover:text-brand"
                        title="Manage this person under Affiliates"
                      >
                        <FiUsers size={12} className="text-dash-mute2" />
                        <span>{c.affiliate.fullName}</span>
                        <FiExternalLink size={11} className="opacity-60" />
                      </Link>
                    ) : (
                      <span className="text-dash-mute2">Shop coupon</span>
                    )}
                    {c.affiliate && (
                      <span className="block font-mono text-[11px] text-dash-mute2">
                        {c.affiliate.applicationId}
                        {c.payoutPerSale ? ` · ${formatTk(c.payoutPerSale)}/sale` : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-dash-ink2">
                    {discountText(c)}
                    {/* The restrictions, under the offer they restrict. Nothing
                        renders for an unrestricted coupon. */}
                    {limitChips(c).length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {limitChips(c).map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-dash-soft px-1.5 py-0.5 text-[10px] font-medium text-dash-mute"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-dash-ink3">
                    {/* "3 / 50" once a total is set — a bare count cannot say
                        how close a campaign is to stopping. */}
                    {Number(c.maxUses) > 0 ? (
                      <span
                        className={
                          Number(c.usedCount || 0) >= Number(c.maxUses)
                            ? 'font-bold text-rose-600'
                            : ''
                        }
                      >
                        {c.usedCount || 0} / {c.maxUses}
                      </span>
                    ) : (
                      c.usedCount || 0
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={busyId === c._id}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${c.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-dash-soft2 text-dash-mute2 hover:bg-dash-soft3'}`}
                      title="Toggle active"
                    >
                      {c.isActive ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}
                      {c.isActive ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/admin/book-coupons/create?id=${c._id}`}
                        className="p-2 rounded-lg text-dash-ink4 hover:bg-brand-soft hover:text-brand transition-colors"
                        title="Edit the code and its discount"
                      >
                        <FiEdit2 size={15} />
                      </Link>
                      {/* Deleting an affiliate's code would erase what they are
                          owed, so that is done by removing the person. The
                          server refuses it too — this only saves the trip. */}
                      {c.affiliate ? (
                        <Link
                          href="/dashboard/admin/affiliates"
                          className="p-2 rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors"
                          title={`Belongs to ${c.affiliate.fullName} — remove them under Affiliates`}
                        >
                          <FiUsers size={15} />
                        </Link>
                      ) : (
                        <button
                          onClick={() => del(c)}
                          disabled={busyId === c._id}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

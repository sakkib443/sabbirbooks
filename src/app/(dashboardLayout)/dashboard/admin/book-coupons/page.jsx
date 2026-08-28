'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiPlus, FiTag, FiEdit2, FiTrash2, FiLoader, FiAlertCircle,
  FiUser, FiDollarSign, FiCheckCircle, FiXCircle, FiLogIn,
} from 'react-icons/fi';
import { listCoupons, removeCoupon, saveCoupon, formatTk } from '@/components/admin/bookCoupon/couponApi';

const discountText = (c) =>
  c.discountType === 'fixed' ? formatTk(c.discountValue) + ' off' : `${c.discountValue}% off`;

export default function BookCouponsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [busyId, setBusyId] = useState('');

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
          <p className="text-dash-mute text-sm">Discount codes for book checkout, with per-sale payouts to their owners.</p>
        </div>
        <div className="flex items-center gap-2">
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

      {state.loading ? (
        <div className="flex items-center justify-center h-[40vh] text-dash-mute2">
          <FiLoader className="animate-spin mr-2" /> Loading coupons…
        </div>
      ) : state.error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {state.error}
        </div>
      ) : state.rows.length === 0 ? (
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
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Discount</th>
                <th className="px-4 py-3 font-semibold">Payout / sale</th>
                <th className="px-4 py-3 font-semibold text-center">Used</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((c) => (
                <tr key={c._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-dash-ink2">{c.code}</span>
                    {c.name && <span className="block text-[11px] text-dash-mute2">{c.name}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-dash-ink3"><FiUser size={12} className="text-dash-mute2" /> {c.ownerName || '—'}</span>
                    {c.ownerPhone && <span className="block text-[11px] text-dash-mute2 font-mono">{c.ownerPhone}</span>}
                    {c.ownerUser?.email && (
                      <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">
                        <FiLogIn size={9} /> {c.ownerUser.email}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-dash-ink2">{discountText(c)}</td>
                  <td className="px-4 py-3 text-dash-ink3">{c.payoutPerSale ? formatTk(c.payoutPerSale) : '—'}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-dash-ink3">{c.usedCount || 0}</td>
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
                        title="Edit"
                      >
                        <FiEdit2 size={15} />
                      </Link>
                      <button
                        onClick={() => del(c)}
                        disabled={busyId === c._id}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 size={15} />
                      </button>
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

'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FiArrowLeft, FiSave, FiTag, FiUser, FiPhone, FiPercent, FiDollarSign,
  FiGift, FiLoader, FiAlertCircle,
} from 'react-icons/fi';

import { getCoupon, saveCoupon } from '@/components/admin/bookCoupon/couponApi';

const EMPTY = {
  code: '', name: '', ownerName: '', ownerPhone: '',
  discountType: 'percent', discountValue: '', payoutPerSale: '', isActive: true,
};

const inputCls =
  'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none transition-all border-dash-line';
const Label = ({ icon: Icon, children }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-1.5">
    {Icon && <Icon className="text-brand" />} {children}
  </label>
);

function CouponForm() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  const editing = !!id;

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    (async () => {
      try {
        const c = await getCoupon(id);
        if (!alive) return;
        setForm({
          code: c.code || '', name: c.name || '', ownerName: c.ownerName || '', ownerPhone: c.ownerPhone || '',
          discountType: c.discountType || 'percent',
          discountValue: c.discountValue ?? '',
          payoutPerSale: c.payoutPerSale ?? '',
          isActive: c.isActive !== false,
        });
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load coupon');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, editing]);

  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const code = form.code.trim().toUpperCase();
    if (!code) return setError('Coupon code is required');
    const val = Number(form.discountValue) || 0;
    if (form.discountType === 'percent' && (val < 0 || val > 90))
      return setError('Percent discount must be between 0 and 90');
    if (val < 0) return setError('Discount cannot be negative');

    setSaving(true);
    try {
      await saveCoupon(id, {
        code,
        name: form.name.trim(),
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim(),
        discountType: form.discountType,
        discountValue: val,
        payoutPerSale: Number(form.payoutPerSale) || 0,
        isActive: !!form.isActive,
      });
      router.push('/dashboard/admin/book-coupons');
    } catch (e2) {
      setError(e2.message || 'Could not save the coupon');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-dash-mute2">
        <FiLoader className="animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <Link href="/dashboard/admin/book-coupons" className="inline-flex items-center gap-2 text-dash-mute hover:text-dash-ink3 mb-6">
        <FiArrowLeft /> Back to coupons
      </Link>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
        <FiTag className="text-brand" /> {editing ? 'Edit Coupon' : 'Add Coupon'}
      </h1>
      <p className="text-dash-mute text-sm mb-6">A discount code buyers enter at checkout, with an optional per-sale payout to its owner.</p>

      {error && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <FiAlertCircle className="shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-dash-card rounded-xl border border-dash-line p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label icon={FiTag}>Coupon code *</Label>
              <input
                value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="e.g. RAKIB20"
                className={`${inputCls} font-mono uppercase`}
              />
            </div>
            <div>
              <Label icon={FiGift}>Campaign name</Label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. রাকিবের রেফারেল" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label icon={FiUser}>Owner name</Label>
              <input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Who this code belongs to" className={inputCls} />
            </div>
            <div>
              <Label icon={FiPhone}>Owner phone</Label>
              <input value={form.ownerPhone} onChange={(e) => set('ownerPhone', e.target.value)} placeholder="01XXXXXXXXX" className={`${inputCls} font-mono`} />
            </div>
          </div>
        </div>

        <div className="bg-dash-card rounded-xl border border-dash-line p-5 sm:p-6 space-y-4">
          <Label icon={FiPercent}>Discount</Label>
          <div className="flex gap-2">
            <select value={form.discountType} onChange={(e) => set('discountType', e.target.value)} className={`${inputCls} w-40 shrink-0`}>
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed (৳)</option>
            </select>
            <input
              type="number" min="0" max={form.discountType === 'percent' ? 90 : undefined}
              value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)}
              placeholder={form.discountType === 'percent' ? '% off, e.g. 20' : '৳ off, e.g. 100'}
              className={`${inputCls} flex-1`}
            />
          </div>
          <p className="text-[11px] text-dash-mute2">
            Applied at checkout <b>on top of</b> the book’s own offer (pre-order / online / normal).
          </p>

          <div>
            <Label icon={FiDollarSign}>Payout per sale (৳)</Label>
            <input
              type="number" min="0" value={form.payoutPerSale} onChange={(e) => set('payoutPerSale', e.target.value)}
              placeholder="0"
              className={inputCls}
            />
            <p className="text-[11px] text-dash-mute2 mt-1">
              What you’ll pay the owner for each sale under this code. 0 = a plain discount, no payout.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-5 h-5 rounded border-dash-line-strong text-brand focus:ring-brand" />
            <span className="text-sm font-medium text-dash-ink3">Active — buyers can use this code now</span>
          </label>
        </div>

        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 disabled:opacity-50">
          {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
          {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Coupon'}
        </button>
      </form>
    </div>
  );
}

export default function AddCouponPage() {
  return (
    <Suspense fallback={<div className="p-8 text-dash-mute2"><FiLoader className="animate-spin inline mr-2" /> Loading…</div>}>
      <CouponForm />
    </Suspense>
  );
}

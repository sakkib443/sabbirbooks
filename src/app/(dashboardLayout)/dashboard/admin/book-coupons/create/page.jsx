'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FiArrowLeft, FiSave, FiTag, FiUser, FiPhone, FiPercent, FiDollarSign,
  FiGift, FiLoader, FiAlertCircle, FiMail, FiLock, FiLogIn,
} from 'react-icons/fi';

import { getCoupon, saveCoupon } from '@/components/admin/bookCoupon/couponApi';

const EMPTY = {
  code: '', name: '', ownerName: '', ownerPhone: '',
  discountType: 'percent', discountValue: '', payoutPerSale: '', isActive: true,
  // Optional login for the coupon's owner — an 'affiliate' account that can sign
  // in and watch their own sales. Off by default; a coupon works without one.
  makeLogin: false, ownerEmail: '', ownerPassword: '',
};

const inputCls =
  'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none transition-all border-dash-line';
const Label = ({ icon: Icon, children }) => (
  <label className="flex items-center gap-2 text-sm font-bold text-dash-ink3 mb-1.5">
    {Icon && <Icon className="text-brand" />} {children}
  </label>
);

/**
 * One card of the form. The heading row carries an icon tile and a one-line
 * explanation, so each group says what it is for before the fields are read.
 */
const Section = ({ icon: Icon, title, subtitle, children }) => (
  <section className="rounded-2xl border border-dash-line bg-dash-card p-5 sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        {Icon && <Icon size={16} />}
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold leading-tight text-dash-ink2">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-dash-mute2">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
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
          // An existing login opens the section already ticked, with the email
          // filled in and the password blank ("leave it alone").
          makeLogin: !!c.ownerUser,
          ownerEmail: c.ownerUser?.email || '',
          ownerPassword: '',
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
    if (form.makeLogin) {
      if (!form.ownerEmail.trim()) return setError('Owner email is required for the login');
      if (!editing && !form.ownerPassword) return setError('Set a password for the owner login');
    }

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
        // '' clears the link; a password is only sent when one was typed, so an
        // untouched box leaves the owner's current password alone.
        ownerEmail: form.makeLogin ? form.ownerEmail.trim().toLowerCase() : '',
        ...(form.makeLogin && form.ownerPassword ? { ownerPassword: form.ownerPassword } : {}),
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
      <Link href="/dashboard/admin/book-coupons" className="inline-flex items-center gap-2 text-sm text-dash-mute hover:text-dash-ink3 mb-5 transition-colors">
        <FiArrowLeft size={15} /> Back to coupons
      </Link>

      <div className="mb-6 flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-hover text-white shadow-lg shadow-brand/25">
          <FiTag size={20} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h1 className="text-2xl font-bold leading-tight text-dash-ink2">{editing ? 'Edit coupon' : 'New coupon'}</h1>
          <p className="mt-0.5 text-sm text-dash-mute">
            A discount code buyers enter at checkout, with an optional per-sale payout to its owner.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          <FiAlertCircle className="shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Section icon={FiTag} title="Coupon &amp; owner" subtitle="The code buyers type, and who it belongs to.">
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
        </Section>

        <Section icon={FiPercent} title="Discount &amp; payout" subtitle="What the buyer saves, and what the owner earns.">
          {/* Type is a segmented control rather than a <select>: two choices read
              faster as a pair, and it keeps the value box full width beneath. */}
          <div>
            <span className="text-xs font-semibold text-dash-mute">Discount type</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-dash-soft p-1">
              {[
                { id: 'percent', label: 'Percent', hint: '%' },
                { id: 'fixed', label: 'Fixed amount', hint: '৳' },
              ].map((t) => {
                const on = form.discountType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set('discountType', t.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                      on
                        ? 'bg-brand text-white shadow-sm shadow-brand/25'
                        : 'text-dash-mute hover:text-dash-ink3 hover:bg-dash-card'
                    }`}
                  >
                    <span className={`text-base leading-none ${on ? 'opacity-90' : 'opacity-60'}`}>{t.hint}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* The value, with its unit shown inside the field so the number never
              has to carry the meaning on its own. */}
          <div className="mt-4">
            <span className="text-xs font-semibold text-dash-mute">
              {form.discountType === 'percent' ? 'How many percent off?' : 'How many taka off?'}
            </span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-dash-mute2">
                {form.discountType === 'percent' ? '%' : '৳'}
              </span>
              <input
                type="number" min="0" max={form.discountType === 'percent' ? 90 : undefined}
                value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)}
                placeholder={form.discountType === 'percent' ? '20' : '100'}
                className={`${inputCls} pl-10 text-lg font-bold tabular-nums`}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-dash-mute2">
              Applied at checkout <b className="text-dash-ink4">on top of</b> the book’s own offer
              (pre-order / online / normal){form.discountType === 'percent' ? '. Maximum 90%.' : '.'}
            </p>
          </div>

          <div className="mt-5 border-t border-dash-line pt-5">
            <span className="text-xs font-semibold text-dash-mute">Payout per sale</span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-dash-mute2">৳</span>
              <input
                type="number" min="0" value={form.payoutPerSale} onChange={(e) => set('payoutPerSale', e.target.value)}
                placeholder="0"
                className={`${inputCls} pl-10 text-lg font-bold tabular-nums`}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-dash-mute2">
              What you’ll pay the owner for <b className="text-dash-ink4">each sale</b> under this code.
              Leave 0 for a plain discount with no payout.
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-dash-line bg-dash-soft/50 p-3.5">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-dash-line-strong text-brand focus:ring-brand" />
            <span>
              <span className="block text-sm font-semibold text-dash-ink3">Active</span>
              <span className="block text-[11px] text-dash-mute2">Buyers can use this code at checkout right now.</span>
            </span>
          </label>
        </Section>

        {/* Owner login — optional account so they can watch their own sales */}
        <Section icon={FiLogIn} title="Owner login" subtitle="Optional — let the owner sign in and watch their own sales.">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={form.makeLogin}
              onChange={(e) => set('makeLogin', e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-dash-line-strong text-brand focus:ring-brand"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-bold text-dash-ink3">
                <FiLogIn className="text-brand" /> Give this owner a login
              </span>
              <span className="block text-[11px] text-dash-mute2 mt-0.5">
                Creates an account they sign in with to see their own sales and earnings.
                They get no admin access. Leave off for a plain discount code.
              </span>
            </span>
          </label>

          {form.makeLogin && (
            <div className="mt-4 space-y-4 border-t border-dash-line pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label icon={FiMail}>Owner email (their username)</Label>
                  <input
                    type="email" value={form.ownerEmail}
                    onChange={(e) => set('ownerEmail', e.target.value)}
                    placeholder="owner@example.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label icon={FiLock}>Password</Label>
                  <input
                    type="text" value={form.ownerPassword}
                    onChange={(e) => set('ownerPassword', e.target.value)}
                    placeholder={editing ? 'Leave blank to keep current' : 'Set a password'}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-[11px] text-dash-mute2">
                They sign in at <b className="text-dash-ink4">/login</b> with this email and land on their own coupon
                dashboard. An email that already has an account is linked instead of recreated.
              </p>
            </div>
          )}
        </Section>

        {/* Sticky so the action stays reachable however long the form gets. */}
        <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-dash-line bg-dash-bg/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-hover disabled:opacity-50">
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
          </button>
          <Link href="/dashboard/admin/book-coupons" className="px-4 py-3 text-sm font-medium text-dash-mute transition-colors hover:text-dash-ink3">
            Cancel
          </Link>
        </div>
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

'use client';

/**
 * Shared vocabulary for the buyer-facing order pages (list + tracking).
 *
 * Kept next to the two pages rather than in components/ because nothing else in
 * the app speaks about orders from the *buyer's* side — the admin order screens
 * have their own (English) labels and a different set of affordances.
 */

import {
  FiClock, FiCheckCircle, FiPackage, FiTruck, FiHome,
  FiXCircle, FiUnlock, FiFileText,
} from 'react-icons/fi';
import { getToken } from '@/lib/session';

export const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

// getToken() reads the canonical `sb_token` and the legacy `token` the ported
// dashboards write — both are live, so never read localStorage directly here.
export const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Formatters ──────────────────────────────────────────────────────────────
// Latin digits, matching every other money/date on the dashboard.
export const formatTk = (v) => '৳' + Math.round(Number(v) || 0).toLocaleString('en-US');

export const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? ''
    : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${fmtDate(dt)} · ${dt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

// ── Status vocabulary ───────────────────────────────────────────────────────
const STATUS = {
  pending: { label: 'অপেক্ষমাণ', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: FiClock },
  paid: { label: 'পেমেন্ট হয়েছে', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FiCheckCircle },
  processing: { label: 'প্রস্তুত হচ্ছে', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: FiPackage },
  shipped: { label: 'কুরিয়ারে আছে', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: FiTruck },
  delivered: { label: 'ডেলিভারি হয়েছে', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FiHome },
  'access-granted': { label: 'অ্যাক্সেস চালু', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FiUnlock },
  cancelled: { label: 'বাতিল', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: FiXCircle },
};

export const statusMeta = (s) =>
  STATUS[s] || { label: s || '—', cls: 'bg-dash-soft text-dash-ink4 border-dash-line', icon: FiClock };

const PAYMENT_STATUS = {
  pending: { label: 'পেমেন্ট বাকি', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'পরিশোধিত', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'ব্যর্থ', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const paymentStatusMeta = (s) =>
  PAYMENT_STATUS[s] || { label: s || '—', cls: 'bg-dash-soft text-dash-ink4 border-dash-line' };

const CHANNELS = { bkash: 'বিকাশ', rocket: 'রকেট', nagad: 'নগদ' };

/** What the buyer actually did to pay — wallet name included when we know it. */
export const paymentMethodLabel = (payment) => {
  const p = payment || {};
  switch (p.method) {
    case 'cod':
      return 'ক্যাশ অন ডেলিভারি';
    case 'manual':
      return p.channel ? `${CHANNELS[p.channel] || p.channel} (সেন্ড মানি)` : 'মোবাইল ব্যাংকিং';
    case 'bkash':
      return 'বিকাশ';
    case 'sslcommerz':
      return 'কার্ড / ব্যাংক';
    case 'free':
      return 'ফ্রি';
    default:
      return 'এখনো নির্ধারিত হয়নি';
  }
};

export const deliveryTypeLabel = (t) =>
  t === 'digital' ? 'ডিজিটাল বই' : t === 'mixed' ? 'ছাপা + ডিজিটাল' : 'ছাপা বই';

export const areaLabel = (a) => (a === 'inside-dhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে');

/** A populated `items.book` gives us a cover; an un-populated one is just an id. */
export const itemCover = (item) => {
  const b = item?.book;
  return b && typeof b === 'object' ? b.coverImage || '' : '';
};

// ── The tracking timeline ───────────────────────────────────────────────────
// There is no history array on the order — the ladder is reconstructed from the
// four fulfillment timestamps plus the current status.

const PRINTED_STEPS = [
  { key: 'ordered', label: 'অর্ডার করা হয়েছে', hint: 'আপনার অর্ডার আমরা পেয়েছি', dateKey: 'createdAt', icon: FiFileText },
  { key: 'confirmed', label: 'অর্ডার কনফার্ম', hint: 'বই প্যাক করা হচ্ছে', dateKey: 'confirmedAt', icon: FiPackage },
  { key: 'shipped', label: 'কুরিয়ারে পাঠানো হয়েছে', hint: 'পার্সেল রওনা দিয়েছে', dateKey: 'shippedAt', icon: FiTruck },
  { key: 'delivered', label: 'ডেলিভারি সম্পন্ন', hint: 'বই আপনার হাতে পৌঁছেছে', dateKey: 'deliveredAt', icon: FiHome },
];

// Nothing ships for a digital-only order, so showing it a courier step would be
// a promise we never keep.
const DIGITAL_STEPS = [
  { key: 'ordered', label: 'অর্ডার করা হয়েছে', hint: 'আপনার অর্ডার আমরা পেয়েছি', dateKey: 'createdAt', icon: FiFileText },
  { key: 'access', label: 'অ্যাক্সেস চালু হয়েছে', hint: 'পেমেন্ট নিশ্চিত — এখন পড়া/ডাউনলোড করা যাবে', dateKey: 'confirmedAt', icon: FiUnlock },
];

const printedIndex = (status) => {
  switch (status) {
    case 'paid':
    case 'processing':
    case 'access-granted': // a mixed order whose digital half already opened
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    default: // 'pending' and anything unrecognised — the order exists, nothing more
      return 0;
  }
};

const digitalIndex = (status) =>
  ['paid', 'processing', 'shipped', 'delivered', 'access-granted'].includes(status) ? 1 : 0;

/**
 * → { cancelled, cancelledAt, steps: [{ …def, at, state }] }
 * `state` is 'done' | 'current' | 'todo'. A cancelled order gets no steps at
 * all: it is a terminal state off the ladder, not a rung on it.
 */
export const buildTimeline = (order) => {
  const cancelled = order?.status === 'cancelled';
  if (cancelled) {
    return { cancelled: true, cancelledAt: order?.cancelledAt || null, steps: [] };
  }

  const defs = order?.deliveryType === 'digital' ? DIGITAL_STEPS : PRINTED_STEPS;
  const current = order?.deliveryType === 'digital'
    ? digitalIndex(order?.status)
    : printedIndex(order?.status);

  return {
    cancelled: false,
    cancelledAt: null,
    steps: defs.map((def, i) => ({
      ...def,
      at: order?.[def.dateKey] || null,
      state: i < current ? 'done' : i === current ? 'current' : 'todo',
    })),
  };
};

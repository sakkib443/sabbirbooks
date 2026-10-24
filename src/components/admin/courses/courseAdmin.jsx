/**
 * The admin's Courses section (25 Oct 2026): All Courses, Add Course, Course
 * Orders, Course View. Shared bits for those four pages — the API call with
 * the admin's token, prices, and the look of a status badge.
 */
import API_BASE_URL from '@/config/api';

export const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

export const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json;
};

/** Every course the admin can see (drafts too), newest first. */
export const loadCourses = async () => {
  const json = await call('/courses?status=all&sort=newest&limit=200');
  return json.data || [];
};

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
/** What a buyer pays: the offer price when it is lower (as the server prices it). */
export const priceOf = (c) => {
  const fee = num(c?.fee);
  const offer = num(c?.offerPrice);
  return offer > 0 && offer < fee ? offer : fee;
};
export const taka = (n) => `৳${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const COURSE_STATUS = {
  published: { label: 'চালু', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  draft: { label: 'খসড়া', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  archived: { label: 'বন্ধ', cls: 'bg-dash-soft text-dash-mute2 ring-dash-line' },
};

export const ORDER_STATUS = {
  pending: { label: 'অপেক্ষমাণ', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  active: { label: 'অনুমোদিত', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'বাতিল', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  expired: { label: 'মেয়াদ শেষ', cls: 'bg-dash-soft text-dash-mute2 ring-dash-line' },
  completed: { label: 'শেষ করেছে', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
};

export const PAY_METHOD = {
  manual: 'Send Money',
  sslcommerz: 'অনলাইন (SSLCommerz)',
  bkash: 'বিকাশ (অনলাইন)',
  free: 'ফ্রি',
  cash: 'হাতে নগদ',
};

export const Badge = ({ map, value }) => {
  const s = map[value] || { label: value || '—', cls: 'bg-dash-soft text-dash-mute2 ring-dash-line' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}`}>{s.label}</span>;
};

export const input =
  'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60';
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm font-medium text-dash-ink3 transition hover:bg-dash-soft disabled:opacity-60';

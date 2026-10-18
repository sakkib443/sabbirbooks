// Every admin ↔ server call for the courier screens, in one place.
import API_BASE_URL from '@/config/api';
import { addDays, bdDate, dayWindow } from '@/lib/shopDay';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function readJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
}

const get = async (path, params) => {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString()}` : '';
  return readJson(await fetch(`${API_BASE_URL}/courier${path}${qs}`, { headers: headers(), cache: 'no-store' }));
};
const post = async (path, body) =>
  readJson(await fetch(`${API_BASE_URL}/courier${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) }));

export const courierStatus = () => get('/status');
export const courierFilters = () => get('/filters');
export const listReady = (params) => get('/ready', params);
export const listConsignments = (params) => get('/consignments', params);
export const courierSummary = (params) => get('/summary', params);
export const courierDashboard = () => get('/dashboard');
export const listCourierPayments = (params) => get('/payments', params);
export const sendToCourier = (orderIds) => post('/send', { orderIds });
export const syncCourier = (orderIds) => post('/sync', orderIds ? { orderIds } : {});
export const syncCourierPayments = () => post('/payments/sync');

export const tk = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '−৳' : '৳') + Math.abs(v).toLocaleString('en-US');
};

/**
 * Date shortcuts, as shop days (noon → noon, Bangladesh time) — the same days
 * the order screens use, so "today" means one thing across the panel.
 */
export const DATE_PRESETS = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '3d', label: 'Last 3 days' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
];

/** { from, to } ISO strings for a shortcut, or {} for all time. */
export function presetWindow(key) {
  const today = bdDate();
  const span = {
    today: [today, today],
    yesterday: [addDays(today, -1), addDays(today, -1)],
    '3d': [addDays(today, -2), addDays(today, 1)],
    '7d': [addDays(today, -6), addDays(today, 1)],
    '30d': [addDays(today, -29), addDays(today, 1)],
    month: [`${today.slice(0, 8)}01`, addDays(today, 1)],
  }[key];
  if (!span) return {};
  const w = dayWindow(span[0], span[1]);
  return { from: w.from.toISOString(), to: w.to.toISOString() };
}

/** A custom pick of two calendar dates ("2026-10-01"), as shop days. */
export function customWindow(fromDay, toDay) {
  if (!fromDay && !toDay) return {};
  const w = dayWindow(fromDay || toDay, toDay || fromDay);
  return { from: w.from.toISOString(), to: w.to.toISOString() };
}

/** The courier's word, as the shop reads it, and its colour. */
export const STATUS_LABEL = {
  in_review: 'In review',
  pending: 'On the way',
  hold: 'On hold',
  unknown: 'Unknown',
  unknown_approval_pending: 'Unknown (approval)',
  delivered_approval_pending: 'Delivered (approval)',
  delivered: 'Delivered',
  partial_delivered_approval_pending: 'Partial (approval)',
  partial_delivered: 'Partly delivered',
  cancelled_approval_pending: 'Returning (approval)',
  cancelled: 'Returned',
};

// Steadfast's own colours: in progress amber, partly delivered blue.
export const GROUP_STYLE = {
  transit: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-sky-100 text-sky-700',
  returned: 'bg-red-100 text-red-600',
};

export const spacedPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '').replace(/^88/, '');
  return d.length === 11 ? `${d.slice(0, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : p || '';
};

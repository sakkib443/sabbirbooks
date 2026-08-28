// All admin ↔ server calls for the book-coupon screens. One place so the three
// pages (list / add / payouts) share the same contract and auth header.
const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function readJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

export async function listCoupons() {
  return readJson(await fetch(`${API}/book-coupons`, { headers: headers(), cache: 'no-store' }));
}

export async function getCoupon(id) {
  return readJson(await fetch(`${API}/book-coupons/${id}`, { headers: headers(), cache: 'no-store' }));
}

// Create (no id) or update (id) — the form uses one call for both.
export async function saveCoupon(id, body) {
  const res = await fetch(`${API}/book-coupons${id ? `/${id}` : ''}`, {
    method: id ? 'PATCH' : 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  return readJson(res);
}

export async function removeCoupon(id) {
  return readJson(await fetch(`${API}/book-coupons/${id}`, { method: 'DELETE', headers: headers() }));
}

export async function fetchPayouts() {
  return readJson(await fetch(`${API}/book-coupons/payouts`, { headers: headers(), cache: 'no-store' }));
}

export const formatTk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

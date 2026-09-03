// Admin ↔ server calls for the book-access screen. One place so the list, the
// block button and the grant form share the same contract and auth header.
const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const token = () =>
  typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('sb_token') || ''
    : '';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function readJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json;
}

/** Everyone who can read a book, with how they came by it. */
export async function listAccess(query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return readJson(
    await fetch(`${API}/book-access/report${qs ? `?${qs}` : ''}`, { headers: headers(), cache: 'no-store' })
  );
}

/** Buyers whose parcel arrived and who have not redeemed a code. */
export async function listWaiting(book) {
  const j = await readJson(
    await fetch(`${API}/book-access/waiting${book ? `?book=${book}` : ''}`, {
      headers: headers(),
      cache: 'no-store',
    })
  );
  return j.data || [];
}

/** Block or restore one grant. A block is soft — the row and its history stay. */
export async function setActive(id, active, note) {
  return readJson(
    await fetch(`${API}/book-access/${id}/active`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ active, note }),
    })
  );
}

/** Give somebody access by hand, by the email an admin has in front of them. */
export async function grantByEmail(body) {
  return readJson(
    await fetch(`${API}/book-access/grant-by-email`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
  );
}

export async function listBooks() {
  const j = await readJson(await fetch(`${API}/books`, { cache: 'no-store' }));
  return j.data?.data || j.data || [];
}

/** How each row came by its access, as the shop would say it. */
export const HOW_LABEL = {
  code: 'বইয়ের কোড',
  manual: 'অ্যাডমিন দিয়েছে',
  digital: 'ডিজিটাল কপি',
};

export const HOW_TONE = {
  code: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  manual: 'bg-sky-50 text-sky-700 border-sky-200',
  digital: 'bg-violet-50 text-violet-700 border-violet-200',
};

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatTk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

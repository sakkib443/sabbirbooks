// Admin ↔ server calls for the book-code screens. One place so the list, the
// generator and the export share the same contract and auth header — the same
// arrangement the affiliate and coupon screens use.
const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('sb_token') || '' : '');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function readJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json;
}

/** The code list, paged and filtered. Returns { rows, total, page, counts }. */
export async function listCopies(query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return readJson(
    await fetch(`${API}/book-copies${qs ? `?${qs}` : ''}`, { headers: headers(), cache: 'no-store' })
  );
}

/** Mint a print run. Returns the codes, so the screen can offer them at once. */
export async function generateCopies(body) {
  const j = await readJson(
    await fetch(`${API}/book-copies/generate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
  );
  return j.data;
}

/** Take one out of circulation — a misprint, a sheet photographed before it shipped. */
export async function voidCopy(id, reason) {
  return readJson(
    await fetch(`${API}/book-copies/${id}/void`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ reason }),
    })
  );
}

/**
 * The file the printer gets.
 *
 * Fetched with the auth header and saved from a blob rather than opened as a
 * plain link: the export needs a token, and a bare <a href> cannot carry one.
 */
export async function downloadCsv(query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== '' && v != null)
  ).toString();
  const res = await fetch(`${API}/book-copies/export${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `book-codes${query.batch ? `-${query.batch}` : ''}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** The books a run can be minted for. */
export async function listBooks() {
  const j = await readJson(await fetch(`${API}/books`, { cache: 'no-store' }));
  return j.data?.data || j.data || [];
}

export const STATUS_LABEL = {
  all: 'সব',
  available: 'খালি',
  redeemed: 'ব্যবহৃত',
  void: 'বাতিল',
};

export const STATUS_TONE = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  redeemed: 'bg-sky-50 text-sky-700 border-sky-200',
  void: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Admin ↔ server calls for the Campus Ambassador screens. One place so the
// list and the detail panel share the same contract and auth header — the same
// arrangement the book-coupon screens use.
const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

async function readJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json;
}

/** The queue. Returns { data, counts } — the counts drive the filter chips. */
export async function listApplications(query = {}) {
  const qs = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return readJson(
    await fetch(`${API}/ambassador${qs ? `?${qs}` : ''}`, { headers: headers(), cache: 'no-store' })
  );
}

export async function getApplication(id) {
  const j = await readJson(
    await fetch(`${API}/ambassador/${id}`, { headers: headers(), cache: 'no-store' })
  );
  return j.data;
}

/**
 * The button that runs the programme. 'approved' mints the coupon and the
 * login; 'rejected' and 'suspended' take the coupon offline. All of that
 * happens server-side — this only says which.
 */
export async function reviewApplication(id, status, adminNote) {
  const j = await readJson(
    await fetch(`${API}/ambassador/${id}/status`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ status, ...(adminNote !== undefined ? { adminNote } : {}) }),
    })
  );
  return j.data;
}

export async function saveNote(id, adminNote) {
  const j = await readJson(
    await fetch(`${API}/ambassador/${id}/note`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ adminNote }),
    })
  );
  return j.data;
}


/** Add an affiliate by hand — no application, approved on the spot. */
export async function createAffiliate(body) {
  const j = await readJson(
    await fetch(`${API}/ambassador`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
  );
  return j.data;
}

/** Edit everything the shop knows about them. Money and identity are not here. */
export async function updateAffiliate(id, body) {
  const j = await readJson(
    await fetch(`${API}/ambassador/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    })
  );
  return j.data;
}

/** Remove the record. The coupon is kept, switched off — see the server note. */
export async function deleteAffiliate(id) {
  return readJson(
    await fetch(`${API}/ambassador/${id}`, { method: 'DELETE', headers: headers() })
  );
}

/** The college list the affiliate form picks from. Public, no auth needed. */
export async function listColleges() {
  const j = await readJson(await fetch(`${API}/medical-colleges`, { cache: 'no-store' }));
  return j.data || [];
}

export const formatTk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

/** How each status is coloured, everywhere it is shown. */
export const STATUS_TONE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  suspended: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const STATUS_LABEL = {
  all: 'সব',
  pending: 'অপেক্ষমাণ',
  approved: 'সক্রিয়',
  rejected: 'বাতিল',
  suspended: 'স্থগিত',
};

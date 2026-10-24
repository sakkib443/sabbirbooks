'use client';

/**
 * "Add order" — orders that did not come through the website (19 Oct 2026).
 *
 * Two ways in, one API (POST /orders/manual, see manualOrder.service):
 *   • One order — a short form; only name, phone, and an address or a
 *     medical college are required.
 *   • From a sheet — upload a .csv (Google Sheets: File → Download → CSV;
 *     Excel: Save as → CSV UTF-8) or paste rows copied straight out of the
 *     sheet. Every row is checked first and shown with what is wrong; then
 *     the good ones are added in one go. The sample file is the format.
 *
 * Nobody is texted. Same sheet twice adds nothing twice (its order number).
 */

import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiDownload, FiFileText, FiLoader, FiPlus, FiUpload, FiX } from 'react-icons/fi';

// The sample sheet: the columns, in the order the shop's sheet should have them.
const TEMPLATE_HEADERS = [
  'order_ref', 'date', 'name', 'phone', 'alt_phone', 'medical_college', 'district', 'upazila',
  'address', 'book', 'quantity', 'amount', 'delivery_charge', 'payment', 'status', 'note', 'session',
];
const TEMPLATE_ROWS = [
  ['KMC-001', '2026-10-19', 'Abdullah Al Mamun', '01711000001', '', 'Khulna Medical College', '', '', '', '', '1', '690', '90', 'cod', 'confirmed', 'Hall 3', '24-25'],
  ['KMC-002', '2026-10-19', 'Nusrat Jahan', '01711000002', '01811000002', 'Khulna Medical College', '', '', 'Girls hostel, room 12', '', '2', '1280', '0', 'paid', 'shipped', '', '25-26'],
  ['PH-003', '2026-10-18', 'রাকিব হাসান', '01711000003', '', '', 'ঢাকা', 'মিরপুর', 'বাসা ১০, রোড ৫, মিরপুর ২', '', '1', '', '', 'cod', 'pending', 'ফোনে অর্ডার', ''],
];

// Header → field. Case, spaces, _ and - are ignored, and Bengali names work too.
const ALIASES = {
  ref: ['orderref', 'ref', 'orderno', 'ordernumber', 'order', 'অর্ডারনম্বর', 'অর্ডার'],
  date: ['date', 'orderdate', 'তারিখ'],
  name: ['name', 'customer', 'customername', 'নাম'],
  phone: ['phone', 'mobile', 'phonenumber', 'mobilenumber', 'ফোন', 'মোবাইল', 'মোবাইলনম্বর'],
  altPhone: ['altphone', 'alternatephone', 'secondphone', 'phone2', 'আরেকটানম্বর'],
  college: ['medicalcollege', 'college', 'কলেজ', 'মেডিকেলকলেজ'],
  district: ['district', 'জেলা'],
  upazila: ['upazila', 'thana', 'upazilathana', 'উপজেলা', 'থানা'],
  address: ['address', 'ঠিকানা'],
  book: ['book', 'booktitle', 'বই'],
  quantity: ['quantity', 'qty', 'copies', 'কয়টা', 'পরিমাণ', 'সংখ্যা'],
  amount: ['amount', 'total', 'price', 'টাকা', 'মোট', 'মোটটাকা'],
  deliveryCharge: ['deliverycharge', 'delivery', 'ডেলিভারিচার্জ', 'ডেলিভারি'],
  payment: ['payment', 'paymentmethod', 'পেমেন্ট'],
  status: ['status', 'স্ট্যাটাস', 'অবস্থা'],
  note: ['note', 'notes', 'remark', 'নোট'],
  // 25-26 (1st year) / 24-25 (2nd year)
  session: ['session', 'year', 'সেশন'],
};
const normKey = (h) => String(h || '').toLowerCase().replace(/[\s_\-().:]/g, '');
const FIELD_OF = Object.fromEntries(Object.entries(ALIASES).flatMap(([f, keys]) => keys.map((k) => [k, f])));

/** CSV or pasted cells (tab-separated) → array of arrays. Handles quotes and line breaks in quotes. */
function parseTable(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = firstLine.includes('\t') ? '\t' : firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/** Rows of cells (first row = headers) → order objects, plus the columns it could not place. */
function toOrders(table) {
  if (table.length < 2) return { orders: [], unknown: [] };
  const header = table[0].map((h) => FIELD_OF[normKey(h)] || null);
  const unknown = table[0].filter((h, i) => !header[i] && String(h).trim());
  const orders = table.slice(1).map((cells) => {
    const o = {};
    header.forEach((f, i) => { if (f) o[f] = String(cells[i] ?? '').trim(); });
    return o;
  });
  return { orders, unknown };
}

function downloadTemplate() {
  const esc = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const csv = [TEMPLATE_HEADERS, ...TEMPLATE_ROWS].map((r) => r.map(esc).join(',')).join('\r\n');
  // The BOM is what makes Excel read the Bengali correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'magic-viva-orders-sample.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

const input = 'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 outline-none focus:border-brand';
const label = 'mb-1 block text-[11px] font-semibold text-dash-mute';

const EMPTY = {
  name: '', phone: '', altPhone: '', college: '', district: '', upazila: '', address: '', book: '',
  quantity: '1', amount: '', deliveryCharge: '', payment: 'cod', status: 'confirmed', date: '', ref: '', note: '', session: '',
};

export default function AddOrderModal({ api, headers, colleges = [], onClose, onAdded }) {
  const [tab, setTab] = useState('one');
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  // Off by default: these buyers did not order on the site. Ticked, each one
  // gets the text for their order's status (confirmed / shipped / delivered).
  const [sms, setSms] = useState(false);

  // Sheet
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { orders, unknown }
  const [check, setCheck] = useState(null); // dry-run results

  useEffect(() => {
    let alive = true;
    fetch(`${api}/books`)
      .then((r) => r.json())
      .then((j) => {
        const list = Array.isArray(j?.data) ? j.data : j?.data?.books || [];
        if (alive) setBooks(list.filter((b) => b.format === 'printed'));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [api]);

  const post = async (orders, dryRun, source) => {
    const res = await fetch(`${api}/orders/manual`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders, dryRun, source, sms: dryRun ? false : sms }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || 'Could not add');
    return json.data;
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const smsBox = (
    <label className="mr-auto flex cursor-pointer items-start gap-2 text-sm text-dash-ink3">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={sms} onChange={(e) => setSms(e.target.checked)} />
      <span>
        স্ট্যাটাস অনুযায়ী ক্রেতাকে SMS পাঠান
        <span className="block text-[11px] text-dash-mute">Confirmed / Shipped / Delivered — যেটা, সেই SMS যাবে। Pending হলে যাবে না।</span>
      </span>
    </label>
  );
  const pickedBook = books.find((b) => b.slug === form.book) || (books.length === 1 ? books[0] : null);
  const listPrice = pickedBook ? Number(pickedBook.offerPrice ?? pickedBook.price) || 0 : 0;
  const suggested = listPrice * (Number(form.quantity) || 1) + (Number(form.deliveryCharge) || 0);

  const addOne = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const data = await post([{ ...form, book: form.book || pickedBook?.slug || '' }], false, 'manual');
      const r = data.results?.[0];
      if (!r?.ok) throw new Error(r?.error || 'Could not add');
      setDone(`অর্ডার #${r.orderSeq} যোগ হয়েছে।`);
      setForm((f) => ({ ...EMPTY, college: f.college, book: f.book, payment: f.payment, status: f.status }));
      onAdded?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const readSheet = async (text, name = '') => {
    setError('');
    setDone('');
    setCheck(null);
    const p = toOrders(parseTable(text));
    setParsed(p);
    setFileName(name);
    if (!p.orders.length) { setError('কোনো অর্ডার পাওয়া যায়নি। প্রথম লাইনে কলামের নাম থাকতে হবে (নমুনা ফাইলের মতো)।'); return; }
    setBusy(true);
    try {
      setCheck(await post(p.orders, true, 'import'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) {
      setError('Excel ফাইল সরাসরি নয় — Excel-এ "Save As → CSV UTF-8" করে আপলোড করুন, অথবা সারিগুলো কপি করে নিচের বক্সে পেস্ট করুন।');
      return;
    }
    readSheet(await f.text(), f.name);
  };

  const okCount = check?.results?.filter((r) => r.ok).length || 0;
  const badCount = (check?.results?.length || 0) - okCount;

  const importAll = async () => {
    if (!parsed?.orders?.length) return;
    setBusy(true);
    setError('');
    try {
      const data = await post(parsed.orders, false, 'import');
      setDone(`${data.created}টি অর্ডার যোগ হয়েছে${data.failed ? `, ${data.failed}টি যোগ হয়নি` : ''}।`);
      setCheck(data);
      onAdded?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const collegeNames = useMemo(() => colleges.map((c) => c.name).filter(Boolean).sort((a, b) => a.localeCompare(b)), [colleges]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-2xl border border-dash-line bg-dash-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-dash-line px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-dash-ink2"><FiPlus className="text-brand" /> Add order</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-dash-mute hover:bg-dash-soft" aria-label="Close"><FiX /></button>
        </div>

        <div className="flex gap-1 border-b border-dash-line px-5 pt-3">
          {[['one', 'একটা অর্ডার'], ['sheet', 'শিট থেকে অনেকগুলো']].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setError(''); setDone(''); }}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === k ? 'border border-b-0 border-dash-line bg-dash-card text-brand' : 'text-dash-mute hover:text-dash-ink3'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-5">
          {error && <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"><FiAlertCircle className="mt-0.5 shrink-0" /> {error}</p>}
          {done && <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><FiCheckCircle /> {done}</p>}

          {tab === 'one' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className={label}>নাম *</label><input className={input} value={form.name} onChange={set('name')} /></div>
                <div><label className={label}>মোবাইল *</label><input className={input} value={form.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" /></div>
                <div><label className={label}>আরেকটা নম্বর</label><input className={input} value={form.altPhone} onChange={set('altPhone')} /></div>
                <div>
                  <label className={label}>মেডিকেল কলেজ</label>
                  <input className={input} list="add-order-colleges" value={form.college} onChange={set('college')} placeholder="নাম লিখুন বা বেছে নিন" />
                  <datalist id="add-order-colleges">{collegeNames.map((n) => <option key={n} value={n} />)}</datalist>
                </div>
                <div><label className={label}>জেলা</label><input className={input} value={form.district} onChange={set('district')} placeholder="কলেজ দিলে নিজে বসবে" /></div>
                <div><label className={label}>উপজেলা / থানা</label><input className={input} value={form.upazila} onChange={set('upazila')} /></div>
                <div className="sm:col-span-2"><label className={label}>ঠিকানা (কলেজ না দিলে লাগবে)</label><input className={input} value={form.address} onChange={set('address')} /></div>
                <div>
                  <label className={label}>বই</label>
                  <select className={input} value={form.book || pickedBook?.slug || ''} onChange={set('book')}>
                    {books.map((b) => <option key={b._id} value={b.slug}>{b.title}</option>)}
                  </select>
                </div>
                <div><label className={label}>কয়টা</label><input className={input} type="number" min="1" value={form.quantity} onChange={set('quantity')} /></div>
                <div><label className={label}>ডেলিভারি চার্জ (৳)</label><input className={input} value={form.deliveryCharge} onChange={set('deliveryCharge')} placeholder="0" /></div>
                <div><label className={label}>মোট টাকা (৳)</label><input className={input} value={form.amount} onChange={set('amount')} placeholder={suggested ? `খালি রাখলে ${suggested}` : ''} /></div>
                <div>
                  <label className={label}>পেমেন্ট</label>
                  <select className={input} value={form.payment} onChange={set('payment')}>
                    <option value="cod">Cash on delivery</option>
                    <option value="paid">Paid (আগেই টাকা পেয়েছি)</option>
                  </select>
                </div>
                <div>
                  <label className={label}>স্ট্যাটাস</label>
                  <select className={input} value={form.status} onChange={set('status')}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div><label className={label}>অর্ডারের তারিখ</label><input className={input} type="date" value={form.date} onChange={set('date')} /></div>
                <div><label className={label}>রেফারেন্স / অর্ডার নম্বর</label><input className={input} value={form.ref} onChange={set('ref')} /></div>
                <div>
                  <label className={label}>Session</label>
                  <select className={input} value={form.session} onChange={set('session')}>
                    <option value="">—</option>
                    <option value="25-26">25-26 (1st year)</option>
                    <option value="24-25">24-25 (2nd year)</option>
                  </select>
                </div>
                <div><label className={label}>নোট</label><input className={input} value={form.note} onChange={set('note')} /></div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {smsBox}
                <button onClick={onClose} className="rounded-lg border border-dash-line px-4 py-2 text-sm text-dash-ink3 hover:bg-dash-soft">বন্ধ</button>
                <button onClick={addOne} disabled={busy || !form.name || !form.phone}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                  {busy ? <FiLoader className="animate-spin" /> : <FiPlus />} অর্ডার যোগ করুন
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-dash-line bg-dash-soft/50 p-4 text-sm text-dash-ink3">
                <p className="mb-2 font-semibold">কীভাবে:</p>
                <ol className="list-decimal space-y-1 pl-5 text-[13px]">
                  <li>নমুনা ফাইলটা নামিয়ে ক্লায়েন্টকে দিন — ওই কলামগুলোতে অর্ডার লিখবে (Google Sheet বা Excel)।</li>
                  <li>Google Sheet: File → Download → CSV. Excel: Save As → <b>CSV UTF-8</b>.</li>
                  <li>সেই ফাইল এখানে আপলোড করুন — অথবা শিট থেকে সারিগুলো (কলামের নামসহ) কপি করে নিচের বক্সে পেস্ট করুন।</li>
                </ol>
                <p className="mt-2 text-[12px] text-dash-mute">
                  লাগবেই: নাম, মোবাইল, আর ঠিকানা বা মেডিকেল কলেজ। status: pending / confirmed / shipped / delivered / cancelled · payment: cod / paid ·
                  date: 2026-10-19 বা 19/10/2026 · amount খালি রাখলে বইয়ের দাম × কয়টা + ডেলিভারি চার্জ।
                </p>
                <button onClick={downloadTemplate} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand/40 bg-dash-card px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft">
                  <FiDownload /> নমুনা ফাইল নামান (CSV)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
                  <FiUpload /> CSV ফাইল আপলোড
                  <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv" className="hidden" onChange={onFile} />
                </label>
                {fileName && <span className="flex items-center gap-1 text-xs text-dash-mute"><FiFileText /> {fileName}</span>}
              </div>
              <div>
                <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={4}
                  placeholder="অথবা Google Sheet / Excel থেকে সারিগুলো (প্রথম লাইনে কলামের নাম) কপি করে এখানে পেস্ট করুন"
                  className={`${input} font-mono text-xs`} />
                <button onClick={() => readSheet(pasted)} disabled={!pasted.trim() || busy}
                  className="mt-2 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft disabled:opacity-50">
                  পেস্ট করা সারিগুলো পরীক্ষা করুন
                </button>
              </div>

              {parsed?.unknown?.length > 0 && (
                <p className="text-xs text-amber-700">এই কলামগুলো চেনা যায়নি, বাদ দেওয়া হবে: {parsed.unknown.join(', ')}</p>
              )}

              {busy && !check && <div className="flex justify-center p-6"><FiLoader className="animate-spin text-brand" size={20} /></div>}

              {check && (
                <>
                  <p className="text-sm text-dash-ink3">
                    <b className="text-emerald-600">{okCount}টি ঠিক আছে</b>
                    {badCount > 0 && <> · <b className="text-red-600">{badCount}টিতে সমস্যা</b> (যোগ হবে না)</>}
                  </p>
                  <div className="max-h-72 overflow-auto rounded-lg border border-dash-line">
                    <table className="w-full min-w-[640px] text-xs">
                      <thead className="sticky top-0 bg-dash-soft text-left text-dash-mute2">
                        <tr>
                          <th className="px-2 py-1.5">সারি</th><th className="px-2 py-1.5">নাম</th><th className="px-2 py-1.5">মোবাইল</th>
                          <th className="px-2 py-1.5">কলেজ</th><th className="px-2 py-1.5 text-right">কয়টা</th><th className="px-2 py-1.5 text-right">টাকা</th>
                          <th className="px-2 py-1.5">স্ট্যাটাস</th><th className="px-2 py-1.5">ফল</th>
                        </tr>
                      </thead>
                      <tbody>
                        {check.results.map((r) => (
                          <tr key={r.row} className={`border-t border-dash-line/60 ${r.ok ? '' : 'bg-red-50/60'}`}>
                            <td className="px-2 py-1.5 tabular-nums">{r.row}</td>
                            <td className="px-2 py-1.5">{r.preview?.name || parsed?.orders?.[r.row - 1]?.name || '—'}</td>
                            <td className="px-2 py-1.5 font-mono">{r.preview?.phone || parsed?.orders?.[r.row - 1]?.phone || '—'}</td>
                            <td className="px-2 py-1.5">{r.preview?.college || '—'}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{r.preview?.quantity ?? '—'}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{r.preview ? `৳${r.preview.total}` : '—'}</td>
                            <td className="px-2 py-1.5">{r.preview?.status || '—'}</td>
                            <td className="px-2 py-1.5">
                              {r.ok ? <span className="text-emerald-600">{r.orderSeq ? `#${r.orderSeq} যোগ হয়েছে` : 'ঠিক আছে'}</span> : <span className="text-red-600">{r.error}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!check.created && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {smsBox}
                      <button onClick={importAll} disabled={busy || okCount === 0}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
                        {busy ? <FiLoader className="animate-spin" /> : <FiPlus />} {okCount}টি অর্ডার যোগ করুন
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

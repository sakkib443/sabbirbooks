'use client';

/**
 * The book codes: minting a print run, and seeing what happened to them.
 *
 * Each printed copy carries one of these under a scratch panel, and whoever
 * redeems it gets the book's QR answers on their own account. So this screen
 * does two jobs that sit oddly together — a factory floor (make 5,000 codes,
 * hand the file to the printer) and a ledger (who opened which copy) — and it
 * keeps them apart: the run is made in a panel that has to be opened, the
 * ledger is the table underneath.
 *
 * The freshly minted codes are shown once, right after making them, with the
 * download button next to them. That is the only moment anybody needs to look
 * at raw codes on a screen; after that the file is the artefact and the table
 * is the record.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  FiKey, FiPlus, FiDownload, FiLoader, FiAlertCircle, FiSearch, FiSlash,
  FiCheckCircle, FiUser, FiBookOpen, FiCopy, FiX, FiRefreshCw,
} from 'react-icons/fi';
import {
  listCopies, generateCopies, voidCopy, downloadCsv, listBooks,
  STATUS_LABEL, STATUS_TONE, formatDate,
} from './copyApi';

const TABS = ['all', 'available', 'redeemed', 'void'];

export default function BookCodesManager() {
  const [books, setBooks] = useState([]);
  const [filters, setFilters] = useState({ status: 'available', book: '', batch: '', q: '', page: 1 });
  const [state, setState] = useState({ loading: true, error: '', rows: [], total: 0, counts: {} });
  const [busyId, setBusyId] = useState('');
  const [showGen, setShowGen] = useState(false);
  const [minted, setMinted] = useState(null); // the run just made, shown once
  const [copied, setCopied] = useState(false);

  const load = async (q = filters) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const j = await listCopies({ ...q, limit: 50 });
      setState({ loading: false, error: '', rows: j.rows || [], total: j.total || 0, counts: j.counts || {} });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'লোড করা যায়নি', rows: [] }));
    }
  };

  useEffect(() => {
    listBooks().then(setBooks).catch(() => { /* the picker falls back to empty */ });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTab = (status) => {
    const next = { ...filters, status, page: 1 };
    setFilters(next);
    load(next);
  };

  const doVoid = async (row) => {
    const reason = prompt(
      `${row.code} বাতিল করবেন?\n\nকারণ লিখুন (যেমন: মিসপ্রিন্ট, শিটের ছবি তোলা হয়েছে):`
    );
    if (reason === null) return;
    setBusyId(row._id);
    try {
      await voidCopy(row._id, reason);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId('');
    }
  };

  const pages = Math.max(Math.ceil(state.total / 50), 1);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
            <FiKey className="text-brand" /> বইয়ের কোড
          </h1>
          <p className="text-sm text-dash-mute">
            প্রতিটা ছাপা বইয়ের ভেতরে একটা করে কোড। যার হাতে বই, সে এই কোড দিয়ে
            নিজের অ্যাকাউন্টে সব উত্তর খুলে নেয়।
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Kpi label="খালি" value={state.counts.available || 0} tone="emerald" />
          <Kpi label="ব্যবহৃত" value={state.counts.redeemed || 0} tone="sky" />
          <Kpi label="বাতিল" value={state.counts.void || 0} tone="slate" />
          <button
            onClick={() => downloadCsv({ book: filters.book, batch: filters.batch, status: filters.status }).catch((e) => alert(e.message))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2.5 text-sm font-medium text-dash-ink3 hover:bg-dash-soft"
            title="এখন যা দেখছেন সেটাই ফাইলে — প্রিন্টারকে দেওয়ার জন্য"
          >
            <FiDownload /> এক্সপোর্ট
          </button>
          <button
            onClick={() => setShowGen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <FiPlus /> নতুন কোড বানান
          </button>
        </div>
      </header>

      {/* The run just minted — the one moment raw codes belong on a screen. */}
      {minted && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-emerald-800">
                <FiCheckCircle /> {minted.count} টি কোড তৈরি হয়েছে
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                ফাইলটা নামিয়ে প্রিন্টারকে দিন। এই তালিকা আর দেখানো হবে না — কোডগুলো
                নিরাপদে রাখা আছে, নিচের তালিকা থেকেই কাজ চলবে।
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(minted.codes.join('\n'));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-800"
              >
                <FiCopy /> {copied ? 'কপি হয়েছে' : 'সব কপি করুন'}
              </button>
              <button
                onClick={() => setMinted(null)}
                className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-100"
              >
                <FiX />
              </button>
            </div>
          </div>
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-white p-3 font-mono text-xs leading-relaxed text-dash-ink3">
            {minted.codes.slice(0, 200).join('  ·  ')}
            {minted.codes.length > 200 && `  … আরও ${minted.codes.length - 200} টি (ফাইলে সব আছে)`}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filters.status === t
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
            }`}
          >
            {STATUS_LABEL[t]}
            {t !== 'all' && state.counts[t] ? (
              <span className="ml-1.5 text-xs opacity-70">{state.counts[t]}</span>
            ) : null}
          </button>
        ))}

        <form
          onSubmit={(e) => { e.preventDefault(); const n = { ...filters, page: 1 }; setFilters(n); load(n); }}
          className="ml-auto flex flex-wrap items-center gap-2"
        >
          <select
            value={filters.book}
            onChange={(e) => { const n = { ...filters, book: e.target.value, page: 1 }; setFilters(n); load(n); }}
            className="rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 outline-none focus:border-brand"
          >
            <option value="">সব বই</option>
            {books.map((b) => (
              <option key={b._id} value={b._id}>{b.title}</option>
            ))}
          </select>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="কোড, নাম, রোল, কলেজ…"
              className="w-56 rounded-lg border border-dash-line bg-dash-card py-2 pl-9 pr-3 text-sm text-dash-ink2 outline-none focus:border-brand"
            />
          </div>
          <button type="submit" className="rounded-lg border border-dash-line px-3 py-2 text-sm font-medium text-dash-ink3 hover:bg-dash-soft">
            খুঁজুন
          </button>
        </form>
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <FiAlertCircle /> {state.error}
        </div>
      )}

      {state.loading ? (
        <div className="flex h-[40vh] items-center justify-center text-dash-mute2">
          <FiLoader className="mr-2 animate-spin" /> লোড হচ্ছে…
        </div>
      ) : state.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dash-line p-12 text-center">
          <FiKey className="mx-auto mb-3 text-3xl text-dash-mute2" />
          <p className="font-medium text-dash-ink3">এখানে কোনো কোড নেই</p>
          <p className="mt-1 text-sm text-dash-mute2">
            নতুন ছাপার জন্য কোড বানিয়ে ফাইলটা প্রিন্টারকে দিন।
          </p>
          <button
            onClick={() => setShowGen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <FiPlus /> নতুন কোড বানান
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-dash-line bg-dash-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-xs uppercase tracking-wider text-dash-mute2">
                  <th className="px-4 py-3 font-semibold">কোড</th>
                  <th className="px-4 py-3 font-semibold">বই</th>
                  <th className="px-4 py-3 font-semibold">ছাপার নাম</th>
                  <th className="px-4 py-3 font-semibold">অবস্থা</th>
                  <th className="px-4 py-3 font-semibold">কে খুলেছে</th>
                  <th className="px-4 py-3 font-semibold">কবে</th>
                  <th className="px-4 py-3 text-right font-semibold">কাজ</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold tracking-wide text-dash-ink2">{r.code}</span>
                    </td>
                    <td className="px-4 py-3 text-dash-ink3">{r.book?.title || '—'}</td>
                    <td className="px-4 py-3 text-dash-mute2">{r.batch || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.holder?.fullName ? (
                        <>
                          <span className="flex items-center gap-1.5 text-dash-ink3">
                            <FiUser size={12} className="text-dash-mute2" /> {r.holder.fullName}
                          </span>
                          <span className="block text-[11px] text-dash-mute2">
                            {[r.holder.medicalCollegeName, r.holder.classRoll].filter(Boolean).join(' · ')}
                          </span>
                          {r.redeemedBy?.email && (
                            <span className="block font-mono text-[11px] text-dash-mute2">{r.redeemedBy.email}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-dash-mute2">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-dash-mute2">
                      {r.status === 'redeemed' ? formatDate(r.redeemedAt) : formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'available' ? (
                        <button
                          disabled={busyId === r._id}
                          onClick={() => doVoid(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dash-line px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                          title="বাতিল করুন — মিসপ্রিন্ট বা হারানো শিট"
                        >
                          {busyId === r._id ? <FiLoader className="animate-spin" /> : <FiSlash />} বাতিল
                        </button>
                      ) : (
                        <span className="text-xs text-dash-mute2">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-dash-mute2">
              <span>মোট {state.total} টি</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => { const n = { ...filters, page: filters.page - 1 }; setFilters(n); load(n); }}
                  className="rounded-lg border border-dash-line px-3 py-1.5 disabled:opacity-40"
                >
                  আগের
                </button>
                <span>{filters.page} / {pages}</span>
                <button
                  disabled={filters.page >= pages}
                  onClick={() => { const n = { ...filters, page: filters.page + 1 }; setFilters(n); load(n); }}
                  className="rounded-lg border border-dash-line px-3 py-1.5 disabled:opacity-40"
                >
                  পরের
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showGen && (
        <GeneratePanel
          books={books}
          onClose={() => setShowGen(false)}
          onDone={(data, query) => {
            setShowGen(false);
            setMinted(data);
            const n = { ...filters, status: 'available', book: query.bookId, batch: query.batch, page: 1 };
            setFilters(n);
            load(n);
          }}
        />
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────

const TONE = {
  emerald: 'text-emerald-600',
  sky: 'text-sky-600',
  slate: 'text-slate-500',
};

const Kpi = ({ label, value, tone }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-dash-line bg-dash-card px-3 py-2">
    <span className="text-dash-mute2">{label}</span>
    <strong className={`tabular-nums ${TONE[tone]}`}>{value}</strong>
  </span>
);

/**
 * Making a print run.
 *
 * The count is typed rather than picked from a list because a print run is
 * whatever the printer quoted — 2,000, 5,000, 300 for a reprint. The batch name
 * matters more than it looks: it is how the shop later answers "the codes in
 * the second printing are not working", so the field explains itself.
 */
function GeneratePanel({ books, onClose, onDone }) {
  const [form, setForm] = useState({ bookId: books[0]?._id || '', count: 1000, batch: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const suggested = useMemo(() => {
    const d = new Date();
    return `PRINT-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const count = Number(form.count) || 0;
    if (!form.bookId) return setError('কোন বইয়ের জন্য, সেটা বেছে নিন');
    if (count < 1) return setError('কয়টা কোড লাগবে?');
    if (count > 20000) return setError('একবারে ২০,০০০-এর বেশি নয় — ভাগ করে নিন');

    setBusy(true);
    try {
      const body = { bookId: form.bookId, count, batch: form.batch.trim() || suggested };
      const data = await generateCopies(body);
      onDone(data, body);
    } catch (err) {
      setError(err.message || 'তৈরি করা যায়নি');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-dash-card p-5 shadow-2xl"
      >
        <h2 className="flex items-center gap-2 text-lg font-bold text-dash-ink2">
          <FiKey className="text-brand" /> নতুন কোড বানান
        </h2>
        <p className="mt-1 text-xs text-dash-mute2">
          যত কপি ছাপাবেন তত কোড। তৈরি হলে ফাইলটা নামিয়ে প্রিন্টারকে দেবেন — প্রতিটা
          বইয়ে একটা করে বসবে।
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-dash-ink3">কোন বই</span>
            <select
              value={form.bookId}
              onChange={(e) => setForm((f) => ({ ...f, bookId: e.target.value }))}
              className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink2 outline-none focus:border-brand"
            >
              <option value="">নির্বাচন করুন</option>
              {books.map((b) => (
                <option key={b._id} value={b._id}>{b.title}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-dash-ink3">কয়টা</span>
            <input
              type="number"
              min="1"
              max="20000"
              value={form.count}
              onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
              className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm tabular-nums text-dash-ink2 outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-dash-ink3">ছাপার নাম</span>
            <span className="mb-1.5 block text-[11px] text-dash-mute2">
              কোন ছাপার কোড, সেটা মনে রাখার জন্য। পরে "দ্বিতীয় ছাপার কোডগুলো কাজ
              করছে না" ধরনের প্রশ্নে এটাই কাজে লাগে।
            </span>
            <input
              value={form.batch}
              onChange={(e) => setForm((f) => ({ ...f, batch: e.target.value }))}
              placeholder={suggested}
              className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink2 outline-none focus:border-brand"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {busy ? <FiRefreshCw className="animate-spin" /> : <FiPlus />}
            {busy ? 'তৈরি হচ্ছে…' : 'তৈরি করুন'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-dash-line px-4 py-2.5 text-sm text-dash-mute hover:text-dash-ink3">
            বাতিল
          </button>
        </div>
      </form>
    </div>
  );
}

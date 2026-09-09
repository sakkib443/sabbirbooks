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
  FiRotateCcw, FiSend, FiUnlock,
} from 'react-icons/fi';
import {
  listCopies, generateCopies, voidCopy, downloadCsv, listBooks,
  resetCopy, transferCopy, getRelease, setRelease,
  STATUS_LABEL, STATUS_TONE, formatDate,
} from './copyApi';

const TABS = ['all', 'available', 'redeemed', 'void'];

/**
 * Undoing one redemption.
 *
 * Both actions take a book away from an account that has it, so the dialog
 * shows WHO currently holds it before asking anything — an admin acting on a
 * support message needs to see that the row in front of them is the one the
 * reader is describing, and the email is the only thing they can check that
 * against.
 */
function FixDialog({ row, onClose, onDone }) {
  const [mode, setMode] = useState('reset');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const holderEmail = row?.redeemedBy?.email || '';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res =
        mode === 'reset'
          ? await resetCopy(row._id, reason.trim())
          : await transferCopy(row._id, email.trim(), reason.trim());
      onDone(res.message);
    } catch (e2) {
      setError(e2.message || 'কাজটি করা যায়নি');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-dash-line bg-dash-card p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-dash-ink2">ব্যবহৃত কোড ঠিক করুন</h3>
            <p className="mt-0.5 font-mono text-[11px] text-dash-mute2">{row.code}</p>
          </div>
          <button onClick={onClose} className="text-dash-mute hover:text-dash-ink3" aria-label="বন্ধ করুন">
            <FiX />
          </button>
        </div>

        {/* Who loses the book. Shown before the choice, not after it. */}
        <div className="mb-4 rounded-xl border border-dash-line bg-dash-soft/60 p-3 text-xs">
          <span className="text-dash-mute2">এখন যার কাছে আছে</span>
          <p className="mt-0.5 font-semibold text-dash-ink3">
            {holderEmail || row.holder?.fullName || '—'}
          </p>
          {row.holder?.fullName && holderEmail && (
            <p className="text-dash-mute2">{row.holder.fullName}</p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-dash-soft p-1">
          {[
            { id: 'reset', label: 'ফেরত নিন', hint: 'কোড আবার ব্যবহারযোগ্য' },
            { id: 'transfer', label: 'সরিয়ে দিন', hint: 'অন্য অ্যাকাউন্টে' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                mode === t.id
                  ? 'bg-brand text-white shadow-sm shadow-brand/25'
                  : 'text-dash-mute hover:bg-dash-card hover:text-dash-ink3'
              }`}
            >
              {t.label}
              <span className="mt-0.5 block text-[10px] font-normal opacity-80">{t.hint}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'transfer' && (
            <div>
              <span className="text-xs font-semibold text-dash-mute">কোন অ্যাকাউন্টে</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@gmail.com"
                className="mt-1.5 w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <p className="mt-1 text-[11px] text-dash-mute2">
                অ্যাকাউন্টটি আগে থেকে থাকতে হবে — না থাকলে আগে সাইন-আপ করতে বলুন।
              </p>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-dash-mute">কারণ (ঐচ্ছিক)</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ভুল অ্যাকাউন্টে বসানো হয়েছিল"
              className="mt-1.5 w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mt-1 text-[11px] text-dash-mute2">
              কোডের ইতিহাসে লেখা থাকবে — পরে কেউ জিজ্ঞেস করলে উত্তর দেওয়া যাবে।
            </p>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {busy ? <FiLoader className="animate-spin" /> : mode === 'reset' ? <FiRotateCcw /> : <FiSend />}
              {mode === 'reset' ? 'ফেরত নিন' : 'সরিয়ে দিন'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2.5 text-sm text-dash-mute hover:text-dash-ink3"
            >
              বাতিল
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BookCodesManager() {
  const [books, setBooks] = useState([]);
  const [filters, setFilters] = useState({ status: 'available', book: '', batch: '', q: '', released: '', page: 1 });
  // How far down the printed sheet the codes work. Its own bit of state
  // because it is a property of the whole run, not of any row on screen.
  const [release, setReleaseState] = useState(null);
  // The row an admin is fixing, and which of the two things they are doing.
  const [fixing, setFixing] = useState(null);
  const [releasing, setReleasing] = useState(false);
  // One line of feedback shared by the release control and the fix dialog —
  // both are actions whose result is a sentence, not a new screen.
  const [notice, setNotice] = useState('');
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
    getRelease().then(setReleaseState).catch(() => { /* the banner just stays hidden */ });
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

      {/* One line saying what just happened. Both the release control and
          the fix dialog end in a sentence rather than a new screen, so they
          share it. */}
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand/30 bg-brand-soft/50 px-4 py-3 text-sm text-dash-ink3">
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            className="shrink-0 text-dash-mute hover:text-dash-ink3"
            aria-label="বন্ধ করুন"
          >
            <FiX />
          </button>
        </div>
      )}

      {fixing && (
        <FixDialog
          row={fixing}
          onClose={() => setFixing(null)}
          onDone={(msg) => {
            setFixing(null);
            setNotice(msg);
            // Both the row and the run-wide counts moved, so both are reread.
            load();
            getRelease().then(setReleaseState).catch(() => {});
          }}
        />
      )}

      {/* ── Which print batch is live ──────────────────────────────────
          3,000 codes exist and the books ship in batches, so the number that
          matters day to day is not "how many codes" but "how far down the
          sheet do they work". It sits above the list because it governs
          every row in it. */}
      {release && release.total > 0 && (
        <section className="rounded-2xl border border-dash-line bg-dash-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-bold text-dash-ink2">
                <FiUnlock className="text-brand" /> ছাপা হওয়া ব্যাচ
              </h2>
              <p className="mt-1 text-[13px] text-dash-mute">
                সিরিয়াল <b className="tabular-nums text-dash-ink3">১–{release.releasedUpTo}</b> এখন
                কাজ করছে। <b className="tabular-nums text-dash-ink3">{release.held}</b>টি কোড এখনো
                বন্ধ — ওই বইগুলো ছাপা হলে সীমা বাড়ান।
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const n = Number(e.currentTarget.upTo.value);
                if (!Number.isFinite(n) || n < 0) return;
                setReleasing(true);
                try {
                  const res = await setRelease(n);
                  setReleaseState(res.data);
                  setNotice(res.message);
                  load();
                } catch (e2) {
                  setNotice(e2.message || 'সীমা বদলানো গেল না');
                } finally {
                  setReleasing(false);
                }
              }}
              className="flex items-end gap-2"
            >
              <label className="text-xs font-semibold text-dash-mute">
                কত পর্যন্ত চালু
                <input
                  name="upTo"
                  type="number"
                  min="0"
                  max={release.total}
                  defaultValue={release.releasedUpTo}
                  className="mt-1.5 block w-28 rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm tabular-nums outline-none focus:border-brand"
                />
              </label>
              <button
                type="submit"
                disabled={releasing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {releasing ? <FiLoader className="animate-spin" /> : <FiUnlock />} প্রয়োগ
              </button>
            </form>
          </div>

          {/* A bar, because "500 of 3000" is a proportion and reads faster as
              one. Live and held are the only two states worth showing here. */}
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-dash-soft">
            <div
              className="bg-brand"
              style={{ width: `${Math.round((release.live / release.total) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-dash-mute2 tabular-nums">
            চালু {release.live} · বন্ধ {release.held} · মোট {release.total}
            {release.redeemed > 0 && ` · ব্যবহৃত ${release.redeemed}`}
          </p>
        </section>
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
          {/* Which print batch, alongside the used/unused tabs. Two different
              questions about one code: has anyone used it, and is it even
              allowed to be used yet. */}
          <select
            value={filters.released}
            onChange={(e) => { const n = { ...filters, released: e.target.value, page: 1 }; setFilters(n); load(n); }}
            className="rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 outline-none focus:border-brand"
          >
            <option value="">চালু-বন্ধ সব</option>
            <option value="true">শুধু চালু</option>
            <option value="false">শুধু বন্ধ</option>
          </select>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
            <input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="কোড, নাম, ইমেইল, রোল, কলেজ…"
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
                  <th className="px-4 py-3 font-semibold">#</th>
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
                    <td className="px-4 py-3 tabular-nums text-dash-mute2">
                      {r.serial ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold tracking-wide text-dash-ink2">{r.code}</span>
                      {/* Held back is a state of the CODE, not of the copy,
                          so it rides with the code rather than the status
                          pill — which is about whether it has been used. */}
                      {r.released === false && (
                        <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          এখনো বন্ধ
                        </span>
                      )}
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
                          {/* The email, because that is what a reader writes
                              in with and the only thing an admin can match a
                              support message against. */}
                          {r.redeemedBy?.email && (
                            <span className="block font-mono text-[11px] text-dash-mute2">{r.redeemedBy.email}</span>
                          )}
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
                      ) : r.status === 'redeemed' ? (
                        <button
                          onClick={() => setFixing(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dash-line px-2.5 py-1.5 text-xs font-medium text-dash-ink4 hover:border-brand hover:text-brand"
                          title="ভুল অ্যাকাউন্টে বসে গেছে? ফেরত নিন বা সরিয়ে দিন"
                        >
                          <FiRotateCcw /> ঠিক করুন
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

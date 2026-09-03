'use client';

/**
 * Who can read the book, and whether that holds together.
 *
 * "Who has access" on its own is a list of emails and answers nothing. The
 * question the shop actually has is whether the picture is consistent: the
 * person who redeemed this code — did they buy a book, or were they handed one
 * by a friend, or is somebody working through codes they should not have?
 *
 * So every row carries three things, and the middle one is the interesting one:
 *
 *   কীভাবে      code · admin · digital
 *   অর্ডার       an order on the SAME account, if there is one
 *   অবস্থা       open, or blocked by an admin
 *
 * A row with a code and no order is completely normal — that is the classmate
 * who was handed a book, which is the whole reason the code system exists. It
 * is NOT flagged as suspicious, because it is not. It is just shown.
 *
 * The second tab is the gap this design creates on purpose: parcels delivered
 * whose codes were never redeemed. Most of those people simply have not noticed
 * the code inside the book. The shop needs to see them, and to be able to hand
 * access over when one of them rings up.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  FiUnlock, FiLock, FiLoader, FiAlertCircle, FiSearch, FiUserPlus, FiKey,
  FiShoppingBag, FiCheckCircle, FiSlash, FiRotateCcw, FiClock, FiX, FiUser,
} from 'react-icons/fi';
import {
  listAccess, listWaiting, setActive, grantByEmail, listBooks,
  HOW_LABEL, HOW_TONE, formatDate, formatTk,
} from './accessApi';

const TABS = [
  { id: 'all', label: 'সবাই' },
  { id: 'code', label: 'কোড দিয়ে' },
  { id: 'manual', label: 'অ্যাডমিন দিয়েছে' },
  { id: 'unmatched', label: 'অর্ডার নেই' },
  { id: 'blocked', label: 'ব্লক করা' },
];

export default function BookAccessManager() {
  const [books, setBooks] = useState([]);
  const [view, setView] = useState('access'); // 'access' | 'waiting'
  const [filters, setFilters] = useState({ how: 'all', book: '', q: '', page: 1 });
  const [state, setState] = useState({ loading: true, error: '', rows: [], total: 0, counts: {} });
  const [waiting, setWaiting] = useState({ loading: false, rows: [] });
  const [busyId, setBusyId] = useState('');
  const [granting, setGranting] = useState(false);

  const load = async (q = filters) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const j = await listAccess({ ...q, limit: 50 });
      setState({ loading: false, error: '', rows: j.rows || [], total: j.total || 0, counts: j.counts || {} });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'লোড করা যায়নি', rows: [] }));
    }
  };

  const loadWaiting = async () => {
    setWaiting({ loading: true, rows: [] });
    try {
      setWaiting({ loading: false, rows: await listWaiting(filters.book) });
    } catch {
      setWaiting({ loading: false, rows: [] });
    }
  };

  useEffect(() => {
    listBooks().then(setBooks).catch(() => { /* the picker stays empty */ });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === 'waiting') loadWaiting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filters.book]);

  const setTab = (how) => {
    const next = { ...filters, how, page: 1 };
    setFilters(next);
    load(next);
  };

  const toggle = async (row) => {
    const blocking = row.active;
    const who = row.user?.email || 'এই ব্যক্তি';
    if (blocking) {
      const reason = prompt(
        `${who} কে ব্লক করবেন?\n\nসে আর বইয়ের কোনো উত্তর দেখতে পাবে না। কারণ লিখুন:`
      );
      if (reason === null) return;
      setBusyId(row._id);
      try {
        await setActive(row._id, false, reason);
        load();
      } catch (e) {
        alert(e.message);
      } finally {
        setBusyId('');
      }
      return;
    }
    setBusyId(row._id);
    try {
      await setActive(row._id, true);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId('');
    }
  };

  const pages = Math.max(Math.ceil(state.total / 50), 1);
  const counts = state.counts;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
            <FiUnlock className="text-brand" /> বইয়ের অ্যাক্সেস
          </h1>
          <p className="text-sm text-dash-mute">
            কারা বইয়ের উত্তর দেখতে পাচ্ছে, আর কীভাবে পেয়েছে। এখান থেকেই ব্লক করা
            বা নতুন কাউকে দেওয়া যায়।
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Kpi label="মোট" value={counts.all || 0} />
          <Kpi label="কোড দিয়ে" value={counts.code || 0} tone="emerald" />
          <Kpi label="অ্যাডমিন" value={counts.manual || 0} tone="sky" />
          <Kpi label="ব্লক" value={counts.blocked || 0} tone="rose" />
          <button
            onClick={() => setGranting(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <FiUserPlus /> অ্যাক্সেস দিন
          </button>
        </div>
      </header>

      {/* Two questions, two views. */}
      <div className="flex gap-1 rounded-xl bg-dash-soft p-1">
        {[
          { id: 'access', label: 'যারা অ্যাক্সেস পেয়েছে', icon: FiUnlock },
          { id: 'waiting', label: 'বই পেয়েছে, কোড দেয়নি', icon: FiClock },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              view === t.id ? 'bg-dash-card text-brand shadow-sm' : 'text-dash-mute hover:text-dash-ink3'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {view === 'access' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  filters.how === t.id
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
                }`}
              >
                {t.label}
                {counts[t.id] != null && (
                  <span className="ml-1.5 text-xs opacity-70">{counts[t.id]}</span>
                )}
              </button>
            ))}

            <form
              onSubmit={(e) => { e.preventDefault(); const n = { ...filters, page: 1 }; setFilters(n); load(n); }}
              className="ml-auto flex flex-wrap items-center gap-2"
            >
              {books.length > 1 && (
                <select
                  value={filters.book}
                  onChange={(e) => { const n = { ...filters, book: e.target.value, page: 1 }; setFilters(n); load(n); }}
                  className="rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 outline-none focus:border-brand"
                >
                  <option value="">সব বই</option>
                  {books.map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
                </select>
              )}
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
                <input
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="ইমেইল, নাম, কোড, অর্ডার…"
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
            <Empty
              icon={FiUnlock}
              title="এখানে কেউ নেই"
              text="কেউ বইয়ের কোড বসালে সাথে সাথেই এই তালিকায় চলে আসবে।"
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-dash-line bg-dash-card">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b border-dash-line text-left text-xs uppercase tracking-wider text-dash-mute2">
                      <th className="px-4 py-3 font-semibold">কে</th>
                      <th className="px-4 py-3 font-semibold">কীভাবে পেয়েছে</th>
                      <th className="px-4 py-3 font-semibold">অর্ডারের সাথে মিল</th>
                      <th className="px-4 py-3 font-semibold">কবে</th>
                      <th className="px-4 py-3 font-semibold">অবস্থা</th>
                      <th className="px-4 py-3 text-right font-semibold">কাজ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.rows.map((r) => (
                      <tr
                        key={r._id}
                        className={`border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40 ${
                          r.active ? '' : 'opacity-60'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-dash-ink2">
                            {r.code?.holder?.fullName ||
                              `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() ||
                              '—'}
                          </span>
                          <span className="block text-[11px] text-dash-mute2">{r.user?.email}</span>
                          {(r.code?.holder?.medicalCollegeName || r.code?.holder?.classRoll) && (
                            <span className="block text-[11px] text-dash-mute2">
                              {[r.code.holder.medicalCollegeName, r.code.holder.classRoll]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${HOW_TONE[r.how]}`}>
                            {HOW_LABEL[r.how]}
                          </span>
                          {r.code && (
                            <span className="mt-0.5 block font-mono text-[11px] text-dash-mute2">
                              {r.code.code}
                              {r.code.batch ? ` · ${r.code.batch}` : ''}
                            </span>
                          )}
                          {r.how === 'manual' && r.note && (
                            <span className="mt-0.5 block text-[11px] text-dash-mute2">{r.note}</span>
                          )}
                        </td>

                        {/* The column the shop reads this screen for. */}
                        <td className="px-4 py-3">
                          {r.matchesOrder ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                <FiCheckCircle size={11} /> মিলে গেছে
                              </span>
                              {r.orders.slice(0, 2).map((o) => (
                                <span key={o.orderNumber} className="block font-mono text-[11px] text-dash-mute2">
                                  {o.orderNumber} · {formatTk(o.total)}
                                </span>
                              ))}
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] text-dash-mute2">এই অ্যাকাউন্টে অর্ডার নেই</span>
                              <span className="block text-[10px] text-dash-mute2">
                                {r.how === 'code' ? 'কারও কাছ থেকে বই পেয়েছে — স্বাভাবিক' : ''}
                              </span>
                            </>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-dash-mute2">
                          {formatDate(r.code?.redeemedAt || r.grantedAt)}
                        </td>

                        <td className="px-4 py-3">
                          {r.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              <FiUnlock size={10} /> খোলা
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                                <FiLock size={10} /> ব্লক
                              </span>
                              <span className="mt-0.5 block text-[10px] text-dash-mute2">
                                {formatDate(r.revokedAt)}
                              </span>
                            </>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            disabled={busyId === r._id}
                            onClick={() => toggle(r)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                              r.active
                                ? 'border-dash-line text-rose-600 hover:border-rose-200 hover:bg-rose-50'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {busyId === r._id ? (
                              <FiLoader className="animate-spin" />
                            ) : r.active ? (
                              <><FiSlash /> ব্লক</>
                            ) : (
                              <><FiRotateCcw /> খুলে দিন</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <Pager
                  page={filters.page}
                  pages={pages}
                  total={state.total}
                  onGo={(p) => { const n = { ...filters, page: p }; setFilters(n); load(n); }}
                />
              )}
            </>
          )}
        </>
      ) : (
        <WaitingList
          data={waiting}
          onGrant={(email) => setGranting({ email })}
        />
      )}

      {granting && (
        <GrantPanel
          books={books}
          preset={typeof granting === 'object' ? granting : null}
          onClose={() => setGranting(false)}
          onDone={() => { setGranting(false); load(); if (view === 'waiting') loadWaiting(); }}
        />
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────

/**
 * Parcels delivered, codes never redeemed.
 *
 * The honest cost of making the code the only way in. Nobody here has done
 * anything wrong — they paid, the book arrived, and they have not noticed the
 * code inside it. One button hands them access when they ring up.
 */
function WaitingList({ data, onGrant }) {
  if (data.loading) {
    return (
      <div className="flex h-[30vh] items-center justify-center text-dash-mute2">
        <FiLoader className="mr-2 animate-spin" /> লোড হচ্ছে…
      </div>
    );
  }
  if (!data.rows.length) {
    return (
      <Empty
        icon={FiCheckCircle}
        title="সবাই কোড বসিয়ে ফেলেছে"
        text="যাদের বই পৌঁছেছে তাদের সবাই বই চালু করে নিয়েছে।"
      />
    );
  }

  return (
    <>
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        এদের বই পৌঁছে গেছে, কিন্তু বইয়ের কোডটি এখনো বসায়নি — তাই উত্তর দেখতে
        পাচ্ছে না। বেশিরভাগ ক্ষেত্রেই কোডটা খেয়াল করেনি। কেউ ফোন করলে এখান থেকেই
        অ্যাক্সেস দিয়ে দিতে পারবেন।
      </p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-dash-line bg-dash-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-dash-line text-left text-xs uppercase tracking-wider text-dash-mute2">
              <th className="px-4 py-3 font-semibold">অর্ডার</th>
              <th className="px-4 py-3 font-semibold">ক্রেতা</th>
              <th className="px-4 py-3 font-semibold">কী কিনেছে</th>
              <th className="px-4 py-3 font-semibold">ডেলিভারি</th>
              <th className="px-4 py-3 text-right font-semibold">কাজ</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((o) => (
              <tr key={o.orderNumber} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40">
                <td className="px-4 py-3 font-mono text-xs text-dash-ink3">{o.orderNumber}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-dash-ink2">
                    <FiUser size={12} className="text-dash-mute2" /> {o.buyerName || '—'}
                  </span>
                  <span className="block text-[11px] text-dash-mute2">{o.user?.email}</span>
                  <span className="block font-mono text-[11px] text-dash-mute2">{o.buyerPhone}</span>
                </td>
                <td className="px-4 py-3 text-dash-ink3">
                  {(o.items || []).map((i) => `${i.title} × ${i.quantity}`).join(', ')}
                  <span className="block text-[11px] text-dash-mute2">{formatTk(o.total)}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-dash-mute2">{formatDate(o.deliveredAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onGrant(o.user?.email)}
                    disabled={!o.user?.email}
                    className="inline-flex items-center gap-1 rounded-lg border border-dash-line px-2.5 py-1.5 text-xs font-medium text-dash-ink3 hover:bg-dash-soft disabled:opacity-40"
                  >
                    <FiUnlock /> অ্যাক্সেস দিন
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Hand somebody access.
 *
 * By email, because the admin is looking at a support message rather than at a
 * database. An email with no account is refused plainly — an account created
 * here would have no password and nobody could sign into it.
 */
function GrantPanel({ books, preset, onClose, onDone }) {
  const [form, setForm] = useState({
    email: preset?.email || '',
    bookId: books[0]?._id || '',
    note: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('সঠিক ইমেইল দিন');
    if (!form.bookId) return setError('কোন বই, সেটা বেছে নিন');

    setBusy(true);
    try {
      const r = await grantByEmail({
        email: form.email.trim().toLowerCase(),
        bookId: form.bookId,
        note: form.note.trim() || 'Granted by admin',
      });
      alert(r.message);
      onDone();
    } catch (err) {
      setError(err.message || 'দেওয়া যায়নি');
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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-dash-ink2">
              <FiUnlock className="text-brand" /> অ্যাক্সেস দিন
            </h2>
            <p className="mt-1 text-xs text-dash-mute2">
              কোড ছাড়াই কাউকে বই খুলে দিন — উপহার কপি, নষ্ট বই বদলানো, বা কোড
              আসার আগে যিনি কিনেছেন।
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-dash-mute2 hover:bg-dash-soft">
            <FiX />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-dash-ink3">ইমেইল</span>
            <span className="mb-1.5 block text-[11px] text-dash-mute2">
              যে ইমেইলে তার অ্যাকাউন্ট আছে। অ্যাকাউন্ট না থাকলে আগে সাইন আপ করতে বলুন।
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink2 outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-dash-ink3">কোন বই</span>
            <select
              value={form.bookId}
              onChange={(e) => setForm((f) => ({ ...f, bookId: e.target.value }))}
              className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink2 outline-none focus:border-brand"
            >
              <option value="">নির্বাচন করুন</option>
              {books.map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-dash-ink3">কারণ</span>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="যেমন: কোড আসার আগে কিনেছেন"
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
            {busy ? <FiLoader className="animate-spin" /> : <FiKey />} দিয়ে দিন
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-dash-line px-4 py-2.5 text-sm text-dash-mute hover:text-dash-ink3">
            বাতিল
          </button>
        </div>
      </form>
    </div>
  );
}

const TONE = { emerald: 'text-emerald-600', sky: 'text-sky-600', rose: 'text-rose-600' };

const Kpi = ({ label, value, tone }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-dash-line bg-dash-card px-3 py-2">
    <span className="text-dash-mute2">{label}</span>
    <strong className={`tabular-nums ${TONE[tone] || 'text-dash-ink2'}`}>{value}</strong>
  </span>
);

const Empty = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl border border-dashed border-dash-line p-12 text-center">
    <Icon className="mx-auto mb-3 text-3xl text-dash-mute2" />
    <p className="font-medium text-dash-ink3">{title}</p>
    <p className="mt-1 text-sm text-dash-mute2">{text}</p>
  </div>
);

const Pager = ({ page, pages, total, onGo }) => (
  <div className="flex items-center justify-between text-sm text-dash-mute2">
    <span>মোট {total} জন</span>
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onGo(page - 1)}
        className="rounded-lg border border-dash-line px-3 py-1.5 disabled:opacity-40"
      >
        আগের
      </button>
      <span>{page} / {pages}</span>
      <button
        disabled={page >= pages}
        onClick={() => onGo(page + 1)}
        className="rounded-lg border border-dash-line px-3 py-1.5 disabled:opacity-40"
      >
        পরের
      </button>
    </div>
  </div>
);

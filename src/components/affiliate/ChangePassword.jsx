'use client';

/**
 * The ambassador's password, changed by the ambassador.
 *
 * Approval hands them credentials they already know — their email as the id,
 * their phone number as the password — which is what makes the account usable
 * on day one without waiting on an email that may never arrive. It is also a
 * password anyone who has their business card can guess, so this screen is the
 * other half of that decision, not a nicety.
 *
 * `POST /api/auth/change-password` already existed and is used by the admin,
 * mentor and student profile screens; the affiliate dashboard simply had no
 * screen of its own. Same endpoint, same contract.
 */

import { useState } from 'react';
import { FiLock, FiLoader, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

/** Long enough not to be guessable, short enough that nobody writes it down. */
const MIN_LENGTH = 6;

export default function ChangePassword({ stillDefault }) {
  const [open, setOpen] = useState(Boolean(stillDefault));
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind: 'ok' | 'err', text }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (form.next.length < MIN_LENGTH) {
      return setMsg({ kind: 'err', text: `নতুন পাসওয়ার্ড অন্তত ${MIN_LENGTH} অক্ষরের হতে হবে।` });
    }
    if (form.next !== form.confirm) {
      return setMsg({ kind: 'err', text: 'দুইবার লেখা নতুন পাসওয়ার্ড মিলছে না।' });
    }
    if (form.next === form.current) {
      return setMsg({ kind: 'err', text: 'নতুন পাসওয়ার্ড আগেরটার মতোই হয়ে গেছে।' });
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.message || 'পাসওয়ার্ড বদলানো যায়নি');
      }
      setMsg({ kind: 'ok', text: 'পাসওয়ার্ড বদলে গেছে। পরের বার এই নতুনটি দিয়ে লগইন করবেন।' });
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setMsg({ kind: 'err', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <FiLock size={16} />
          </span>
          <span>
            <span className="block font-bold text-slate-900 hind-siliguri">পাসওয়ার্ড পরিবর্তন</span>
            <span className="block text-xs text-slate-500 hind-siliguri">
              {stillDefault
                ? 'এখনো আপনার ফোন নম্বরই পাসওয়ার্ড — বদলে নিন।'
                : 'নিজের পাসওয়ার্ড নিজে ঠিক করুন।'}
            </span>
          </span>
        </span>
        {stillDefault && !open && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 hind-siliguri">
            করা দরকার
          </span>
        )}
      </button>

      {open && (
        <form onSubmit={submit} className="space-y-3 border-t border-slate-200 px-5 py-4">
          {/* The default password IS their phone number, so saying so here saves
              an ambassador who has forgotten what they were given. */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 hind-siliguri">
              বর্তমান পাসওয়ার্ড {stillDefault && '(আপনার ফোন নম্বর)'}
            </span>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={form.current}
                onChange={(e) => set('current', e.target.value)}
                className={input}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={show ? 'লুকান' : 'দেখান'}
              >
                {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 hind-siliguri">
              নতুন পাসওয়ার্ড
            </span>
            <input
              type={show ? 'text' : 'password'}
              value={form.next}
              onChange={(e) => set('next', e.target.value)}
              className={input}
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600 hind-siliguri">
              নতুন পাসওয়ার্ড আবার লিখুন
            </span>
            <input
              type={show ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              className={input}
              autoComplete="new-password"
            />
          </label>

          {msg && (
            <p
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm hind-siliguri ${
                msg.kind === 'ok'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {msg.kind === 'ok' ? (
                <FiCheckCircle className="mt-0.5 shrink-0" />
              ) : (
                <FiAlertCircle className="mt-0.5 shrink-0" />
              )}
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !form.current || !form.next || !form.confirm}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 hind-siliguri"
          >
            {busy ? <FiLoader className="animate-spin" /> : <FiLock />}
            {busy ? 'বদলানো হচ্ছে…' : 'পাসওয়ার্ড বদলান'}
          </button>
        </form>
      )}
    </section>
  );
}

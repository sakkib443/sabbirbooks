'use client';

/**
 * Password reset, for a buyer who forgot theirs (20 Nov 2026).
 *
 * Buyers set a password when they first open a QR code (or buy a course),
 * forget it, and message the shop. Here staff find them by email, phone or
 * name, give them a new password (typed, or made up here), and copy a ready
 * message — or open WhatsApp with it — to send. The server
 * (PATCH /user/:id/password) signs the account out everywhere and refuses
 * staff accounts to anyone but the Super Admin; this page lists buyers only.
 *
 * An email with no account yet (24 Nov 2026): staff can open one for it right
 * here — name, email, a password they choose — and the buyer logs in with
 * that email and password (POST /user/create-student).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiCopy, FiKey, FiLoader, FiRefreshCw, FiSearch, FiUser, FiUserPlus } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import API_BASE_URL from '@/config/api';
import { useToast } from '@/components/shared/Toast';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const BUYER_ROLES = ['student', 'user'];
const input = 'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2.5 text-sm text-dash-ink3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15';

/** Easy to read out on the phone: no 0/O, 1/l. */
const makePassword = () => {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  return `mv${pick(letters)}${pick(letters)}${Math.floor(1000 + Math.random() * 9000)}`;
};
const digits = (s) => String(s || '').replace(/\D/g, '');
const nameOf = (u) => `${u.firstName || ''} ${u.lastName && u.lastName !== '-' ? u.lastName : ''}`.trim() || u.name || u.email;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

export default function PasswordResetPage() {
  const { showToast, toastNode } = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  // For a new account: the buyer's name and phone.
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/user`, { headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.success === false) throw new Error(j.message);
        setUsers((j.data || []).filter((u) => BUYER_ROLES.includes(u.role) && !u.isDeleted));
      })
      .catch((e) => alive && (setError(e.message || 'লোড হয়নি'), setUsers([])));
    return () => {
      alive = false;
    };
  }, []);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!users || s.length < 3) return [];
    const d = digits(s).replace(/^880/, '0').replace(/^88/, '');
    return users
      .filter((u) => {
        const phones = [u.phoneNumber, u.whatsappNumber].map(digits).join(' ');
        return (
          (u.email || '').toLowerCase().includes(s) ||
          nameOf(u).toLowerCase().includes(s) ||
          (d.length >= 5 && phones.includes(d.replace(/^0/, '')))
        );
      })
      .slice(0, 20);
  }, [users, q]);

  // A typed email nobody has yet: offer to open an account for it.
  const typedEmail = q.trim().toLowerCase();
  const canCreate = !!users && isEmail(typedEmail) && !users.some((u) => (u.email || '').toLowerCase() === typedEmail);

  const choose = (u) => {
    setPicked(u);
    setPassword(makePassword());
    setDone(null);
  };
  const chooseNew = () => {
    setPicked({ isNew: true, email: typedEmail });
    setNewName('');
    setNewPhone('');
    setPassword(makePassword());
    setDone(null);
  };

  const save = async () => {
    if (!picked) return;
    if (password.length < 6) return showToast('error', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর');
    if (picked.isNew && !newName.trim()) return showToast('error', 'ক্রেতার নাম লিখুন');
    setBusy(true);
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
      const res = picked.isNew
        ? await fetch(`${API_BASE_URL}/user/create-student`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ firstName: newName.trim(), lastName: '', email: picked.email, phoneNumber: newPhone.trim(), password }),
          })
        : await fetch(`${API_BASE_URL}/user/${picked.id || picked._id}/password`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ newPassword: password }),
          });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409) throw new Error('এই ইমেইলে আগেই একটা অ্যাকাউন্ট আছে (হয়তো স্টাফের বা মুছে ফেলা)');
      if (!res.ok || j.success === false) throw new Error(j.message || (picked.isNew ? 'অ্যাকাউন্ট বানানো যায়নি' : 'পাসওয়ার্ড বদলানো যায়নি'));
      if (picked.isNew) {
        const created = { ...(j.data || {}), email: picked.email, firstName: newName.trim(), phoneNumber: newPhone.trim() };
        setUsers((list) => [created, ...(list || [])]);
        setDone({ user: created, password, created: true });
        showToast('success', 'নতুন অ্যাকাউন্ট তৈরি হয়েছে');
      } else {
        setDone({ user: picked, password });
        showToast('success', 'নতুন পাসওয়ার্ড বসেছে');
      }
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const message = done
    ? `আসসালামু আলাইকুম ${nameOf(done.user)},\n${done.created ? 'আপনার জন্য Magic Viva-তে একটা অ্যাকাউন্ট খুলে দেওয়া হলো।' : 'আপনার Magic Viva অ্যাকাউন্টের পাসওয়ার্ড নতুন করে দেওয়া হলো।'}\n\nইমেইল: ${done.user.email}\nনতুন পাসওয়ার্ড: ${done.password}\n\nলগইন করুন: https://magicviva.com/login\nলগইনের পর চাইলে প্রোফাইল থেকে পাসওয়ার্ড বদলে নিতে পারবেন।`
    : '';
  const waNumber = done ? digits(done.user.whatsappNumber || done.user.phoneNumber).replace(/^0/, '880') : '';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {toastNode}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2"><FiKey className="text-brand" /> পাসওয়ার্ড রিসেট / সেট</h1>
        <p className="text-sm text-dash-mute2">
          কেউ পাসওয়ার্ড ভুলে গেলে ইমেইল বা ফোন নম্বর দিয়ে খুঁজে নতুন পাসওয়ার্ড বসান। যে ইমেইলে এখনো অ্যাকাউন্ট নেই, সেটা পুরো লিখলে
          ঐ ইমেইলে নতুন অ্যাকাউন্ট খুলে পাসওয়ার্ড দিতে পারবেন — সেই ইমেইল-পাসওয়ার্ডে সে লগইন করবে।
        </p>
      </div>

      {/* 1. Find */}
      <div className="rounded-xl border border-dash-line bg-dash-card p-5">
        <p className="mb-2 text-sm font-bold text-dash-ink2">১. ক্রেতাকে খুঁজুন</p>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPicked(null);
              setDone(null);
            }}
            placeholder="ইমেইল, ফোন নম্বর বা নাম লিখুন…"
            className={`${input} pl-9`}
            autoFocus
          />
        </div>
        {users === null ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-dash-mute2"><FiLoader className="animate-spin" /> লোড হচ্ছে…</p>
        ) : error ? (
          <p className="mt-3 text-sm text-rose-600">{error}</p>
        ) : q.trim().length >= 3 && !picked ? (
          matches.length === 0 ? (
            canCreate ? null : (
              <p className="mt-3 text-sm text-dash-mute2">
                এই নামে/নম্বরে কাউকে পাওয়া যায়নি। নতুন অ্যাকাউন্ট খুলতে চাইলে পুরো ইমেইলটা লিখুন।
              </p>
            )
          ) : (
            <ul className="mt-3 divide-y divide-dash-line overflow-hidden rounded-lg border border-dash-line">
              {matches.map((u) => (
                <li key={u._id}>
                  <button type="button" onClick={() => choose(u)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-dash-soft">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"><FiUser /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-dash-ink2">{nameOf(u)}</span>
                      <span className="block truncate text-xs text-dash-mute2">{u.email} · {u.whatsappNumber || u.phoneNumber || '—'}</span>
                      {u.medicalCollegeName && <span className="block truncate text-xs text-dash-faint">{u.medicalCollegeName}</span>}
                    </span>
                    <span className="text-xs font-semibold text-brand">বাছুন →</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {canCreate && !picked && (
          <button
            type="button"
            onClick={chooseNew}
            className="mt-3 flex w-full items-center gap-3 rounded-lg border border-dashed border-brand/50 bg-brand-soft/40 px-4 py-3 text-left hover:bg-brand-soft"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white"><FiUserPlus /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-dash-ink2">এই ইমেইলে নতুন অ্যাকাউন্ট খুলুন</span>
              <span className="block truncate text-xs text-dash-mute2">{typedEmail} — এই ইমেইলে এখনো কোনো অ্যাকাউন্ট নেই</span>
            </span>
            <span className="text-xs font-semibold text-brand">খুলুন →</span>
          </button>
        )}
      </div>

      {/* 2. New password */}
      {picked && !done && (
        <div className="rounded-xl border border-dash-line bg-dash-card p-5">
          <p className="mb-1 text-sm font-bold text-dash-ink2">{picked.isNew ? '২. নতুন অ্যাকাউন্ট' : '২. নতুন পাসওয়ার্ড'}</p>
          {picked.isNew ? (
            <div className="mb-3 space-y-2">
              <p className="text-sm text-dash-mute2">ইমেইল: <b className="text-dash-ink3">{picked.email}</b></p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ক্রেতার নাম *" className={input} />
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="ফোন / WhatsApp (ঐচ্ছিক)" inputMode="tel" className={input} />
              </div>
              <p className="text-xs font-semibold text-dash-mute">পাসওয়ার্ড</p>
            </div>
          ) : (
            <p className="mb-3 text-sm text-dash-mute2">
              <b className="text-dash-ink3">{nameOf(picked)}</b> · {picked.email} · {picked.whatsappNumber || picked.phoneNumber}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={password} onChange={(e) => setPassword(e.target.value.trim())} className={`${input} font-mono text-base`} />
            <button type="button" onClick={() => setPassword(makePassword())} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dash-line px-3 py-2 text-sm font-medium text-dash-ink3 hover:bg-dash-soft">
              <FiRefreshCw /> নতুন বানান
            </button>
            <button type="button" onClick={save} disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
              {busy ? <FiLoader className="animate-spin" /> : picked.isNew ? <FiUserPlus /> : <FiKey />} {picked.isNew ? 'অ্যাকাউন্ট খুলুন' : 'পাসওয়ার্ড সেট করুন'}
            </button>
          </div>
          <p className="mt-2 text-xs text-dash-mute2">
            {picked.isNew
              ? 'কমপক্ষে ৬ অক্ষর। এই ইমেইল আর পাসওয়ার্ড দিয়ে ক্রেতা magicviva.com-এ লগইন করবে।'
              : 'কমপক্ষে ৬ অক্ষর। সেট করলে ক্রেতা সব ডিভাইস থেকে লগআউট হয়ে যাবে, নতুন পাসওয়ার্ড দিয়ে আবার লগইন করবে।'}
          </p>
        </div>
      )}

      {/* 3. Send it */}
      {done && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800"><FiCheckCircle /> ৩. {done.created ? 'অ্যাকাউন্ট তৈরি হয়েছে' : 'পাসওয়ার্ড বসেছে'} — এখন ক্রেতাকে পাঠিয়ে দিন</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-dash-ink3 ring-1 ring-emerald-200">{message}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(message).then(() => showToast('success', 'কপি হয়েছে'))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-card px-4 py-2 text-sm font-semibold text-dash-ink3 hover:bg-dash-soft"
            >
              <FiCopy /> মেসেজ কপি করুন
            </button>
            {waNumber && (
              <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:brightness-95">
                <FaWhatsapp /> WhatsApp-এ পাঠান
              </a>
            )}
            <button type="button" onClick={() => { setQ(''); setPicked(null); setDone(null); }} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-dash-mute hover:text-dash-ink3">
              আরেকজনের জন্য
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

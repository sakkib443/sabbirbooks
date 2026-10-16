'use client';

/**
 * Security & devices — the Super Admin's control over staff sign-ins.
 *
 *   • Requests: a staff account (admin, manager…) signing in from a new device
 *     waits here until it is approved. Rejecting refuses that device for good.
 *   • Signed-in devices: every staff account, how many devices it is signed in
 *     on, and which. "Remove" signs that device out at once; signing in from
 *     it again needs a fresh approval.
 *
 * The Super Admin's own sign-ins need no approval. Refreshes every 30 seconds.
 */

import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiLoader, FiLogOut, FiMonitor, FiRefreshCw, FiShield, FiSmartphone, FiX } from 'react-icons/fi';
import API_BASE_URL from '@/config/api';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { getStoredUser, ROLE_LABELS } from '@/lib/permissions';
import { getDeviceId } from '@/lib/session';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const call = async (path, method = 'GET', body) => {
  const res = await fetch(`${API_BASE_URL}/security${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    cache: 'no-store',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
};

const ago = (d) => {
  if (!d) return '—';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'এইমাত্র';
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  return new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const DeviceIcon = ({ label }) =>
  /Android|iPhone/.test(label || '') ? <FiSmartphone className="shrink-0 text-dash-mute" /> : <FiMonitor className="shrink-0 text-dash-mute" />;

export default function SecurityPage() {
  const { confirm, confirmNode } = useConfirm();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [me, setMe] = useState({ email: '', deviceId: '' });

  const load = useCallback(async () => {
    try {
      setData(await call('/overview'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setMe({ email: getStoredUser()?.email || '', deviceId: getDeviceId() });
      load();
    }, 0);
    const every = setInterval(load, 30_000);
    return () => {
      clearTimeout(t);
      clearInterval(every);
    };
  }, [load]);

  const act = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const decide = (r, verdict) =>
    act(`${r._id}:${verdict}`, () => call(`/requests/${r._id}/${verdict === 'approved' ? 'approve' : 'reject'}`, 'POST'));

  const removeOne = async (u, s) => {
    const ok = await confirm({
      title: 'এই ডিভাইস সরাবেন?',
      message: `${u.name} — ${s.device} থেকে এখনই লগআউট হয়ে যাবে। আবার ঢুকতে হলে নতুন অনুমোদন লাগবে।`,
      confirmText: 'Remove',
    });
    if (ok) act(`${u._id}:${s.deviceId}`, () => call(`/users/${u._id}/devices/remove`, 'POST', { deviceId: s.deviceId }));
  };

  const removeAll = async (u) => {
    const ok = await confirm({
      title: 'সব ডিভাইস থেকে লগআউট?',
      message: `${u.name}-এর ${u.sessions.length}টি ডিভাইস থেকেই এখনই লগআউট হবে। আবার ঢুকতে প্রতিটির জন্য অনুমোদন লাগবে।`,
      confirmText: 'Remove all',
    });
    if (ok) act(`${u._id}:all`, () => call(`/users/${u._id}/devices/remove-all`, 'POST'));
  };

  const pending = (data?.requests || []).filter((r) => r.status === 'pending');
  const rejected = (data?.requests || []).filter((r) => r.status === 'rejected');
  const users = data?.users || [];
  const signedIn = users.reduce((n, u) => n + u.sessions.length, 0);

  return (
    <div className="space-y-4">
      {confirmNode}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-dash-ink outfit">
            <FiShield className="text-brand" /> Security &amp; Devices
          </h1>
          <p className="mt-0.5 text-sm text-dash-mute">
            নতুন ডিভাইস থেকে স্টাফ লগইন করতে চাইলে এখানে অনুমোদন দিন। কে কোন ডিভাইসে আছে দেখুন, দরকার হলে সরিয়ে দিন।
          </p>
        </div>
        <button onClick={() => act('reload', load)} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft">
          <FiRefreshCw className={busy === 'reload' ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {/not authorized|Access denied/i.test(error) ? 'এই পাতা শুধু Super Admin দেখতে পারেন।' : error}
        </p>
      )}

      {!data && !error ? (
        <div className="flex justify-center p-10"><FiLoader className="animate-spin text-brand" size={22} /></div>
      ) : data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl border px-4 py-3 ${pending.length ? 'border-amber-200 bg-amber-50' : 'border-dash-line/60 bg-dash-card'}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">অনুমোদনের অপেক্ষায়</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums outfit ${pending.length ? 'text-amber-700' : 'text-dash-ink'}`}>{pending.length}</p>
            </div>
            <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">স্টাফ অ্যাকাউন্ট</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-dash-ink outfit">{users.length}</p>
            </div>
            <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">লগইন করা ডিভাইস</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-dash-ink outfit">{signedIn}</p>
            </div>
          </div>

          {/* Requests */}
          <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
            <h2 className="border-b border-dash-line px-4 py-3 text-sm font-semibold text-dash-ink2">নতুন ডিভাইসের অনুরোধ</h2>
            {pending.length === 0 ? (
              <p className="p-6 text-center text-sm text-dash-mute">কোনো অনুরোধ নেই।</p>
            ) : (
              <ul className="divide-y divide-dash-line/60">
                {pending.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <DeviceIcon label={r.device} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-dash-ink2">
                        {r.name} <span className="ml-1 rounded bg-dash-soft px-1.5 py-0.5 text-[10px] font-medium text-dash-mute">{ROLE_LABELS[r.role] || r.role}</span>
                      </p>
                      <p className="text-xs text-dash-mute">{r.email} · {r.device}{r.ip ? ` · ${r.ip}` : ''} · {ago(r.requestedAt)}</p>
                    </div>
                    <button
                      onClick={() => decide(r, 'approved')}
                      disabled={!!busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === `${r._id}:approved` ? <FiLoader className="animate-spin" /> : <FiCheck />} Approve
                    </button>
                    <button
                      onClick={() => decide(r, 'rejected')}
                      disabled={!!busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busy === `${r._id}:rejected` ? <FiLoader className="animate-spin" /> : <FiX />} Reject
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Who is signed in where */}
          <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
            <h2 className="border-b border-dash-line px-4 py-3 text-sm font-semibold text-dash-ink2">কে কোন ডিভাইসে লগইন আছে</h2>
            <ul className="divide-y divide-dash-line/60">
              {users.map((u) => (
                <li key={u._id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex-1 text-sm font-semibold text-dash-ink2">
                      {u.name}
                      <span className="ml-1.5 rounded bg-dash-soft px-1.5 py-0.5 text-[10px] font-medium text-dash-mute">{ROLE_LABELS[u.role] || u.role}</span>
                      <span className="ml-2 text-xs font-normal text-dash-mute">{u.email}</span>
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.sessions.length ? 'bg-emerald-50 text-emerald-700' : 'bg-dash-soft text-dash-mute'}`}>
                      {u.sessions.length}টি ডিভাইস
                    </span>
                    {u.sessions.length > 0 && u.role !== 'superAdmin' && (
                      <button
                        onClick={() => removeAll(u)}
                        disabled={!!busy}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FiLogOut /> সব থেকে লগআউট
                      </button>
                    )}
                  </div>
                  {u.sessions.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {u.sessions.map((s) => {
                        const mine = u.email === me.email && s.deviceId === me.deviceId;
                        return (
                          <li key={s.deviceId} className="flex flex-wrap items-center gap-2 rounded-lg bg-dash-soft/50 px-3 py-2 text-xs text-dash-ink3">
                            <DeviceIcon label={s.device} />
                            <span className="font-medium text-dash-ink2">{s.device}</span>
                            {mine && <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">এই ডিভাইস</span>}
                            <span className="flex-1 text-dash-mute">
                              {s.ip ? `${s.ip} · ` : ''}শেষ ব্যবহার {ago(s.lastActiveAt)} · লগইন {ago(s.signedInAt)}
                            </span>
                            {!mine && (
                              <button
                                onClick={() => removeOne(u, s)}
                                disabled={!!busy}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {busy === `${u._id}:${s.deviceId}` ? <FiLoader className="animate-spin" /> : <FiX />} Remove
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {rejected.length > 0 && (
            <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
              <h2 className="border-b border-dash-line px-4 py-3 text-sm font-semibold text-dash-ink2">বাতিল করা ডিভাইস</h2>
              <ul className="divide-y divide-dash-line/60">
                {rejected.map((r) => (
                  <li key={r._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs">
                    <DeviceIcon label={r.device} />
                    <span className="flex-1 text-dash-ink3">
                      <b className="text-dash-ink2">{r.name}</b> · {r.device}{r.ip ? ` · ${r.ip}` : ''} · {ago(r.requestedAt)}
                    </span>
                    <button
                      onClick={() => decide(r, 'approved')}
                      disabled={!!busy}
                      className="rounded-md border border-dash-line px-2 py-1 text-[11px] font-semibold text-dash-ink3 hover:bg-dash-soft disabled:opacity-50"
                    >
                      অনুমতি দিন
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

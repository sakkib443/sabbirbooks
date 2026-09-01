'use client';

/**
 * Admin — delete a book order.
 *
 * Its own page, on purpose. Deleting used to be a button in the orders list's
 * selection bar: one click on the screen an admin uses all day, next to the
 * status buttons they press constantly, and an order once deleted is gone.
 *
 * Three things stand between an admin and a deletion now:
 *   1. they have to come here — nothing on the orders screen deletes any more;
 *   2. they have to find the order, and it is shown in full first, so what is
 *      about to be destroyed is on screen while they decide;
 *   3. they have to type its order number. Not "yes", not a checkbox — the
 *      number itself, which cannot be produced by a mis-click.
 *
 * Deleting is still owner-only; the server enforces that, this only hides the
 * screen from everyone else.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiTrash2, FiSearch, FiLoader, FiAlertTriangle, FiArrowLeft,
  FiUser, FiPhone, FiMapPin, FiPackage, FiCreditCard, FiCalendar, FiShield,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { getStoredUser } from '@/lib/permissions';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const bdt = (v) => (typeof v === 'number' ? '৳' + v.toLocaleString('en-US') : '—');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const buyerName = (u) =>
  u && typeof u === 'object'
    ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—'
    : '—';

export default function DeleteOrderPage() {
  const { showToast, toastNode } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const canDelete = ['superAdmin', 'admin'].includes(getStoredUser()?.role);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/orders?status=all&limit=500`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load orders');
        setOrders(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        setError(e.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Deliberately no "show everything" default: this page opens empty, and an
  // order only appears once it has been searched for. Nobody deletes an order
  // they have to type a name to find by accident.
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return orders
      .filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          String(o.orderSeq || '').includes(q) ||
          buyerName(o.user).toLowerCase().includes(q) ||
          o.shippingAddress?.name?.toLowerCase().includes(q) ||
          o.shippingAddress?.phone?.includes(q)
      )
      .slice(0, 20);
  }, [orders, search]);

  const confirmed = picked && typed.trim() === picked.orderNumber;

  const doDelete = async () => {
    if (!confirmed) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/orders/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ids: [picked._id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not delete');
      showToast('success', `${picked.orderNumber} deleted`);
      setOrders((prev) => prev.filter((o) => o._id !== picked._id));
      setPicked(null);
      setTyped('');
      setSearch('');
    } catch (e) {
      showToast('error', e.message || 'Could not delete the order');
    } finally {
      setBusy(false);
    }
  };

  if (!canDelete) {
    return (
      <div className="rounded-2xl border border-dash-line bg-dash-card p-12 text-center">
        <FiShield className="mx-auto mb-3 text-3xl text-dash-mute2" />
        <p className="font-semibold text-dash-ink3">Owner accounts only</p>
        <p className="mt-1 text-sm text-dash-mute2">
          Deleting an order is restricted to the shop’s own admin accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {toastNode}

      <Link
        href="/dashboard/admin/book-orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-dash-mute transition-colors hover:text-brand"
      >
        <FiArrowLeft size={14} /> Back to orders
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
          <FiTrash2 className="text-rose-600" /> Delete an order
        </h1>
        <p className="text-sm text-dash-mute">
          One at a time, and only after typing its order number. There is no undo.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <FiAlertTriangle className="mt-0.5 shrink-0" />
        <p>
          Deleting removes the order record permanently. Any stock it had taken goes back on the
          shelf. If you only want to stop an order, <strong>cancel</strong> it from the orders
          screen instead — that keeps the record and the history.
        </p>
      </div>

      {/* Step 1 — find it */}
      <section className="rounded-2xl border border-dash-line bg-dash-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-dash-mute">
          Step 1 — find the order
        </p>
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPicked(null); setTyped(''); }}
            placeholder="Order number, buyer name or phone…"
            className="w-full rounded-lg border border-dash-line bg-dash-card py-2.5 pl-9 pr-3 text-sm text-dash-ink2 outline-none focus:border-brand"
          />
        </div>

        {loading && (
          <p className="mt-3 flex items-center gap-2 text-sm text-dash-mute2">
            <FiLoader className="animate-spin" /> Loading orders…
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        {!loading && search.trim().length >= 2 && results.length === 0 && (
          <p className="mt-3 text-sm text-dash-mute2">No order matches that.</p>
        )}

        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-dash-line-soft">
            {results.map((o) => (
              <li key={o._id}>
                <button
                  onClick={() => { setPicked(o); setTyped(''); }}
                  className={`flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left transition-colors hover:bg-dash-soft/50 ${
                    picked?._id === o._id ? 'bg-rose-50' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-xs font-bold text-dash-ink2">
                      {o.orderNumber}
                    </span>
                    <span className="block truncate text-xs text-dash-mute2">
                      {o.shippingAddress?.name || buyerName(o.user)} · {fmtDate(o.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-dash-ink3">
                    {bdt(o.total)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Step 2 — look at it, then type its number */}
      {picked && (
        <section className="rounded-2xl border-2 border-rose-300 bg-dash-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-rose-600">
            Step 2 — this is what will be deleted
          </p>

          <div className="grid gap-3 rounded-xl bg-dash-soft/60 p-4 sm:grid-cols-2">
            <Row icon={FiPackage} label="Order" value={picked.orderNumber} mono />
            <Row icon={FiCalendar} label="Placed" value={fmtDate(picked.createdAt)} />
            <Row icon={FiUser} label="Buyer" value={picked.shippingAddress?.name || buyerName(picked.user)} />
            <Row icon={FiPhone} label="Phone" value={picked.shippingAddress?.phone} />
            <Row
              icon={FiMapPin}
              label="Address"
              value={[picked.shippingAddress?.address, picked.shippingAddress?.city]
                .filter(Boolean)
                .join(', ')}
            />
            <Row
              icon={FiCreditCard}
              label="Payment"
              value={`${picked.payment?.method || '—'} · ${picked.payment?.status || '—'}`}
            />
            <Row icon={FiPackage} label="Status" value={picked.status} />
            <Row icon={FiCreditCard} label="Total" value={bdt(picked.total)} />
          </div>

          {picked.items?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-dash-ink3">
              {picked.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">{it.title} × {it.quantity}</span>
                  <span className="shrink-0 tabular-nums">{bdt(it.price * it.quantity)}</span>
                </li>
              ))}
            </ul>
          )}

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-dash-ink2">
              Type <span className="font-mono font-bold text-rose-600">{picked.orderNumber}</span> to
              confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={picked.orderNumber}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2.5 font-mono text-sm text-dash-ink2 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={doDelete}
              disabled={!confirmed || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
              Delete permanently
            </button>
            <button
              onClick={() => { setPicked(null); setTyped(''); }}
              className="rounded-lg border border-dash-line px-4 py-2.5 text-sm font-medium text-dash-mute transition-colors hover:text-dash-ink3"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

const Row = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-2">
    <Icon size={13} className="mt-0.5 shrink-0 text-dash-mute2" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-dash-mute2">{label}</p>
      <p className={`break-words text-sm text-dash-ink3 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  </div>
);

'use client';

/**
 * Admin — Book Orders.
 * Lists orders from GET /api/orders (admin, bearer token), filter by status,
 * expand a row to see items / buyer / shipping / payment, and advance the
 * fulfillment status via PATCH /api/orders/:id/status.
 * Allowed manual statuses mirror the backend zod enum:
 *   processing | shipped | delivered | cancelled
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiShoppingBag, FiSearch, FiLoader, FiRefreshCw, FiAlertCircle,
  FiChevronDown, FiUser, FiMail, FiPhone, FiMapPin, FiHash,
  FiCreditCard, FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock,
  FiCheck, FiX, FiEdit2, FiSave, FiSmartphone, FiSend, FiTrash2,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { getStoredUser } from '@/lib/permissions';

const CHANNEL_LABEL = { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad' };

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const bdt = (v) => (typeof v === 'number' ? '৳' + v.toLocaleString('en-US') : '—');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

// Manual fulfillment transitions the admin can set (payment-driven states
// 'pending' / 'paid' / 'access-granted' are set by the payment flow, not here).
const FULFILLMENT_OPTIONS = ['processing', 'shipped', 'delivered', 'cancelled'];

// The raw enum values read like database jargon on a button. These say what the
// click actually does — which matters most for `delivered`, since on a COD order
// it is also the moment the money is recorded.
const FULFILLMENT_LABEL = {
  processing: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const FULFILLMENT_HELP = {
  processing: 'Order confirmed — stock reserved and the buyer can open this book’s QR content',
  shipped: 'Handed to the courier',
  delivered: 'Book received by the buyer — cash-on-delivery orders are marked paid here',
  cancelled: 'Order cancelled — reserved stock goes back on the shelf',
};

const STATUS_META = {
  pending: { cls: 'bg-amber-50 text-amber-600 border-amber-200', icon: FiClock },
  paid: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle },
  processing: { cls: 'bg-sky-50 text-sky-600 border-sky-200', icon: FiPackage },
  shipped: { cls: 'bg-indigo-50 text-indigo-600 border-indigo-200', icon: FiTruck },
  delivered: { cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: FiCheckCircle },
  'access-granted': { cls: 'bg-violet-50 text-violet-600 border-violet-200', icon: FiCheckCircle },
  cancelled: { cls: 'bg-red-50 text-red-500 border-red-200', icon: FiXCircle },
};
const PAY_STYLES = {
  paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  pending: 'bg-amber-50 text-amber-600 border-amber-200',
  failed: 'bg-red-50 text-red-500 border-red-200',
};

const buyerName = (u) =>
  u && typeof u === 'object'
    ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—'
    : '—';

const isCod = (order) => order?.payment?.method === 'cod';

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${meta.cls}`}>
      <Icon size={11} /> {status}
    </span>
  );
}

const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-2">
    <Icon size={13} className="text-dash-faint mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-dash-mute2 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-dash-ink3 break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  </div>
);

export default function BookOrdersPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [busyId, setBusyId] = useState(null); // approve/reject/edit in flight
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  // Multi-select for bulk delete. Only owner accounts (superAdmin/admin) may
  // delete an order at all — the server enforces it; this only hides the UI.
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const canDelete = ['superAdmin', 'admin'].includes(getStoredUser()?.role);

  // Accepts the status so the filter dropdown can refetch with the new value
  // immediately (state updates are async and wouldn't be visible in the same tick).
  const fetchOrders = async (status = statusFilter) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/orders?status=${status}&limit=500`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load orders');
      setOrders(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = (status) => {
    setStatusFilter(status);
    fetchOrders(status);
  };

  useEffect(() => { fetchOrders(); }, []); // initial load

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      o.orderNumber?.toLowerCase().includes(q) ||
      buyerName(o.user).toLowerCase().includes(q) ||
      o.shippingAddress?.name?.toLowerCase().includes(q) ||
      o.shippingAddress?.phone?.includes(q) ||
      (o.user?.email || '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const stats = useMemo(() => ({
    total: orders.length,
    revenue: orders
      .filter((o) => o.payment?.status === 'paid')
      .reduce((s, o) => s + (o.total || 0), 0),
    // Orders waiting on a decision — the actual work queue.
    pending: orders.filter((o) => o.status === 'pending').length,
    // Cash still out with couriers: confirmed COD orders not yet collected.
    codOutstanding: orders
      .filter((o) => isCod(o) && o.payment?.status !== 'paid' && o.status !== 'cancelled')
      .reduce((s, o) => s + (o.total || 0), 0),
    delivered: orders.filter((o) => o.status === 'delivered').length,
  }), [orders]);

  const updateStatus = async (order, status) => {
    setUpdatingId(order._id);
    try {
      const res = await fetch(`${API}/orders/${order._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Update failed');
      // Take the server's copy rather than patching `status` locally: marking a
      // COD order delivered also flips payment.status to paid and stamps the
      // timestamps, and a local patch would leave the row showing "pending".
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, ...(json.data || { status }) } : o))
      );
      showToast(
        'success',
        status === 'delivered' && isCod(order)
          ? `Delivered — ${bdt(order.total)} recorded as paid`
          : `Order marked as ${status}`
      );
    } catch (err) {
      showToast('error', err.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const patchOrder = (id, data) =>
    setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, ...(data || {}) } : o)));

  // Generic POST/PATCH helper for the payment admin actions.
  const runAction = async (order, path, method, body, okMsg) => {
    setBusyId(order._id);
    try {
      const res = await fetch(`${API}/orders/${order._id}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Action failed');
      patchOrder(order._id, json.data);
      showToast('success', okMsg);
      return true;
    } catch (err) {
      showToast('error', err.message || 'Action failed');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const approvePayment = (order) =>
    runAction(order, '/approve', 'POST', null, 'Payment approved — order confirmed');

  // Confirming a COD order is a fulfillment move, not a payment one: it reserves
  // stock and opens the buyer's QR content, but books no money.
  const confirmCodOrder = async (order) => {
    const ok = await confirm({
      title: 'Confirm this cash-on-delivery order?',
      message:
        'Stock will be reserved and the buyer gets access to this book’s QR content. Payment is recorded when you mark it delivered.',
      confirmText: 'Confirm order',
    });
    if (!ok) return;
    updateStatus(order, 'processing');
  };

  const rejectPayment = async (order) => {
    const ok = await confirm({
      title: 'Reject this payment?',
      message: 'The order will be cancelled and the buyer notified to retry.',
      confirmText: 'Reject',
    });
    if (!ok) return;
    runAction(order, '/reject', 'POST', {}, 'Payment rejected — order cancelled');
  };

  const startEdit = (order) => {
    const p = order.payment || {};
    setEditForm({
      channel: p.channel || 'bkash',
      transactionId: p.transactionId || '',
      senderNumber: p.senderNumber || '',
      sentAt: p.sentAt ? new Date(p.sentAt).toISOString().slice(0, 16) : '',
      note: p.note || '',
    });
    setEditingId(order._id);
  };

  const saveEdit = async (order) => {
    const ok = await runAction(
      order,
      '/payment',
      'PATCH',
      {
        channel: editForm.channel,
        transactionId: editForm.transactionId,
        senderNumber: editForm.senderNumber,
        sentAt: editForm.sentAt || null,
        note: editForm.note,
      },
      'Payment details updated'
    );
    if (ok) setEditingId(null);
  };

  // ── Selection + bulk delete ───────────────────────────────────────────────
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selected.has(o._id));
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((o) => next.delete(o._id));
      else filtered.forEach((o) => next.add(o._id));
      return next;
    });

  const deleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: `Delete ${ids.length} order${ids.length === 1 ? '' : 's'}?`,
      message:
        'This permanently removes the order records. Any stock these orders had taken is put back. This cannot be undone.',
      confirmText: 'Delete permanently',
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API}/orders/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not delete');
      showToast('success', json.message || 'Orders deleted');
      setOrders((prev) => prev.filter((o) => !selected.has(o._id)));
      setSelected(new Set());
    } catch (e) {
      showToast('error', e.message || 'Could not delete the selected orders');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2 flex items-center gap-2.5">
            <FiShoppingBag className="text-brand" /> Book Orders
          </h1>
          <p className="text-dash-mute text-sm">Track and fulfill customer book orders.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3.5 py-2.5 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors self-start"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-dash-ink2">{stats.total}</p>
          <p className="text-xs text-dash-mute2 mt-1">Total orders</p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-emerald-600">{bdt(stats.revenue)}</p>
          <p className="text-xs text-dash-mute2 mt-1">Paid revenue</p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-dash-mute2 mt-1">Awaiting confirmation</p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-orange-600">{bdt(stats.codOutstanding)}</p>
          <p className="text-xs text-dash-mute2 mt-1">COD to collect</p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-sky-600">{stats.delivered}</p>
          <p className="text-xs text-dash-mute2 mt-1">Delivered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, buyer name, phone or email…"
            className="w-full pl-10 pr-4 py-2.5 border border-dash-line rounded-lg focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => changeStatus(e.target.value)}
          className="px-4 py-2.5 border border-dash-line rounded-lg focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none text-dash-ink4"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="access-granted">Access granted</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Selection toolbar — owner accounts only. Appears above the list so the
          count and the destructive button are never far from the checkboxes. */}
      {canDelete && filtered.length > 0 && (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
          selected.size > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-dash-line bg-dash-card'
        }`}>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              className="w-4 h-4 rounded border-dash-line-strong text-brand focus:ring-brand"
            />
            <span className="text-sm font-medium text-dash-ink3">
              {selected.size > 0
                ? `${selected.size} order${selected.size === 1 ? '' : 's'} selected`
                : `Select all (${filtered.length})`}
            </span>
          </label>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-2 text-sm font-medium text-dash-mute hover:text-dash-ink3 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
                Delete selected
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-dash-mute2">
          <FiLoader className="animate-spin mr-2" /> Loading orders…
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-dash-card rounded-xl border border-dashed border-dash-line">
          <FiShoppingBag className="mx-auto text-dash-faint" size={40} />
          <p className="text-dash-mute mt-3 font-medium">No orders found</p>
          <p className="text-dash-mute2 text-sm">
            {orders.length === 0 ? 'Book orders will appear here once customers buy.' : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isOpen = expanded === o._id;
            return (
              <div
                key={o._id}
                className={`bg-dash-card rounded-xl border overflow-hidden transition-colors ${
                  selected.has(o._id) ? 'border-rose-300 ring-1 ring-rose-200' : 'border-dash-line'
                }`}
              >
                {/* Summary row. The checkbox sits OUTSIDE the expand button —
                    nesting a control inside a button is invalid and would make
                    every tick also toggle the panel. */}
                <div className="flex items-center">
                  {canDelete && (
                    <label className="pl-4 pr-1 py-3.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(o._id)}
                        onChange={() => toggleOne(o._id)}
                        className="w-4 h-4 rounded border-dash-line-strong text-brand focus:ring-brand"
                        aria-label={`Select order ${o.orderNumber}`}
                      />
                    </label>
                  )}
                <button
                  onClick={() => setExpanded(isOpen ? null : o._id)}
                  className="flex-1 min-w-0 flex flex-wrap items-center gap-3 sm:gap-4 px-4 py-3.5 text-left hover:bg-dash-soft/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[170px]">
                    <span
                      className="inline-flex shrink-0 items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs font-extrabold text-indigo-700"
                      title="Order number"
                    >
                      #{o.orderSeq ?? '—'}
                    </span>
                    <FiHash className="text-dash-faint shrink-0" size={13} />
                    <span className="font-mono text-xs font-semibold text-dash-ink3 truncate">{o.orderNumber}</span>
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <p className="text-sm font-medium text-dash-ink3 truncate">{buyerName(o.user)}</p>
                    <p className="text-xs text-dash-mute2">{fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="text-sm text-dash-mute hidden sm:block">
                    {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'}
                  </div>
                  <div className="font-bold text-dash-ink2 min-w-[70px] text-right">{bdt(o.total)}</div>
                  {isCod(o) && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">
                      COD
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${PAY_STYLES[o.payment?.status] || PAY_STYLES.pending}`}>
                    {o.payment?.status || 'pending'}
                  </span>
                  <StatusBadge status={o.status} />
                  <FiChevronDown className={`text-dash-mute2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-dash-line-soft p-4 sm:p-5 bg-dash-soft/40 space-y-5">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-bold text-dash-mute uppercase tracking-wider mb-2">Items</p>
                      <div className="bg-dash-card rounded-lg border border-dash-line divide-y divide-dash-line-soft">
                        {(o.items || []).map((it, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium text-dash-ink3 truncate">{it.title}</p>
                              <p className="text-xs text-dash-mute2 capitalize">{it.format} · {bdt(it.price)} × {it.quantity}</p>
                            </div>
                            <span className="font-semibold text-dash-ink3 shrink-0">{bdt(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 mt-2 text-sm px-1">
                        <span className="text-dash-mute2">Subtotal: <span className="text-dash-ink4">{bdt(o.subtotal)}</span></span>
                        {o.discount > 0 && (
                          <span className="text-dash-mute2">Discount: <span className="text-emerald-600">−{bdt(o.discount)}</span></span>
                        )}
                        {o.deliveryCharge > 0 && (
                          <span className="text-dash-mute2">Delivery: <span className="text-dash-ink4">{bdt(o.deliveryCharge)}</span></span>
                        )}
                        <span className="font-semibold text-dash-ink3">Total: {bdt(o.total)}</span>
                      </div>
                    </div>

                    {/* Buyer / shipping / payment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-dash-card rounded-lg border border-dash-line p-4">
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Buyer</p>
                        <DetailRow icon={FiUser} label="Name" value={buyerName(o.user)} />
                        <DetailRow icon={FiMail} label="Email" value={o.user?.email} />
                        <DetailRow icon={FiPhone} label="Phone" value={o.user?.phoneNumber || o.shippingAddress?.phone} />
                      </div>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Shipping</p>
                        {o.shippingAddress ? (
                          <>
                            <DetailRow icon={FiUser} label="Recipient" value={o.shippingAddress.name} />
                            <DetailRow icon={FiPhone} label="Phone" value={o.shippingAddress.phone} mono />
                            <DetailRow icon={FiMapPin} label="Address" value={`${o.shippingAddress.address || ''}${o.shippingAddress.city ? ', ' + o.shippingAddress.city : ''}`} />
                            <DetailRow
                              icon={FiTruck}
                              label="Zone"
                              value={o.shippingAddress.area === 'inside-dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                            />
                            {o.shippingAddress.note && <DetailRow icon={FiPackage} label="Note" value={o.shippingAddress.note} />}
                          </>
                        ) : (
                          <p className="text-sm text-dash-mute2">Digital delivery — no shipping</p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Payment</p>
                        <DetailRow
                          icon={FiCreditCard}
                          label="Method"
                          value={o.payment?.method === 'manual'
                            ? `Manual · ${CHANNEL_LABEL[o.payment?.channel] || o.payment?.channel || '—'}`
                            : o.payment?.method === 'cod'
                              ? 'Cash on delivery'
                              : o.payment?.method}
                        />
                        <DetailRow icon={FiHash} label="Transaction ID" value={o.payment?.transactionId} mono />
                        {o.payment?.method === 'manual' && (
                          <>
                            <DetailRow icon={FiSmartphone} label="Sender number" value={o.payment?.senderNumber} mono />
                            <DetailRow icon={FiClock} label="Sent at" value={o.payment?.sentAt ? fmtDate(o.payment.sentAt) : '—'} />
                            <DetailRow icon={FiSend} label="Submitted" value={o.payment?.submittedAt ? fmtDate(o.payment.submittedAt) : '—'} />
                            {o.payment?.note && <DetailRow icon={FiHash} label="Note" value={o.payment.note} />}
                          </>
                        )}
                        <DetailRow icon={FiPackage} label="Delivery type" value={o.deliveryType} />
                        {o.couponCode && <DetailRow icon={FiHash} label="Coupon" value={o.couponCode} />}
                      </div>
                    </div>

                    {/* Payment verification.
                        Cash-on-delivery has no transaction to verify — the money
                        arrives with the courier — so it gets its own action:
                        CONFIRM the order (which reserves stock and opens the
                        book's QR content), and it becomes paid when marked
                        delivered. Approving it here would book revenue for a
                        parcel still in a van. */}
                    <div className="rounded-lg border border-dash-line bg-dash-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-dash-mute uppercase tracking-wider">
                            {isCod(o) ? 'Cash on delivery' : 'Payment verification'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${PAY_STYLES[o.payment?.status] || PAY_STYLES.pending}`}>
                            {o.payment?.status || 'pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!isCod(o) && editingId !== o._id && (
                            <button
                              onClick={() => startEdit(o)}
                              disabled={busyId === o._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dash-line text-dash-ink4 hover:border-brand hover:text-brand-ink transition disabled:opacity-50"
                            >
                              <FiEdit2 size={12} /> Edit
                            </button>
                          )}

                          {isCod(o) ? (
                            o.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => rejectPayment(o)}
                                  disabled={busyId === o._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                  <FiX size={12} /> Cancel order
                                </button>
                                <button
                                  onClick={() => confirmCodOrder(o)}
                                  disabled={updatingId === o._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                                >
                                  {updatingId === o._id ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />} Confirm order
                                </button>
                              </>
                            )
                          ) : (
                            o.payment?.status !== 'paid' && (
                              <>
                                <button
                                  onClick={() => rejectPayment(o)}
                                  disabled={busyId === o._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                  <FiX size={12} /> Reject
                                </button>
                                <button
                                  onClick={() => approvePayment(o)}
                                  disabled={busyId === o._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                                >
                                  {busyId === o._id ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />} Approve
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </div>

                      {isCod(o) && (
                        <p className="mt-3 text-xs text-dash-mute leading-relaxed bg-amber-50/70 border border-amber-100 rounded-lg px-3 py-2">
                          {o.status === 'pending' ? (
                            <>
                              কল করে অর্ডারটি নিশ্চিত করে <b>Confirm order</b> চাপুন — তখনই স্টক
                              কমবে আর ক্রেতা বইয়ের QR কনটেন্ট দেখতে পাবে। বই পৌঁছে দেওয়ার পর{' '}
                              <b>delivered</b> চাপলে <b>{bdt(o.total)}</b> পেমেন্ট হিসেবে বসে যাবে।
                            </>
                          ) : o.payment?.status === 'paid' ? (
                            <>ডেলিভারিতে <b>{bdt(o.total)}</b> নেওয়া হয়েছে।</>
                          ) : (
                            <>
                              কুরিয়ার ক্রেতার কাছ থেকে <b>{bdt(o.total)}</b> নেবে। বই পৌঁছে গেলে{' '}
                              <b>delivered</b> চাপুন — তখনই টাকা বুঝে পাওয়া হিসেবে লেখা হবে।
                            </>
                          )}
                        </p>
                      )}

                      {editingId === o._id && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="text-xs">
                            <span className="text-dash-mute font-medium">Channel</span>
                            <select
                              value={editForm.channel}
                              onChange={(e) => setEditForm((f) => ({ ...f, channel: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
                            >
                              <option value="bkash">bKash</option>
                              <option value="rocket">Rocket</option>
                              <option value="nagad">Nagad</option>
                            </select>
                          </label>
                          <label className="text-xs">
                            <span className="text-dash-mute font-medium">Transaction ID</span>
                            <input
                              value={editForm.transactionId}
                              onChange={(e) => setEditForm((f) => ({ ...f, transactionId: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
                            />
                          </label>
                          <label className="text-xs">
                            <span className="text-dash-mute font-medium">Sender number</span>
                            <input
                              value={editForm.senderNumber}
                              onChange={(e) => setEditForm((f) => ({ ...f, senderNumber: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
                            />
                          </label>
                          <label className="text-xs">
                            <span className="text-dash-mute font-medium">Sent at</span>
                            <input
                              type="datetime-local"
                              value={editForm.sentAt}
                              onChange={(e) => setEditForm((f) => ({ ...f, sentAt: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
                            />
                          </label>
                          <label className="text-xs sm:col-span-2">
                            <span className="text-dash-mute font-medium">Note</span>
                            <input
                              value={editForm.note}
                              onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-dash-line rounded-lg text-sm outline-none focus:border-brand"
                            />
                          </label>
                          <div className="sm:col-span-2 flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-dash-line text-dash-ink4 hover:bg-dash-soft"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(o)}
                              disabled={busyId === o._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
                            >
                              {busyId === o._id ? <FiLoader className="animate-spin" size={12} /> : <FiSave size={12} />} Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fulfillment status control */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-dash-mute uppercase tracking-wider">Update status:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {FULFILLMENT_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(o, s)}
                            disabled={updatingId === o._id || o.status === s}
                            title={FULFILLMENT_HELP[s]}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed
                              ${o.status === s
                                ? 'bg-brand text-white border-brand'
                                : 'bg-dash-card text-dash-ink4 border-dash-line hover:border-brand hover:text-brand-ink'}`}
                          >
                            {updatingId === o._id ? (
                              <FiLoader className="animate-spin" size={12} />
                            ) : (
                              FULFILLMENT_LABEL[s]
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fulfillment trail — when each step actually happened */}
                    {(o.confirmedAt || o.shippedAt || o.deliveredAt || o.cancelledAt) && (
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-dash-mute2">
                        {o.confirmedAt && <span>Confirmed: {fmtDate(o.confirmedAt)}</span>}
                        {o.shippedAt && <span>Shipped: {fmtDate(o.shippedAt)}</span>}
                        {o.deliveredAt && <span>Delivered: {fmtDate(o.deliveredAt)}</span>}
                        {o.cancelledAt && <span>Cancelled: {fmtDate(o.cancelledAt)}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toastNode}
      {confirmNode}
    </div>
  );
}

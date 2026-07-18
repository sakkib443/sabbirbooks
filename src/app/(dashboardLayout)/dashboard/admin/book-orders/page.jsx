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
  FiCheck, FiX, FiEdit2, FiSave, FiSmartphone, FiSend,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';

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
    <Icon size={13} className="text-slate-300 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-slate-700 break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
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
    pending: orders.filter((o) => o.status === 'pending').length,
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
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status } : o)));
      showToast('success', `Order marked as ${status}`);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <FiShoppingBag className="text-[#F3A522]" /> Book Orders
          </h1>
          <p className="text-slate-500 text-sm">Track and fulfill customer book orders.</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors self-start"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">Total orders</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-emerald-600">{bdt(stats.revenue)}</p>
          <p className="text-xs text-slate-400 mt-1">Paid revenue</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-slate-400 mt-1">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xl font-bold text-sky-600">{stats.delivered}</p>
          <p className="text-xs text-slate-400 mt-1">Delivered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, buyer name, phone or email…"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/25 focus:border-[#F3A522] outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => changeStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#F3A522]/25 focus:border-[#F3A522] outline-none text-slate-600"
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <FiLoader className="animate-spin mr-2" /> Loading orders…
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
          <FiShoppingBag className="mx-auto text-slate-300" size={40} />
          <p className="text-slate-500 mt-3 font-medium">No orders found</p>
          <p className="text-slate-400 text-sm">
            {orders.length === 0 ? 'Book orders will appear here once customers buy.' : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isOpen = expanded === o._id;
            return (
              <div key={o._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : o._id)}
                  className="w-full flex flex-wrap items-center gap-3 sm:gap-4 px-4 py-3.5 text-left hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-[150px]">
                    <FiHash className="text-slate-300" size={14} />
                    <span className="font-mono text-sm font-semibold text-slate-700">{o.orderNumber}</span>
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{buyerName(o.user)}</p>
                    <p className="text-xs text-slate-400">{fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="text-sm text-slate-500 hidden sm:block">
                    {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'}
                  </div>
                  <div className="font-bold text-slate-800 min-w-[70px] text-right">{bdt(o.total)}</div>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${PAY_STYLES[o.payment?.status] || PAY_STYLES.pending}`}>
                    {o.payment?.status || 'pending'}
                  </span>
                  <StatusBadge status={o.status} />
                  <FiChevronDown className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 p-4 sm:p-5 bg-slate-50/40 space-y-5">
                    {/* Items */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items</p>
                      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                        {(o.items || []).map((it, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-700 truncate">{it.title}</p>
                              <p className="text-xs text-slate-400 capitalize">{it.format} · {bdt(it.price)} × {it.quantity}</p>
                            </div>
                            <span className="font-semibold text-slate-700 shrink-0">{bdt(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-6 mt-2 text-sm px-1">
                        <span className="text-slate-400">Subtotal: <span className="text-slate-600">{bdt(o.subtotal)}</span></span>
                        {o.discount > 0 && (
                          <span className="text-slate-400">Discount: <span className="text-emerald-600">−{bdt(o.discount)}</span></span>
                        )}
                        <span className="font-semibold text-slate-700">Total: {bdt(o.total)}</span>
                      </div>
                    </div>

                    {/* Buyer / shipping / payment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white rounded-lg border border-slate-200 p-4">
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buyer</p>
                        <DetailRow icon={FiUser} label="Name" value={buyerName(o.user)} />
                        <DetailRow icon={FiMail} label="Email" value={o.user?.email} />
                        <DetailRow icon={FiPhone} label="Phone" value={o.user?.phoneNumber || o.shippingAddress?.phone} />
                      </div>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shipping</p>
                        {o.shippingAddress ? (
                          <>
                            <DetailRow icon={FiUser} label="Recipient" value={o.shippingAddress.name} />
                            <DetailRow icon={FiMapPin} label="Address" value={`${o.shippingAddress.address || ''}${o.shippingAddress.city ? ', ' + o.shippingAddress.city : ''}`} />
                            {o.shippingAddress.note && <DetailRow icon={FiPackage} label="Note" value={o.shippingAddress.note} />}
                          </>
                        ) : (
                          <p className="text-sm text-slate-400">Digital delivery — no shipping</p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment</p>
                        <DetailRow
                          icon={FiCreditCard}
                          label="Method"
                          value={o.payment?.method === 'manual'
                            ? `Manual · ${CHANNEL_LABEL[o.payment?.channel] || o.payment?.channel || '—'}`
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

                    {/* Payment verification — approve / reject / edit manual payments */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment verification</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${PAY_STYLES[o.payment?.status] || PAY_STYLES.pending}`}>
                            {o.payment?.status || 'pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {editingId !== o._id && (
                            <button
                              onClick={() => startEdit(o)}
                              disabled={busyId === o._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:border-[#F3A522] hover:text-[#c9871a] transition disabled:opacity-50"
                            >
                              <FiEdit2 size={12} /> Edit
                            </button>
                          )}
                          {o.payment?.status !== 'paid' && (
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
                          )}
                        </div>
                      </div>

                      {editingId === o._id && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="text-xs">
                            <span className="text-slate-500 font-medium">Channel</span>
                            <select
                              value={editForm.channel}
                              onChange={(e) => setEditForm((f) => ({ ...f, channel: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]"
                            >
                              <option value="bkash">bKash</option>
                              <option value="rocket">Rocket</option>
                              <option value="nagad">Nagad</option>
                            </select>
                          </label>
                          <label className="text-xs">
                            <span className="text-slate-500 font-medium">Transaction ID</span>
                            <input
                              value={editForm.transactionId}
                              onChange={(e) => setEditForm((f) => ({ ...f, transactionId: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]"
                            />
                          </label>
                          <label className="text-xs">
                            <span className="text-slate-500 font-medium">Sender number</span>
                            <input
                              value={editForm.senderNumber}
                              onChange={(e) => setEditForm((f) => ({ ...f, senderNumber: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]"
                            />
                          </label>
                          <label className="text-xs">
                            <span className="text-slate-500 font-medium">Sent at</span>
                            <input
                              type="datetime-local"
                              value={editForm.sentAt}
                              onChange={(e) => setEditForm((f) => ({ ...f, sentAt: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]"
                            />
                          </label>
                          <label className="text-xs sm:col-span-2">
                            <span className="text-slate-500 font-medium">Note</span>
                            <input
                              value={editForm.note}
                              onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))}
                              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#F3A522]"
                            />
                          </label>
                          <div className="sm:col-span-2 flex justify-end gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(o)}
                              disabled={busyId === o._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F3A522] text-white hover:bg-[#d88f13] disabled:opacity-50"
                            >
                              {busyId === o._id ? <FiLoader className="animate-spin" size={12} /> : <FiSave size={12} />} Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fulfillment status control */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Update status:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {FULFILLMENT_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(o, s)}
                            disabled={updatingId === o._id || o.status === s}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition disabled:opacity-40 disabled:cursor-not-allowed
                              ${o.status === s
                                ? 'bg-[#F3A522] text-white border-[#F3A522]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#F3A522] hover:text-[#c9871a]'}`}
                          >
                            {updatingId === o._id ? <FiLoader className="animate-spin" size={12} /> : s}
                          </button>
                        ))}
                      </div>
                    </div>
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

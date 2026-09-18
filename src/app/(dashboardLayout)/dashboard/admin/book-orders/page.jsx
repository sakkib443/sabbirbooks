'use client';

/**
 * Admin — Book Orders.
 * Lists orders from GET /api/orders (admin, bearer token), filter by status,
 * date, medical college and area, expand a row to see items / buyer / shipping
 * / payment, and advance the fulfillment status via PATCH /api/orders/:id/status.
 * The filtered (or ticked) orders download as a PDF list, or as one PDF per
 * medical college — see lib/orderListPdf.
 * Allowed manual statuses mirror the backend zod enum:
 *   processing | shipped | delivered | cancelled
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiShoppingBag, FiSearch, FiLoader, FiRefreshCw, FiAlertCircle,
  FiChevronDown, FiUser, FiMail, FiPhone, FiMapPin, FiHash,
  FiCreditCard, FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiClock,
  FiCheck, FiX, FiEdit2, FiSave, FiSmartphone, FiSend, FiTrash2, FiBookOpen, FiTag, FiGift, FiDollarSign, FiBook,
  FiCalendar, FiDownload, FiLayers,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { useBrand } from '@/components/shared/Brand';
import { getStoredUser } from '@/lib/permissions';
import { buildOrderListPdf, downloadBlob } from '@/lib/orderListPdf';
import { DeliveryToggle, useDeliveryMode } from '@/components/admin/stats/OrderStats';
import { addDays, bdDate, dayWindow, formatBd, pastCutoff } from '@/lib/shopDay';
import {
  areaOf, collegeOf, copiesOf, countOptions, formatBdFull, matchesPlace, printRowOf, safeFileName,
} from '@/lib/orderList';

const CHANNEL_LABEL = { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad' };

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const bdt = (v) => (typeof v === 'number' ? '৳' + v.toLocaleString('en-US') : '—');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

// The same instant, short enough for a row: "18 Sep, 2:47 pm". Bangladesh
// time, whatever the admin's own device says — the day filter above counts in
// Bangladesh time too, and two clocks on one screen is how orders end up
// looking like they fell a day out.
const fmtWhen = (d) =>
  d
    ? new Date(d).toLocaleString('en-GB', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

// Manual fulfillment transitions the admin can set (payment-driven states
// 'pending' / 'paid' / 'access-granted' are set by the payment flow, not here).
const FULFILLMENT_OPTIONS = ['processing', 'shipped', 'delivered', 'cancelled'];

// The desktop table's column widths. Declared once and used by BOTH the header
// strip and every row, because a table whose header does not line up with its
// cells is worse than no header at all. It needs ~900px, so the table starts at
// xl — below that (a tablet, a small laptop with the sidebar open) the stacked
// card is used, rather than a table with its last columns cut off.
const GRID_COLS =
  'grid-cols-[32px_30px_120px_minmax(116px,1.2fr)_minmax(96px,1fr)_minmax(104px,1fr)_92px_84px_128px_28px]';

// Which books, as one short line: "MAGIC VIVA ANATOMY ×2 · PHYSIOLOGY ×1".
const titlesOf = (o) =>
  (o?.items || []).map((it) => `${it.title} ×${Number(it.quantity) || 1}`).join(' · ');

// An order's money without the delivery charge — what its books sold for.
const bookMoneyOf = (o) => (o?.total || 0) - (o?.deliveryCharge || 0);

// How many orders one load brings. The stat cards are counted from what is
// loaded, so a date filter is also how the admin gets exact figures past this.
const LIST_LIMIT = 500;

// The most a PDF list fetches when more orders match than the screen loaded.
const EXPORT_LIMIT = 5000;

// The status filter as the PDF's heading line names it.
const STATUS_TEXT = {
  all: 'All',
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  'access-granted': 'Access granted',
  cancelled: 'Cancelled',
};

/** The query GET /api/orders takes: status, a date window, how many. */
const ordersQuery = (status, range, limit) => {
  const params = new URLSearchParams({ status, limit: String(limit) });
  if (range) {
    params.set('from', range.from.toISOString());
    params.set('to', range.to.toISOString());
  }
  return params;
};

// Date shortcuts. A day on this screen runs noon → noon Bangladesh time and is
// named by the date it ends on (lib/shopDay). "Tomorrow" only makes sense once
// today's noon has passed: orders placed after it already count for tomorrow.
const DATE_PRESETS = [
  { key: 'all', label: 'All dates' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow (after 12 PM)', afterCutoffOnly: true },
  { key: '7d', label: 'Last 7 days' },
];

/** The first and last date a shortcut covers, or null for all dates. */
const daysForPreset = (key) => {
  const today = bdDate();
  if (key === 'today') return { fromDay: today, toDay: today };
  if (key === 'yesterday') return { fromDay: addDays(today, -1), toDay: addDays(today, -1) };
  if (key === 'tomorrow') return { fromDay: addDays(today, 1), toDay: addDays(today, 1) };
  if (key === '7d') return { fromDay: addDays(today, -6), toDay: today };
  return null;
};

/** "3 books", on a chip, so the count reads at a glance in a long list. */
function BooksChip({ order, className = '' }) {
  const n = copiesOf(order);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-brand/25 bg-brand-soft/60 px-1.5 py-0.5 text-xs font-bold text-brand-ink tabular-nums ${className}`}
      title={titlesOf(order)}
    >
      <FiBook size={11} /> {n} {n === 1 ? 'book' : 'books'}
    </span>
  );
}

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

// Who placed an order, as the order knows it. Ordering needs no account now, so
// a guest order carries everything itself — name, numbers, email, college — and
// has no `user` at all. For an account, its name comes first; the order's own
// fields fill what an older order never recorded.
const buyerOf = (o) => ({
  isGuest: !o?.user,
  name: o?.user ? buyerName(o.user) : o?.shippingAddress?.name || '—',
  email: o?.shippingAddress?.email || o?.user?.email || '',
  phone: o?.shippingAddress?.phone || o?.user?.phoneNumber || '',
  altPhone: o?.shippingAddress?.altPhone || '',
  whatsapp: o?.user?.whatsappNumber || '',
  college: collegeOf(o),
  collegeArea: [
    o?.college?.upazila || o?.user?.upazila,
    o?.college?.district || o?.user?.district,
    o?.user?.division,
  ].filter(Boolean).join(', '),
});

/** The search box: order #, buyer, phone, email, college or a book's title. `q` is lower-case. */
const matchesSearch = (o, q) => {
  if (!q) return true;
  const b = buyerOf(o);
  return (
    o.orderNumber?.toLowerCase().includes(q) ||
    b.name.toLowerCase().includes(q) ||
    o.shippingAddress?.name?.toLowerCase().includes(q) ||
    b.phone.includes(q) ||
    b.altPhone.includes(q) ||
    b.email.toLowerCase().includes(q) ||
    b.college.toLowerCase().includes(q) ||
    // A book's title finds every order of it.
    (o.items || []).some((it) => it.title?.toLowerCase().includes(q))
  );
};

/** A select with its options counted: "Dhaka Medical College (12)". */
function CountSelect({ value, onChange, allLabel, options, disabled, label }) {
  // A choice the reloaded orders no longer contain stays listed, at 0, so the
  // select never shows a filter other than the one actually applied.
  const shown = value && !options.some((o) => o.value === value) ? [{ value, count: 0 }, ...options] : options;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label={label}
      className="w-full min-w-0 px-4 py-2.5 border border-dash-line rounded-lg focus:ring-2 focus:ring-brand/25 focus:border-brand outline-none text-dash-ink4 disabled:opacity-50"
    >
      <option value="">{allLabel}</option>
      {shown.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value} ({o.count})
        </option>
      ))}
    </select>
  );
}

function GuestBadge() {
  return (
    <span
      className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
      title="Ordered without an account"
    >
      Guest
    </span>
  );
}

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

// One labelled box in the full-order editor.
const EditField = ({ label, value, onChange, type = 'text', mono }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-medium text-dash-mute">{label}</span>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${mono ? 'font-mono' : ''}`}
    />
  </label>
);

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
  // One flag for every bulk action, so two cannot run at once.
  const [bulkBusy, setBulkBusy] = useState(false);
  // The owner's full correction pass over one order — a separate panel from the
  // payment-details edit above, because it also touches the buyer's own record.
  const [fullEditId, setFullEditId] = useState(null);
  const [fullForm, setFullForm] = useState({});
  const [savingFull, setSavingFull] = useState(false);
  const canDelete = ['superAdmin', 'admin'].includes(getStoredUser()?.role);
  // Paid revenue with or without the delivery charge — the same switch, and the
  // same remembered choice, as the dashboard and the analytics page.
  const [deliveryMode, setDeliveryMode] = useDeliveryMode();
  // Date filter: the shortcut in use, the exact window it resolved to (sent to
  // the API as instants), and the two date inputs.
  const [datePreset, setDatePreset] = useState('all');
  const [dateRange, setDateRange] = useState(null); // { from: Date, to: Date } | null
  const [dayFrom, setDayFrom] = useState('');
  const [dayTo, setDayTo] = useState('');
  // Every order matching the filters on the server, which can be more than loaded.
  const [matchCount, setMatchCount] = useState(0);
  // Medical college and area (district → upazila). Applied here, to the loaded
  // orders, and their choices are counted from them — only colleges and places
  // that actually have orders in the chosen dates are offered.
  const [collegeFilter, setCollegeFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [upazilaFilter, setUpazilaFilter] = useState('');
  // A PDF being made, and the last per-college set — kept so a file the browser
  // did not save can be downloaded again from the list under the filters.
  const [exporting, setExporting] = useState(false);
  const [batch, setBatch] = useState(null); // { files: [{ college, count, name, blob }] }
  const brand = useBrand();

  // Accepts the status and the date window so a filter change can refetch with
  // the new values immediately (state updates are async and wouldn't be visible
  // in the same tick).
  const fetchOrders = async (status = statusFilter, range = dateRange) => {
    setLoading(true);
    setError('');
    // Those files were made from the orders being replaced.
    setBatch(null);
    try {
      const params = ordersQuery(status, range, LIST_LIMIT);
      const res = await fetch(`${API}/orders?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Failed to load orders');
      const list = Array.isArray(json.data) ? json.data : [];
      setOrders(list);
      setMatchCount(Number(json.meta?.total) || list.length);
      // A different list: a tick left over from the previous one would let a
      // bulk action change orders that are no longer on the screen.
      setSelected(new Set());
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const applyDatePreset = (key) => {
    const days = daysForPreset(key);
    const range = days ? dayWindow(days.fromDay, days.toDay) : null;
    setDatePreset(key);
    setDateRange(range);
    setDayFrom(days?.fromDay || '');
    setDayTo(days?.toDay || '');
    fetchOrders(statusFilter, range);
  };

  // One date, or a span of dates, both ends included.
  const applyCustomDays = () => {
    if (!dayFrom && !dayTo) return;
    let first = dayFrom || dayTo;
    let last = dayTo || dayFrom;
    if (first > last) [first, last] = [last, first];
    const range = dayWindow(first, last);
    setDayFrom(first);
    setDayTo(last);
    setDatePreset('custom');
    setDateRange(range);
    fetchOrders(statusFilter, range);
  };

  const changeStatus = (status) => {
    setStatusFilter(status);
    fetchOrders(status);
  };

  useEffect(() => { fetchOrders(); }, []); // initial load

  const place = useMemo(
    () => ({ college: collegeFilter, district: districtFilter, upazila: upazilaFilter }),
    [collegeFilter, districtFilter, upazilaFilter]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => matchesSearch(o, q) && matchesPlace(o, place));
  }, [orders, search, place]);

  // The choices, counted from the loaded orders. The upazilas are the chosen
  // district's; with no district chosen there is nothing to narrow.
  const collegeOptions = useMemo(() => countOptions(orders.map(collegeOf)), [orders]);
  const districtOptions = useMemo(() => countOptions(orders.map((o) => areaOf(o).district)), [orders]);
  const upazilaOptions = useMemo(
    () =>
      districtFilter
        ? countOptions(orders.map(areaOf).filter((a) => a.district === districtFilter).map((a) => a.upazila))
        : [],
    [orders, districtFilter]
  );

  // A PDF of the filtered list leaves cancelled orders out — nobody delivers
  // them or collects for them — unless cancelled orders are what was asked for.
  const keepForPdf = (list) => (statusFilter === 'cancelled' ? list : list.filter((o) => o.status !== 'cancelled'));
  const allLoaded = matchCount <= orders.length;
  const pdfCount = keepForPdf(filtered).length;
  const pdfColleges = new Set(keepForPdf(filtered).map(collegeOf)).size;

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.payment?.status === 'paid');
    const live = orders.filter((o) => o.status !== 'cancelled');
    const codUnpaid = live.filter((o) => isCod(o) && o.payment?.status !== 'paid');
    return {
      total: orders.length,
      revenue: paid.reduce((s, o) => s + (o.total || 0), 0),
      revenueBooks: paid.reduce((s, o) => s + bookMoneyOf(o), 0),
      // Books in every order that still stands — a cancelled order sold nothing.
      books: live.reduce((s, o) => s + copiesOf(o), 0),
      // Orders waiting on a decision — the actual work queue.
      pending: orders.filter((o) => o.status === 'pending').length,
      // Cash still out with couriers: COD orders not yet collected. With the
      // delivery charge it is what the rider collects; without it, what the
      // books are owed — the same switch as the revenue card.
      codOutstanding: codUnpaid.reduce((s, o) => s + (o.total || 0), 0),
      codOutstandingBooks: codUnpaid.reduce((s, o) => s + bookMoneyOf(o), 0),
      delivered: orders.filter((o) => o.status === 'delivered').length,
    };
  }, [orders]);

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

  // Open the full editor prefilled with what the order says today, so an admin
  // fixing one typo does not have to retype the rest.
  const startFullEdit = (o) => {
    const a = o.shippingAddress || {};
    setFullEditId(o._id);
    setFullForm({
      name: a.name || '',
      phone: a.phone || '',
      address: a.address || '',
      upazila: a.upazila || a.city || '',
      district: a.district || '',
      division: a.division || '',
      note: a.note || '',
      altPhone: a.altPhone || '',
      email: a.email || o.user?.email || '',
      userPhone: o.user?.phoneNumber || '',
      whatsappNumber: o.user?.whatsappNumber || '',
      payStatus: o.payment?.status || 'pending',
      payMethod: o.payment?.method || '',
      transactionId: o.payment?.transactionId || '',
      adminNote: o.adminNote || '',
    });
  };

  const saveFullEdit = async (o) => {
    setSavingFull(true);
    try {
      const res = await fetch(`${API}/orders/${o._id}/admin-edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          shippingAddress: {
            name: fullForm.name,
            phone: fullForm.phone,
            altPhone: fullForm.altPhone,
            // The order's own email: where its emails go, and all a guest has.
            email: fullForm.email,
            address: fullForm.address,
            upazila: fullForm.upazila,
            district: fullForm.district,
            division: fullForm.division,
            note: fullForm.note,
          },
          payment: {
            status: fullForm.payStatus,
            ...(fullForm.payMethod ? { method: fullForm.payMethod } : {}),
            transactionId: fullForm.transactionId,
          },
          buyer: {
            email: fullForm.email,
            phoneNumber: fullForm.userPhone,
            whatsappNumber: fullForm.whatsappNumber,
          },
          adminNote: fullForm.adminNote,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not save');
      showToast('success', 'Order updated');
      setFullEditId(null);
      fetchOrders();
    } catch (e) {
      showToast('error', e.message || 'Could not save the changes');
    } finally {
      setSavingFull(false);
    }
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

  // Move every selected order to one status. Cancelling is destructive enough
  // (it puts stock back and fails the payment) to be worth confirming first.
  const bulkStatus = async (status) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (status === 'cancelled') {
      const ok = await confirm({
        title: `Cancel ${ids.length} order${ids.length === 1 ? '' : 's'}?`,
        message: 'Reserved stock goes back on the shelf and unpaid payments are marked failed.',
        confirmText: 'Cancel orders',
        danger: true,
      });
      if (!ok) return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch(`${API}/orders/bulk-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ids, status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not update');
      showToast('success', json.message || 'Orders updated');
      setSelected(new Set());
      fetchOrders();
    } catch (e) {
      showToast('error', e.message || 'Could not update the selected orders');
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * Delete orders, for real.
   *
   * This lived on its own page for a while, behind typing the order number
   * out. The shop wants it back on the screen they actually work on, so it is
   * here — but the danger that moved it away has not changed: a deleted order
   * is gone, with its payment record and its buyer's proof of purchase.
   *
   * So what stands in the way now is the confirm dialog, and it is written to
   * be READ rather than dismissed: it names the order (or counts them), says
   * what is lost, and its button says "Delete" rather than "OK". The whole
   * point is that the second click is a different decision from the first, not
   * a reflex continuing it.
   *
   * One request for any number of orders — /bulk-delete already exists and
   * restores each order's reserved stock as it goes, which a loop of single
   * deletes from here would do too but over N round trips, with the list half
   * gone if the tab is closed midway. The server reports how many actually
   * went, and that number is what the toast says: with twenty orders and one
   * failure, "20 deleted" would be a lie the admin then acts on.
   */
  const deleteOrders = async (orders) => {
    const list = orders.filter(Boolean);
    if (list.length === 0) return;
    const one = list.length === 1 ? list[0] : null;

    const ok = await confirm({
      title: one ? `Delete order ${one.orderNumber}?` : `Delete ${list.length} orders?`,
      message: one
        ? `${buyerOf(one).name} · ${bdt(one.total)}. The order, its payment record and the buyer's proof of purchase are removed for good. This cannot be undone.`
        : `${list.length} orders, their payment records and their buyers' proof of purchase are removed for good. This cannot be undone.`,
      confirmText: one ? 'Delete order' : `Delete ${list.length} orders`,
      danger: true,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      const res = await fetch(`${API}/orders/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ids: list.map((o) => o._id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not delete');

      const deleted = Number(json?.data?.deleted ?? list.length);
      const failed = Number(json?.data?.failed ?? 0);
      if (failed > 0) {
        // Partial. Say both numbers — an admin told "deleted" who then sees the
        // rows still there has stopped trusting the whole screen.
        showToast('error', `${deleted} deleted, ${failed} could not be`);
      } else {
        showToast('success', deleted === 1 ? 'Order deleted' : `${deleted} orders deleted`);
      }
    } catch (e) {
      showToast('error', e.message || 'Could not delete');
    } finally {
      setBulkBusy(false);
      setSelected(new Set());
      fetchOrders();
    }
  };

  /**
   * The orders a PDF of the filtered list holds: every order the filters show —
   * fetched in full first when the screen holds only the latest LIST_LIMIT —
   * less the cancelled ones (keepForPdf). `matching` still has those, so a
   * heading can say how many were left out.
   */
  const collectForPdf = async () => {
    let pool = orders;
    let fromLatest = 0;
    if (!allLoaded) {
      const params = ordersQuery(statusFilter, dateRange, Math.min(matchCount, EXPORT_LIMIT));
      const res = await fetch(`${API}/orders?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not load the orders');
      pool = Array.isArray(json.data) ? json.data : [];
      if (pool.length < matchCount) fromLatest = pool.length;
    }
    const q = search.trim().toLowerCase();
    const matching = pool.filter((o) => matchesSearch(o, q) && matchesPlace(o, place));
    return { matching, list: keepForPdf(matching), fromLatest };
  };

  // What a PDF says about itself, and what its file is called. English, as the
  // shop asked, and the file name starts with the college: a phone's file list and
  // WhatsApp both cut a long name off at the end, so the college has to be at
  // the front to tell one day's six files apart.
  const pdfArea = [upazilaFilter, districtFilter].filter(Boolean).join(', ');
  const pdfDays = dayFrom && dayTo ? (dayFrom === dayTo ? dayTo : `${dayFrom} to ${dayTo}`) : bdDate();
  const pdfFileName = (subject) =>
    `${safeFileName(`${subject || pdfArea || brand.englishName} - ${pdfDays}`)} orders.pdf`;
  const pdfText = ({ list, leftOut = 0, fromLatest = 0, onlySelected = false, heading = '' }) => {
    const madeAt = formatBdFull(new Date());
    // What the courier or the campus rep has to bring back, on the first line.
    const cod = list.filter((o) => isCod(o) && o.payment?.status !== 'paid');
    const toCollect = cod.reduce((sum, o) => sum + (o.total || 0), 0);
    return {
      title: `${brand.englishName} - Order list`,
      heading,
      filters: [
        `Date: ${dateRange ? `${formatBdFull(dateRange.from)} to ${formatBdFull(dateRange.to)}` : 'all dates'}`,
        `Status: ${STATUS_TEXT[statusFilter] || statusFilter}`,
        !heading && collegeFilter && `Medical college: ${collegeFilter}`,
        pdfArea && `Area: ${pdfArea}`,
        search.trim() && `Search: ${search.trim()}`,
      ].filter(Boolean),
      summary: [
        `${list.length} order${list.length === 1 ? '' : 's'}`,
        `${list.reduce((n, o) => n + copiesOf(o), 0)} books`,
        cod.length > 0 && `${cod.length} cash on delivery, Tk ${toCollect.toLocaleString('en-US')} to collect`,
        onlySelected && 'only the ticked orders',
        leftOut > 0 && `${leftOut} cancelled left out`,
        fromLatest > 0 && `from the latest ${fromLatest} orders`,
        `Made: ${madeAt}`,
      ].filter(Boolean).join('   ·   '),
      footer: `${brand.englishName} · ${madeAt}`,
    };
  };

  /** One PDF: the ticked orders, or else every order the filters show. */
  const exportPdf = async (onlySelected = false) => {
    if (exporting) return;
    setExporting(true);
    try {
      const { matching, list, fromLatest } = onlySelected
        ? { matching: [], list: filtered.filter((o) => selected.has(o._id)), fromLatest: 0 }
        : await collectForPdf();
      if (list.length === 0) {
        showToast('error', 'No orders to put in the PDF');
        return;
      }
      const leftOut = onlySelected ? 0 : matching.length - list.length;
      const blob = await buildOrderListPdf({
        ...pdfText({ list, leftOut, fromLatest, onlySelected }),
        rows: list.map(printRowOf),
      });
      downloadBlob(blob, pdfFileName(collegeFilter));
    } catch (e) {
      showToast('error', e.message || 'Could not make the PDF');
    } finally {
      setExporting(false);
    }
  };

  /**
   * One PDF for every medical college in the orders the filters show, all
   * downloaded from one click — a day's parcels, sorted by where they go.
   * Orders with no college get a file of their own, so none is dropped.
   */
  const exportPerCollege = async () => {
    if (exporting) return;
    if (!dateRange) {
      const ok = await confirm({
        title: 'No date picked',
        message:
          'This makes one PDF for every medical college across ALL dates. For one day’s orders, pick the date first.',
        confirmText: 'Make them anyway',
      });
      if (!ok) return;
    }
    setExporting(true);
    try {
      const { matching, list, fromLatest } = await collectForPdf();
      if (list.length === 0) {
        showToast('error', 'No orders to put in the PDFs');
        return;
      }
      const byCollege = new Map();
      for (const o of list) {
        const college = collegeOf(o);
        byCollege.set(college, [...(byCollege.get(college) || []), o]);
      }
      // A→Z, and the orders without a college last.
      const groups = [...byCollege].sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b, 'bn')));

      const files = [];
      for (const [college, group] of groups) {
        const leftOut =
          statusFilter === 'cancelled'
            ? 0
            : matching.filter((o) => o.status === 'cancelled' && collegeOf(o) === college).length;
        const blob = await buildOrderListPdf({
          ...pdfText({
            list: group,
            leftOut,
            fromLatest,
            heading: `Medical college: ${college || 'not given'}`,
          }),
          rows: group.map(printRowOf),
        });
        files.push({ college, count: group.length, name: pdfFileName(college || 'No college'), blob });
      }

      // A short gap between files: some browsers drop downloads fired together.
      files.forEach((file, i) => setTimeout(() => downloadBlob(file.blob, file.name), i * 400));
      setBatch({ files });
      showToast('success', `${files.length} PDF${files.length === 1 ? '' : 's'} — one per medical college`);
    } catch (e) {
      showToast('error', e.message || 'Could not make the PDFs');
    } finally {
      setExporting(false);
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
        <div className="flex flex-wrap items-center gap-2 self-start">
          <DeliveryToggle mode={deliveryMode} onChange={setDeliveryMode} />
          <button
            onClick={() => fetchOrders()}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-dash-line rounded-lg text-dash-ink4 hover:bg-dash-soft transition-colors"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-dash-ink2">{stats.total}</p>
          <p className="text-xs text-dash-mute2 mt-1">Total orders</p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-brand-ink tabular-nums">{stats.books.toLocaleString('en-US')}</p>
          <p className="text-xs text-dash-mute2 mt-1" title="Every book in orders that were not cancelled">Books ordered</p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-emerald-600 tabular-nums">
            {bdt(deliveryMode === 'without' ? stats.revenueBooks : stats.revenue)}
          </p>
          <p className="text-xs text-dash-mute2 mt-1">
            Paid revenue · {deliveryMode === 'without' ? 'without delivery' : 'with delivery'}
          </p>
        </div>
        <div className="bg-dash-card rounded-xl border border-dash-line p-4">
          <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-dash-mute2 mt-1">Awaiting confirmation</p>
        </div>
        <div
          className="bg-dash-card rounded-xl border border-dash-line p-4"
          title={`The couriers collect ${bdt(stats.codOutstanding)}, delivery charge included`}
        >
          <p className="text-xl font-bold text-orange-600 tabular-nums">
            {bdt(deliveryMode === 'without' ? stats.codOutstandingBooks : stats.codOutstanding)}
          </p>
          <p className="text-xs text-dash-mute2 mt-1">
            COD to collect · {deliveryMode === 'without' ? 'without delivery' : 'with delivery'}
          </p>
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
            placeholder="Search by order #, buyer, phone, email or book…"
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

      {/* Dates. A day here runs noon → noon Bangladesh time, named by the date
          it ends on — the stat cards above count the same window. */}
      <div className="space-y-1.5">
        <div className="flex flex-col gap-3 rounded-xl border border-dash-line bg-dash-card px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <FiCalendar className="mr-1 text-dash-mute2" aria-hidden />
            {DATE_PRESETS.filter((p) => !p.afterCutoffOnly || pastCutoff()).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyDatePreset(p.key)}
                aria-pressed={datePreset === p.key}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  datePreset === p.key
                    ? 'bg-brand text-white shadow-sm shadow-brand/25'
                    : 'text-dash-mute hover:bg-dash-soft hover:text-dash-ink3'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dayFrom}
              onChange={(e) => setDayFrom(e.target.value)}
              aria-label="First date"
              className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
            />
            <span className="text-dash-mute2">–</span>
            <input
              type="date"
              value={dayTo}
              onChange={(e) => setDayTo(e.target.value)}
              aria-label="Last date"
              className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={applyCustomDays}
              disabled={!dayFrom && !dayTo}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                datePreset === 'custom'
                  ? 'bg-brand text-white shadow-sm shadow-brand/25'
                  : 'bg-dash-soft2 text-dash-ink4 hover:bg-dash-soft3'
              }`}
            >
              Apply
            </button>
          </div>
        </div>
        <p className="px-1 text-xs text-dash-mute2">
          {dateRange ? (
            <>
              Orders placed <span className="font-semibold text-dash-ink3">{formatBd(dateRange.from)}</span>
              {' → '}
              <span className="font-semibold text-dash-ink3">{formatBd(dateRange.to)}</span>
            </>
          ) : (
            'All dates'
          )}
          {' · '}A day here runs 12 PM → 12 PM, Bangladesh time.
          {!loading && matchCount > orders.length && (
            <span className="text-amber-700">
              {' '}Showing the latest {orders.length.toLocaleString('en-US')} of {matchCount.toLocaleString('en-US')} — pick dates to see and count the rest.
            </span>
          )}
        </p>
      </div>

      {/* Medical college and area, then the PDFs of whatever the filters show.
          One row on a wide screen; the selects three across and the buttons
          under them on a tablet; everything stacked on a phone. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <CountSelect
          label="Medical college"
          value={collegeFilter}
          onChange={setCollegeFilter}
          allLabel="All medical colleges"
          options={collegeOptions}
        />
        <CountSelect
          label="District"
          value={districtFilter}
          onChange={(v) => {
            setDistrictFilter(v);
            // An upazila belongs to one district; a new district starts over.
            setUpazilaFilter('');
          }}
          allLabel="All districts"
          options={districtOptions}
        />
        <CountSelect
          label="Upazila / thana"
          value={upazilaFilter}
          onChange={setUpazilaFilter}
          allLabel={districtFilter ? 'All upazilas / thanas' : 'Upazila — pick a district first'}
          options={upazilaOptions}
          disabled={!districtFilter}
        />
        <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row xl:col-span-1">
          <button
            type="button"
            onClick={() => exportPdf(false)}
            disabled={loading || exporting || (allLoaded && pdfCount === 0)}
            title={
              statusFilter === 'cancelled'
                ? 'One PDF with every order shown'
                : 'One PDF with every order shown, cancelled ones left out'
            }
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand px-4 py-2.5 font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-hover disabled:opacity-50 sm:flex-1 xl:flex-none"
          >
            {exporting ? <FiLoader className="animate-spin" /> : <FiDownload />}
            Download PDF
            {allLoaded && <span className="rounded-md bg-white/20 px-1.5 text-xs tabular-nums">{pdfCount}</span>}
          </button>
          <button
            type="button"
            onClick={exportPerCollege}
            disabled={loading || exporting || (allLoaded && pdfCount === 0)}
            title="A separate PDF for each medical college in the orders shown — pick the date first"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-brand/50 bg-dash-card px-4 py-2.5 font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-50 sm:flex-1 xl:flex-none"
          >
            {exporting ? <FiLoader className="animate-spin" /> : <FiLayers />}
            PDF per college
            {allLoaded && <span className="rounded-md bg-brand-soft px-1.5 text-xs tabular-nums">{pdfColleges}</span>}
          </button>
        </div>
      </div>

      {/* The last per-college set. The files download by themselves; this is
          for the one a browser held back, and to say how many there were. */}
      {batch && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/40 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-dash-ink2">
                {batch.files.length} PDF{batch.files.length === 1 ? '' : 's'} — one per medical college
              </p>
              <p className="mt-0.5 text-xs text-dash-mute">
                If the browser asks to download multiple files, choose Allow. A file missing? Tap it to download it again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBatch(null)}
              aria-label="Close"
              className="shrink-0 rounded-md p-1 text-dash-mute transition-colors hover:bg-dash-soft hover:text-dash-ink3"
            >
              <FiX />
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {batch.files.map((file) => (
              <button
                key={file.name}
                type="button"
                onClick={() => downloadBlob(file.blob, file.name)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs font-medium text-dash-ink3 transition-colors hover:border-brand/40 hover:text-brand"
              >
                <FiDownload size={12} className="shrink-0" />
                <span className="truncate">{file.college || 'No college'}</span>
                <span className="shrink-0 tabular-nums text-dash-mute2">· {file.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection toolbar. Appears above the list so the count and the actions
          are never far from the checkboxes. Every fulfilment status can be set
          in bulk — confirming twenty COD orders one at a time is the job this
          screen exists to avoid. Delete stays owner-only. */}
      {filtered.length > 0 && (
        <div
          className={`flex flex-col gap-3 rounded-xl border px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
            selected.size > 0 ? 'border-brand/40 bg-brand-soft/40' : 'border-dash-line bg-dash-card'
          }`}
        >
          <label className="flex cursor-pointer select-none items-center gap-2.5">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              className="h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand"
            />
            <span className="text-sm font-medium text-dash-ink3">
              {selected.size > 0
                ? `${selected.size} selected`
                : `Select all (${filtered.length})`}
            </span>
          </label>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {FULFILLMENT_OPTIONS.map((st) => {
                const Icon = STATUS_META[st]?.icon || FiCheck;
                return (
                  <button
                    key={st}
                    onClick={() => bulkStatus(st)}
                    disabled={bulkBusy}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      st === 'cancelled'
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-dash-line bg-dash-card text-dash-ink3 hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    <Icon size={13} /> {FULFILLMENT_LABEL[st]}
                  </button>
                );
              })}
              {/* Only the ticked orders, as a PDF list — cancelled ones too,
                  since ticking them is asking for them. */}
              <button
                onClick={() => exportPdf(true)}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-xs font-semibold text-dash-ink3 transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
              >
                <FiDownload size={13} /> PDF
              </button>
              {/* Deleting, set apart on purpose.
                  A divider and its own colour, because everything to the left
                  moves an order along and this one ends it. Owner-only, and
                  the confirm dialog names what goes. */}
              {canDelete && (
                <>
                  <span className="mx-1 h-5 w-px bg-dash-line" aria-hidden />
                  <button
                    onClick={() => deleteOrders(filtered.filter((o) => selected.has(o._id)))}
                    disabled={bulkBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                  >
                    <FiTrash2 size={13} /> Delete
                  </button>
                </>
              )}

              <button
                onClick={() => setSelected(new Set())}
                className="px-2 py-2 text-xs font-medium text-dash-mute transition-colors hover:text-dash-ink3"
              >
                Clear
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
        <div className="space-y-2">
          {/* Column headers — desktop only; the mobile card labels its own
              fields inline, where a header row has nothing to align to. */}
          <div className={`hidden xl:grid ${GRID_COLS} items-center gap-3 rounded-lg bg-dash-soft px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-dash-mute2`}>
            <span />
            {/* Counts the list as it stands, so a date filter starts again at 1
                — the same numbering the PDF of this list prints. */}
            <span className="text-right">#</span>
            <span>Order</span>
            <span>Buyer &amp; phone</span>
            <span>Medical college</span>
            <span>Books</span>
            <span className="text-right">Total</span>
            <span className="text-center">Payment</span>
            <span>Status</span>
            <span />
          </div>

          {filtered.map((o, index) => {
            const isOpen = expanded === o._id;
            const serial = index + 1;
            return (
              <div
                key={o._id}
                className={`bg-dash-card rounded-xl border overflow-hidden transition-colors ${
                  selected.has(o._id) ? 'border-rose-300 ring-1 ring-rose-200' : 'border-dash-line'
                }`}
              >
                {/* Summary row.
                    Desktop is a real table: GRID_COLS is shared with the header
                    strip above the list, so every cell lines up under its label.
                    Mobile drops to a stacked card — a 7-column table on a phone
                    is unreadable. The checkbox and the status select sit OUTSIDE
                    the expand button: nesting a control inside a button is
                    invalid, and every tick would also toggle the panel. */}
                <div className={`hidden xl:grid ${GRID_COLS} items-center gap-3 px-3 py-2.5`}>
                  <label className="flex cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selected.has(o._id)}
                      onChange={() => toggleOne(o._id)}
                      className="h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand"
                      aria-label={`Select order ${o.orderNumber}`}
                    />
                  </label>

                  <span className="text-right text-xs font-semibold tabular-nums text-dash-mute2">{serial}</span>

                  <button onClick={() => setExpanded(isOpen ? null : o._id)} className="min-w-0 text-left">
                    <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs font-extrabold text-indigo-700">
                      #{o.orderSeq ?? '—'}
                    </span>
                    {/* When it was placed, on the row itself: the packing list
                        is made by the clock, not by the order number. */}
                    <span className="mt-0.5 block truncate text-[11px] tabular-nums text-dash-mute2" title={fmtDate(o.createdAt)}>
                      {fmtWhen(o.createdAt)}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-dash-faint">{o.orderNumber}</span>
                  </button>

                  <button onClick={() => setExpanded(isOpen ? null : o._id)} className="min-w-0 text-left">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-medium text-dash-ink3">{buyerOf(o).name}</span>
                      {buyerOf(o).isGuest && <GuestBadge />}
                    </span>
                    <span className="block truncate font-mono text-xs text-dash-mute2">
                      {buyerOf(o).phone || '—'}
                    </span>
                  </button>

                  <div className="min-w-0">
                    <span className="block truncate text-sm text-dash-ink4" title={buyerOf(o).college}>
                      {buyerOf(o).college || '—'}
                    </span>
                    <span className="block truncate text-xs text-dash-mute2">
                      {[o.shippingAddress?.district, o.shippingAddress?.division].filter(Boolean).join(', ') || fmtDate(o.createdAt)}
                    </span>
                  </div>

                  {/* How many books, and which — offers and coupons make the
                      total alone say nothing about the count. */}
                  <button onClick={() => setExpanded(isOpen ? null : o._id)} className="min-w-0 text-left">
                    <BooksChip order={o} />
                    <span className="mt-0.5 block truncate text-[11px] text-dash-mute2" title={titlesOf(o)}>
                      {titlesOf(o) || '—'}
                    </span>
                  </button>

                  <div className="text-right">
                    <span className="block font-bold text-dash-ink2">{bdt(o.total)}</span>
                    {isCod(o) && <span className="text-[10px] font-bold text-amber-600">COD</span>}
                  </div>

                  <div className="text-center">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${PAY_STYLES[o.payment?.status] || PAY_STYLES.pending}`}>
                      {o.payment?.status || 'pending'}
                    </span>
                  </div>

                  {/* Status is changed right here — no need to open the panel. */}
                  <div>
                    <select
                      value={FULFILLMENT_OPTIONS.includes(o.status) ? o.status : ''}
                      disabled={updatingId === o._id}
                      onChange={(e) => e.target.value && updateStatus(o, e.target.value)}
                      className={`w-full rounded-md border px-2 py-1.5 text-xs font-semibold capitalize outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 ${STATUS_META[o.status]?.cls || 'border-dash-line text-dash-ink3'}`}
                      title="Change status"
                    >
                      {!FULFILLMENT_OPTIONS.includes(o.status) && (
                        <option value="">{o.status}</option>
                      )}
                      {FULFILLMENT_OPTIONS.map((s) => (
                        <option key={s} value={s}>{FULFILLMENT_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setExpanded(isOpen ? null : o._id)}
                    className="flex items-center justify-center text-dash-mute2 hover:text-brand"
                    title={isOpen ? 'Hide details' : 'Show details'}
                  >
                    {updatingId === o._id
                      ? <FiLoader className="animate-spin" size={15} />
                      : <FiChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                  </button>
                </div>

                {/* Mobile / tablet card */}
                <div className="xl:hidden px-3 py-3">
                  <div className="flex items-start gap-3">
                    <label className="cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={selected.has(o._id)}
                        onChange={() => toggleOne(o._id)}
                        className="h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand"
                        aria-label={`Select order ${o.orderNumber}`}
                      />
                    </label>
                    <button onClick={() => setExpanded(isOpen ? null : o._id)} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {/* Same running number as the desktop table and the
                            PDF: where this order sits in the list on screen. */}
                        <span className="text-xs font-bold tabular-nums text-dash-mute2">{serial}.</span>
                        <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs font-extrabold text-indigo-700">
                          #{o.orderSeq ?? '—'}
                        </span>
                        <span className="text-sm font-semibold text-dash-ink3">{buyerOf(o).name}</span>
                        {buyerOf(o).isGuest && <GuestBadge />}
                        {isCod(o) && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">COD</span>}
                      </span>
                      <span className="mt-1 block text-[11px] tabular-nums text-dash-mute2" title={fmtDate(o.createdAt)}>
                        {fmtWhen(o.createdAt)}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-dash-mute2">
                        {buyerOf(o).phone || '—'}
                      </span>
                      <span className="block truncate text-xs text-dash-mute2">{buyerOf(o).college || '—'}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-dash-ink2">{bdt(o.total)}</span>
                        <BooksChip order={o} />
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${PAY_STYLES[o.payment?.status] || PAY_STYLES.pending}`}>
                          {o.payment?.status || 'pending'}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-dash-mute2">{titlesOf(o)}</span>
                    </button>
                    <FiChevronDown size={16} className={`mt-1 shrink-0 text-dash-mute2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <select
                    value={FULFILLMENT_OPTIONS.includes(o.status) ? o.status : ''}
                    disabled={updatingId === o._id}
                    onChange={(e) => e.target.value && updateStatus(o, e.target.value)}
                    className={`mt-2 w-full rounded-md border px-2 py-2 text-xs font-semibold capitalize outline-none ${STATUS_META[o.status]?.cls || 'border-dash-line text-dash-ink3'}`}
                  >
                    {!FULFILLMENT_OPTIONS.includes(o.status) && <option value="">{o.status}</option>}
                    {FULFILLMENT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{FULFILLMENT_LABEL[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-dash-line-soft p-4 sm:p-5 bg-dash-soft/40 space-y-5">
                    {/* Items — the quantity in a column of its own, so "how many"
                        is read off the page rather than worked out from prices. */}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Items</p>
                        <BooksChip order={o} />
                      </div>
                      <div className="bg-dash-card rounded-lg border border-dash-line overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,1fr)_44px_68px_76px] sm:grid-cols-[minmax(0,1fr)_64px_96px_104px] gap-2 bg-dash-soft px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">
                          <span>Book</span>
                          <span className="text-center">Qty</span>
                          <span className="text-right">Price</span>
                          <span className="text-right">Amount</span>
                        </div>
                        {(o.items || []).map((it, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[minmax(0,1fr)_44px_68px_76px] sm:grid-cols-[minmax(0,1fr)_64px_96px_104px] items-center gap-2 border-t border-dash-line-soft px-3 py-2.5 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-dash-ink3 truncate" title={it.title}>{it.title}</p>
                              <p className="text-xs text-dash-mute2 capitalize">{it.format}</p>
                            </div>
                            <span className="text-center text-base font-bold text-dash-ink2 tabular-nums">{Number(it.quantity) || 1}</span>
                            <span className="text-right text-dash-ink4 tabular-nums">{bdt(it.price)}</span>
                            <span className="text-right font-semibold text-dash-ink3 tabular-nums">{bdt(it.price * (Number(it.quantity) || 1))}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 mt-2 text-sm px-1">
                        <span className="text-dash-mute2">Subtotal: <span className="text-dash-ink4">{bdt(o.subtotal)}</span></span>
                        {o.discount > 0 && (
                          <span className="text-dash-mute2">Discount: <span className="text-emerald-600">−{bdt(o.discount)}</span></span>
                        )}
                        <span className="text-dash-mute2">Books: <span className="text-dash-ink4">{bdt(bookMoneyOf(o))}</span></span>
                        {o.deliveryCharge > 0 && (
                          <span className="text-dash-mute2">Delivery: <span className="text-dash-ink4">{bdt(o.deliveryCharge)}</span></span>
                        )}
                        <span className="font-semibold text-dash-ink3">Total: {bdt(o.total)}</span>
                      </div>
                    </div>

                    {/* Buyer / shipping / payment — the complete picture of one
                        order, so the admin never has to look anything up elsewhere
                        before confirming it or calling the buyer. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-dash-card rounded-lg border border-dash-line p-4">
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Buyer</p>
                        {buyerOf(o).isGuest && (
                          <p className="text-xs text-dash-mute2">Ordered without an account — every detail below is from the order itself.</p>
                        )}
                        <DetailRow icon={FiUser} label="Name" value={buyerOf(o).name} />
                        <DetailRow icon={FiMail} label="Email" value={buyerOf(o).email} />
                        <DetailRow icon={FiPhone} label="Phone" value={buyerOf(o).phone} mono />
                        {buyerOf(o).altPhone && (
                          <DetailRow icon={FiPhone} label="Second phone" value={buyerOf(o).altPhone} mono />
                        )}
                        {buyerOf(o).whatsapp && (
                          <DetailRow icon={FiSmartphone} label="WhatsApp" value={buyerOf(o).whatsapp} mono />
                        )}
                        {/* The college is snapshotted onto the order, with where it
                            is — that is what a college's own delivery rate matched. */}
                        <DetailRow icon={FiBookOpen} label="Medical college" value={buyerOf(o).college} />
                        {buyerOf(o).collegeArea && (
                          <DetailRow icon={FiMapPin} label="College area" value={buyerOf(o).collegeArea} />
                        )}
                        {o.deliveryRule === 'college' && (
                          <DetailRow icon={FiTruck} label="Delivery" value="College rate (address matched the college)" />
                        )}
                        <DetailRow icon={FiClock} label="Ordered" value={fmtDate(o.createdAt)} />
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Delivery address</p>
                        {o.shippingAddress ? (
                          <>
                            <DetailRow icon={FiUser} label="Recipient" value={o.shippingAddress.name} />
                            <DetailRow icon={FiPhone} label="Phone" value={o.shippingAddress.phone} mono />
                            <DetailRow icon={FiMapPin} label="Street / village" value={o.shippingAddress.address} />
                            <DetailRow icon={FiMapPin} label="Upazila / thana" value={o.shippingAddress.upazila || o.shippingAddress.city} />
                            <DetailRow icon={FiMapPin} label="District" value={o.shippingAddress.district} />
                            <DetailRow icon={FiMapPin} label="Division" value={o.shippingAddress.division} />
                            {/* One line a courier can be read verbatim. */}
                            <DetailRow
                              icon={FiTruck}
                              label="Full address"
                              value={[
                                o.shippingAddress.address,
                                o.shippingAddress.upazila || o.shippingAddress.city,
                                o.shippingAddress.district,
                                o.shippingAddress.division,
                              ].filter(Boolean).join(', ')}
                            />
                            {o.shippingAddress.note && <DetailRow icon={FiPackage} label="Delivery note" value={o.shippingAddress.note} />}
                          </>
                        ) : (
                          <p className="text-sm text-dash-mute2">Digital delivery — no shipping</p>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-dash-mute uppercase tracking-wider">Payment &amp; order</p>
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
                        {o.payment?.paidAt && <DetailRow icon={FiCheckCircle} label="Paid at" value={fmtDate(o.payment.paidAt)} />}
                        {o.payment?.method === 'manual' && (
                          <>
                            <DetailRow icon={FiSmartphone} label="Sender number" value={o.payment?.senderNumber} mono />
                            <DetailRow icon={FiClock} label="Sent at" value={o.payment?.sentAt ? fmtDate(o.payment.sentAt) : '—'} />
                            <DetailRow icon={FiSend} label="Submitted" value={o.payment?.submittedAt ? fmtDate(o.payment.submittedAt) : '—'} />
                            {o.payment?.note && <DetailRow icon={FiHash} label="Note" value={o.payment.note} />}
                          </>
                        )}
                        <DetailRow icon={FiPackage} label="Delivery type" value={o.deliveryType} />
                        {o.isPreOrder && <DetailRow icon={FiClock} label="Pre-order" value="Yes — sold before printing" />}
                        {/* Coupon: the code, what it saved the buyer, and what the
                            shop owes the code owner for this one sale. */}
                        {o.couponCode && (
                          <>
                            <DetailRow icon={FiTag} label="Coupon" value={o.couponCode} mono />
                            {o.couponDiscount > 0 && (
                              <DetailRow icon={FiGift} label="Coupon discount" value={bdt(o.couponDiscount)} />
                            )}
                            {o.couponPayout > 0 && (
                              <DetailRow icon={FiDollarSign} label="Owner payout" value={bdt(o.couponPayout)} />
                            )}
                          </>
                        )}
                        {o.confirmedAt && <DetailRow icon={FiCheckCircle} label="Confirmed" value={fmtDate(o.confirmedAt)} />}
                        {o.shippedAt && <DetailRow icon={FiTruck} label="Shipped" value={fmtDate(o.shippedAt)} />}
                        {o.deliveredAt && <DetailRow icon={FiPackage} label="Delivered" value={fmtDate(o.deliveredAt)} />}
                        {o.courierName && <DetailRow icon={FiTruck} label="Courier" value={o.courierName} />}
                        {o.trackingCode && <DetailRow icon={FiHash} label="Tracking" value={o.trackingCode} mono />}
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

                    {/* Owner correction pass. Buyers mistype their own address and
                        phone constantly, and a payment lands against the wrong
                        method often enough that "delete and re-order" was becoming
                        the workaround. Money is deliberately NOT editable — the
                        line prices and total are the record of what was agreed. */}
                    {canDelete && (
                      <div className="rounded-lg border border-dash-line bg-dash-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-dash-mute">
                              <FiEdit2 size={12} /> Edit order
                            </p>
                            <p className="mt-0.5 text-[11px] text-dash-mute2">
                              Fix a wrong address, phone, email or payment state.
                            </p>
                          </div>
                          {fullEditId === o._id ? (
                            <button
                              onClick={() => setFullEditId(null)}
                              className="rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-mute transition hover:text-dash-ink3"
                            >
                              Close
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startFullEdit(o)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover"
                              >
                                <FiEdit2 size={12} /> Edit everything
                              </button>
                              {/* The other end of "fix this order". Most
                                  mistakes are an edit; some are an order that
                                  should never have existed. Both belong where
                                  the admin is already looking at the order —
                                  but only this one is irreversible, so it is
                                  the quiet outlined button, not the filled
                                  one, and it asks before it acts. */}
                              <button
                                onClick={() => deleteOrders([o])}
                                disabled={bulkBusy || busyId === o._id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                              >
                                <FiTrash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {fullEditId === o._id && (
                          <div className="mt-4 space-y-4 border-t border-dash-line pt-4">
                            <div>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">Buyer account</p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <EditField label="Email" value={fullForm.email} onChange={(v) => setFullForm((p) => ({ ...p, email: v }))} type="email" />
                                <EditField label="Phone" value={fullForm.userPhone} onChange={(v) => setFullForm((p) => ({ ...p, userPhone: v }))} mono />
                                <EditField label="WhatsApp" value={fullForm.whatsappNumber} onChange={(v) => setFullForm((p) => ({ ...p, whatsappNumber: v }))} mono />
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">Delivery address</p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <EditField label="Recipient name" value={fullForm.name} onChange={(v) => setFullForm((p) => ({ ...p, name: v }))} />
                                <EditField label="Phone" value={fullForm.phone} onChange={(v) => setFullForm((p) => ({ ...p, phone: v }))} mono />
                                <EditField label="Second phone" value={fullForm.altPhone} onChange={(v) => setFullForm((p) => ({ ...p, altPhone: v }))} mono />
                                <EditField label="Street / village" value={fullForm.address} onChange={(v) => setFullForm((p) => ({ ...p, address: v }))} />
                                <EditField label="Upazila / thana" value={fullForm.upazila} onChange={(v) => setFullForm((p) => ({ ...p, upazila: v }))} />
                                <EditField label="District" value={fullForm.district} onChange={(v) => setFullForm((p) => ({ ...p, district: v }))} />
                                <EditField label="Division" value={fullForm.division} onChange={(v) => setFullForm((p) => ({ ...p, division: v }))} />
                                <EditField label="Delivery note" value={fullForm.note} onChange={(v) => setFullForm((p) => ({ ...p, note: v }))} />
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-dash-mute2">Payment</p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <label className="block">
                                  <span className="mb-1 block text-[11px] font-medium text-dash-mute">Status</span>
                                  <select
                                    value={fullForm.payStatus}
                                    onChange={(e) => setFullForm((p) => ({ ...p, payStatus: e.target.value }))}
                                    className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm outline-none focus:border-brand"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="failed">Failed</option>
                                  </select>
                                </label>
                                <label className="block">
                                  <span className="mb-1 block text-[11px] font-medium text-dash-mute">Method</span>
                                  <select
                                    value={fullForm.payMethod}
                                    onChange={(e) => setFullForm((p) => ({ ...p, payMethod: e.target.value }))}
                                    className="w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm outline-none focus:border-brand"
                                  >
                                    <option value="">— not set —</option>
                                    <option value="cod">Cash on delivery</option>
                                    <option value="sslcommerz">SSLCommerz</option>
                                    <option value="bkash">bKash</option>
                                    <option value="manual">Manual</option>
                                    <option value="free">Free</option>
                                  </select>
                                </label>
                                <EditField label="Transaction ID" value={fullForm.transactionId} onChange={(v) => setFullForm((p) => ({ ...p, transactionId: v }))} mono />
                              </div>
                            </div>

                            <EditField label="Admin note" value={fullForm.adminNote} onChange={(v) => setFullForm((p) => ({ ...p, adminNote: v }))} />

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => saveFullEdit(o)}
                                disabled={savingFull}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
                              >
                                {savingFull ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                                {savingFull ? 'Saving…' : 'Save changes'}
                              </button>
                              <button
                                onClick={() => setFullEditId(null)}
                                className="px-3 py-2.5 text-sm font-medium text-dash-mute transition hover:text-dash-ink3"
                              >
                                Cancel
                              </button>
                              <span className="ml-auto text-[11px] text-dash-mute2">
                                Prices and totals are not editable — cancel and re-place instead.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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

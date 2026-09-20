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
  FiCalendar, FiDownload, FiLayers, FiLink, FiArrowRight,
} from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { useBrand } from '@/components/shared/Brand';
import { getStoredUser } from '@/lib/permissions';
import { buildOrderListPdf, downloadBlob } from '@/lib/orderListPdf';
import { DeliveryToggle, useDeliveryMode } from '@/components/admin/stats/OrderStats';
import { addDays, bdDate, dayOf, dayWindow, formatBd, pastCutoff } from '@/lib/shopDay';
import {
  areaOf, collegeOf, copiesOf, countOptions, formatBdFull, matchesPlace, printRowOf, safeFileName,
} from '@/lib/orderList';

const CHANNEL_LABEL = { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad' };
const COLLEGE_TYPE_LABEL = { government: 'Government', private: 'Private', army: 'Army' };

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const bdt = (v) => (typeof v === 'number' ? '৳' + v.toLocaleString('en-US') : '—');

// "01707387130" → "01707 387 130". The admin reads these aloud down a phone
// line, and an unbroken 11-digit run is where digits get dropped or swapped.
// Anything that isn't a plain 11-digit local number is shown as stored.
const spacedPhone = (p) => {
  const s = String(p || '').replace(/\s+/g, '');
  return /^\d{11}$/.test(s) ? `${s.slice(0, 5)} ${s.slice(5, 8)} ${s.slice(8)}` : p;
};
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

// The methods that redirect the buyer to somebody else's payment page. An
// order sitting on one of these with nothing paid never came back from it.
const HOSTED_GATEWAYS = ['sslcommerz', 'bkash'];
const PAY_LABEL = { sslcommerz: 'SSLCommerz', bkash: 'bKash', manual: 'ম্যানুয়াল', cod: 'ক্যাশ অন ডেলিভারি' };
// Couriers hand out links in every shape, including a bare
// "steadfast.com.bd/t/ABC123". Without a scheme a browser reads that as a
// path on this site, so the admin's "open the tracking page" click lands on a
// 404 of our own making.
const trackingHref = (url) => {
  const s = String(url || '').trim();
  return s.toLowerCase().startsWith('http') ? s : 'https://' + s;
};

const startedOnline = (o) =>
  HOSTED_GATEWAYS.includes(String(o?.payment?.method || '').toLowerCase()) &&
  o?.payment?.status !== 'paid' &&
  o?.status !== 'cancelled';

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

/**
 * One fact about an order, on ONE line: icon, label, value.
 *
 * The label used to sit above the value, which doubled the height of every
 * field — a single order's details ran well past a screen, and the shorter
 * columns (payment, with three fields) left a hole beside the longer ones.
 * Side by side, the same facts take half the room and line up down the column.
 */
const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-baseline gap-2">
    <Icon size={11} className="shrink-0 translate-y-0.5 text-dash-faint" />
    <span className="w-[74px] shrink-0 text-[10px] uppercase leading-snug tracking-wider text-dash-mute2">{label}</span>
    <span className={`min-w-0 flex-1 break-words text-[13px] leading-snug text-dash-ink3 ${mono ? 'font-mono' : ''}`}>
      {value || '—'}
    </span>
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

  // Two bulk actions ask something before they fire. Moving a batch to the day
  // it actually goes out needs that day; handing a batch to a courier needs the
  // tracking link, because the buyer's text carries it and a text sent before
  // the link exists is the one message nobody can act on.
  const [datePanel, setDatePanel] = useState(false);
  const [dispatchDay, setDispatchDay] = useState('');
  const [shipPanel, setShipPanel] = useState(false);
  const [shipForm, setShipForm] = useState({ courierName: '', trackingUrl: '' });
  // The owner's full correction pass over one order — a separate panel from the
  // payment-details edit above, because it also touches the buyer's own record.
  // The courier line for ONE order, kept per-order so opening a second row
  // does not inherit the first one's half-typed link.
  const [courierId, setCourierId] = useState(null);
  const [courierForm, setCourierForm] = useState({ courierName: '', trackingUrl: '' });
  const [courierBusy, setCourierBusy] = useState(false);

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

  // The per-college PDF picker, and the college directory behind it. The
  // directory is what lets the list show a college that has NOT ordered, and
  // where each college's type and university come from.
  const [picker, setPicker] = useState(null); // { rows, fromLatest } | null
  const [pickerSort, setPickerSort] = useState('orders');
  const [pickerEmpty, setPickerEmpty] = useState(false);
  const [pickerPick, setPickerPick] = useState(() => new Set());
  const [directory, setDirectory] = useState([]);
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

  // The college directory, once. Public route, 112 short rows, and the orders
  // themselves only carry a college NAME — type and university live here.
  useEffect(() => {
    let alive = true;
    fetch(`${API}/medical-colleges`)
      .then((r) => r.json())
      .then((j) => {
        if (alive && Array.isArray(j?.data)) setDirectory(j.data);
      })
      // A missing directory is not fatal: the picker then lists exactly the
      // colleges that ordered, which is what it did before this existed.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  // Counted from `filtered` — everything the college, area and search boxes
  // have narrowed the list to — rather than from the whole load. The cards sit
  // directly over that list and have to describe it; a "42 orders" card above
  // eight Cumilla rows is read as a bug, and was.
  //
  // The 500-row load limit still applies underneath: with more matches than
  // that, these count the latest 500, which is what the amber line under the
  // dates says.
  const stats = useMemo(() => {
    const paid = filtered.filter((o) => o.payment?.status === 'paid');
    const live = filtered.filter((o) => o.status !== 'cancelled');
    const codUnpaid = live.filter((o) => isCod(o) && o.payment?.status !== 'paid');
    return {
      total: filtered.length,
      revenue: paid.reduce((s, o) => s + (o.total || 0), 0),
      revenueBooks: paid.reduce((s, o) => s + bookMoneyOf(o), 0),
      // Books in every order that still stands — a cancelled order sold nothing.
      books: live.reduce((s, o) => s + copiesOf(o), 0),
      // Orders waiting on a decision — the actual work queue.
      pending: filtered.filter((o) => o.status === 'pending').length,
      // Cash still out with couriers: COD orders not yet collected. With the
      // delivery charge it is what the rider collects; without it, what the
      // books are owed — the same switch as the revenue card.
      codOutstanding: codUnpaid.reduce((s, o) => s + (o.total || 0), 0),
      codOutstandingBooks: codUnpaid.reduce((s, o) => s + bookMoneyOf(o), 0),
      delivered: filtered.filter((o) => o.status === 'delivered').length,
    };
  }, [filtered]);

  const updateStatus = async (order, status, extra) => {
    setUpdatingId(order._id);
    try {
      const res = await fetch(`${API}/orders/${order._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        // The courier details ride along with the status, because the server
        // writes them before it sends the shipping text that links to them.
        body: JSON.stringify({ status, ...(extra || {}) }),
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

  /**
   * Save this order's courier line - and ship it, if it has not shipped yet.
   *
   * Two routes on purpose. Before shipping, the details go WITH the status
   * change, so the server has the link in hand when it sends the buyer's text.
   * Afterwards the text is long gone and this is a correction, which belongs
   * on the owner-only edit route rather than on a second status write that
   * would restamp the shipping time.
   */
  const saveCourier = async (o) => {
    const body = {
      courierName: courierForm.courierName.trim(),
      trackingUrl: courierForm.trackingUrl.trim(),
    };
    const alreadyGone = o.status === 'shipped' || o.status === 'delivered';
    if (!alreadyGone) {
      setCourierId(null);
      await updateStatus(o, 'shipped', body);
      return;
    }
    setCourierBusy(true);
    try {
      const res = await fetch(`${API}/orders/${o._id}/admin-edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not save');
      showToast('success', 'Tracking link saved');
      setCourierId(null);
      setOrders((prev) => prev.map((x) => (x._id === o._id ? { ...x, ...(json.data || body) } : x)));
    } catch (e) {
      showToast('error', e.message || 'Could not save the tracking link');
    } finally {
      setCourierBusy(false);
    }
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
  const bulkStatus = async (status, extra) => {
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
        body: JSON.stringify({ ids, status, ...(extra || {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not update');
      showToast('success', json.message || 'Orders updated');
      setSelected(new Set());
      setShipPanel(false);
      setShipForm({ courierName: '', trackingUrl: '' });
      fetchOrders();
    } catch (e) {
      showToast('error', e.message || 'Could not update the selected orders');
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * Move the ticked orders to the day they actually go out — or back.
   *
   * The shop holds a college's orders and sends them together: everything for
   * Cumilla from the 19th, 20th and 21st leaves on the 21st. Those orders then
   * have to be on the 21st's packing list and off the 19th's and 20th's, which
   * is what this does and all it does — no status moves, no text goes out.
   *
   * A day is sent as the instant it opens (the previous noon), because that is
   * how every other date on this screen is expressed; the server stores it and
   * the day filter compares it exactly as it compares the order's own date.
   */
  const applyDispatchDate = async (day) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch(`${API}/orders/bulk-dispatch-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ids,
          dispatchDate: day ? dayWindow(day).from.toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Could not set the date');
      showToast('success', json.message || 'Delivery date set');
      setSelected(new Set());
      setDatePanel(false);
      setDispatchDay('');
      // Refetch rather than patch in place: with a date filter on, the orders
      // just moved are no longer part of what the screen is showing, and
      // leaving them on it is how an order gets packed twice.
      fetchOrders();
    } catch (e) {
      showToast('error', e.message || 'Could not set the delivery date');
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
  /**
   * Step one of the per-college PDFs: work out what there is, and show it.
   *
   * This used to build every PDF and fire every download the moment it was
   * pressed - twenty-three files landing in the downloads folder before the
   * admin had decided which colleges the day's run was even for. The list
   * comes first now: how many orders each college has, sorted the way the
   * packing is being thought about, and only the ticked ones are built.
   *
   * Colleges with NO orders are in the list too (behind a toggle), because
   * "who has not ordered yet" is a question this screen can answer and the
   * shop was answering by hand. They cannot be ticked - an empty PDF is not
   * a thing anyone wants - they are there to be read.
   */
  const openCollegePicker = async () => {
    if (exporting) return;
    if (!dateRange) {
      const ok = await confirm({
        title: 'No date picked',
        message:
          'This lists every medical college across ALL dates. For one day’s orders, pick the date first.',
        confirmText: 'Show them anyway',
      });
      if (!ok) return;
    }
    setExporting(true);
    try {
      const { matching, list, fromLatest } = await collectForPdf();
      const byCollege = new Map();
      for (const o of list) {
        const name = collegeOf(o);
        byCollege.set(name, [...(byCollege.get(name) || []), o]);
      }
      const meta = new Map(directory.map((c) => [c.name, c]));
      const rows = [...byCollege].map(([name, group]) => ({
        name,
        group,
        count: group.length,
        books: group.reduce((n, o) => n + copiesOf(o), 0),
        // Cancelled orders are left out of the PDF itself, so the count on
        // screen has to be the count in the file, and this is what the file
        // says it left behind.
        leftOut:
          statusFilter === 'cancelled'
            ? 0
            : matching.filter((o) => o.status === 'cancelled' && collegeOf(o) === name).length,
        type: meta.get(name)?.type || '',
        university: meta.get(name)?.university || '',
      }));
      for (const c of directory) {
        if (!byCollege.has(c.name)) {
          rows.push({
            name: c.name,
            group: [],
            count: 0,
            books: 0,
            leftOut: 0,
            type: c.type || '',
            university: c.university || '',
          });
        }
      }
      setPicker({ rows, fromLatest });
      // Everything with orders starts ticked: that is the old one-press
      // behaviour, one confirmation later.
      setPickerPick(new Set(rows.filter((r) => r.count > 0).map((r) => r.name)));
    } catch (e) {
      showToast('error', e.message || 'Could not read the orders');
    } finally {
      setExporting(false);
    }
  };


  // How the picker list is ordered. Four questions the shop actually asks of
  // it: what is it called, who ordered most, is it government or private, and
  // which university is it under. A college with no university filled in sorts
  // last rather than first, so the unknowns do not head the list.
  const pickerRows = useMemo(() => {
    if (!picker) return [];
    const rows = pickerEmpty ? picker.rows : picker.rows.filter((r) => r.count > 0);
    const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en');
    const TYPE_ORDER = { government: 0, army: 1, private: 2 };
    const sorted = [...rows];
    if (pickerSort === 'orders') sorted.sort((a, b) => b.count - a.count || byName(a, b));
    else if (pickerSort === 'type') {
      sorted.sort(
        (a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) || byName(a, b)
      );
    } else if (pickerSort === 'university') {
      sorted.sort((a, b) => {
        const au = a.university || '';
        const bu = b.university || '';
        if (!au !== !bu) return au ? -1 : 1;
        return au.localeCompare(bu, 'en') || byName(a, b);
      });
    } else sorted.sort(byName);
    return sorted;
  }, [picker, pickerSort, pickerEmpty]);

  const pickedCount = pickerRows.filter((r) => r.count > 0 && pickerPick.has(r.name)).length;
  /** Step two: build a PDF for each ticked college and hand them over. */
  const downloadCollegePdfs = async () => {
    if (!picker || exporting) return;
    const chosen = picker.rows.filter((r) => r.count > 0 && pickerPick.has(r.name));
    if (chosen.length === 0) {
      showToast('error', 'Tick at least one college');
      return;
    }
    setExporting(true);
    try {
      const files = [];
      for (const row of chosen) {
        const blob = await buildOrderListPdf({
          ...pdfText({
            list: row.group,
            leftOut: row.leftOut,
            fromLatest: picker.fromLatest,
            heading: `Medical college: ${row.name || 'not given'}`,
          }),
          rows: row.group.map(printRowOf),
        });
        files.push({
          college: row.name,
          count: row.group.length,
          name: pdfFileName(row.name || 'No college'),
          blob,
        });
      }
      // A short gap between files: some browsers drop downloads fired together.
      files.forEach((file, i) => setTimeout(() => downloadBlob(file.blob, file.name), i * 400));
      setBatch({ files });
      setPicker(null);
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

      {/* The filters come first, above the counts, because they are what the
          admin sets and the counts are what comes back: pick a day and a
          college, then read the six cards for that day and that college.

          Dates. A day here runs noon → noon Bangladesh time, named by the date
          it ends on. An order the admin moved to another delivery date answers
          on THAT day instead — see the selection toolbar. */}
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
            onClick={openCollegePicker}
            disabled={loading || exporting || (allLoaded && pdfCount === 0)}
            title="List the medical colleges, then download a PDF for the ones you pick"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-brand/50 bg-dash-card px-4 py-2.5 font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-50 sm:flex-1 xl:flex-none"
          >
            {exporting ? <FiLoader className="animate-spin" /> : <FiLayers />}
            PDF per college
            {allLoaded && <span className="rounded-md bg-brand-soft px-1.5 text-xs tabular-nums">{pdfColleges}</span>}
          </button>
        </div>
      </div>

      {/* Stats — for whatever the filters above have narrowed the list to,
          not for the whole load. Picking Cumilla Medical College makes these
          six cards Cumilla's numbers, which is the only reading that matches
          the list they sit over. */}
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
          className={`rounded-xl border px-4 py-3 transition-colors ${
            selected.size > 0 ? 'border-brand/40 bg-brand-soft/40' : 'border-dash-line bg-dash-card'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    onClick={() => {
                      // Shipping is the one status that carries something with
                      // it: the courier's tracking link, which the buyer's text
                      // is built around. Ask first, then fire.
                      if (st === 'shipped') {
                        setDatePanel(false);
                        setShipPanel((open) => !open);
                        return;
                      }
                      bulkStatus(st);
                    }}
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
              {/* The day the batch goes out, which is not always the day it
                  was ordered. Set apart from the status buttons by intent: it
                  moves an order between packing lists without moving it along
                  the ladder. */}
              <button
                onClick={() => {
                  setShipPanel(false);
                  setDatePanel((open) => !open);
                }}
                disabled={bulkBusy}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  datePanel
                    ? 'border-brand bg-brand text-white'
                    : 'border-dash-line bg-dash-card text-dash-ink3 hover:border-brand/40 hover:text-brand'
                }`}
              >
                <FiCalendar size={13} /> Delivery date
              </button>
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

          {/* Move the ticked orders to the day they go out. The date box starts
              empty rather than on today: this is used to send orders FORWARD to
              a batch day, and a default that is right one day in three is worse
              than one that is never right. */}
          {selected.size > 0 && datePanel && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dash-line bg-dash-card px-3 py-3 sm:flex-row sm:items-center">
              <span className="text-xs font-semibold text-dash-ink3">
                Send {selected.size} order{selected.size === 1 ? '' : 's'} out on
              </span>
              <input
                type="date"
                value={dispatchDay}
                onChange={(e) => setDispatchDay(e.target.value)}
                aria-label="Delivery date"
                className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
              />
              <button
                onClick={() => applyDispatchDate(dispatchDay)}
                disabled={!dispatchDay || bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {bulkBusy ? <FiLoader className="animate-spin" size={13} /> : <FiCheck size={13} />}
                Set date
              </button>
              <button
                onClick={() => applyDispatchDate(null)}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-ink4 transition-colors hover:text-dash-ink3 disabled:opacity-50"
              >
                <FiX size={13} /> Back to order date
              </button>
              <span className="text-xs text-dash-mute2 sm:ml-auto">
                They leave their own day's list and join that day's. Nothing else changes.
              </span>
            </div>
          )}

          {/* Handing a batch to the courier. The link is optional - a shop that
              has not been given one yet still has to be able to mark a sack of
              parcels shipped - and the buyer's text says "the courier will
              call" instead when it is missing. */}
          {selected.size > 0 && shipPanel && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dash-line bg-dash-card px-3 py-3">
              <span className="text-xs font-semibold text-dash-ink3">
                Mark {selected.size} order{selected.size === 1 ? '' : 's'} shipped
              </span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={shipForm.courierName}
                  onChange={(e) => setShipForm((f) => ({ ...f, courierName: e.target.value }))}
                  placeholder="Courier (Steadfast, Sundarban...)"
                  className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand sm:w-56"
                />
                <input
                  value={shipForm.trackingUrl}
                  onChange={(e) => setShipForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                  placeholder="Tracking link the courier gave"
                  className="flex-1 rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
                />
                <button
                  onClick={() =>
                    bulkStatus('shipped', {
                      courierName: shipForm.courierName.trim(),
                      trackingUrl: shipForm.trackingUrl.trim(),
                    })
                  }
                  disabled={bulkBusy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  {bulkBusy ? <FiLoader className="animate-spin" size={13} /> : <FiTruck size={13} />}
                  Shipped
                </button>
              </div>
              <span className="text-xs text-dash-mute2">
                {shipForm.trackingUrl.trim()
                  ? 'Each buyer gets one SMS carrying this link.'
                  : 'No link: the SMS asks them to keep their phone on for the courier call.'}
              </span>
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
                    {/* Moved to another day's batch. Shown on the row because
                        an order sitting in a list it was not ordered on is
                        otherwise indistinguishable from a mistake. */}
                    {o.dispatchDate && (
                      <span
                        className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-brand-ink"
                        title={`Goes out on ${formatBdFull(new Date(dayOf(new Date(o.dispatchDate)) + 'T06:00:00Z'))}`}
                      >
                        <FiArrowRight size={10} aria-hidden /> {dayOf(new Date(o.dispatchDate))}
                      </span>
                    )}
                  </button>

                  <button onClick={() => setExpanded(isOpen ? null : o._id)} className="min-w-0 text-left">
                    <span className="flex items-center gap-1.5">
                      <span className="block truncate text-sm font-medium text-dash-ink3">{buyerOf(o).name}</span>
                      {buyerOf(o).isGuest && <GuestBadge />}
                    </span>
                    {/* The number the admin actually dials — so it is the
                        largest thing in the cell, and grouped for reading. */}
                    <span className="mt-0.5 block truncate font-mono text-base font-bold tracking-wide text-dash-ink2">
                      {spacedPhone(buyerOf(o).phone) || '—'}
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
                        {o.dispatchDate && (
                          <span className="ml-1.5 font-semibold text-brand-ink">
                            &rarr; goes out {dayOf(new Date(o.dispatchDate))}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block font-mono text-base font-bold tracking-wide text-dash-ink2">
                        {spacedPhone(buyerOf(o).phone) || '—'}
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
                  <div className="border-t border-dash-line-soft bg-dash-soft/40 p-3 sm:p-4 space-y-3">
                    {/* Buyer / shipping / payment — the complete picture of one
                        order, so the admin never has to look anything up elsewhere
                        before confirming it or calling the buyer. */}
                    {/* Buyer / shipping / payment, three columns of one-line facts. The
                        columns are uneven by nature — an address has more parts than a
                        payment — so they share one card rather than three boxes whose
                        empty halves show. */}
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-dash-line bg-dash-card p-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-dash-mute">Buyer</p>
                        {buyerOf(o).isGuest && (
                          <p className="text-[11px] leading-snug text-dash-mute2">Ordered without an account — every detail below is from the order itself.</p>
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

                      <div className="space-y-1">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-dash-mute">Delivery address</p>
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

                      <div className="space-y-1">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-dash-mute">Payment &amp; order</p>
                        {/* Off the list row now — it is only needed when looking one order up. */}
                        <DetailRow icon={FiHash} label="Order no." value={o.orderNumber} mono />
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
                        {o.trackingUrl && (
                          <DetailRow
                            icon={FiLink}
                            label="Tracking link"
                            value={
                              <a
                                href={trackingHref(o.trackingUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-brand-ink underline decoration-dotted underline-offset-2"
                              >
                                {o.trackingUrl}
                              </a>
                            }
                          />
                        )}
                        {o.dispatchDate && (
                          <DetailRow
                            icon={FiCalendar}
                            label="Goes out on"
                            value={dayOf(new Date(o.dispatchDate))}
                          />
                        )}

                        {/* Books and money. This was a full-width strip above the
                            three columns; the payment column is the short one, so
                            it sits in the space under it and the whole panel gets
                            one row shorter. */}
                        <div className="mt-3 overflow-hidden rounded-md border border-dash-line-soft">
                          {(o.items || []).map((it, i) => {
                            const qty = Number(it.quantity) || 1;
                            return (
                              <div key={i} className="border-b border-dash-line-soft px-2.5 py-1.5 text-sm last:border-b-0">
                                <span className="block truncate" title={it.title}>
                                  <span className="font-medium text-dash-ink3">{it.title}</span>
                                  <span className="ml-1.5 text-[11px] capitalize text-dash-mute2">{it.format}</span>
                                </span>
                                <span className="flex justify-between tabular-nums text-xs text-dash-mute2">
                                  <span><span className="font-bold text-dash-ink2">×{qty}</span> · {bdt(it.price)}</span>
                                  <span className="font-semibold text-dash-ink3">{bdt(it.price * qty)}</span>
                                </span>
                              </div>
                            );
                          })}
                          <div className="space-y-0.5 border-t border-dash-line bg-dash-soft/60 px-2.5 py-1.5 text-xs tabular-nums">
                            <p className="flex justify-between text-dash-mute2">Subtotal <span className="text-dash-ink4">{bdt(o.subtotal)}</span></p>
                            {o.discount > 0 && (
                              <p className="flex justify-between text-dash-mute2">Discount <span className="text-emerald-600">−{bdt(o.discount)}</span></p>
                            )}
                            <p className="flex justify-between text-dash-mute2">Books <span className="text-dash-ink4">{bdt(bookMoneyOf(o))}</span></p>
                            {o.deliveryCharge > 0 && (
                              <p className="flex justify-between text-dash-mute2">Delivery <span className="text-dash-ink4">{bdt(o.deliveryCharge)}</span></p>
                            )}
                            <p className="flex justify-between border-t border-dash-line-soft pt-1 text-sm font-semibold text-dash-ink3">Total <span>{bdt(o.total)}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment verification.
                        Cash-on-delivery has no transaction to verify — the money
                        arrives with the courier — so it gets its own action:
                        CONFIRM the order (which reserves stock and opens the
                        book's QR content), and it becomes paid when marked
                        delivered. Approving it here would book revenue for a
                        parcel still in a van. */}
                    <div className="rounded-lg border border-dash-line bg-dash-card p-3">
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

                      {/* An online payment that was started and never finished.
                          It looks exactly like an order waiting for a human to
                          verify a bKash transaction - same panel, same Approve
                          button - except no money moved and the transaction ID
                          is the reference the gateway was HANDED, not proof of
                          anything. Approving it would book a sale that does not
                          exist, so the panel says so. The server closes these
                          by itself 90 minutes after they were placed. */}
                      {startedOnline(o) && (
                        <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs leading-relaxed text-dash-mute">
                          অনলাইনে <b>{PAY_LABEL[o.payment?.method] || o.payment?.method}</b> দিয়ে পেমেন্ট শুরু
                          হয়েছিল, কিন্তু শেষ হয়নি — <b>টাকা আসেনি</b>। উপরের ট্রানজেকশন আইডিটি গেটওয়েকে দেওয়া
                          রেফারেন্স (অর্ডার নম্বরই), পেমেন্টের প্রমাণ নয়। অর্ডারের ৯০ মিনিট পর এটি নিজে থেকেই
                          বাতিল হয়ে যাবে। <b>Approve</b>{' '}চাপলে টাকা না আসা অর্ডার &ldquo;পেইড&rdquo; হয়ে যাবে —
                          ক্রেতা সত্যিই টাকা পাঠিয়ে থাকলে তবেই চাপুন।
                        </p>
                      )}

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
                            onClick={() => {
                              // Same reason as the bulk button: shipping is the
                              // status that carries the buyer's tracking link.
                              if (s === 'shipped') {
                                setCourierForm({
                                  courierName: o.courierName || '',
                                  trackingUrl: o.trackingUrl || '',
                                });
                                setCourierId((id) => (id === o._id ? null : o._id));
                                return;
                              }
                              updateStatus(o, s);
                            }}
                            disabled={updatingId === o._id || (o.status === s && s !== 'shipped')}
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

                    {/* The courier line for this one order.
                        Opened from the Shipped button rather than sitting open,
                        because on a screen where most orders are still waiting
                        to be confirmed, an always-visible courier form is noise.
                        The link is what the buyer's SMS is built around, so it
                        is written BEFORE the status moves - the server saves it
                        first and then sends the text. */}
                    {courierId === o._id && (
                      <div className="flex flex-col gap-2 rounded-lg border border-dash-line bg-dash-card p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            value={courierForm.courierName}
                            onChange={(e) => setCourierForm((f) => ({ ...f, courierName: e.target.value }))}
                            placeholder="Courier"
                            className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand sm:w-44"
                          />
                          <input
                            value={courierForm.trackingUrl}
                            onChange={(e) => setCourierForm((f) => ({ ...f, trackingUrl: e.target.value }))}
                            placeholder="Tracking link the courier gave"
                            className="flex-1 rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
                          />
                          <button
                            onClick={() => saveCourier(o)}
                            disabled={courierBusy || updatingId === o._id}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                          >
                            {courierBusy ? <FiLoader className="animate-spin" size={13} /> : <FiTruck size={13} />}
                            {o.status === 'shipped' || o.status === 'delivered' ? 'Save link' : 'Mark shipped'}
                          </button>
                          <button
                            onClick={() => setCourierId(null)}
                            className="px-2 py-1.5 text-xs font-medium text-dash-mute transition-colors hover:text-dash-ink3"
                          >
                            Cancel
                          </button>
                        </div>
                        <span className="text-xs text-dash-mute2">
                          {o.status === 'shipped' || o.status === 'delivered'
                            ? 'Already shipped: this corrects the stored link. No new SMS goes out.'
                            : courierForm.trackingUrl.trim()
                              ? 'The buyer gets one SMS with this link.'
                              : 'No link: the SMS asks them to keep their phone on for the courier call.'}
                        </span>
                      </div>
                    )}

                    {/* Owner correction pass. Buyers mistype their own address and
                        phone constantly, and a payment lands against the wrong
                        method often enough that "delete and re-order" was becoming
                        the workaround. Money is deliberately NOT editable — the
                        line prices and total are the record of what was agreed. */}
                    {canDelete && (
                      <div className="rounded-lg border border-dash-line bg-dash-card p-3">
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


      {/* The per-college list. A dialog rather than a panel on the page: it is
          a decision taken once, over a list that can run to a hundred rows,
          and everything behind it is the list it was opened from. */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-dash-line bg-dash-card shadow-xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-dash-line px-4 py-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-dash-ink2">
                  <FiLayers className="text-brand" /> PDF per medical college
                </h2>
                <p className="mt-0.5 text-xs text-dash-mute2">
                  {pickerRows.filter((r) => r.count > 0).length} college(s) ordered
                  {picker.rows.length > pickerRows.length
                    ? ` · ${picker.rows.length - pickerRows.length} hidden with no orders`
                    : ''}
                </p>
              </div>
              <button
                onClick={() => setPicker(null)}
                className="rounded-lg p-1.5 text-dash-mute transition-colors hover:bg-dash-soft hover:text-dash-ink3"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-dash-line bg-dash-soft/50 px-4 py-2.5">
              <span className="text-xs font-semibold text-dash-mute">Sort by</span>
              {[
                { key: 'orders', label: 'Most orders' },
                { key: 'name', label: 'Name A–Z' },
                { key: 'type', label: 'Government / private' },
                { key: 'university', label: 'University' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setPickerSort(s.key)}
                  aria-pressed={pickerSort === s.key}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    pickerSort === s.key
                      ? 'bg-brand text-white'
                      : 'text-dash-mute hover:bg-dash-soft hover:text-dash-ink3'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <label className="ml-auto flex cursor-pointer select-none items-center gap-2 text-xs text-dash-ink4">
                <input
                  type="checkbox"
                  checked={pickerEmpty}
                  onChange={(e) => setPickerEmpty(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-dash-line-strong text-brand focus:ring-brand"
                />
                Show colleges with no orders
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {pickerRows.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-dash-mute2">No colleges to show.</p>
              ) : (
                pickerRows.map((r) => {
                  const none = r.count === 0;
                  return (
                    <label
                      key={r.name || '(none)'}
                      className={`flex items-center gap-3 border-b border-dash-line-soft px-4 py-2.5 last:border-b-0 ${
                        none ? 'opacity-55' : 'cursor-pointer hover:bg-dash-soft/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={none}
                        checked={!none && pickerPick.has(r.name)}
                        onChange={() =>
                          setPickerPick((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.name)) next.delete(r.name);
                            else next.add(r.name);
                            return next;
                          })
                        }
                        className="h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand disabled:opacity-40"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-dash-ink3">
                          {r.name || 'No college given'}
                        </span>
                        <span className="block truncate text-[11px] text-dash-mute2">
                          {[
                            r.type && COLLEGE_TYPE_LABEL[r.type],
                            r.university,
                            r.leftOut > 0 && `${r.leftOut} cancelled left out`,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block text-sm font-bold text-dash-ink2">
                          {none ? '—' : r.count}
                        </span>
                        <span className="block text-[11px] text-dash-mute2">
                          {none ? 'no orders' : `${r.books} book${r.books === 1 ? '' : 's'}`}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-dash-line px-4 py-3">
              <button
                onClick={() =>
                  setPickerPick(new Set(pickerRows.filter((r) => r.count > 0).map((r) => r.name)))
                }
                className="rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-ink4 transition-colors hover:text-dash-ink3"
              >
                Select all
              </button>
              <button
                onClick={() => setPickerPick(new Set())}
                className="rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-ink4 transition-colors hover:text-dash-ink3"
              >
                Clear
              </button>
              <button
                onClick={downloadCollegePdfs}
                disabled={exporting || pickedCount === 0}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {exporting ? <FiLoader className="animate-spin" /> : <FiDownload />}
                Download {pickedCount} PDF{pickedCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toastNode}
      {confirmNode}
    </div>
  );
}

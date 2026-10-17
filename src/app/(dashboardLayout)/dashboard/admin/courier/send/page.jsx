'use client';

/**
 * Send to courier — confirmed orders not yet handed to Steadfast.
 *
 * Filter down to a batch (a day, a college, a district), tick, send. Each
 * order that goes through gets its consignment and tracking link and moves to
 * "Shipped" (the buyer gets the shipped SMS with the link). Any that the
 * courier or our own checks refuse are listed with the reason, and stay here.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiLoader, FiRefreshCw, FiSend, FiXCircle } from 'react-icons/fi';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { CourierFilters, CourierHeader, EMPTY_FILTERS, filterQuery, isSuperAdmin } from '@/components/admin/courier/CourierShell';
import { listReady, sendToCourier, spacedPhone, tk } from '@/components/admin/courier/courierApi';

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

export default function CourierSendPage() {
  const { confirm, confirmNode } = useConfirm();
  // Opens on today's orders — the batch going out now; any other day is a click away.
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, preset: 'today' }));
  // Each parcel's COD is shown to whoever sends it; the COD of the ticked
  // parcels ADDED UP is the Super Admin's alone (18 Oct 2026: no sums).
  const [showSums] = useState(isSuperAdmin);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await listReady(filterQuery(filters)));
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const rows = useMemo(() => data.rows || [], [data.rows]);
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const picked = useMemo(() => rows.filter((r) => selected.has(r._id)), [rows, selected]);
  const pickedCod = picked.reduce((a, r) => a + (r.codAmount || 0), 0);

  const send = async () => {
    if (!picked.length) return;
    const ok = await confirm({
      title: `${picked.length}টি অর্ডার Steadfast-এ পাঠাবেন?`,
      message: `${showSums ? `মোট COD ${tk(pickedCod)}। ` : ''}পাঠানোর পর অর্ডারগুলো "Shipped" হবে আর ক্রেতা ট্র্যাকিং লিংকসহ SMS পাবেন।`,
      confirmText: 'পাঠান',
      danger: false,
    });
    if (!ok) return;
    setSending(true);
    setResults(null);
    try {
      const r = await sendToCourier(picked.map((p) => p._id));
      setResults(r);
      await load();
    } catch (e) {
      setResults([{ ok: false, orderNumber: '—', error: e.message }]);
    } finally {
      setSending(false);
    }
  };

  const okN = results?.filter((r) => r.ok).length || 0;
  const badN = results ? results.length - okN : 0;

  return (
    <div className="space-y-4">
      <CourierHeader subtitle="Confirmed orders that have not gone to the courier yet." />
      {confirmNode}

      <CourierFilters
        value={filters}
        onChange={setFilters}
        dateLabel="Order day"
        extra={
          <select
            value={filters.extra?.payment || ''}
            onChange={(e) => setFilters((f) => ({ ...f, extra: { ...f.extra, payment: e.target.value } }))}
            className="rounded-lg border border-dash-line bg-dash-card px-3 py-1.5 text-xs text-dash-ink3"
          >
            <option value="">COD + prepaid</option>
            <option value="cod">Cash on delivery only</option>
            <option value="prepaid">Prepaid only</option>
          </select>
        }
      />

      {results && (
        <div className="rounded-xl border border-dash-line bg-dash-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-dash-ink2">
            <span className="text-emerald-600">{okN} পাঠানো হয়েছে</span>
            {badN > 0 && <span className="ml-3 text-red-600">{badN} যায়নি</span>}
          </p>
          {badN > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {results.filter((r) => !r.ok).map((r) => (
                <li key={r.orderId || r.orderNumber} className="flex items-center gap-2 text-red-600">
                  <FiXCircle className="shrink-0" /> <b>{r.orderNumber}</b> — {r.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dash-line px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-dash-ink3">
            <input
              type="checkbox"
              checked={allOn}
              onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r._id)))}
              className="h-4 w-4 rounded border-dash-line-strong text-brand focus:ring-brand"
            />
            {selected.size ? `${selected.size} selected${showSums ? ` · COD ${tk(pickedCod)}` : ''}` : `Select all (${rows.length}${data.total > rows.length ? ` of ${data.total}` : ''})`}
          </label>
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft">
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Reload
            </button>
            <button
              onClick={send}
              disabled={!selected.size || sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-40"
            >
              {sending ? <FiLoader className="animate-spin" /> : <FiSend />}
              Send {selected.size || ''} to Steadfast
            </button>
          </div>
        </div>

        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : loading ? (
          <div className="flex justify-center p-10"><FiLoader className="animate-spin text-brand" size={22} /></div>
        ) : rows.length === 0 ? (
          <p className="flex items-center justify-center gap-2 p-10 text-sm text-dash-mute">
            <FiCheckCircle className="text-emerald-500" /> পাঠানোর মতো কোনো অর্ডার নেই।
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-[11px] uppercase tracking-wide text-dash-mute2">
                  <th className="w-10 px-4 py-2" />
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">College / area</th>
                  <th className="px-2 py-2">Books</th>
                  <th className="px-2 py-2 text-right">COD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} onClick={() => toggle(r._id)} className={`cursor-pointer border-b border-dash-line/60 ${selected.has(r._id) ? 'bg-brand/5' : 'hover:bg-dash-soft/50'}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" readOnly checked={selected.has(r._id)} className="h-4 w-4 rounded border-dash-line-strong text-brand" />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="font-mono text-xs font-semibold text-dash-ink2"><span className="mr-1.5 inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-sans text-xs font-extrabold text-indigo-700">#{r.orderSeq ?? '—'}</span>{r.orderNumber}</div>
                      <div className="text-[11px] text-dash-mute2">{fmt(r.dispatchDate || r.createdAt)} · {r.status === 'processing' ? 'Confirmed' : r.status}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="font-medium text-dash-ink2">{r.shippingAddress?.name}</div>
                      <div className="font-mono text-xs text-dash-ink3">{spacedPhone(r.shippingAddress?.phone)}</div>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-dash-ink3">
                      <div>{r.college?.name || '—'}</div>
                      <div className="text-dash-mute2">{[r.shippingAddress?.upazila || r.shippingAddress?.city, r.shippingAddress?.district].filter(Boolean).join(', ')}</div>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-dash-ink3">{(r.items || []).map((i) => `${i.title} ×${i.quantity}`).join(', ')}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-dash-ink2">
                      {r.codAmount ? tk(r.codAmount) : <span className="text-xs font-medium text-emerald-600">Prepaid</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

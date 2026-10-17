'use client';

/**
 * Parcels — every order handed to Steadfast, with where it is now and what it
 * is worth. Tabs by status, the shared filters, payout and payment-type
 * filters, and a button that asks Steadfast for fresh statuses (the server
 * also does this on its own every 30 minutes, and the webhook does it at once).
 */

import { useCallback, useEffect, useState } from 'react';
import { FiExternalLink, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { CourierFilters, CourierHeader, EMPTY_FILTERS, filterQuery, isSuperAdmin } from '@/components/admin/courier/CourierShell';
import { GROUP_STYLE, listConsignments, spacedPhone, STATUS_LABEL, syncCourier, tk } from '@/components/admin/courier/courierApi';

const GROUPS = [
  { key: 'all', label: 'All' },
  { key: 'transit', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'partial', label: 'Partly delivered' },
  { key: 'returned', label: 'Returned' },
];
const PAGE = 100;

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

export default function CourierParcelsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  // Only the Super Admin is shown money (the server blanks it for everyone else).
  const [showMoney] = useState(isSuperAdmin);
  const [group, setGroup] = useState('all');
  const [data, setData] = useState({ rows: [], total: 0, tabs: {} });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState('');

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError('');
      try {
        const d = await listConsignments({ ...filterQuery(filters), group, page: p, limit: PAGE });
        setData((prev) => (p === 1 ? d : { ...d, rows: [...prev.rows, ...d.rows] }));
        setPage(p);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [filters, group]
  );
  // Deferred a tick: the first fetch starts after the render that set it up.
  useEffect(() => {
    const t = setTimeout(() => load(1), 0);
    return () => clearTimeout(t);
  }, [load]);

  const sync = async () => {
    setSyncing(true);
    setSyncNote('');
    try {
      const r = await syncCourier();
      setSyncNote(`${r.checked}টি পার্সেল দেখা হলো, ${r.changed}টির অবস্থা বদলেছে${r.failed ? `, ${r.failed}টি দেখা যায়নি` : ''}।`);
      await load(1);
    } catch (e) {
      setSyncNote(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const rows = data.rows || [];
  const sel = 'rounded-lg border border-dash-line bg-dash-card px-3 py-1.5 text-xs text-dash-ink3';
  const setExtra = (k, v) => setFilters((f) => ({ ...f, extra: { ...f.extra, [k]: v } }));

  return (
    <div className="space-y-4">
      <CourierHeader subtitle="Every parcel at Steadfast — where it is, and what it is worth." />

      <CourierFilters
        value={filters}
        onChange={setFilters}
        dateLabel="Sent"
        extra={
          <>
            <select value={filters.extra?.settled || ''} onChange={(e) => setExtra('settled', e.target.value)} className={sel}>
              <option value="">Paid out + not yet</option>
              <option value="yes">Paid out by courier</option>
              <option value="no">Not paid out yet</option>
            </select>
            <select value={filters.extra?.payment || ''} onChange={(e) => setExtra('payment', e.target.value)} className={sel}>
              <option value="">COD + prepaid</option>
              <option value="cod">Cash on delivery</option>
              <option value="prepaid">Prepaid</option>
            </select>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                group === g.key ? 'bg-dash-ink text-dash-card' : 'border border-dash-line bg-dash-card text-dash-ink3 hover:border-brand/40'
              }`}
            >
              {g.label} <span className="opacity-70">{data.tabs?.[g.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {syncNote && <span className="text-xs text-dash-mute">{syncNote}</span>}
          <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft disabled:opacity-50">
            <FiRefreshCw className={syncing ? 'animate-spin' : ''} /> Update statuses from Steadfast
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : loading && page === 1 ? (
          <div className="flex justify-center p-10"><FiLoader className="animate-spin text-brand" size={22} /></div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-dash-mute">এই ফিল্টারে কোনো পার্সেল নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-[11px] uppercase tracking-wide text-dash-mute2">
                  <th className="px-4 py-2">Order · sent</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">College / area</th>
                  <th className="px-2 py-2">Consignment</th>
                  <th className="px-2 py-2">Status</th>
                  {showMoney ? (
                    <>
                      <th className="px-2 py-2 text-right">COD asked</th>
                      <th className="px-2 py-2 text-right">Collected</th>
                      <th className="px-2 py-2 text-right">Courier charge</th>
                      <th className="px-4 py-2 text-right">Payout</th>
                    </>
                  ) : (
                    <th className="px-4 py-2 text-right">Payment</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const c = r.courier || {};
                  return (
                    <tr key={r._id} className="border-b border-dash-line/60 align-top hover:bg-dash-soft/40">
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-xs font-semibold text-dash-ink2"><span className="mr-1.5 inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-sans text-xs font-extrabold text-indigo-700">#{r.orderSeq ?? '—'}</span>{r.orderNumber}</div>
                        <div className="text-[11px] text-dash-mute2">{fmt(c.sentAt)}</div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="font-medium text-dash-ink2">{r.shippingAddress?.name}</div>
                        <div className="font-mono text-xs text-dash-ink3">{spacedPhone(r.shippingAddress?.phone)}</div>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-dash-ink3">
                        <div>{r.college?.name || '—'}</div>
                        <div className="text-dash-mute2">{r.shippingAddress?.district}</div>
                      </td>
                      <td className="px-2 py-2.5 text-xs">
                        <div className="font-mono text-dash-ink2">{c.consignmentId}</div>
                        {c.trackingCode && (
                          <a href={`https://steadfast.com.bd/t/${c.trackingCode}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-brand hover:underline">
                            {c.trackingCode} <FiExternalLink size={11} />
                          </a>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${GROUP_STYLE[r.courierGroup] || 'bg-dash-soft text-dash-ink3'}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                        {c.lastMessage && <div className="mt-1 max-w-[220px] text-[11px] leading-snug text-dash-mute2">{c.lastMessage}</div>}
                        <div className="mt-0.5 text-[10px] text-dash-mute2">updated {fmt(c.statusUpdatedAt)}</div>
                      </td>
                      {!showMoney && (
                        <td className="px-4 py-2.5 text-right text-xs">
                          {r.payment?.method === 'cod' ? <span className="font-medium text-amber-600">COD</span> : <span className="font-medium text-emerald-600">Prepaid</span>}
                        </td>
                      )}
                      {showMoney && (<>
                      <td className="px-2 py-2.5 text-right tabular-nums text-dash-ink2">{c.codAmount ? tk(c.codAmount) : <span className="text-xs text-emerald-600">Prepaid</span>}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-dash-ink2">{r.courierGroup === 'transit' ? '—' : tk(c.collectedAmount)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-dash-ink2">{c.deliveryCharge == null ? <span className="text-xs text-dash-mute2">not yet</span> : tk(c.deliveryCharge)}</td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {c.paymentId ? (
                          <span className="font-semibold text-emerald-600">Paid #{c.paymentId}</span>
                        ) : r.courierGroup === 'delivered' || r.courierGroup === 'partial' ? (
                          <span className="font-semibold text-amber-600">Owed</span>
                        ) : (
                          <span className="text-dash-mute2">—</span>
                        )}
                      </td>
                      </>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length < data.total && (
          <div className="border-t border-dash-line p-3 text-center">
            <button onClick={() => load(page + 1)} disabled={loading} className="rounded-lg border border-dash-line px-4 py-2 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft disabled:opacity-50">
              {loading ? 'Loading…' : `Show more (${rows.length} of ${data.total})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

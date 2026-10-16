'use client';

/**
 * Payouts & accounts — the money between the shop and the courier.
 *
 * Over the parcels sent in the chosen window: what buyers were asked to pay,
 * what the courier collected, what it charged, what it has paid the shop and
 * what it still owes. Below, every payout Steadfast has made, each opening to
 * the parcels it settled. "Sync payouts" copies new payouts from Steadfast
 * (the server also does this every 30 minutes).
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { FiChevronDown, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { CourierFilters, CourierHeader, EMPTY_FILTERS, filterQuery } from '@/components/admin/courier/CourierShell';
import { courierSummary, listCourierPayments, syncCourierPayments, tk } from '@/components/admin/courier/courierApi';

const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Card({ label, value, note, tone = 'text-dash-ink' }) {
  return (
    <div className="rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums outfit ${tone}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-dash-mute2">{note}</p>}
    </div>
  );
}

export default function CourierPayoutsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [s, setS] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = filterQuery(filters);
      const [sum, pays] = await Promise.all([courierSummary(q), listCourierPayments({ from: q.from, to: q.to })]);
      setS(sum);
      setPayments(pays || []);
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

  const sync = async () => {
    setSyncing(true);
    setNote('');
    try {
      const r = await syncCourierPayments();
      setNote(`Steadfast-এ ${r.payments}টি পেআউট — ${r.added}টি নতুন, ${r.updated}টি হালনাগাদ।`);
      await load();
    } catch (e) {
      setNote(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const feeGap = s ? s.buyerDeliveryFees - s.courierCharges : 0;

  return (
    <div className="space-y-4">
      <CourierHeader subtitle="What the courier collected, charged, paid and still owes." />

      <CourierFilters
        value={filters}
        onChange={setFilters}
        dateLabel="Sent"
        extra={
          <select
            value={filters.extra?.payment || ''}
            onChange={(e) => setFilters((f) => ({ ...f, extra: { ...f.extra, payment: e.target.value } }))}
            className="rounded-lg border border-dash-line bg-dash-card px-3 py-1.5 text-xs text-dash-ink3"
          >
            <option value="">COD + prepaid</option>
            <option value="cod">Cash on delivery</option>
            <option value="prepaid">Prepaid</option>
          </select>
        }
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {/not authorized|Access denied/i.test(error) ? 'এই পাতা শুধু Super Admin দেখতে পারেন।' : error}
        </p>
      )}

      {loading && !s ? (
        <div className="flex justify-center p-10"><FiLoader className="animate-spin text-brand" size={22} /></div>
      ) : s && (
        <>
          {/* The two numbers the shop asks first. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Courier owes you</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-amber-700 outfit">{tk(s.receivable)}</p>
              <p className="mt-1 text-xs text-amber-700/80">
                Collected on delivered parcels, less the courier&rsquo;s charge, not paid out yet.
                {s.chargesUnknown > 0 &&
                  ` Charges on ${s.chargesUnknown} parcel(s) are not reported yet, so the real figure is a little lower.`}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Courier has paid you</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700 outfit">{tk(s.payoutsReceived)}</p>
              <p className="mt-1 text-xs text-emerald-700/80">{s.payoutCount} payout{s.payoutCount === 1 ? '' : 's'} in this period (by payout date).</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card label="Parcels sent" value={s.parcels} note={`${s.delivered} delivered · ${s.partial} partial · ${s.returned} returned · ${s.transit} on the way`} />
            <Card label="COD asked" value={tk(s.codAsked)} note="What buyers were asked to pay on delivery" />
            <Card label="COD collected" value={tk(s.codCollected)} tone="text-emerald-600" note="Collected by the courier on delivered parcels" />
            <Card label="Still with the courier" value={tk(s.codInTransit)} tone="text-sky-600" note="COD on parcels not delivered yet" />
            <Card
              label="Courier charges"
              value={tk(s.courierCharges)}
              tone="text-red-600"
              note={s.chargesUnknown ? `${s.chargesUnknown} parcel(s) not reported yet` : 'Delivery + return charges'}
            />
            <Card label="Return charges" value={tk(s.returnCharges)} note={`${s.returned} returned parcel(s)`} />
            <Card label="Buyers paid for delivery" value={tk(s.buyerDeliveryFees)} note="Delivery charge on these orders" />
            <Card
              label="Delivery: you − courier"
              value={`${feeGap >= 0 ? '+' : '−'}${tk(Math.abs(feeGap))}`}
              tone={feeGap >= 0 ? 'text-emerald-600' : 'text-red-600'}
              note="What buyers paid for delivery, less what the courier charged"
            />
          </div>
        </>
      )}

      <div className="rounded-xl border border-dash-line/60 bg-dash-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-line px-4 py-3">
          <h2 className="text-sm font-semibold text-dash-ink2">Payouts from Steadfast</h2>
          <div className="flex items-center gap-2">
            {note && <span className="text-xs text-dash-mute">{note}</span>}
            <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2 text-xs font-semibold text-dash-ink3 hover:bg-dash-soft disabled:opacity-50">
              <FiRefreshCw className={syncing ? 'animate-spin' : ''} /> Sync payouts
            </button>
          </div>
        </div>
        {payments.length === 0 ? (
          <p className="p-8 text-center text-sm text-dash-mute">এই সময়ে কোনো পেআউট নেই। নতুন পেআউট আনতে &ldquo;Sync payouts&rdquo; চাপুন।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-[11px] uppercase tracking-wide text-dash-mute2">
                  <th className="px-4 py-2">Payout</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2 text-right">Parcels</th>
                  <th className="px-2 py-2 text-right">COD</th>
                  <th className="px-2 py-2 text-right">Charges</th>
                  <th className="px-2 py-2 text-right">Paid to you</th>
                  <th className="w-10 px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <Fragment key={p.paymentId}>
                    <tr onClick={() => setOpen(open === p.paymentId ? null : p.paymentId)} className="cursor-pointer border-b border-dash-line/60 hover:bg-dash-soft/40">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-dash-ink2">#{p.paymentId} <span className="ml-1 font-sans font-normal text-dash-mute2">{p.status}</span></td>
                      <td className="px-2 py-2.5 text-xs text-dash-ink3">{fmtDay(p.paidAt)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{p.consignments?.length || 0}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{tk(p.codTotal)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-red-600">{tk(p.chargeTotal)}</td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums text-emerald-600">{tk(p.amount)}</td>
                      <td className="px-4 py-2.5"><FiChevronDown className={`transition ${open === p.paymentId ? 'rotate-180' : ''}`} /></td>
                    </tr>
                    {open === p.paymentId && (
                      <tr className="border-b border-dash-line/60 bg-dash-soft/30">
                        <td colSpan={7} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-dash-mute2">
                                <th className="py-1">Order</th>
                                <th className="py-1">Consignment</th>
                                <th className="py-1">Status</th>
                                <th className="py-1 text-right">COD</th>
                                <th className="py-1 text-right">Charge</th>
                                <th className="py-1 text-right">Net</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(p.consignments || []).map((c) => (
                                <tr key={c.consignmentId}>
                                  <td className="py-1 font-mono">{c.invoice}</td>
                                  <td className="py-1 font-mono">{c.consignmentId}</td>
                                  <td className="py-1">{c.status}</td>
                                  <td className="py-1 text-right tabular-nums">{tk(c.codAmount)}</td>
                                  <td className="py-1 text-right tabular-nums text-red-600">{tk(c.deliveryCharge)}</td>
                                  <td className="py-1 text-right font-semibold tabular-nums">{tk((c.codAmount || 0) - (c.deliveryCharge || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

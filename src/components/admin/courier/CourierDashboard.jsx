'use client';

/**
 * The courier money dashboard — the top of Payouts & Accounts (18 Oct 2026).
 *
 * Modelled on Steadfast's own merchant dashboard, from our own records (every
 * parcel we sent, every payout we copied): what is with the courier right
 * now, the last 30 days, parcels booked each day by how they ended up, the
 * latest parcels, the last payout and what the courier still owes. Super
 * Admin only — the API refuses anyone else.
 *
 * Colours follow Steadfast's: delivered green, in progress amber, partly
 * delivered blue, returned red (and the Parcels chips use the same).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FiAlertCircle, FiArrowRight, FiBox, FiCalendar, FiCheckCircle, FiClock, FiCornerUpLeft,
  FiCreditCard, FiDollarSign, FiLoader, FiPackage, FiRefreshCw, FiSend, FiTruck,
} from 'react-icons/fi';
import { courierDashboard, STATUS_LABEL, tk } from './courierApi';

const SERIES = [
  { key: 'delivered', label: 'Delivered', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { key: 'transit', label: 'In progress', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'partial', label: 'Partly delivered', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  { key: 'returned', label: 'Returned', bar: 'bg-red-500', dot: 'bg-red-500' },
];

const CHIP = {
  delivered: 'bg-emerald-50 text-emerald-700',
  transit: 'bg-amber-50 text-amber-700',
  partial: 'bg-sky-50 text-sky-700',
  returned: 'bg-red-50 text-red-600',
};

const shortDay = (d) => new Date(`${d}T00:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' });
const when = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

function Panel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-dash-line/60 bg-dash-card p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-dash-ink2 outfit">
            {Icon && <Icon className="text-dash-mute" />} {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function NowRow({ icon: Icon, tone, label, note, count, amount, href }) {
  const body = (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-dash-soft/60">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-dash-ink2">{label}</p>
        {note && <p className="text-xs text-amber-600">{note}</p>}
      </div>
      <div className="text-right">
        <p className="text-xl font-bold tabular-nums text-dash-ink2 outfit">{count.toLocaleString('en-US')}</p>
        {amount != null && <p className="text-[11px] tabular-nums text-dash-mute2">{tk(amount)}</p>}
      </div>
      {href && <FiArrowRight className="shrink-0 text-dash-mute2" />}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Tile({ icon: Icon, label, value, sub, children, tone = 'text-dash-ink2' }) {
  return (
    <div className="rounded-2xl border border-dash-line/60 bg-dash-card p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-semibold text-dash-mute">
        <Icon /> {label}
      </p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums outfit ${tone}`}>{value}</p>
      {children}
      {sub && <p className="mt-1 text-xs text-dash-mute2">{sub}</p>}
    </div>
  );
}

/** Parcels booked each day, stacked by how they ended up. Hover a day for its numbers. */
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  // An even top, so the middle gridline sits on a whole number.
  const peak = Math.max(1, ...daily.map((d) => SERIES.reduce((n, s) => n + d[s.key], 0)));
  const max = peak % 2 ? peak + 1 : peak;
  const ticks = [max, max / 2, 0];
  const shown = hover != null ? daily[hover] : null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dash-mute">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${s.dot}`} /> {s.label}
          </span>
        ))}
      </div>
      <div className="relative flex gap-2">
        <div className="flex h-48 flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-dash-mute2">
          {ticks.map((t) => <span key={t}>{t}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 border-b border-dash-line">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-dash-line/60" />
          </div>
          <div className="flex h-48 items-end gap-[3px]">
            {daily.map((d, i) => {
              const total = SERIES.reduce((n, s) => n + d[s.key], 0);
              return (
                <div
                  key={d.day}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className="flex h-full flex-1 cursor-default flex-col justify-end"
                  aria-label={`${shortDay(d.day)}: ${total} parcels`}
                >
                  <div className={`flex flex-col-reverse gap-[2px] ${hover === i ? 'opacity-100' : hover != null ? 'opacity-60' : ''}`} style={{ height: `${(total / max) * 100}%` }}>
                    {SERIES.map((s) =>
                      d[s.key] ? (
                        <div
                          key={s.key}
                          className={`w-full ${s.bar} first:rounded-b-[2px] last:rounded-t-[4px]`}
                          style={{ flexGrow: d[s.key] }}
                        />
                      ) : null
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-dash-mute2">
            <span>{shortDay(daily[0].day)}</span>
            <span>{shortDay(daily[Math.floor(daily.length / 2)].day)}</span>
            <span>{shortDay(daily[daily.length - 1].day)}</span>
          </div>
          {shown && (
            <div className="pointer-events-none absolute right-0 top-0 rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-xs shadow-lg">
              <p className="mb-1 font-semibold text-dash-ink2">{shortDay(shown.day)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center gap-1.5 text-dash-ink3">
                  <span className={`h-2 w-2 rounded-sm ${s.dot}`} /> {s.label}: <b className="tabular-nums">{shown[s.key]}</b>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <button type="button" onClick={() => setAsTable((v) => !v)} className="mt-3 text-xs font-medium text-dash-mute hover:text-dash-ink3">
        {asTable ? '▾ Hide the table' : '▸ Show as a table'}
      </button>
      {asTable && (
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-dash-line">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-dash-soft">
              <tr className="text-left text-dash-mute2">
                <th className="px-3 py-1.5">Day</th>
                {SERIES.map((s) => <th key={s.key} className="px-3 py-1.5 text-right">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.day} className="border-t border-dash-line/60">
                  <td className="px-3 py-1.5 text-dash-ink3">{shortDay(d.day)}</td>
                  {SERIES.map((s) => <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">{d[s.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function CourierDashboard({ onSyncPayouts, syncing }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setD(await courierDashboard());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const ended = useMemo(() => {
    if (!d) return [];
    const total = Math.max(1, d.booked30);
    return SERIES.map((s) => ({ ...s, n: d.ended[s.key], pct: Math.round((d.ended[s.key] / total) * 100) }));
  }, [d]);

  if (error) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <FiAlertCircle /> {/not authorized|Access denied/i.test(error) ? 'এই পাতা শুধু Super Admin দেখতে পারেন।' : error}
      </p>
    );
  }
  if (!d) {
    return <div className="flex justify-center p-10"><FiLoader className="animate-spin text-brand" size={22} /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Right now + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="Right now"
          action={
            <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
              <FiRefreshCw size={12} /> Refresh
            </button>
          }
        >
          <div className="divide-y divide-dash-line/50">
            <NowRow icon={FiClock} tone="bg-amber-50 text-amber-600" label="In review" note="Added, not approved by the courier yet" count={d.inReview} href="/dashboard/admin/courier" />
            <NowRow icon={FiTruck} tone="bg-sky-50 text-sky-600" label="Delivery processing" count={d.processing} href="/dashboard/admin/courier" />
            <NowRow icon={FiCreditCard} tone="bg-emerald-50 text-emerald-600" label="COD processing" note="Delivered, the courier has not paid it yet" count={d.codProcessing} amount={d.codProcessingAmount} />
            <NowRow icon={FiCornerUpLeft} tone="bg-red-50 text-red-500" label="Returns (30 days)" count={d.returns30} href="/dashboard/admin/courier" />
          </div>
        </Panel>

        <Panel title="Quick actions">
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/dashboard/admin/courier/send', icon: FiSend, label: 'Send to courier', tone: 'text-emerald-600' },
              { href: '/dashboard/admin/courier', icon: FiPackage, label: 'All parcels', tone: 'text-amber-600' },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 rounded-xl border border-dash-line/60 bg-dash-soft/40 px-3 py-5 text-sm font-semibold text-dash-ink3 transition hover:border-brand/40 hover:bg-dash-soft">
                <a.icon className={a.tone} size={20} /> {a.label}
              </Link>
            ))}
            <button onClick={onSyncPayouts} disabled={syncing} className="flex flex-col items-center gap-2 rounded-xl border border-dash-line/60 bg-dash-soft/40 px-3 py-5 text-sm font-semibold text-dash-ink3 transition hover:border-brand/40 hover:bg-dash-soft disabled:opacity-50">
              <FiRefreshCw className={`text-sky-600 ${syncing ? 'animate-spin' : ''}`} size={20} /> Sync payouts
            </button>
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dash-line/60 bg-dash-soft/40 px-3 py-4 text-center">
              <span className="text-xs font-semibold text-dash-mute">Steadfast balance</span>
              <span className="text-lg font-bold tabular-nums text-dash-ink2 outfit">{d.balance == null ? '—' : tk(d.balance)}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Last 30 days */}
      <div>
        <h2 className="mb-3 text-base font-bold text-dash-ink2 outfit">Your last 30 days</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile icon={FiBox} label="Booked today" value={d.bookedToday} sub={`${d.bookedYesterday} yesterday`} />
          <Tile icon={FiCalendar} label="Booked · 30 days" value={d.booked30.toLocaleString('en-US')} />
          <Tile icon={FiCheckCircle} label="Delivery success" value={d.successRate == null ? '—' : `${d.successRate}%`} sub={`${d.delivered30} delivered of ${d.finished30} finished`}>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-dash-soft2">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.successRate || 0}%` }} />
            </div>
          </Tile>
          {/* The same figure Steadfast's dashboard shows: COD collected on
              delivered parcels not paid out yet, before its charge. What
              actually reaches the shop (after the charge) is underneath. */}
          <Tile icon={FiDollarSign} label="Delivered, not yet paid" value={tk(d.codProcessingAmount)} tone="text-emerald-600" sub={`${d.receivableParcels} parcels · after charges you get ${tk(d.receivable)}`} />
        </div>
      </div>

      {/* Each day + how they ended up */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Parcels booked each day">
          <p className="-mt-2 mb-3 text-xs text-dash-mute2">Coloured by how each day&rsquo;s parcels have ended up so far.</p>
          <DailyChart daily={d.daily} />
        </Panel>
        <Panel title="How they ended up">
          <p className="-mt-2 mb-3 text-xs text-dash-mute2">{d.booked30.toLocaleString('en-US')} parcels booked in 30 days</p>
          <div className="mb-4 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
            {ended.filter((e) => e.n > 0).map((e) => (
              <div key={e.key} className={e.bar} style={{ flexGrow: e.n }} title={`${e.label}: ${e.n}`} />
            ))}
          </div>
          <ul className="space-y-2.5 text-sm">
            {ended.map((e) => (
              <li key={e.key} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${e.dot}`} />
                <span className="flex-1 text-dash-ink3">{e.label}</span>
                <b className="tabular-nums text-dash-ink2">{e.n}</b>
                <span className="w-10 text-right text-xs tabular-nums text-dash-mute2">{e.pct}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Latest parcels + last payment */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Latest parcels"
          action={<Link href="/dashboard/admin/courier" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">All parcels <FiArrowRight size={12} /></Link>}
        >
          {d.latest.length === 0 ? (
            <p className="py-6 text-center text-sm text-dash-mute">এখনো কোনো পার্সেল পাঠানো হয়নি।</p>
          ) : (
            <ul className="divide-y divide-dash-line/50">
              {d.latest.map((p) => (
                <li key={p._id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><FiBox size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-dash-ink2">{p.name || '—'}</p>
                    <p className="text-[11px] text-dash-mute2">#{p.orderSeq ?? '—'} · {p.consignmentId} · {when(p.sentAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-dash-ink2">{tk(p.cod)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${CHIP[p.group] || CHIP.transit}`}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Last payment" icon={FiCreditCard}>
          {d.lastPayment ? (
            <>
              <p className="text-3xl font-extrabold tabular-nums text-emerald-600 outfit">{tk(d.lastPayment.amount)}</p>
              <p className="mt-1 text-xs text-dash-mute">
                <span className="font-semibold text-emerald-600">● {d.lastPayment.status || 'Paid'}</span> · #{d.lastPayment.paymentId} · {when(d.lastPayment.paidAt)} · {d.lastPayment.parcels} parcels
              </p>
            </>
          ) : (
            <p className="text-sm text-dash-mute">এখনো কোনো পেআউট আসেনি। &ldquo;Sync payouts&rdquo; চাপুন।</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dash-line/60 pt-4 text-sm">
            <div>
              <p className="text-xs text-dash-mute">Paid to you, all time</p>
              <p className="font-bold tabular-nums text-dash-ink2">{tk(d.paidOutAllTime)}</p>
              <p className="text-[11px] text-dash-mute2">{d.payoutCount} payouts</p>
            </div>
            <div>
              <p className="text-xs text-dash-mute">Still to come</p>
              <p className="font-bold tabular-nums text-amber-600">{tk(d.receivable)}</p>
              <p className="text-[11px] text-dash-mute2">{d.receivableParcels} parcels</p>
            </div>
          </div>
          {d.payments.length > 1 && (
            <ul className="mt-4 space-y-1.5 border-t border-dash-line/60 pt-3 text-xs">
              {d.payments.slice(1, 6).map((p) => (
                <li key={p.paymentId} className="flex justify-between text-dash-ink3">
                  <span>#{p.paymentId} · {when(p.paidAt)}</span>
                  <b className="tabular-nums">{tk(p.amount)}</b>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

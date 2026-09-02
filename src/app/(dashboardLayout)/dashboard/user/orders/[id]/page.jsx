'use client';

/**
 * Order tracking — "আমার অর্ডারটা কোন ধাপে আছে?"
 *
 * The order carries no history array, so the ladder is reconstructed from the
 * four fulfillment timestamps (confirmedAt / shippedAt / deliveredAt, plus
 * createdAt) and the current status — see buildTimeline in ../orderUi.
 *
 * The rail is vertical at every width on purpose: a horizontal stepper with four
 * Bengali labels cannot fit 375px without wrapping into something unreadable.
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiLoader, FiArrowLeft, FiAlertCircle, FiRefreshCw, FiCheck, FiXCircle,
  FiTruck, FiMapPin, FiCreditCard, FiBookOpen, FiInfo, FiHash,
} from 'react-icons/fi';

import {
  API, authHeaders, fmtDate, fmtDateTime, formatTk, statusMeta, paymentStatusMeta,
  paymentMethodLabel, deliveryTypeLabel, areaLabel, itemCover, buildTimeline,
} from '../orderUi';

export default function OrderTrackingPage({ params }) {
  const { id } = use(params);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Bumped by the retry button; every state write below sits behind an await so
  // nothing is set synchronously inside the effect body.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // no-store: after the admin advances the order, the buyer must see the
        // new step on refresh — a cached response would keep showing the old one.
        const res = await fetch(`${API}/orders/${id}`, { headers: authHeaders(), cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || !body.success) {
          // 403 is a different problem from 404 and deserves a different sentence.
          throw new Error(
            res.status === 403
              ? 'এই অর্ডারটি দেখার অনুমতি আপনার নেই।'
              : res.status === 404 || body.message === 'Order not found'
                ? 'অর্ডারটি খুঁজে পাওয়া যায়নি।'
                : body.message || 'অর্ডার লোড করা যায়নি'
          );
        }
        setOrder(body.data || null);
        setError('');
      } catch (err) {
        if (alive) setError(err.message || 'অর্ডার লোড করা যায়নি');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, attempt]);

  const retry = () => {
    setLoading(true);
    setError('');
    setAttempt((n) => n + 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <FiLoader className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-5 poppins">
        <BackLink />
        <div className="bg-dash-card rounded-2xl border border-rose-200 p-8 text-center">
          <FiAlertCircle className="mx-auto text-rose-400 mb-3" size={28} />
          <p className="text-sm font-semibold text-dash-ink3">{error || 'অর্ডার পাওয়া যায়নি'}</p>
          <button
            onClick={retry}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
          >
            <FiRefreshCw size={13} /> আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  const st = statusMeta(order.status);
  const StatusIcon = st.icon;
  const timeline = buildTimeline(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const addr = order.shippingAddress;
  const pay = order.payment || {};
  const payStatus = paymentStatusMeta(pay.status);

  return (
    <div className="space-y-5 poppins">
      <BackLink />

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {/* No running count here — see the note on the orders list. */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-dash-mute2">
                অর্ডার নম্বর
              </p>
            </div>
            <p className="text-[15px] font-mono font-bold text-dash-ink2 break-all mt-0.5">
              {order.orderNumber}
            </p>
            <p className="text-xs text-dash-mute2 mt-1">
              {fmtDateTime(order.createdAt)} · {deliveryTypeLabel(order.deliveryType)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shrink-0 ${st.cls}`}
          >
            <StatusIcon size={13} /> {st.label}
          </span>
        </div>
      </div>

      {/* ── Progress ─────────────────────────────────────────── */}
      {timeline.cancelled ? (
        <div className="bg-dash-card rounded-2xl border border-rose-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <FiXCircle size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-dash-ink2">অর্ডারটি বাতিল হয়েছে</h2>
              {timeline.cancelledAt && (
                <p className="text-xs text-dash-mute2 mt-0.5">{fmtDateTime(timeline.cancelledAt)}</p>
              )}
              <p className="text-sm text-dash-mute mt-2 leading-relaxed">
                এই অর্ডারের জন্য কোনো ডেলিভারি হবে না। কারণ জানতে বা আবার অর্ডার করতে আমাদের সাথে
                যোগাযোগ করুন।
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-4 sm:p-5">
          <h2 className="text-sm font-bold text-dash-ink2 mb-4">অর্ডারের অগ্রগতি</h2>
          <Timeline steps={timeline.steps} />
        </div>
      )}

      {/* ── Courier ──────────────────────────────────────────── */}
      {(order.courierName || order.trackingCode) && (
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-dash-ink2 mb-3">
            <FiTruck className="text-brand" size={15} /> কুরিয়ার তথ্য
          </h2>
          <div className="space-y-2">
            {order.courierName && <InfoRow label="কুরিয়ার" value={order.courierName} />}
            {order.trackingCode && (
              <InfoRow label="ট্র্যাকিং কোড" value={order.trackingCode} mono />
            )}
          </div>
        </div>
      )}

      {/* ── Admin note ───────────────────────────────────────── */}
      {order.adminNote && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <FiInfo className="text-blue-500 mt-0.5 shrink-0" size={16} />
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-800">আমাদের নোট</p>
            <p className="text-sm text-blue-900/80 mt-0.5 leading-relaxed whitespace-pre-line">
              {order.adminNote}
            </p>
          </div>
        </div>
      )}

      {/* ── Items + money ────────────────────────────────────── */}
      <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-dash-ink2 mb-4">
          <FiBookOpen className="text-brand" size={15} /> অর্ডারের বই
        </h2>

        <div className="space-y-3">
          {items.map((it, i) => {
            const cover = itemCover(it);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-14 rounded-md bg-dash-soft2 border border-dash-line overflow-hidden shrink-0 flex items-center justify-center">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <FiBookOpen className="text-dash-faint" size={16} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-dash-ink3 leading-snug">{it.title}</p>
                  <p className="text-[11px] text-dash-mute2 mt-0.5">
                    {it.format === 'digital' ? 'ডিজিটাল' : 'ছাপা'} · {formatTk(it.price)} ×{' '}
                    {it.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-dash-ink2 shrink-0">
                  {formatTk((Number(it.price) || 0) * (Number(it.quantity) || 0))}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-dash-line-soft space-y-2">
          <InfoRow label="সাবটোটাল" value={formatTk(order.subtotal)} />
          {Number(order.discount) > 0 && (
            <InfoRow label="ছাড়" value={`− ${formatTk(order.discount)}`} />
          )}
          {Number(order.deliveryCharge) > 0 && (
            <InfoRow label="ডেলিভারি চার্জ" value={formatTk(order.deliveryCharge)} />
          )}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-dash-line-soft">
            <span className="text-sm font-bold text-dash-ink3">সর্বমোট</span>
            <span className="text-lg font-bold text-brand-ink">{formatTk(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Payment ──────────────────────────────────────────── */}
      <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-dash-ink2 mb-3">
          <FiCreditCard className="text-brand" size={15} /> পেমেন্ট
        </h2>
        <div className="space-y-2">
          <InfoRow label="পদ্ধতি" value={paymentMethodLabel(pay)} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-dash-mute">অবস্থা</span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${payStatus.cls}`}
            >
              {payStatus.label}
            </span>
          </div>
          {pay.transactionId && (
            <InfoRow label="ট্রানজেকশন আইডি" value={pay.transactionId} mono />
          )}
          {pay.paidAt && <InfoRow label="পরিশোধের সময়" value={fmtDateTime(pay.paidAt)} />}
        </div>

        {pay.method === 'cod' && pay.status !== 'paid' && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-soft border border-brand/25 p-3 text-xs text-brand-deep leading-relaxed">
            <FiHash className="mt-0.5 shrink-0" size={13} />
            বই হাতে পাওয়ার সময় কুরিয়ারকে <b className="mx-1">{formatTk(order.total)}</b> নগদে
            পরিশোধ করতে হবে।
          </p>
        )}
      </div>

      {/* ── Shipping address ─────────────────────────────────── */}
      {addr && (
        <div className="bg-dash-card rounded-2xl border border-dash-line shadow-sm p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-dash-ink2 mb-3">
            <FiMapPin className="text-brand" size={15} /> ডেলিভারি ঠিকানা
          </h2>
          <p className="text-sm font-semibold text-dash-ink3">{addr.name}</p>
          <p className="text-sm text-dash-mute mt-0.5">{addr.phone}</p>
          <p className="text-sm text-dash-mute mt-1.5 leading-relaxed">
            {addr.address}
            {addr.city ? `, ${addr.city}` : ''}
          </p>
          <p className="text-[11px] text-dash-mute2 mt-1">{areaLabel(addr.area)}</p>
          {addr.note && (
            <p className="text-xs text-dash-mute mt-2 rounded-lg bg-dash-soft border border-dash-line-soft p-2.5 leading-relaxed">
              {addr.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/user/orders"
      className="inline-flex items-center gap-2 text-sm font-medium text-dash-mute hover:text-brand-ink transition-colors"
    >
      <FiArrowLeft size={15} /> সব অর্ডার
    </Link>
  );
}

/** Vertical rail — safe at 375px, where a horizontal stepper is not. */
function Timeline({ steps }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = s.state === 'done';
        const current = s.state === 'current';
        const last = i === steps.length - 1;

        return (
          <li key={s.key} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Connector — stops at the last step so the line never dangles. */}
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-9 bottom-0 w-0.5 rounded-full ${
                  done ? 'bg-emerald-400' : 'bg-dash-soft3'
                }`}
              />
            )}

            {/* Dot */}
            <span
              className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : current
                    ? 'bg-brand-soft border-brand text-brand-ink'
                    : 'bg-dash-card border-dash-line text-dash-faint'
              }`}
            >
              {done ? <FiCheck size={15} /> : <Icon size={14} />}
            </span>

            {/* Label */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={`text-sm leading-snug ${
                  done || current ? 'font-semibold text-dash-ink2' : 'font-medium text-dash-mute2'
                }`}
              >
                {s.label}
                {current && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-brand-soft text-brand-deep text-[10px] font-bold align-middle">
                    এখন এখানে
                  </span>
                )}
              </p>
              <p className={`text-xs mt-0.5 ${done || current ? 'text-dash-mute' : 'text-dash-faint'}`}>
                {s.at ? fmtDate(s.at) : current ? s.hint : 'অপেক্ষমাণ'}
              </p>
              {s.at && (done || current) && (
                <p className="text-[11px] text-dash-mute2 mt-0.5">{s.hint}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-dash-mute shrink-0">{label}</span>
      <span
        className={`text-sm text-right text-dash-ink3 break-all ${
          mono ? 'font-mono text-xs' : 'font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

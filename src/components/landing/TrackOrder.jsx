'use client';

/**
 * "Where is my book?" — on the home page, with a phone number.
 *
 * The shop's buyers order on a phone, often without ever setting a password,
 * and then want one thing: is it coming. Sending them to find an account they
 * may not remember creating, in order to read a delivery status, is exactly
 * the friction that turns into a phone call to the shop.
 *
 * So: the number they ordered with, and nothing else.
 *
 * WHAT IS NOT SHOWN, AND WHY
 *
 * A phone number is not a secret — anyone holding one can look it up here. So
 * the server sends back only what answers the question: the order number, the
 * date, what was bought, the amount, and where it has got to. It does not send
 * the buyer's name, address or email, and this component could not show them if
 * it wanted to. Knowing somebody ordered a book on Tuesday is close to
 * worthless; knowing where they live is not.
 *
 * Collapsed until asked for, because the home page's job is selling the book —
 * this is for the person who has already bought it.
 */

import { useState } from 'react';
import {
  LuPackageSearch, LuLoaderCircle, LuTriangleAlert, LuChevronDown, LuChevronUp,
  LuCheck, LuTruck, LuHouse, LuCircleX, LuClock,
} from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';
import { Container, cn } from '@/components/ui';
import { formatTk } from '@/lib/landingBook';
import API_BASE_URL from '@/config/api';

const T = {
  bn: {
    title: 'আমার অর্ডার দেখুন',
    sub: 'যে মোবাইল নম্বর দিয়ে অর্ডার করেছেন সেটি দিন — লগইন লাগবে না।',
    placeholder: '01XXXXXXXXX',
    button: 'দেখুন',
    searching: 'খুঁজছি…',
    none: 'এই নম্বরে কোনো অর্ডার পাওয়া যায়নি। নম্বরটি আরেকবার দেখে নিন।',
    badPhone: 'সঠিক মোবাইল নম্বর দিন।',
    network: 'সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    orderedOn: 'অর্ডারের তারিখ',
    steps: { placed: 'অর্ডার হয়েছে', confirmed: 'কনফার্ম হয়েছে', shipped: 'পাঠানো হয়েছে', delivered: 'পৌঁছে গেছে' },
    cancelled: 'বাতিল হয়েছে',
    courier: 'কুরিয়ার',
    found: (n) => `${n} টি অর্ডার পাওয়া গেছে`,
  },
  en: {
    title: 'Track my order',
    sub: 'Enter the mobile number you ordered with — no sign-in needed.',
    placeholder: '01XXXXXXXXX',
    button: 'Track',
    searching: 'Looking…',
    none: 'No orders found for this number. Please check it and try again.',
    badPhone: 'Enter a valid mobile number.',
    network: 'Something went wrong. Please try again.',
    orderedOn: 'Ordered on',
    steps: { placed: 'Placed', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered' },
    cancelled: 'Cancelled',
    courier: 'Courier',
    found: (n) => `${n} order${n === 1 ? '' : 's'} found`,
  },
};

const STEPS = [
  { key: 'placed', icon: LuClock },
  { key: 'confirmed', icon: LuCheck },
  { key: 'shipped', icon: LuTruck },
  { key: 'delivered', icon: LuHouse },
];

const fmtDate = (d, bengali) =>
  d
    ? new Date(d).toLocaleDateString(bengali ? 'bn-BD' : 'en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '';

export default function TrackOrder() {
  const { isBengali } = useLanguage();
  const S = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setOrders(null);

    // The same ten-digit test the server uses, so a typo is caught here rather
    // than as a round trip that finds nothing.
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) return setError(S.badPhone);

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || S.network);
      setOrders(json.data || []);
    } catch (err) {
      setError(err.message || S.network);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-border bg-surface-soft/40 py-8">
      <Container>
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary/40"
            aria-expanded={open}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <LuPackageSearch className="text-xl" />
              </span>
              <span className="min-w-0">
                <span className={cn('block font-heading text-base font-bold text-foreground', bn)}>
                  {S.title}
                </span>
                <span className={cn('block text-xs text-muted-foreground', bn)}>{S.sub}</span>
              </span>
            </span>
            {open ? (
              <LuChevronUp className="shrink-0 text-muted-foreground" />
            ) : (
              <LuChevronDown className="shrink-0 text-muted-foreground" />
            )}
          </button>

          {open && (
            <div className="mt-3 rounded-2xl border border-border bg-card p-5">
              <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={S.placeholder}
                  inputMode="numeric"
                  autoComplete="tel"
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60',
                    bn
                  )}
                >
                  {busy ? <LuLoaderCircle className="animate-spin" /> : <LuPackageSearch />}
                  {busy ? S.searching : S.button}
                </button>
              </form>

              {error && (
                <p className={cn('mt-3 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral', bn)}>
                  <LuTriangleAlert className="mt-0.5 shrink-0" /> {error}
                </p>
              )}

              {orders && orders.length === 0 && (
                <p className={cn('mt-3 rounded-xl bg-surface-soft px-4 py-3 text-sm text-muted-foreground', bn)}>
                  {S.none}
                </p>
              )}

              {orders && orders.length > 0 && (
                <>
                  <p className={cn('mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground', bn)}>
                    {S.found(orders.length)}
                  </p>
                  <ul className="mt-2 space-y-3">
                    {orders.map((o) => (
                      <OrderCard key={o.orderNumber} order={o} S={S} bn={bn} bengali={isBengali} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

/**
 * One order, as a progress line.
 *
 * The line is the whole point — "processing" means nothing to a buyer, but four
 * ticks with the third one empty says exactly where the parcel is. A cancelled
 * order gets its own treatment rather than a line with no end, because showing
 * it as "not delivered yet" would be a lie of omission.
 */
function OrderCard({ order, S, bn, bengali }) {
  const cancelled = order.status === 'cancelled' || order.stage === -1;
  // `stage` is the server's answer to "how far along", worked out from the
  // status AND the timestamps — an order can be genuinely delivered and carry
  // no deliveredAt, because those stamps were added after the shop had been
  // trading for a while. Drawing this from the timestamps alone told those
  // buyers their delivered parcel was still "placed".
  const at = Number.isInteger(order.stage) ? order.stage : 0;
  const reached = STEPS.map((_, i) => i <= at);

  return (
    <li className="rounded-2xl border border-border bg-surface-soft/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold text-foreground">{order.orderNumber}</p>
          <p className={cn('text-xs text-muted-foreground', bn)}>
            {S.orderedOn} {fmtDate(order.createdAt, bengali)}
          </p>
        </div>
        <span className="font-heading text-base font-bold text-primary">{formatTk(order.total)}</span>
      </div>

      {order.items?.length > 0 && (
        <p className={cn('mt-1.5 text-xs text-muted-foreground', bn)}>
          {order.items.map((i) => `${i.title} × ${i.quantity}`).join(', ')}
        </p>
      )}

      {cancelled ? (
        <p className={cn('mt-3 inline-flex items-center gap-2 rounded-lg bg-coral/10 px-3 py-2 text-sm font-semibold text-coral', bn)}>
          <LuCircleX /> {S.cancelled}
        </p>
      ) : (
        <ol className="mt-4 flex items-start">
          {STEPS.map((s, i) => {
            const done = reached[i];
            const Icon = s.icon;
            return (
              <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
                {/* The connector sits behind the dot and stops at the last step. */}
                {i < STEPS.length - 1 && (
                  <span
                    className={cn(
                      'absolute left-1/2 top-3.5 h-0.5 w-full',
                      i < at ? 'bg-primary' : 'bg-border'
                    )}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground'
                  )}
                >
                  <Icon className="text-[13px]" />
                </span>
                <span
                  className={cn(
                    'mt-1.5 text-[10px] leading-tight',
                    done ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    bn
                  )}
                >
                  {S.steps[s.key]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.courierName && !cancelled && (
        <p className={cn('mt-3 text-xs text-muted-foreground', bn)}>
          {S.courier}: <b className="text-foreground">{order.courierName}</b>
          {order.trackingCode && <> · <span className="font-mono">{order.trackingCode}</span></>}
        </p>
      )}
    </li>
  );
}

'use client';

/**
 * "আজকের কুপন" — the coupon the shop is advertising, in a card that slides in
 * from the bottom right a moment after the page opens.
 *
 * Which coupon is the admin's choice (Book Coupons → "পপআপ"); the server only
 * offers one that would be accepted at checkout right now, and nothing at all
 * otherwise, in which case this renders nothing. The countdown runs to the
 * coupon's own end date. "অর্ডার করুন" opens the checkout with the code
 * already applied (?coupon=), so the buyer never has to type it.
 *
 * Closing it keeps it closed for the rest of the visit (sessionStorage), not
 * for ever: tomorrow's visitor may want tomorrow's coupon.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuCopy, LuCheck, LuTicket, LuX, LuTimer } from 'react-icons/lu';
import API_BASE_URL from '@/config/api';
import { useLanguage } from '@/context/LanguageContext';

const CLOSED_KEY = 'mv_coupon_popup_closed';

const T = {
  bn: {
    today: 'আজকের কুপন',
    off: (s) => `${s} ছাড়`,
    perBook: 'প্রতিটি বইয়ে',
    freeDelivery: 'ফ্রি ডেলিভারি',
    ends: 'শেষ হবে',
    d: 'দিন', h: 'ঘণ্টা', m: 'মিনিট', s: 'সেকেন্ড',
    copy: 'কপি', copied: 'কপি হয়েছে',
    order: 'এই কুপনে অর্ডার করুন',
    close: 'বন্ধ করুন',
  },
  en: {
    today: "Today's coupon",
    off: (s) => `${s} off`,
    perBook: 'per book',
    freeDelivery: 'Free delivery',
    ends: 'Ends in',
    d: 'days', h: 'hrs', m: 'min', s: 'sec',
    copy: 'Copy', copied: 'Copied',
    order: 'Order with this coupon',
    close: 'Close',
  },
};

const tk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

function offText(c, L) {
  const parts = [];
  if (Number(c.discountValue) > 0) {
    const amount = c.discountType === 'percent' ? `${c.discountValue}%` : tk(c.discountValue);
    parts.push(L.off(amount) + (c.discountType === 'fixed' && c.fixedPer === 'book' ? ` (${L.perBook})` : ''));
  }
  if (c.freeDelivery) parts.push(L.freeDelivery);
  return parts.join(' + ');
}

/** Whole seconds left until `until`, never below zero. */
const secondsLeft = (until) => Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));

export default function CouponPopup({ checkoutHref }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';

  const [coupon, setCoupon] = useState(null);
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch after mount, then show a moment later — after the hero, not over it.
  useEffect(() => {
    let closed = false;
    try {
      closed = sessionStorage.getItem(CLOSED_KEY) === '1';
    } catch {
      /* private mode: just show it */
    }
    if (closed) return undefined;

    let alive = true;
    let timer;
    fetch(`${API_BASE_URL}/book-coupons/popup`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j?.data) return;
        setCoupon(j.data);
        if (j.data.validUntil) setLeft(secondsLeft(j.data.validUntil));
        timer = setTimeout(() => alive && setOpen(true), 1500);
      })
      .catch(() => {});
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // The countdown. When it reaches zero the coupon has ended and the card goes.
  useEffect(() => {
    if (!coupon?.validUntil) return undefined;
    const id = setInterval(() => {
      const s = secondsLeft(coupon.validUntil);
      setLeft(s);
      if (s <= 0) setOpen(false);
    }, 1000);
    return () => clearInterval(id);
  }, [coupon]);

  if (!coupon || !open) return null;

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(CLOSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the code is on screen to type */
    }
  };

  const href = `${checkoutHref}${checkoutHref.includes('?') ? '&' : '?'}coupon=${encodeURIComponent(coupon.code)}`;

  const parts =
    left == null
      ? null
      : [
          [Math.floor(left / 86400), L.d],
          [Math.floor((left % 86400) / 3600), L.h],
          [Math.floor((left % 3600) / 60), L.m],
          [left % 60, L.s],
        ];

  return (
    <div
      role="dialog"
      aria-label={L.today}
      // Above the WhatsApp button (bottom-20 on a phone, bottom-6 on desktop)
      // and the phone's tab bar, on the same right-hand edge.
      className="fixed bottom-36 right-3 z-40 w-[300px] max-w-[calc(100vw-1.5rem)] animate-coupon-in sm:right-6 lg:bottom-24"
    >
      <div className="animate-coupon-wiggle relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-primary-foreground">
          <span className={`inline-flex items-center gap-2 text-sm font-bold ${bn}`}>
            <LuTicket className="text-base" /> {L.today}
          </span>
          <button type="button" onClick={close} aria-label={L.close} className="rounded-full p-1 transition hover:bg-white/20">
            <LuX className="text-base" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className={`text-center text-lg font-extrabold text-foreground ${bn}`}>{offText(coupon, L)}</p>

          <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft px-3 py-2">
            <span className="flex-1 truncate text-center font-mono text-lg font-bold tracking-widest text-primary">{coupon.code}</span>
            <button
              type="button"
              onClick={copy}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:text-primary ${bn}`}
            >
              {copied ? <LuCheck /> : <LuCopy />} {copied ? L.copied : L.copy}
            </button>
          </div>

          {parts && (
            <div>
              <p className={`mb-1.5 flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground ${bn}`}>
                <LuTimer /> {L.ends}
              </p>
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {parts.map(([n, unit]) => (
                  <div key={unit} className="rounded-lg bg-muted px-1 py-1.5">
                    <div className="font-mono text-lg font-bold tabular-nums text-foreground">{String(n).padStart(2, '0')}</div>
                    <div className={`text-[10px] text-muted-foreground ${bn}`}>{unit}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href={href}
            className={`block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition hover:bg-primary-hover ${bn}`}
          >
            {L.order}
          </Link>
        </div>
      </div>
    </div>
  );
}

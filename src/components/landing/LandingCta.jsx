'use client';

/**
 * The closing ask, plus the two things a hesitant buyer still wants: a phone
 * number that reaches a human, and confirmation they can pay on delivery.
 * Bilingual — the copy follows the page language toggle.
 */

import Link from 'next/link';
import { LuArrowRight, LuBanknote, LuPhone, LuTruck } from 'react-icons/lu';
import { formatTk } from '@/lib/landingBook';
import { useLanguage } from '@/context/LanguageContext';

const T = {
  bn: {
    headingPre: 'এখনই প্রি-অর্ডার করে রাখুন',
    heading: 'বইটি অর্ডার করুন',
    off: 'ছাড়ে',
    ctaPre: 'প্রি-অর্ডার করুন',
    cta: 'অর্ডার করুন',
    cod: 'ক্যাশ অন ডেলিভারি',
    delivery: 'সারা দেশে পৌঁছে যাবে',
    offNames: { preorder: 'প্রি-অর্ডার অফার', normal: 'ছাড়' },
    onlineExtra: (v) => `অনলাইনে পেমেন্ট করলে আরও ${v} ছাড়`,
  },
  en: {
    headingPre: 'Pre-order your copy now',
    heading: 'Order the book',
    off: 'off',
    ctaPre: 'Pre-order now',
    cta: 'Order now',
    cod: 'Cash on delivery',
    delivery: 'Delivered nationwide',
    offNames: { preorder: 'Pre-order offer', normal: 'Discount' },
    onlineExtra: (v) => `${v} more off when you pay online`,
  },
};

// "25%" for a percentage offer, "৳150" for a fixed one.
const discText = (kind, percent, amount) =>
  kind === 'fixed' ? formatTk(amount) : `${percent}%`;

export default function LandingCta({ book, price, checkoutHref, supportPhone, deliveryNote }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';

  // The active headline offer decides the heading, the CTA verb and the offer
  // name shown — no longer hard-wired to pre-order.
  const isPreOrder = price?.isPreOrder ?? book?.isPreOrder;
  const offerName =
    price?.label || (price?.mode && price.mode !== 'none' ? L.offNames[price.mode] : '');

  return (
    <section className="border-t border-border bg-surface-soft">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
        <h2 className={`font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl ${bn}`}>
          {isPreOrder ? L.headingPre : L.heading}
        </h2>

        {price.saved > 0 && (
          <p className={`mt-3 text-muted-foreground ${bn}`}>
            {offerName && (
              <span className="mr-2 inline-flex items-center rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-bold text-coral align-middle">
                {offerName}
              </span>
            )}
            <span className="font-bold text-coral">{discText(price.kind, price.percent, price.amount)} {L.off}</span>{' '}
            <span className="font-bold text-foreground">{formatTk(price.payable)}</span>{' '}
            <span className="line-through">{formatTk(price.price)}</span>
          </p>
        )}

        {price?.online && (
          <p className={`mt-1.5 text-sm font-semibold text-accent ${bn}`}>
            {L.onlineExtra(discText(price.online.kind, price.online.percent, price.online.amount))}
          </p>
        )}

        <Link
          href={checkoutHref}
          className={`group mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${bn}`}
        >
          {isPreOrder ? L.ctaPre : L.cta}
          <LuArrowRight className="transition-transform group-hover:translate-x-1" />
        </Link>

        <div className={`mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground ${bn}`}>
          <span className="inline-flex items-center gap-2">
            <LuBanknote className="text-accent" /> {L.cod}
          </span>
          <span className="inline-flex items-center gap-2">
            <LuTruck className="text-accent" /> {L.delivery}
          </span>
          {supportPhone && (
            <a
              href={`tel:${supportPhone}`}
              className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
            >
              <LuPhone /> {supportPhone}
            </a>
          )}
        </div>

        {deliveryNote && (
          <p className={`mt-4 text-xs text-muted-foreground ${bn}`}>{deliveryNote}</p>
        )}
      </div>
    </section>
  );
}

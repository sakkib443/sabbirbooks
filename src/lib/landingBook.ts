/**
 * Which book the public landing page is about, fetched on the server.
 *
 * Runs during render (and during generateMetadata, so the Facebook preview and
 * the page always describe the same book). Never throws: a shop whose API is
 * briefly down should still serve a page, not a stack trace.
 */

import { priceBook, type BookOffers } from '@/lib/bookOffers';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '');

export interface LandingFeature {
  text: string;
  weight?: number;
  highlight?: boolean;
}

export interface LandingBook {
  _id: string;
  title: string;
  slug: string;
  author?: string;
  description?: string;
  coverImage?: string;
  price?: number;
  offerPrice?: number;
  format?: string;
  stock?: number;
  previewImages?: string[];
  previewPdfUrl?: string;
  isPreOrder?: boolean;
  preOrderDiscountPercent?: number;
  preOrderNote?: string;
  expectedReleaseDate?: string;
  promoVideoUrl?: string;
  features?: LandingFeature[];
  // Named per-book offers. Priced by @/lib/bookOffers (mirrors the server).
  offers?: BookOffers;
}

export interface LandingSettings {
  brandName?: string;
  brandNameBn?: string;
  logo?: string;
  favicon?: string;
  landingBookSlug?: string;
  landingHeadline?: string;
  landingSubheadline?: string;
  orderSupportPhone?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  deliveryNote?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
}

const json = async (url: string, revalidate = 60) => {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export async function getLandingSettings(): Promise<LandingSettings> {
  const body = await json(`${API}/api/settings`, 300);
  return (body?.data as LandingSettings) || {};
}

/**
 * The five selling points for this book, as the shop dictated them.
 *
 * Used only when the admin has not entered any features. Without a fallback the
 * whole "why this book" section vanishes, which is exactly the state the live
 * page was in — a title and a price and nothing else. The admin can override
 * every one of these from the book form; this is the floor, not the ceiling.
 */
export const DEFAULT_FEATURES: LandingFeature[] = [
  {
    text: 'এনাটমির মত একটা ভাস্ট সাবজেক্ট মাত্র ২৮০ পেজে সম্পূর্ণ ভাইভা কমপ্লিট, সাথে রিটেন ৯০% কাভার।',
    weight: 3,
  },
  {
    text: 'নতুন সিলেবাস অনুযায়ী Board-1 এ 70 Cards; Board-2 তে 100 Cards সংবলিত দেশের একমাত্র বই।',
    weight: 5,
    highlight: true,
  },
  {
    text: 'সম্পূর্ণ Practical (OSPE, Dissection, Surface Marking, Radiology) এর সমাধান এক জায়গাতেই।',
    weight: 2,
  },
  {
    text: 'মাত্র ৩ ঘণ্টায় দুই বোর্ডের সমস্ত স্পেশাল ফিগার পড়ে ফেলার সুযোগ।',
    weight: 2,
  },
  {
    text: 'একটা বইয়ের সাথেই প্রয়োজনীয় সকল ম্যাটেরিয়ালস — ছবি, ভিডিও, এক্সট্রা ইনফরমেশন।',
    weight: 1,
  },
];

/**
 * The configured book, or the best stand-in.
 *
 * Falls back deliberately rather than rendering an empty page: an admin who has
 * not set landingBookSlug yet still gets a working site, and the featured flag
 * is the next most likely intent.
 */
export async function getLandingBook(settings?: LandingSettings): Promise<LandingBook | null> {
  const s = settings ?? (await getLandingSettings());

  if (s.landingBookSlug) {
    const body = await json(`${API}/api/books/${encodeURIComponent(s.landingBookSlug)}`);
    if (body?.data) return body.data as LandingBook;
  }

  const list = await json(`${API}/api/books?limit=24`);
  const books: LandingBook[] = Array.isArray(list?.data) ? list.data : [];
  if (!books.length) return null;

  return (
    books.find((b) => (b as { isFeatured?: boolean }).isFeatured) ??
    books.find((b) => b.isPreOrder) ??
    books[0]
  );
}

/**
 * What the buyer actually pays and saves on the storefront — the HEADLINE price
 * (pre-order or normal discount), before the online-payment offer, which only
 * exists at checkout once a payment method is chosen. `label`/`mode` name the
 * active offer so the hero and CTA can show it instead of a fixed "pre-order",
 * and `online` carries the extra-if-you-pay-online incentive for a CTA hint.
 *
 * Delegates to @/lib/bookOffers so this quote and the invoice can never disagree.
 */
export function landingPrice(book: LandingBook | null) {
  const bp = priceBook(book, { online: false, quantity: 1 });
  return {
    price: bp.list,
    payable: bp.headlinePayable,
    saved: bp.headlineSaved,
    percent: bp.percent,
    // The active headline offer, for the badge/eyebrow copy.
    label: bp.headline.label,
    mode: bp.headline.mode,
    isPreOrder: bp.isPreOrder,
    // The online-payment offer, so the CTA can nudge "pay online, save more".
    online: bp.offers.online.enabled
      ? { label: bp.offers.online.label, percent: bp.offers.online.percent }
      : null,
  };
}

export const formatTk = (n: number) => '৳' + Math.round(n || 0).toLocaleString('en-US');

import type { Metadata } from 'next';
import {
  getBookOutline,
  getLandingBook,
  getLandingSettings,
  landingPrice,
} from '@/lib/landingBook';
import { PUBLIC_PAGES_ENABLED } from '@/config/site';
import LandingPage from '@/components/landing/LandingPage';
import MarketingHome from '@/components/home/MarketingHome';

/**
 * The public site.
 *
 * A SERVER component on purpose. The old homepage was `"use client"`, which
 * makes `generateMetadata` impossible — and without it a link to this site
 * posted on Facebook renders as a bare white box. Since the whole point of the
 * page is to be shared, the data is fetched here and the interactive parts live
 * in child client components.
 *
 * When NEXT_PUBLIC_PUBLIC_PAGES=on, the original multi-section marketing home
 * comes back instead; nothing about it was deleted.
 */

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLandingSettings();
  const book = await getLandingBook(settings);

  const brand = settings.brandName || 'Magic Viva';
  if (!book) {
    return { title: brand, description: 'মেডিকেল শিক্ষার্থীদের জন্য বই।' };
  }

  const price = landingPrice(book);
  const title = settings.landingHeadline || book.title;
  const description =
    settings.landingSubheadline ||
    (price.percent > 0
      ? `${price.percent}% ছাড়ে ${book.isPreOrder ? 'প্রি-অর্ডার' : 'অর্ডার'} করুন। ${
          book.description?.slice(0, 120) || ''
        }`.trim()
      : book.description?.slice(0, 160) || brand);

  // An absolute URL is required — Facebook will not follow a relative one.
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const image = book.coverImage;

  return {
    title,
    description,
    ...(site ? { metadataBase: new URL(site) } : {}),
    openGraph: {
      type: 'website',
      title: `${title} — ${brand}`,
      description,
      siteName: brand,
      locale: 'bn_BD',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: book.title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${title} — ${brand}`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function HomePage() {
  if (PUBLIC_PAGES_ENABLED) return <MarketingHome />;

  const settings = await getLandingSettings();
  const book = await getLandingBook(settings);
  // The book's own chapters and counts. Null when it has no QR content yet, in
  // which case the contents section simply does not render.
  const outline = book ? await getBookOutline(book.slug || book._id) : null;

  return <LandingPage book={book} settings={settings} outline={outline} />;
}

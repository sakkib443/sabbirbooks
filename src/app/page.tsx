import type { Metadata } from 'next';
import { getLandingBook, getLandingSettings, landingPrice } from '@/lib/landingBook';
import { landingSeoFor } from '@/lib/landingSeo';
import { PUBLIC_PAGES_ENABLED, SITE_URL } from '@/config/site';
import { BUSINESS_NAME, BUSINESS_NAME_BN, SUPPORT_PHONE_INTL } from '@/config/business';
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
 * The share image and the icons are files beside this one (opengraph-image.jpg,
 * icon.png, apple-icon.png, favicon.ico), all cut from the book's cover.
 *
 * When NEXT_PUBLIC_PUBLIC_PAGES=on, the original multi-section marketing home
 * comes back instead; nothing about it was deleted.
 */

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLandingSettings();
  const book = await getLandingBook(settings);

  const brand = settings.brandName || BUSINESS_NAME;
  if (!book) {
    return { title: brand, description: 'মেডিকেল শিক্ষার্থীদের জন্য বই।' };
  }

  // The book's search copy, when it has one, wins over the hero's headline:
  // the headline is written for someone already on the page, the title for
  // someone choosing between search results.
  const seo = landingSeoFor(book);
  const price = landingPrice(book);
  const title = seo?.title || settings.landingHeadline || book.title;
  const description =
    seo?.description ||
    settings.landingSubheadline ||
    (price.percent > 0
      ? `${price.percent}% ছাড়ে ${book.isPreOrder ? 'প্রি-অর্ডার' : 'অর্ডার'} করুন। ${
          book.description?.slice(0, 120) || ''
        }`.trim()
      : book.description?.slice(0, 160) || brand);

  return {
    title,
    description,
    ...(seo ? { keywords: seo.keywords } : {}),
    alternates: { canonical: '/' },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      type: 'website',
      url: '/',
      title,
      description,
      siteName: brand,
      locale: 'bn_BD',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * What Google is told about the page, beyond its text: the site's name and
 * logo (the name shown above a search result), the book as a product with the
 * price the page shows, and the FAQ exactly as it is printed on the page.
 */
function structuredData(
  book: NonNullable<Awaited<ReturnType<typeof getLandingBook>>>,
  settings: Awaited<ReturnType<typeof getLandingSettings>>
) {
  const seo = landingSeoFor(book);
  const price = landingPrice(book);
  const home = `${SITE_URL}/`;
  const brand = settings.brandName || BUSINESS_NAME;
  const outOfStock = book.format === 'printed' && !price.isPreOrder && (book.stock ?? 0) <= 0;
  const facebook = /^https:\/\/(www\.)?facebook\.com\//i.test(settings.facebookUrl || '')
    ? settings.facebookUrl
    : undefined;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${home}#website`,
      url: home,
      name: brand,
      alternateName: [BUSINESS_NAME_BN, 'MagicViva'],
      inLanguage: 'bn-BD',
      publisher: { '@id': `${home}#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${home}#organization`,
      name: brand,
      url: home,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/brand/magic-viva-logo-512.png`,
        width: 512,
        height: 512,
      },
      ...(facebook ? { sameAs: [facebook] } : {}),
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: SUPPORT_PHONE_INTL,
        contactType: 'customer service',
        areaServed: 'BD',
        availableLanguage: ['bn', 'en'],
      },
    },
    {
      '@type': 'Product',
      '@id': `${home}#book`,
      name: book.title,
      ...(seo ? { alternateName: 'Anatomy Viva Book for MBBS' } : {}),
      description: seo?.description || book.description || book.title,
      ...(book.coverImage ? { image: [book.coverImage] } : {}),
      sku: book.slug,
      category: 'Books',
      brand: { '@type': 'Brand', name: brand },
      offers: {
        '@type': 'Offer',
        url: home,
        priceCurrency: 'BDT',
        price: price.payable,
        itemCondition: 'https://schema.org/NewCondition',
        availability: price.isPreOrder
          ? 'https://schema.org/PreOrder'
          : outOfStock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        seller: { '@id': `${home}#organization` },
      },
    },
  ];

  // The server renders the page in Bengali, so the FAQ Google reads is the
  // Bengali one — the same words a visitor sees.
  if (seo) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${home}#faq`,
      inLanguage: 'bn-BD',
      mainEntity: seo.bn.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export default async function HomePage() {
  if (PUBLIC_PAGES_ENABLED) return <MarketingHome />;

  const settings = await getLandingSettings();
  const book = await getLandingBook(settings);

  return (
    <>
      {book && (
        <script
          type="application/ld+json"
          // `<` escaped so text from the book record cannot close the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData(book, settings)).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <LandingPage book={book} settings={settings} />
    </>
  );
}

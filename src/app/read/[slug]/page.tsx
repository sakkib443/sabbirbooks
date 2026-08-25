import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLandingSettings, landingPrice, formatTk, type LandingBook } from '@/lib/landingBook';
import ReadView from './ReadView';

/**
 * /read/<slug> — the link the shop posts on Facebook.
 *
 * It exists to be shared, so its whole job is: show a proper preview card when
 * pasted, let the visitor read the sample without leaving, and put a buy button
 * where they finish reading. A server component, because `generateMetadata` is
 * the only way to emit the Open Graph tags Facebook reads — a client page here
 * would render the bare white box the shop has today.
 */

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '');

async function getBook(slug: string): Promise<LandingBook | null> {
  try {
    const res = await fetch(`${API}/api/books/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data as LandingBook) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Next 16 hands route params in as a promise.
  const { slug } = await params;
  const [book, settings] = await Promise.all([getBook(slug), getLandingSettings()]);

  const brand = settings.brandName || 'Magic Viva';
  if (!book) return { title: brand };

  const price = landingPrice(book);
  const description =
    (book.description?.slice(0, 150) ||
      `${book.title} — বইয়ের কিছু অংশ পড়ে দেখুন।`) +
    (price.percent > 0 ? ` · ${price.percent}% ছাড়ে ${formatTk(price.payable)}` : '');

  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const image = book.coverImage;

  return {
    title: `${book.title} — পড়ে দেখুন`,
    description,
    ...(site ? { metadataBase: new URL(site) } : {}),
    alternates: site ? { canonical: `${site}/read/${slug}` } : undefined,
    openGraph: {
      type: 'article',
      title: `${book.title} — একটু পড়ে দেখুন`,
      description,
      siteName: brand,
      locale: 'bn_BD',
      ...(site ? { url: `${site}/read/${slug}` } : {}),
      // Facebook needs a real, absolute image or it renders a blank card. The
      // cover is uploaded through the PUBLIC media path, so it is fetchable by
      // a crawler that carries no session.
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: book.title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${book.title} — একটু পড়ে দেখুন`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [book, settings] = await Promise.all([getBook(slug), getLandingSettings()]);

  if (!book) notFound();

  const price = landingPrice(book);
  const hasSample = Boolean(book.previewPdfUrl || book.previewImages?.length);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {book.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={book.title}
            className="mx-auto w-40 shrink-0 rounded-xl border border-border object-contain shadow-soft sm:mx-0"
          />
        )}

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl hind-siliguri">
            {book.title}
          </h1>
          {book.author && (
            <p className="mt-1 text-muted-foreground hind-siliguri">{book.author}</p>
          )}

          <div className="mt-4 flex flex-wrap items-end justify-center gap-3 sm:justify-start">
            <span className="font-heading text-3xl font-bold text-primary">
              {formatTk(price.payable)}
            </span>
            {price.saved > 0 && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatTk(price.price)}
                </span>
                <span className="rounded-lg bg-coral/10 px-2.5 py-1 text-sm font-bold text-coral hind-siliguri">
                  {price.percent}% ছাড়
                </span>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/checkout?type=book&slug=${encodeURIComponent(book.slug)}`}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover hind-siliguri"
            >
              {book.isPreOrder ? 'প্রি-অর্ডার করুন' : 'অর্ডার করুন'}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
            >
              বই সম্পর্কে বিস্তারিত
            </Link>
          </div>

          {book.preOrderNote && (
            <p className="mt-3 text-sm text-muted-foreground hind-siliguri">{book.preOrderNote}</p>
          )}
        </div>
      </div>

      {hasSample ? (
        <ReadView book={book} />
      ) : (
        <p className="mt-10 rounded-xl border border-dashed border-border px-4 py-10 text-center text-muted-foreground hind-siliguri">
          এই বইয়ের নমুনা এখনো যোগ করা হয়নি।
        </p>
      )}

      {settings.orderSupportPhone && (
        <p className="mt-10 text-center text-sm text-muted-foreground hind-siliguri">
          কোনো প্রশ্ন থাকলে কল করুন{' '}
          <a href={`tel:${settings.orderSupportPhone}`} className="font-semibold text-primary">
            {settings.orderSupportPhone}
          </a>
        </p>
      )}
    </main>
  );
}

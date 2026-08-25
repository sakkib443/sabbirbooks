'use client';

/**
 * Assembles the one page the shop currently has.
 *
 * Order is the order a buyer decides in: what it is and what it costs, why it
 * is worth it, proof they can read for themselves, how the QR part works, then
 * the ask again for anyone who scrolled all the way down.
 */

import Link from 'next/link';
import { LuBookOpen } from 'react-icons/lu';
import { landingPrice } from '@/lib/landingBook';
import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingSample from './LandingSample';
import LandingQr from './LandingQr';
import LandingCta from './LandingCta';

export default function LandingPage({ book, settings }) {
  // Nothing to sell yet. Better an honest holding page than a broken one — this
  // is what an admin sees before they have published a book.
  if (!book) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <LuBookOpen className="text-2xl" />
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground hind-siliguri">
            বইটি শীঘ্রই আসছে
          </h1>
          <p className="mt-2 text-muted-foreground hind-siliguri">
            অ্যাডমিন প্যানেল থেকে বই প্রকাশ করলেই এই পাতায় দেখা যাবে।
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary"
          >
            লগইন
          </Link>
        </div>
      </main>
    );
  }

  const price = landingPrice(book);
  const checkoutHref = `/checkout?type=book&slug=${encodeURIComponent(book.slug)}`;
  const shareHref = `/read/${encodeURIComponent(book.slug)}`;

  return (
    <main>
      <LandingHero
        book={book}
        price={price}
        headline={settings?.landingHeadline}
        subheadline={settings?.landingSubheadline || book.description}
        checkoutHref={checkoutHref}
      />

      <LandingFeatures
        features={book.features || []}
        heading="কেন এই বইটি"
        subheading="যা যা পাচ্ছেন"
      />

      <LandingSample book={book} shareHref={book.previewPdfUrl ? shareHref : null} />

      <LandingQr />

      <LandingCta
        book={book}
        price={price}
        checkoutHref={checkoutHref}
        supportPhone={settings?.orderSupportPhone || settings?.phoneNumber}
        deliveryNote={settings?.deliveryNote}
      />
    </main>
  );
}

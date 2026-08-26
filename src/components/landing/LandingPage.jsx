'use client';

/**
 * Assembles the one page the shop currently has.
 *
 * Deliberately short. The hero now carries the cover, the price, the buttons,
 * the selling points and the video — everything a buyer needs — so what follows
 * it is only what the hero cannot say: how the QR codes work, and the ask again
 * for anyone who read to the bottom.
 *
 * The book's chapter list used to sit here too. It came out at the client's
 * request: what a QR opens is what the book is sold for, and the page should
 * not advertise the contents of something it will not let a visitor read.
 */

import Link from 'next/link';
import { LuBookOpen } from 'react-icons/lu';
import { landingPrice, DEFAULT_FEATURES } from '@/lib/landingBook';
import LandingHero from './LandingHero';
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

  return (
    <main>
      <LandingHero
        book={book}
        price={price}
        // Falls back to the shop's own five selling points when the admin has
        // entered none, so the middle column is never empty — which is exactly
        // how the page went live the first time: a title, a price, and nothing
        // to decide on.
        features={book.features?.length ? book.features : DEFAULT_FEATURES}
        headline={settings?.landingHeadline}
        subheadline={settings?.landingSubheadline || book.description}
        checkoutHref={checkoutHref}
      />

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

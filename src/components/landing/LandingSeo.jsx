'use client';

/**
 * What the book is, in the words students search with — then the questions a
 * buyer still has.
 *
 * Search engines rank a page on the text it shows, so this is where "Anatomy
 * Viva Book for MBBS", "viva card" and "practical viva" live as ordinary
 * sentences rather than hidden keywords. Copy comes from lib/landingSeo, the
 * same source as the page title and the FAQ structured data, so the three
 * cannot drift apart. Bilingual — follows the page language toggle.
 *
 * The FAQ uses <details>: every answer is in the HTML even while closed, it
 * opens with a keyboard, and it needs no script.
 */

import { LuChevronDown } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';
import { landingSeoFor } from '@/lib/landingSeo';

export default function LandingSeo({ book }) {
  const { isBengali } = useLanguage();
  const seo = landingSeoFor(book);
  if (!seo) return null;

  const L = isBengali ? seo.bn : seo.en;
  const bn = isBengali ? 'hind-siliguri' : '';

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      {/* The "Anatomy Viva Book for MBBS" block that stood here was taken
          off the page on 22 Oct 2026 at the shop's request; the FAQ stays. */}
      <div id="faq" className="mx-auto max-w-3xl scroll-mt-20">
        <h2 className={`text-center font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl ${bn}`}>
          {L.faqHeading}
        </h2>
        <div className="mt-6 space-y-3">
          {L.faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-card px-5 py-4 transition-shadow open:shadow-soft"
            >
              <summary
                className={`flex cursor-pointer list-none items-center justify-between gap-4 font-heading font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md [&::-webkit-details-marker]:hidden ${bn}`}
              >
                {item.q}
                <LuChevronDown
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className={`mt-3 text-sm leading-relaxed text-muted-foreground ${bn}`}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

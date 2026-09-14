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

import { LuChevronDown, LuLayers, LuMessageCircleQuestion, LuNotebookPen, LuStethoscope } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';
import { landingSeoFor } from '@/lib/landingSeo';

const ICONS = [LuLayers, LuStethoscope, LuMessageCircleQuestion, LuNotebookPen];

export default function LandingSeo({ book }) {
  const { isBengali } = useLanguage();
  const seo = landingSeoFor(book);
  if (!seo) return null;

  const L = isBengali ? seo.bn : seo.en;
  const bn = isBengali ? 'hind-siliguri' : '';

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{L.eyebrow}</p>
        <h2 className={`mt-2 font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl ${bn}`}>
          {L.heading}
        </h2>
        <p className={`mt-3 leading-relaxed text-muted-foreground ${bn}`}>{L.intro}</p>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {L.points.map((point, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={point.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="text-xl" />
              </span>
              <h3 className={`font-heading font-bold text-foreground ${bn}`}>{point.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-muted-foreground ${bn}`}>{point.body}</p>
            </li>
          );
        })}
      </ul>

      <p className={`mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground ${bn}`}>{L.closing}</p>

      <div id="faq" className="mx-auto mt-14 max-w-3xl scroll-mt-20">
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

'use client';

/**
 * What the book actually gives you.
 *
 * Features carry a `weight` set by the admin: the heavier ones get a wider cell
 * and a larger type size, so the page reflects what the author thinks matters
 * most instead of flattening everything into an identical grid. A feature
 * flagged `highlight` is the one the shop wants shouted — it renders in the
 * accent red and moves, once, when it scrolls into view.
 */

import { useEffect, useRef, useState } from 'react';
import { LuCheck } from 'react-icons/lu';

/** Reveal children as the section scrolls in, in document order. */
function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Fail OPEN. The reveal is decoration; the features are the reason the page
    // exists. If there is no element yet, or the browser has no
    // IntersectionObserver, show them rather than leaving the whole section at
    // opacity 0 forever.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    // Fires once, then stops observing — a list that re-animates every time it
    // scrolls past is the kind of motion that makes a page feel cheap.
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return [ref, shown];
}

export default function LandingFeatures({ features = [], heading, subheading }) {
  const [ref, shown] = useReveal();
  if (!features.length) return null;

  // Heaviest first, but keep the admin's order among equals.
  const ordered = [...features]
    .map((f, i) => ({ ...f, i }))
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1) || a.i - b.i);

  const maxWeight = Math.max(...ordered.map((f) => f.weight ?? 1), 1);

  return (
    <section ref={ref} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl hind-siliguri">
          {heading}
        </h2>
        {subheading && (
          <p className="mt-3 text-muted-foreground hind-siliguri">{subheading}</p>
        )}
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {ordered.map((f, idx) => {
          const weight = f.weight ?? 1;
          // The single most important feature spans the full width; the rest
          // share the two columns.
          const wide = weight >= maxWeight && maxWeight > 1;
          return (
            <li
              key={`${f.text}-${idx}`}
              style={{ transitionDelay: shown ? `${Math.min(idx, 6) * 70}ms` : '0ms' }}
              className={[
                'group rounded-2xl border p-5 transition-all duration-500 sm:p-6',
                wide ? 'sm:col-span-2' : '',
                f.highlight
                  ? 'border-coral/35 bg-coral/[0.07]'
                  : 'border-border bg-card shadow-soft hover:border-primary/30',
                shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
              ].join(' ')}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={[
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    f.highlight ? 'bg-coral text-white' : 'bg-primary-soft text-primary',
                  ].join(' ')}
                >
                  <LuCheck className="text-sm" strokeWidth={3} />
                </span>

                <p
                  className={[
                    'leading-relaxed hind-siliguri',
                    f.highlight
                      ? 'text-lg font-bold text-coral sm:text-xl'
                      : wide
                        ? 'text-lg font-semibold text-foreground'
                        : 'text-foreground',
                    // The shouted line gets a slow, small nudge so it catches
                    // the eye in peripheral vision without ever being read as
                    // a broken layout.
                    f.highlight ? 'motion-safe:animate-nudge' : '',
                  ].join(' ')}
                >
                  {f.text}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

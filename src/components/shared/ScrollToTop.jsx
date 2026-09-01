'use client';

/**
 * Where a page opens.
 *
 * No hash → the top. A hash → that section.
 *
 * Both halves are here rather than left to the browser, because neither worked
 * on its own:
 *
 *   • Opening at the top was broken by `overflow-x: hidden` on body, which made
 *     BODY the scroll container — so Next's own scroll-to-top scrolled a window
 *     that was not the thing scrolling. That is fixed in globals.css now, but
 *     the browser still restores the previous offset on a navigation Next does
 *     not treat as a fresh push (a redirect to /login, a router.replace). The
 *     visible result was pressing Order from halfway down the homepage and
 *     landing halfway down the next page.
 *
 *   • Scrolling to a hash was broken by timing: #sample lives in a section that
 *     is not in the document when the browser looks for it, so the native jump
 *     finds nothing and gives up. Retrying for a moment finds it.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** How long to keep looking for a hash target that renders after the data. */
const HASH_RETRY_MS = 1500;
const HASH_RETRY_EVERY = 100;
/** Clears the sticky navbar, so a section does not open under it. */
const HASH_OFFSET = 80;

export default function ScrollToTop() {
  const pathname = usePathname();

  // The browser's own restoration would otherwise put the old offset back a
  // moment after this component has scrolled to the top — once the new page has
  // grown tall enough to hold it.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    if (!hash) {
      // 'instant': html carries scroll-behavior: smooth for in-page links, and
      // inheriting it here would animate a scroll nobody asked for, across a
      // page they have not seen yet.
      const top = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      top();
      // Again after paint — a route change can grow the document after this
      // runs, and a scroll set while the page was still short does not survive.
      const raf = requestAnimationFrame(top);
      const t = window.setTimeout(top, 120);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }

    // A hash: put its target under the navbar, and keep asserting that until it
    // sticks. Two things work against a single attempt — the section may not be
    // in the document yet (it waits on the book), and hydration resets the
    // scroll shortly after the first paint, undoing an early jump. So this
    // re-scrolls every tick and only stops once the element has actually stayed
    // where it was put, or the window closes.
    let elapsed = 0;
    const id = window.setInterval(() => {
      elapsed += HASH_RETRY_EVERY;
      const el = document.getElementById(hash);

      if (el) {
        const offsetNow = el.getBoundingClientRect().top;
        // Close enough, and it held: done.
        if (Math.abs(offsetNow - HASH_OFFSET) < 4) {
          window.clearInterval(id);
          return;
        }
        // Not scrollIntoView: `behavior: 'auto'` defers to the CSS, which is
        // `scroll-behavior: smooth` here, and that animation is cancelled by
        // whatever else is settling — the element gets reached and then
        // abandoned back at the start. A computed, instant scroll lands.
        const top = window.scrollY + offsetNow - HASH_OFFSET;
        window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'instant' });
      }

      if (elapsed >= HASH_RETRY_MS) window.clearInterval(id);
    }, HASH_RETRY_EVERY);

    return () => window.clearInterval(id);
  }, [pathname]);

  return null;
}

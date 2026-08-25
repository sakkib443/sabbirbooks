/**
 * What the public site currently is.
 *
 * The shop sells one book. The course catalogue, the books index, the about and
 * contact pages were all built for a wider site and are not wanted right now —
 * but they are not gone, only switched off here. Flipping this one flag brings
 * the whole marketing site back: the routes still exist, the components still
 * compile, nothing was deleted.
 *
 * Set NEXT_PUBLIC_PUBLIC_PAGES=on to re-enable them without a code change.
 */
export const PUBLIC_PAGES_ENABLED = process.env.NEXT_PUBLIC_PUBLIC_PAGES === 'on';

/**
 * Routes that only exist when the full marketing site is on. A visitor who
 * types one of these — or follows an old link, or a search result — lands on
 * the book instead of a 404.
 *
 * Deliberately NOT listed, because they must keep working in single-page mode:
 *   /                  the landing page itself
 *   /books/<slug>      the book's own page, which checkout links to
 *   /read/<slug>       the shareable sample-reading page
 *   /checkout          buying
 *   /login /register   accounts
 *   /b/<code>          what a printed QR opens
 *   /dashboard/**      the admin panel and a reader's own area
 */
export const MARKETING_ONLY_ROUTES = [
  '/about',
  '/contact',
  '/courses',
  '/books',
  '/blog',
];

/** True when this path should be hidden in the current mode. */
export function isHiddenRoute(pathname) {
  if (PUBLIC_PAGES_ENABLED) return false;
  return MARKETING_ONLY_ROUTES.some(
    (route) =>
      // /books is hidden, but /books/anatomy-magic-viva is not — the book's own
      // page is where checkout sends people.
      pathname === route || (route !== '/books' && pathname.startsWith(`${route}/`))
  );
}

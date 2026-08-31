import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isHiddenRoute } from '@/config/site';

/**
 * Keeps the public site to a single page while the shop sells one book.
 *
 * The course catalogue, books index, about and contact pages still exist and
 * still build — they are simply not reachable. A visitor who follows an old
 * link, a bookmark or a search result lands on the book rather than on a page
 * the shop no longer wants to show. Flip NEXT_PUBLIC_PUBLIC_PAGES=on and every
 * one of them is live again with no code change.
 *
 * 307 rather than 308: this is a temporary shape for the site, and a permanent
 * redirect would be cached by browsers and search engines long after the flag
 * is turned back on.
 *
 * In Next 16 this file is `proxy`, not `middleware` — the middleware convention
 * was renamed.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isHiddenRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  // Only the marketing routes are considered. Everything else — the API proxy,
  // uploads, static assets, the QR scan page, checkout, the dashboards — must
  // not pay for a proxy hop on every request.
  matcher: ['/courses/:path*', '/books', '/blog/:path*'],
};

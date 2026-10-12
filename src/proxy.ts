import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isHiddenRoute } from '@/config/site';

/**
 * Header the API reads to learn who the visitor is. Must match
 * CLIENT_IP_HEADER in the server's src/app/utils/clientIp.ts.
 */
const CLIENT_IP_HEADER = 'x-mv-client-ip';

/**
 * The visitor's address, as Traefik saw it.
 *
 * Traefik puts the connecting address LAST in X-Forwarded-For (anything a
 * visitor sent themselves can only sit before it), so the last entry is the one
 * to believe.
 */
const visitorIp = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const last = forwarded.split(',').pop()?.trim();
  return last || request.headers.get('x-real-ip')?.trim() || '';
};

/**
 * Two jobs.
 *
 * 1. Keeps the public site to a single page while the shop sells one book.
 *
 *    The course catalogue, books index, about and contact pages still exist and
 *    still build — they are simply not reachable. A visitor who follows an old
 *    link, a bookmark or a search result lands on the book rather than on a
 *    page the shop no longer wants to show. Flip NEXT_PUBLIC_PUBLIC_PAGES=on
 *    and every one of them is live again with no code change.
 *
 *    307 rather than 308: this is a temporary shape for the site, and a
 *    permanent redirect would be cached by browsers and search engines long
 *    after the flag is turned back on.
 *
 * 2. Tells the API who is asking, on the few API routes that are rate limited.
 *
 *    The /api rewrite in next.config.ts means the API only ever sees THIS
 *    server as the caller — one address for every visitor — so each limit was
 *    shared by the whole site: thirty QR scans a minute for every student
 *    together. Each request here carries the visitor's own address instead,
 *    overwriting anything the visitor sent under that name.
 *
 *    Only those routes, never all of /api: while this runs, Next buffers the
 *    request body and cuts it at 10 MB (proxyClientMaxBodySize), which would
 *    break every large upload in the dashboard. The server trusts the header
 *    only on exactly these paths for the same reason — keep the two lists the
 *    same.
 *
 * In Next 16 this file is `proxy`, not `middleware` — the middleware convention
 * was renamed.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (/^\/api\//i.test(pathname)) {
    const headers = new Headers(request.headers);
    const ip = visitorIp(request);
    if (ip) headers.set(CLIENT_IP_HEADER, ip);
    else headers.delete(CLIENT_IP_HEADER);
    return NextResponse.next({ request: { headers } });
  }

  if (isHiddenRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  // Everything else — the rest of the API proxy, uploads, static assets, the QR
  // scan page, checkout, the dashboards — must not pay for a proxy hop on every
  // request.
  matcher: [
    // Marketing routes hidden while the shop sells one book.
    '/courses/:path*',
    '/books',
    '/blog/:path*',
    // Rate-limited API routes (server: utils/clientIp.ts TRUSTED_PATHS).
    //
    // "api" in ANY case: the /api rewrite matches case-insensitively and always
    // forwards the literal "/api", so "/API/orders" reaches the server as
    // "/api/orders" — a path it trusts. Were this matcher case-sensitive, that
    // spelling would skip this file and carry whatever header the visitor
    // invented. The rest of each path stays exact: the server receives it as
    // typed and trusts only the exact spelling.
    '/:api([aA][pP][iI])/book-content/scan/:code',
    '/:api([aA][pP][iI])/orders',
    '/:api([aA][pP][iI])/book-coupons/validate',
    '/:api([aA][pP][iI])/user/google-signin',
  ],
};

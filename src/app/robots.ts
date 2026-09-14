import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

/**
 * /robots.txt
 *
 * Everything public is open. Closed: the dashboards, checkout and payment
 * (nothing to find there, and every visit is someone's order), the API, the
 * staff preview, and /b/ — the page a printed QR code opens, whose answers are
 * what the book is sold for and must not turn up in search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/checkout', '/payment/', '/api/', '/b/', '/book-preview/', '/activate'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';
import { LEGAL_PAGES } from '@/config/business';

/**
 * /sitemap.xml
 *
 * The book's landing page, which is the site, and the policy pages. Nothing
 * else is listed while the site is a single page: the rest is either private
 * or switched off (see config/site.js).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...LEGAL_PAGES.map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];
}

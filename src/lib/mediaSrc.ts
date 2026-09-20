/**
 * A media URL the image optimizer can actually take.
 *
 * Uploaded media is stored with an absolute URL ("https://magicviva.com/
 * uploads/materials/cover.png"), and next/image refuses a remote host that is
 * not in next.config's remotePatterns. The site's own domain never is: the
 * build only knows the API host, and the domain can change without a rebuild.
 *
 * It does not have to be remote at all. This site proxies /uploads to the
 * backend (see next.config rewrites), so that absolute URL is also a path on
 * whatever origin is serving the page — and a same-origin path is optimised
 * with no configuration and no host list to keep in step.
 *
 * Anything else (a Cloudinary URL, a data: URI, a path already) is handed back
 * untouched.
 */
export function mediaSrc(url?: string | null): string {
  const s = String(url || '');
  if (!s.toLowerCase().startsWith('http')) return s;
  const at = s.indexOf('/uploads/');
  return at > 0 ? s.slice(at) : s;
}

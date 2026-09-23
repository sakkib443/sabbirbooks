/**
 * The small copies of an uploaded picture.
 *
 * The server keeps two lighter versions of every figure and cover beside the
 * original, named after it — "figure.jpg" also has "figure.jpg.thumb.webp"
 * (the grid tile) and "figure.jpg.view.webp" (what opens when it is tapped).
 * Nothing about them is stored: the address is worked out from the original's,
 * and the server makes the copy the first time one is asked for. So a figure
 * uploaded a year ago gets one too, and every URL already saved in an answer
 * stays exactly as it is.
 *
 * Always pair these with `onVariantError` on the element: if a copy cannot be
 * made — an odd format, a corrupt file — the page must still show the picture,
 * heavy or not.
 */

// What the server can convert. GIF stays a GIF (it may be animated) and SVG is
// already small and sharp at any size.
const CONVERTIBLE = /\.(jpe?g|png|webp|tiff?|avif|heic|heif)$/i;
const VARIANT_SUFFIX = /\.(thumb|view)\.webp(?=\?|$)/;

/** @param kind 'thumb' (≈480px wide) or 'view' (≈1600px wide) */
export function variantUrl(url, kind = 'view') {
  if (typeof url !== 'string' || !url) return url;
  const [base, query] = url.split('?');
  if (!CONVERTIBLE.test(base)) return url;
  return `${base}.${kind}.webp${query ? `?${query}` : ''}`;
}

/** The picture a copy was made from — or the URL itself if it is not a copy. */
export const originalUrl = (url) =>
  typeof url === 'string' ? url.replace(VARIANT_SUFFIX, '') : url;

/** onError handler: put the original back when its small copy is missing. */
export function onVariantError(event) {
  const img = event.currentTarget;
  const original = originalUrl(img.src);
  if (original === img.src || img.dataset.fellBack === '1') return; // let it fail quietly
  img.dataset.fellBack = '1';
  img.src = original;
}

/**
 * Points the pictures inside an answer at their lighter copies.
 *
 * An answer arrives as a string of HTML with its images already in it, so they
 * cannot be given props like the rest of the page. The swap happens in the
 * string, BEFORE it reaches the document: rewriting the elements afterwards
 * meant the browser had already started downloading the full-size original —
 * paying for the very bytes this exists to save.
 *
 * Each image keeps its original address in data-original, which is what
 * `attachAnswerImageFallback` puts back if the copy turns out to be missing.
 */
export function lightenAnswerHtml(html) {
  if (typeof html !== 'string' || !html) return html;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!src) return tag;
    const original = src[1];
    const lighter = variantUrl(original, 'view');
    if (lighter === original) return tag;
    const swapped = tag.replace(src[0], ` src="${lighter}" data-original="${original}"`);
    return /\sloading\s*=/i.test(swapped)
      ? swapped
      : swapped.replace(/<img\b/i, '<img loading="lazy" decoding="async"');
  });
}

/**
 * Makes each rewritten answer image fall back to its original.
 * Call it on the container after the answer renders.
 */
export function attachAnswerImageFallback(node) {
  if (!node) return;
  node.querySelectorAll('img[data-original]').forEach((img) => {
    if (img.dataset.fallbackReady === '1') return;
    img.dataset.fallbackReady = '1';
    img.addEventListener(
      'error',
      () => {
        const original = img.dataset.original;
        if (original && img.dataset.fellBack !== '1') {
          img.dataset.fellBack = '1';
          img.src = original;
        }
      },
      { once: true }
    );
  });
}

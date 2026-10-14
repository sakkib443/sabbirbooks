/**
 * Is this page open inside another app's built-in browser?
 *
 * A printed QR is usually scanned with the camera, Google Lens or a scanner
 * app, and many of those open the link in their own small browser instead of
 * Chrome. Those browsers often drop a download without a word — the student
 * taps "ডাউনলোড" and nothing happens. Android WebViews mark themselves with
 * "; wv)"; the Facebook, Instagram, Line and Google apps name themselves.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /; wv\)|FBAN|FBAV|FB_IAB|Instagram|Line\/|GSA\/|Messenger/i.test(ua);
}

export const isAndroid = (): boolean =>
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");

/**
 * The same page, opened in Chrome. Android only: an intent link hands the URL
 * to Chrome directly, and falls back to the normal link if Chrome is missing.
 */
export function chromeLink(href: string): string {
  try {
    const u = new URL(href);
    const fallback = encodeURIComponent(href);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  } catch {
    return href;
  }
}

/**
 * Meta (Facebook) Pixel — the four events the shop's ads are measured by.
 *
 *   PageView              a page is opened          components/analytics/MetaPixel
 *   CompleteRegistration  an account is made        the register page, the book-code
 *                                                   form, and a Google sign-up
 *                                                   finishing its profile (ProfileGate)
 *   InitiateCheckout      the order form is opened  CheckoutView
 *   Purchase              an order is placed, or    CheckoutView, PaymentReturn
 *                         an online payment clears
 *
 * Only a production build talks to Facebook. `next dev` prints the same calls
 * to the browser console instead, so every event can be checked on a laptop
 * without a single test visit landing in the numbers the shop buys ads by.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "2102406647330843";

export const isPixelLive = process.env.NODE_ENV === "production";

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/**
 * Meta's own stub, the part of their snippet that runs before the library.
 *
 * Calls made before fbevents.js has arrived wait in its queue, and the library
 * replays them when it lands — so an event fired during a page's first render
 * is not lost to the order in which React happens to run effects.
 */
export function preparePixel(): void {
  if (!isPixelLive || typeof window === "undefined" || window.fbq) return;
  const stub = function (...args: unknown[]) {
    if (stub.callMethod) stub.callMethod.apply(stub, args);
    else stub.queue.push(args);
  } as Fbq;
  if (!window._fbq) window._fbq = stub;
  stub.push = stub;
  stub.loaded = true;
  stub.version = "2.0";
  stub.queue = [];
  window.fbq = stub;
  stub("init", META_PIXEL_ID);
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!isPixelLive) {
    console.info(`[Meta Pixel] ${event}`, params ?? "");
    return;
  }
  preparePixel();
  if (params) window.fbq?.("track", event, params);
  else window.fbq?.("track", event);
}

/**
 * For an intent the same visit can show twice. InitiateCheckout is the case: a
 * signed-out buyer opens the order form, is sent to log in, and is brought
 * straight back to it — one decision to buy, not two.
 */
export function trackOncePerSession(event: string): void {
  const key = `mv_pixel_${event}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Storage blocked (private mode on some phones): a possible duplicate is a
    // smaller error than a missing event.
  }
  track(event);
}

/**
 * A placed order, counted once however many times its success screen is seen.
 *
 * The value is what the books sold for — after offers and coupons, and without
 * the delivery charge, which is the courier's money passing through the order
 * rather than a sale.
 */
export function trackPurchase(order: { _id?: string; total?: number; deliveryCharge?: number }): void {
  const key = order._id ? `mv_pixel_purchase_${order._id}` : "";
  try {
    if (key && localStorage.getItem(key)) return;
    if (key) localStorage.setItem(key, "1");
  } catch {
    // See trackOncePerSession.
  }
  const value = Math.max(0, Math.round(Number(order.total || 0) - Number(order.deliveryCharge || 0)));
  track("Purchase", { value, currency: "BDT" });
}

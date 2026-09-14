// What delivery will cost, worked out in the browser exactly as the server does.
//
// The server re-prices every order (order.service.ts → quoteDeliveryCharge), so
// this is never the source of truth. It exists so the number on the summary is
// the number on the invoice: a total that changes after the buyer presses the
// button is the one surprise this screen is built to avoid. Any change here has
// to be made there too, and the other way round.

import type { CollegeOption } from "./types";

export type DeliveryRule = "digital" | "free-above" | "college" | "standard";

const norm = (s?: string) => String(s || "").trim().replace(/\s+/g, " ");
const sameGeo = (a?: string, b?: string) => norm(a) !== "" && norm(a) === norm(b);

/**
 * Does the college's own delivery rate apply to a parcel going here?
 *
 * Only when the college has a rate AND the parcel goes to that college's own
 * district and upazila. The rate is the shop's price for delivering to that
 * campus — a Rajshahi Medical College student sending the book home to Narail
 * pays the standard charge.
 */
export function collegeRateApplies(
  college: Pick<CollegeOption, "district" | "upazila" | "deliveryCharge"> | null | undefined,
  district?: string,
  upazila?: string
): boolean {
  if (!college) return false;
  const rate = college.deliveryCharge;
  if (rate === null || rate === undefined || !Number.isFinite(Number(rate)) || Number(rate) < 0) {
    return false;
  }
  return sameGeo(college.district, district) && sameGeo(college.upazila, upazila);
}

/** The delivery charge before any free-delivery coupon, and the rule that set it. */
export function quoteDelivery(opts: {
  isPrinted: boolean;
  /** Settings.deliveryCharge, from checkout-options. */
  standard: number;
  codExtra: number;
  isCod: boolean;
  /** Settings.freeDeliveryAbove; 0 = off. */
  freeAbove: number;
  /** Books after offers and coupon — what the threshold is measured on. */
  productTotal: number;
  college: CollegeOption | null;
  district: string;
  upazila: string;
}): { charge: number; rule: DeliveryRule } {
  if (!opts.isPrinted) return { charge: 0, rule: "digital" };
  if (opts.freeAbove > 0 && opts.productTotal >= opts.freeAbove) return { charge: 0, rule: "free-above" };

  const codExtra = opts.isCod ? Math.max(0, opts.codExtra || 0) : 0;

  if (collegeRateApplies(opts.college, opts.district, opts.upazila)) {
    const rate = Math.max(0, Math.round(Number(opts.college!.deliveryCharge)));
    // Free means free, whichever way the buyer pays.
    return { charge: rate === 0 ? 0 : rate + codExtra, rule: "college" };
  }

  return { charge: Math.max(0, Math.round((opts.standard || 0) + codExtra)), rule: "standard" };
}

// ─── Which ways of paying are open right now ────────────────────────────────
//
// Pulled out of CheckoutView as plain functions with no React in them, because
// this is the one piece of checkout where a wrong answer costs real money: the
// manual Send-Money flow and cash on delivery are the live revenue path, and a
// gateway being added must not be able to take either of them away. Pure
// functions can be exhaustively tested across every combination; the same logic
// spread through JSX conditionals cannot.
//
// The rule the tests pin down: whatever the gateway configuration says, if the
// shop allowed manual or COD before, it still allows it.

import type { ManualChannel, PayMode } from "./types";

export type GatewayId = "bkash" | "sslcommerz";

/** GET /api/payment/gateways — what the server has credentials for. */
export interface GatewayStatus {
  bkash: { configured: boolean; live: boolean };
  sslcommerz: { configured: boolean; live: boolean };
  anyConfigured: boolean;
}

export interface AvailabilityInput {
  /** A physical parcel exists — the only thing a courier can collect cash for. */
  isPrintedBook: boolean;
  outOfStock: boolean;
  isFreeCourse: boolean;
  /** From GET /api/orders/checkout-options. */
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  /** Wallets the admin has put a receiving number against. */
  manualChannels: ManualChannel[];
  /** null while still loading, or when the endpoint could not be reached. */
  gateways: GatewayStatus | null;
}

export interface Availability {
  /** Anything at all has to be paid. */
  needsPayment: boolean;
  cod: boolean;
  /** Send Money by hand, then an admin verifies the TrxID. */
  manual: boolean;
  /** Hosted checkout — money settles instantly. */
  gateway: boolean;
  gatewayOptions: GatewayId[];
}

export const getAvailability = (input: AvailabilityInput): Availability => {
  const {
    isPrintedBook, outOfStock, isFreeCourse,
    codEnabled, onlinePaymentEnabled, manualChannels, gateways,
  } = input;

  const needsPayment = !outOfStock && !isFreeCourse;

  // Unchanged from the original inline expression: cash on delivery needs
  // something to physically deliver, in stock, with the shop switch on.
  const cod = Boolean(isPrintedBook && !outOfStock && codEnabled);

  // `onlinePaymentEnabled` is the admin's one switch over paying now, so it gates
  // the hosted gateway and the manual flow alike.
  const manual = Boolean(needsPayment && onlinePaymentEnabled && manualChannels.length > 0);

  const gatewayOptions: GatewayId[] = [];
  if (gateways?.bkash.configured) gatewayOptions.push("bkash");
  if (gateways?.sslcommerz.configured) gatewayOptions.push("sslcommerz");

  const gateway = Boolean(needsPayment && onlinePaymentEnabled && gatewayOptions.length > 0);

  return { needsPayment, cod, manual, gateway, gatewayOptions: gateway ? gatewayOptions : [] };
};

/**
 * The mode actually in force, given what the buyer picked.
 *
 * Deliberately mirrors the original one-liner
 *   `codAllowed && payMode === "cod" ? "cod" : "online"`
 * with only the gateway branch added. In particular an unavailable "online"
 * choice still resolves to "online" rather than being quietly rewritten to COD:
 * the buyer sees the "not set up yet — please choose Cash on Delivery" notice and
 * makes that call themselves. Silently moving someone onto a different way of
 * paying is not a thing to do behind their back.
 */
export const resolvePayMode = (chosen: PayMode, a: Availability): PayMode => {
  if (chosen === "cod") return a.cod ? "cod" : a.gateway ? "gateway" : "online";
  if (chosen === "gateway") return a.gateway ? "gateway" : "online";
  return "online";
};

/**
 * Which gateway to send the buyer to when they pick "pay now instantly".
 *
 * bKash first when both are configured: the shop's buyers already pay by bKash
 * (that is what the manual flow has always been), and the direct integration
 * costs the merchant less per transaction than routing the same wallet through
 * the aggregator.
 */
export const preferredGateway = (a: Availability): GatewayId | null =>
  a.gatewayOptions.includes("bkash")
    ? "bkash"
    : a.gatewayOptions.includes("sslcommerz")
      ? "sslcommerz"
      : null;

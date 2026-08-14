// Shared types + tiny helpers for the Checkout flow.
// Mirrors the *public* server shapes: course (GET /api/courses/:id) and
// book (GET /api/books/:slug), plus the Order returned by /api/orders.

export type CheckoutType = "course" | "book";
// The hosted gateways. Real when the server reports credentials for them
// (GET /api/payment/gateways); a built-in demo stand-in otherwise.
export type PaymentMethod = "bkash" | "sslcommerz";

// Manual payment — the mobile wallet the buyer used to Send Money.
export type ManualChannel = "bkash" | "rocket" | "nagad";

// How the buyer pays.
//   gateway → hosted bKash/SSLCommerz checkout, settles instantly
//   online  → Send Money by hand now, submit the TrxID, admin verifies
//   cod     → hand cash to the courier when the parcel arrives
//
// "online" keeps its original meaning of the MANUAL flow. Renaming it to
// something clearer would have been tidier, but it is the live revenue path and
// the name is load-bearing in CheckoutView, the success screen and the admin
// order queue — a rename buys nothing and risks the one flow that must not break.
export type PayMode = "gateway" | "online" | "cod";

// Courier zone; drives the delivery charge.
export type DeliveryArea = "inside-dhaka" | "outside-dhaka";

// GET /api/orders/checkout-options — what the shop currently accepts and charges.
export interface CheckoutOptions {
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  deliveryCharge: Record<DeliveryArea, number>;
  codExtraCharge: number;
  freeDeliveryAbove: number;
  deliveryNote: string;
  supportPhone: string;
  wallets: { bkash: string; rocket: string; nagad: string; instructions: string };
}

// The Send-Money details the buyer submits at checkout for admin verification.
export interface ManualDetails {
  channel: ManualChannel;
  transactionId: string;
  senderNumber: string;
  sentAt: string; // datetime-local string ("when did you send it?")
  note?: string;
}

// Receiving numbers configured by the admin (GET /api/settings), shown on checkout.
export interface PaymentSettings {
  bkash: string;
  rocket: string;
  nagad: string;
  instructions: string;
}

// Human labels + icons for the three manual channels.
export const MANUAL_CHANNELS: { id: ManualChannel; en: string; bn: string }[] = [
  { id: "bkash", en: "bKash", bn: "বিকাশ" },
  { id: "rocket", en: "Rocket", bn: "রকেট" },
  { id: "nagad", en: "Nagad", bn: "নগদ" },
];

// ── Course (GET /api/courses/:id → { success, data }) ──────────────────────
// fee / offerPrice come back as numeric-ish strings on the course model.
export interface CheckoutCourse {
  _id: string;
  id: number;
  title: string;
  slug?: string;
  image?: string;
  type?: string;
  fee?: string | number;
  offerPrice?: string | number;
  durationMonth?: number;
  lectures?: number;
  totalExam?: number;
}

// ── Book (GET /api/books/:slug → { success, data }) ────────────────────────
export interface CheckoutBook {
  _id: string;
  id?: number;
  title: string;
  slug: string;
  author?: string;
  coverImage?: string;
  price?: number;
  offerPrice?: number;
  category?: string;
  language?: string;
  format?: "printed" | "digital" | string;
  stock?: number;
}

// ── Shipping address (required for printed books) ──────────────────────────
export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  area?: DeliveryArea;
  note?: string;
}

// ── Order (returned by /api/orders create + complete) ──────────────────────
export interface OrderItem {
  book: string; // Mongo _id of the Book — needed for the download endpoint
  title: string;
  price: number;
  quantity: number;
  format: "printed" | "digital";
}

export interface OrderResult {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  deliveryType: "printed" | "digital" | "mixed";
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  total: number;
  status: string;
  payment: { status: string; method?: string; transactionId?: string };
  shippingAddress?: ShippingAddress;
}

// Result handed to the success screen once a flow finishes end-to-end.
export type SuccessResult =
  | {
      kind: "course";
      courseTitle: string;
      reference: string; // transaction / enrollment reference
      method: PaymentMethod | "free";
      amount: number;
    }
  | {
      kind: "book";
      order: OrderResult;
    }
  | {
      // Manual payment submitted — pending admin verification (course OR book).
      kind: "manual";
      itemKind: CheckoutType;
      title: string;
      reference: string; // order number / enrollment ref
      // Mongo _id, book orders only. `reference` is the human-facing order
      // number, which the tracking route cannot look up — carrying the id
      // lets the success screen link straight at the order instead of
      // dropping the buyer on a list to find it themselves.
      orderId?: string;
      amount: number;
      channel: ManualChannel;
      isPrintedBook?: boolean;
    }
  | {
      // Cash on delivery — nothing has been paid yet; the courier collects.
      kind: "cod";
      title: string;
      reference: string; // order number
      orderId?: string; // Mongo _id — see the note on `manual` above
      amount: number; // what the courier will collect
      deliveryCharge: number;
      supportPhone?: string;
      deliveryNote?: string;
    };

// Progress steps surfaced on the "Confirm & Pay" button while a flow runs.
export type CheckoutStep =
  | "idle"
  | "creating"
  | "initiating"
  | "paying"
  // Handing the browser over to the gateway's hosted page. The button stays in
  // this state until navigation happens, so nobody clicks Pay twice while the
  // redirect is in flight and ends up with two orders.
  | "redirecting"
  | "confirming"
  | "done";

// Safely coerce a numeric-ish string/number to a finite number (0 fallback).
export const toNumber = (v?: string | number | null): number => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Effective unit price = offer price when it's a real, lower discount, else base.
export const effectiveCoursePrice = (c: CheckoutCourse): number => {
  const fee = toNumber(c.fee);
  const offer = toNumber(c.offerPrice);
  return offer > 0 && offer < fee ? offer : fee;
};

export const effectiveBookPrice = (b: CheckoutBook): number => {
  const price = toNumber(b.price);
  const offer = toNumber(b.offerPrice);
  return offer > 0 && offer < price ? offer : price;
};

// ৳-prefixed amount, grouped. Whole numbers only (prices here are integers).
export const formatTk = (v: number): string => "৳" + Math.round(v).toLocaleString("en-US");

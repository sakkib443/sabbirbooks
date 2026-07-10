// Shared types + tiny helpers for the Checkout flow.
// Mirrors the *public* server shapes: course (GET /api/courses/:id) and
// book (GET /api/books/:slug), plus the Order returned by /api/orders.

export type CheckoutType = "course" | "book";
export type PaymentMethod = "bkash" | "sslcommerz";

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
    };

// Progress steps surfaced on the "Confirm & Pay" button while a flow runs.
export type CheckoutStep =
  | "idle"
  | "creating"
  | "initiating"
  | "paying"
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

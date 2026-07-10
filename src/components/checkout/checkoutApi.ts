// All Checkout ↔ server calls live here so the contract with the backend is in
// one place. Every authenticated call sends `Authorization: Bearer <sb_token>`.
//
// Endpoints used (confirmed against the server modules):
//   Course : POST /api/payment/bkash/initiate      { courseId, amount, totalFee }
//            POST /api/payment/bkash/demo-complete  { paymentID, courseId, amount, totalFee }
//            POST /api/payment/sslcommerz/init      { courseId, amount, courseName, totalFee }
//            POST /api/payment/sslcommerz/demo-complete { tran_id, courseId, amount, totalFee }
//            POST /api/payment/free/enroll          { courseId }
//   Book   : POST /api/orders                       { items:[{ bookSlugOrId, quantity }], shippingAddress? }
//            POST /api/orders/:id/pay/bkash | /pay/sslcommerz
//            POST /api/orders/:id/pay/complete      { method }
//            GET  /api/orders/:id/download/:bookId  → { title, secureFileUrl }
import API_BASE_URL from "@/config/api";
import { STORAGE_KEYS } from "@/components/auth/authClient";
import {
  CheckoutBook,
  CheckoutCourse,
  CheckoutStep,
  OrderResult,
  PaymentMethod,
  ShippingAddress,
  effectiveCoursePrice,
} from "./types";

// ── Auth helpers ───────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getStoredUser(): {
  firstName?: string;
  lastName?: string;
  name?: string;
  phoneNumber?: string;
  role?: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// POST helper that throws the server's friendly message on failure.
async function post<T = Record<string, unknown>>(
  path: string,
  body: unknown,
  fallbackErr: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("__NETWORK__");
  }
  const json = await readJson(res);
  if (!res.ok || json.success === false) {
    throw new Error((json.message as string) || fallbackErr);
  }
  return (json.data as T) ?? (json as T);
}

// ── Item fetchers (public, no auth) ────────────────────────────────────────
export async function fetchCourse(id: string): Promise<CheckoutCourse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await readJson(res);
    return (json.success && json.data ? (json.data as CheckoutCourse) : null) || null;
  } catch {
    return null;
  }
}

export async function fetchBook(slug: string): Promise<CheckoutBook | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await readJson(res);
    const data =
      (json.data as CheckoutBook | undefined) ??
      ((json as { slug?: string }).slug ? (json as unknown as CheckoutBook) : null);
    return data ?? null;
  } catch {
    return null;
  }
}

// ── COURSE flow: enroll + pay (demo gateway) ───────────────────────────────
// Free courses skip the gateway entirely (POST /payment/free/enroll).
export async function payForCourse(opts: {
  course: CheckoutCourse;
  method: PaymentMethod;
  onProgress?: (s: CheckoutStep) => void;
  genericErr: string;
}): Promise<{ reference: string; amount: number; method: PaymentMethod | "free" }> {
  const { course, method, onProgress, genericErr } = opts;
  const amount = effectiveCoursePrice(course);
  const courseId = course._id;

  // Free course → single enroll call, no payment gateway.
  if (amount <= 0) {
    onProgress?.("confirming");
    const data = await post<{ _id?: string }>(
      "/payment/free/enroll",
      { courseId },
      genericErr
    );
    const ref = data?._id ? `ENR-${String(data._id).slice(-8).toUpperCase()}` : "FREE-ENROLL";
    return { reference: ref, amount: 0, method: "free" };
  }

  if (method === "bkash") {
    onProgress?.("initiating");
    const init = await post<{ paymentID?: string }>(
      "/payment/bkash/initiate",
      { courseId, amount, totalFee: amount },
      genericErr
    );
    const paymentID = init?.paymentID;
    if (!paymentID) throw new Error(genericErr);

    onProgress?.("confirming");
    const done = await post<{ trxID?: string; paymentID?: string }>(
      "/payment/bkash/demo-complete",
      { paymentID, courseId, amount, totalFee: amount },
      genericErr
    );
    return { reference: done?.trxID || paymentID, amount, method: "bkash" };
  }

  // SSLCommerz
  onProgress?.("initiating");
  const init = await post<{ tran_id?: string }>(
    "/payment/sslcommerz/init",
    { courseId, amount, courseName: course.title, totalFee: amount },
    genericErr
  );
  const tranId = init?.tran_id;
  if (!tranId) throw new Error(genericErr);

  onProgress?.("confirming");
  const done = await post<{ val_id?: string; tran_id?: string }>(
    "/payment/sslcommerz/demo-complete",
    { tran_id: tranId, courseId, amount, totalFee: amount },
    genericErr
  );
  return { reference: done?.val_id || tranId, amount, method: "sslcommerz" };
}

// ── BOOK flow: create order → pay → complete (demo) ────────────────────────
export async function checkoutBook(opts: {
  book: CheckoutBook;
  quantity: number;
  method: PaymentMethod;
  shippingAddress?: ShippingAddress;
  onProgress?: (s: CheckoutStep) => void;
  genericErr: string;
}): Promise<OrderResult> {
  const { book, quantity, method, shippingAddress, onProgress, genericErr } = opts;

  // 1) Create the pending order (server computes prices/total server-side).
  onProgress?.("creating");
  const order = await post<OrderResult>(
    "/orders",
    {
      items: [{ bookSlugOrId: book.slug, quantity }],
      ...(shippingAddress ? { shippingAddress } : {}),
    },
    genericErr
  );
  if (!order?._id) throw new Error(genericErr);

  // 2) Kick off the (demo) gateway session.
  onProgress?.("paying");
  await post(`/orders/${order._id}/pay/${method}`, {}, genericErr);

  // 3) Finalize the demo payment → marks paid, grants access / moves to processing.
  onProgress?.("confirming");
  const finalized = await post<OrderResult>(
    `/orders/${order._id}/pay/complete`,
    { method },
    genericErr
  );
  return finalized;
}

// ── Digital download (owner, paid order) ───────────────────────────────────
export async function fetchDownloadUrl(
  orderId: string,
  bookId: string,
  fallbackErr: string
): Promise<{ title: string; secureFileUrl: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/orders/${orderId}/download/${bookId}`, {
      headers: authHeaders(),
    });
  } catch {
    throw new Error("__NETWORK__");
  }
  const json = await readJson(res);
  if (!res.ok || json.success === false) {
    throw new Error((json.message as string) || fallbackErr);
  }
  return json.data as { title: string; secureFileUrl: string };
}

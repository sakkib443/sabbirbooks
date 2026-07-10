"use client";

// ─────────────────────────────────────────────────────────────
// Student dashboard API layer. Every authenticated request goes
// through here so the Bearer token (STORAGE_KEYS.sb_token) is
// injected consistently and the backend's { success, message,
// data } envelope is unwrapped.
//
// Endpoints used (confirmed against the server modules):
//   Enrollments : GET  /api/enrollments/my-enrollments
//                 GET  /api/enrollments/check-access/:courseId
//   Orders      : GET  /api/orders/my
//                 GET  /api/orders/:id/download/:bookId → { title, secureFileUrl }
//   Auth        : GET  /api/auth/me
//                 POST /api/auth/change-password  { currentPassword, newPassword }
//                 GET  /api/auth/sessions
//                 POST /api/auth/logout       (needs x-device-id header)
//                 POST /api/auth/logout-all
//   Course/curriculum (learn player):
//                 GET  /api/courses/:id
//                 GET  /api/modules/course/:courseId
//                 GET  /api/lessons/course/:courseId
// ─────────────────────────────────────────────────────────────
import API_BASE_URL from "@/config/api";
import { STORAGE_KEYS, getDeviceId } from "@/components/auth/authClient";

// ── Auth / session helpers ──────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.token);
}

export interface DashUser {
  _id?: string;
  id?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  image?: string;
}

export function getStoredUser(): DashUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DashUser;
  } catch {
    return null;
  }
}

export function dashDisplayName(user: DashUser | null): string {
  if (!user) return "Student";
  return (
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "Student"
  );
}

// Clear the auth session but keep the device id (it's a stable per-browser UUID).
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

// ── Request helper ──────────────────────────────────────────────────────────
export interface DashResult<T = unknown> {
  ok: boolean;
  status: number;
  success: boolean;
  message?: string;
  data?: T;
  raw: unknown;
}

// `path` is relative to API_BASE_URL (which already includes /api).
export async function dashRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<DashResult<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    return {
      ok: false,
      status: 0,
      success: false,
      message: "__NETWORK__",
      raw: null,
    };
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    success: Boolean(json?.success),
    message: typeof json?.message === "string" ? (json.message as string) : undefined,
    data: (json?.data as T) ?? undefined,
    raw: json,
  };
}

// ── Logout (this device) — sends x-device-id so the backend drops the right
// session row, freeing up one of the two device slots. ──────────────────────
export async function logoutThisDevice(): Promise<void> {
  try {
    await dashRequest("/auth/logout", {
      method: "POST",
      headers: { "x-device-id": getDeviceId() },
    });
  } catch {
    /* even if the call fails we still clear the local session below */
  }
  clearSession();
}

// ── Shared shapes (only the fields the dashboard reads) ─────────────────────
export interface DashMentor {
  _id?: string;
  name?: string;
  image?: string;
  designation?: string;
}

export interface DashCourse {
  _id: string;
  id?: number;
  title?: string;
  slug?: string;
  image?: string;
  type?: string;
  fee?: string;
  offerPrice?: string;
  durationMonth?: number;
  lectures?: number;
  totalExam?: number;
  totalStudentsEnroll?: number;
  courseStart?: string;
  mentor?: DashMentor | string;
}

export interface DashPayment {
  amount?: number;
  method?: string;
  status?: "pending" | "paid" | "failed";
  transactionId?: string;
  paidAt?: string;
}

export interface DashEnrollment {
  _id: string;
  courseId: DashCourse | null;
  batchId?: { _id?: string; name?: string; id?: string | number } | null;
  status: "active" | "pending" | "cancelled" | "expired" | "completed" | "deleted" | string;
  payment?: DashPayment;
  completionPercent?: number;
  studentStatus?: string;
  createdAt?: string;
}

export interface DashOrderItem {
  book: string; // ObjectId of the Book — used for the download endpoint
  title: string;
  price: number;
  quantity: number;
  format: "printed" | "digital";
}

export interface DashOrder {
  _id: string;
  orderNumber: string;
  items: DashOrderItem[];
  deliveryType: "printed" | "digital" | "mixed";
  shippingAddress?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    note?: string;
  };
  subtotal: number;
  discount?: number;
  couponCode?: string;
  total: number;
  payment?: DashPayment;
  status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "access-granted"
    | "cancelled"
    | string;
  createdAt?: string;
}

export interface DashSession {
  _id: string;
  deviceId: string;
  userAgent?: string;
  ip?: string;
  lastActiveAt?: string;
  createdAt?: string;
}

export interface DashProfile {
  _id: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

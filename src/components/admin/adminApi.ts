"use client";

// ─────────────────────────────────────────────────────────────
// Admin API layer — every admin request goes through here so the
// Bearer token (STORAGE_KEYS.sb_token) is injected consistently and
// the backend's { success, message, data, meta } envelope is unwrapped.
// ─────────────────────────────────────────────────────────────
import { useCallback } from "react";
import API_BASE_URL from "@/config/api";
import { STORAGE_KEYS } from "@/components/auth/authClient";

export interface AdminUser {
  _id?: string;
  id?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string;
}

// Roles allowed into the admin panel. superAdmin (master admin) bypasses
// everything on the backend; admin is the standard staff role.
export const ADMIN_ROLES: readonly string[] = ["admin", "superAdmin"];

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAdminUser(user: AdminUser | null): boolean {
  return Boolean(user?.role && ADMIN_ROLES.includes(user.role));
}

export function adminDisplayName(user: AdminUser | null): string {
  if (!user) return "Admin";
  return (
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "Admin"
  );
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export interface AdminMeta {
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface AdminResult<T = unknown> {
  ok: boolean;
  status: number;
  success: boolean;
  message?: string;
  data?: T;
  meta?: AdminMeta;
  raw: unknown;
}

// Core request helper. `path` is relative to API_BASE_URL (which already
// includes /api), e.g. adminRequest("/courses?status=all").
export async function adminRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<AdminResult<T>> {
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
      message: "Could not reach the server. Check your connection.",
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
    meta: (json?.meta as AdminMeta) ?? undefined,
    raw: json,
  };
}

// Hook flavour requested by the spec — returns a stable request fn that
// injects the Bearer token. Thin wrapper over adminRequest.
export function useAdminFetch() {
  const request = useCallback(
    <T = unknown>(path: string, options?: RequestInit) => adminRequest<T>(path, options),
    []
  );
  return { request };
}

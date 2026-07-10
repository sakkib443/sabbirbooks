// Shared client-side auth helpers for the Sabbir Book login/register flow.
//
// Every page in the app should read/write the auth session through these
// constants and helpers so the token, refresh token, user and device-id are
// stored under a single, consistent set of localStorage keys.
import API_BASE_URL from "@/config/api";

// ── localStorage keys (single source of truth) ─────────────────────────────
export const STORAGE_KEYS = {
  token: "sb_token", // access token (JWT)
  refresh: "sb_refresh", // refresh token
  user: "sb_user", // JSON-encoded user object
  deviceId: "sb_device_id", // stable per-device UUID (device-limit)
} as const;

// ── Device id ───────────────────────────────────────────────────────────────
// The backend enforces a max of 2 devices per account and identifies a device
// by the `x-device-id` header. We generate one stable UUID per browser, persist
// it, and reuse it on every login/refresh.
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_KEYS.deviceId, id);
  }
  return id;
}

// ── Session persistence ──────────────────────────────────────────────────────
// Accepts the `data` object returned by POST /api/auth/login. The server sends
// both `accessToken` and a legacy `token` field — we store whichever is present.
export interface LoginData {
  user?: unknown;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  deviceId?: string;
}

export function persistSession(data: LoginData): void {
  if (typeof window === "undefined" || !data) return;
  const accessToken = data.accessToken || data.token;
  if (accessToken) localStorage.setItem(STORAGE_KEYS.token, accessToken);
  if (data.refreshToken) localStorage.setItem(STORAGE_KEYS.refresh, data.refreshToken);
  if (data.user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
  // Persist the deviceId the server echoed back so it stays in sync with ours.
  if (data.deviceId) localStorage.setItem(STORAGE_KEYS.deviceId, data.deviceId);

  // The ported Aptech dashboards + protectedRoutes read the LEGACY keys
  // `localStorage.token` (raw JWT) and `localStorage.user` (JSON user). Mirror
  // the session into those keys so both auth systems stay in sync.
  if (accessToken) localStorage.setItem("token", accessToken);
  if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
}

// Clears every auth key — both the sb_* keys and the legacy token/user keys the
// Aptech dashboards use. Leaves sb_device_id in place (stable per-device id).
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ── API result shape ─────────────────────────────────────────────────────────
export interface ApiResult<T = unknown> {
  ok: boolean;
  success: boolean;
  message?: string;
  data?: T;
  raw: unknown;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
// mode picks whether the identifier is sent as `email` or `phone`, matching the
// backend contract ({ email } OR { phone } + password). Sends x-device-id.
export async function apiLogin(params: {
  identifier: string;
  password: string;
  mode: "email" | "phone";
}): Promise<ApiResult<LoginData>> {
  const deviceId = getDeviceId();
  const body: Record<string, string> = { password: params.password };
  if (params.mode === "email") body.email = params.identifier;
  else body.phone = params.identifier;

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-device-id": deviceId,
    },
    body: JSON.stringify(body),
  });
  const json = await readJson(res);
  return {
    ok: res.ok,
    success: Boolean(json.success),
    message: typeof json.message === "string" ? json.message : undefined,
    data: json.data as LoginData | undefined,
    raw: json,
  };
}

// ── Register ───────────────────────────────────────────────────────────────────
// Backend requires firstName + lastName + email + password (4–20 chars).
// phoneNumber is optional. No device header needed for registration.
export async function apiRegister(params: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
}): Promise<ApiResult> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phoneNumber: params.phoneNumber || undefined,
      password: params.password,
    }),
  });
  const json = await readJson(res);
  return {
    ok: res.ok,
    success: Boolean(json.success),
    message: typeof json.message === "string" ? json.message : undefined,
    data: json.data,
    raw: json,
  };
}

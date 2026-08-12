'use client';

/**
 * The one place the browser's auth session is read, written and renewed.
 *
 * Why this exists: the access token is short-lived and NOTHING in the app ever
 * called /auth/refresh-token. Fifteen minutes after logging in, every request
 * started coming back 401, the route guard saw that and bounced the admin to
 * /login — mid-answer, losing whatever was unsaved. The refresh token was sitting
 * in localStorage the whole time, unused.
 *
 * Rather than rewrite the ~90 dashboard pages that each call fetch() with their
 * own Authorization header, this module patches window.fetch once. Any request
 * to our API now:
 *   1. gets a freshly-renewed token if the current one is about to expire,
 *   2. and if it still comes back 401, is retried once behind a single refresh.
 * Only when the refresh itself fails is the session actually over.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(
  /\/api\/?$/i,
  ''
);

// Both key sets are live: the public pages use the sb_* names, the ported
// dashboards read the bare `token`/`user`. Every write here updates both, so
// they can never drift apart and log the user out of half the app.
export const KEYS = {
  token: 'sb_token',
  refresh: 'sb_refresh',
  user: 'sb_user',
  deviceId: 'sb_device_id',
  legacyToken: 'token',
  legacyUser: 'user',
};

const isBrowser = () => typeof window !== 'undefined';

export const getToken = () => {
  if (!isBrowser()) return '';
  return localStorage.getItem(KEYS.legacyToken) || localStorage.getItem(KEYS.token) || '';
};

export const getRefreshToken = () => (isBrowser() ? localStorage.getItem(KEYS.refresh) || '' : '');

export const getDeviceId = () => {
  if (!isBrowser()) return '';
  let id = localStorage.getItem(KEYS.deviceId);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEYS.deviceId, id);
  }
  return id;
};

export const getUser = () => {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.legacyUser) || localStorage.getItem(KEYS.user) || 'null');
  } catch {
    return null;
  }
};

export const setAccessToken = (token) => {
  if (!isBrowser() || !token) return;
  localStorage.setItem(KEYS.token, token);
  localStorage.setItem(KEYS.legacyToken, token);
};

export const clearSession = () => {
  if (!isBrowser()) return;
  [KEYS.token, KEYS.refresh, KEYS.user, KEYS.legacyToken, KEYS.legacyUser].forEach((k) =>
    localStorage.removeItem(k)
  );
  // sb_device_id deliberately survives: it identifies the browser, not the login.
};

/** Seconds-since-epoch expiry from a JWT, or null if it isn't readable. */
export const tokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
};

/** True when the token is gone, unreadable, or expires within `skewSec`. */
export const isTokenExpiring = (token, skewSec = 90) => {
  if (!token) return true;
  const exp = tokenExpiry(token);
  if (!exp) return true;
  return Date.now() >= (exp - skewSec) * 1000;
};

// ── Refresh, single-flight ───────────────────────────────────────────────────
// Ten components mounting at once would otherwise fire ten refreshes; the first
// one rotates the token and the other nine 401 against a token that no longer
// matches the stored session. Everyone waits on the same promise instead.
let inFlightRefresh = null;

export function refreshAccessToken() {
  if (inFlightRefresh) return inFlightRefresh;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  // Deliberately the ORIGINAL fetch, captured at install time — going through
  // the patched one would recurse the moment a refresh itself 401s.
  const rawFetch = originalFetch || window.fetch;

  inFlightRefresh = rawFetch(`${API_BASE}/api/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': getDeviceId() },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) return null;
      const body = await res.json().catch(() => ({}));
      const token = body?.data?.accessToken;
      if (!token) return null;
      setAccessToken(token);
      return token;
    })
    .catch(() => null) // network blip — keep the session, let the caller retry
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

/** End the session and send the user to login, once. */
let redirecting = false;
export function endSession(reason = 'session_expired') {
  if (!isBrowser() || redirecting) return;
  redirecting = true;
  clearSession();
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?reason=${reason}&redirect=${next}`;
}

// ── The global fetch interceptor ─────────────────────────────────────────────

let originalFetch = null;
const INSTALLED = Symbol.for('sb.fetchInterceptor');

const isOurApi = (url) => {
  try {
    const abs = new URL(url, window.location.origin);
    return abs.href.startsWith(`${API_BASE}/api`) || abs.pathname.startsWith('/api/');
  } catch {
    return false;
  }
};

// Endpoints that must never trigger a refresh-and-retry: a 401 from them IS the
// answer (bad password, dead refresh token), not a stale access token.
const isAuthEndpoint = (url) => /\/api\/auth\/(login|register|refresh-token)/.test(String(url));

const requestUrl = (input) =>
  typeof input === 'string' ? input : input instanceof Request ? input.url : String(input?.url || input);

/** Replace the Authorization header on a fetch call with the current token. */
const withFreshAuth = (input, init, token) => {
  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined)
  );
  headers.set('Authorization', `Bearer ${token}`);

  if (input instanceof Request && !init) {
    return [new Request(input, { headers }), undefined];
  }
  return [input, { ...(init || {}), headers }];
};

export function installFetchInterceptor() {
  if (!isBrowser() || window[INSTALLED]) return;
  window[INSTALLED] = true;

  originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = requestUrl(input);

    // Anything that isn't our API, or is an auth call, goes straight through.
    if (!isOurApi(url) || isAuthEndpoint(url)) {
      return originalFetch(input, init);
    }

    const hadAuthHeader = (() => {
      try {
        const h = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        return h.has('Authorization');
      } catch {
        return false;
      }
    })();

    let args = [input, init];

    // Pre-emptive renewal: if the token we're about to send is within 90s of
    // expiring, swap it now. Cheaper than a guaranteed 401 + retry, and it means
    // a long editing session never hits a failed save.
    if (hadAuthHeader && getRefreshToken() && isTokenExpiring(getToken())) {
      const fresh = await refreshAccessToken();
      if (fresh) args = withFreshAuth(input, init, fresh);
    }

    let response = await originalFetch(...args);

    // Still 401 → the token really was rejected. Refresh once and replay.
    if (response.status === 401 && hadAuthHeader && getRefreshToken()) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        try {
          const retryArgs = withFreshAuth(input, init, fresh);
          response = await originalFetch(...retryArgs);
          // A second 401 after a successful refresh means this device's session
          // was revoked (logged out elsewhere, or evicted) — a real logout.
          if (response.status === 401) endSession();
        } catch {
          // A Request object whose body was already consumed cannot be replayed.
          // Hand back the original 401 rather than throwing a different error at
          // a caller that is only prepared for a fetch result.
        }
      } else {
        endSession();
      }
    }

    return response;
  };
}

/**
 * fetch() with the Authorization header already attached.
 * New code should use this; existing pages keep working through the interceptor.
 */
export async function authFetch(path, init = {}) {
  const url = /^https?:\/\//i.test(path) ? path : `${API_BASE}/api${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${getToken()}`);
  // FormData must set its own multipart boundary — never force a content type.
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

export { API_BASE };

"use client";

/**
 * Route guard for the dashboards.
 *
 * It used to log the user out on sight of an expired token, and separately
 * monkey-patched window.fetch to log them out on ANY 401 — with no refresh
 * anywhere, that turned a 15-minute-old token into a forced logout. Both jobs
 * now belong to lib/session (renew first, log out only when renewal fails), so
 * what is left here is what a guard should do: is there a session, and is this
 * role allowed on this page.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiLoader } from "react-icons/fi";
import {
  API_BASE,
  getToken,
  getUser,
  getRefreshToken,
  isTokenExpiring,
  refreshAccessToken,
  clearSession,
} from "@/lib/session";
import { can, homeRouteFor, mergeStoredUser } from "@/lib/permissions";

/**
 * @param role/allowedRoles  which roles may enter this dashboard shell
 * @param requireCapabilities  capabilities the user must ALSO hold. This is the
 *   client half of the same rule the server enforces — the server is still the
 *   one that says no (403), this just avoids rendering a page that would only
 *   fill up with failed requests.
 */
const ProtectedRoute = ({ children, role, allowedRoles = [], requireCapabilities = [] }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  // Serialised so a fresh array literal on every render does not re-run the check.
  const requiredCaps = requireCapabilities.join(",");

  const toLogin = useCallback(
    (reason) => {
      clearSession();
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login${reason ? `?reason=${reason}&redirect=${next}` : `?redirect=${next}`}`);
    },
    [router]
  );

  const checkAuth = useCallback(async () => {
    let token = getToken();
    let user = getUser();

    if (!token || !user) {
      toLogin();
      return;
    }

    // Expired locally? That is not a logout — try to renew first. Only a refresh
    // that actually fails (revoked session, or no refresh token at all) ends it.
    if (isTokenExpiring(token, 0)) {
      const fresh = getRefreshToken() ? await refreshAccessToken() : null;
      if (!fresh) {
        toLogin("session_expired");
        return;
      }
      token = fresh;
    }

    // Confirm with the server. This goes through the patched fetch, so a 401
    // here has already survived one refresh-and-retry.
    //
    // It is also where authorization gets refreshed: the response carries the
    // role and the capability list the SERVER resolved, which we write back over
    // the stored user. That is what makes a permission change take effect on the
    // next page load instead of at token expiry — and it means the sidebar and
    // this guard are reading the same list the API routes enforce.
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        toLogin("session_expired");
        return;
      }
      const body = await res.json().catch(() => null);
      const fresh = body?.data;
      if (fresh?.role) {
        user =
          mergeStoredUser({
            role: fresh.role,
            capabilities: Array.isArray(fresh.capabilities) ? fresh.capabilities : undefined,
            permissions: fresh.permissions,
          }) || user;
      }
    } catch {
      // Server unreachable — let a locally-valid token through rather than
      // locking someone out of the panel because the API blipped. Every request
      // the page then makes is still checked server-side.
    }

    const userRole = user.role || "student";
    const requiredCapList = requiredCaps ? requiredCaps.split(",") : [];

    const requiredRoles = allowedRoles.length > 0 ? allowedRoles : role ? [role] : [];
    const normalize = (r) => (r === "user" || r === "student" ? "student" : r);
    const normalizedUserRole = normalize(userRole);
    const normalizedRequired = requiredRoles.map(normalize);

    // superAdmin/admin still clear every ROLE gate — but a capability gate is
    // checked for everyone, so a shell can be narrowed without special cases.
    const roleOk =
      userRole === "superAdmin" ||
      userRole === "admin" ||
      normalizedRequired.length === 0 ||
      normalizedRequired.includes(normalizedUserRole);

    if (!roleOk || !can(user, ...requiredCapList)) {
      const home = homeRouteFor(userRole);
      // Bounce to the user's own landing page — never to a route that does not
      // exist. (trainingManager used to be sent to /dashboard/training-manager,
      // which 404'd.) If that IS this page, fall back to login rather than loop.
      router.replace(home === window.location.pathname ? "/login" : home);
      return;
    }

    setIsAuthorized(true);
    setChecking(false);
    // allowedRoles is a fresh array literal on every render at most call sites,
    // so it is intentionally not a dependency — including it re-runs the whole
    // check (and its /auth/me call) on every single render. requiredCaps is a
    // joined string precisely so it CAN be one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, role, toLogin, requiredCaps]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (checking || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <FiLoader className="text-4xl text-[#41bfb8] animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Verifying Access...</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

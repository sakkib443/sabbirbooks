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

const ProtectedRoute = ({ children, role, allowedRoles = [] }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

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
    const user = getUser();

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
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        toLogin("session_expired");
        return;
      }
    } catch {
      // Server unreachable — let a locally-valid token through rather than
      // locking someone out of the panel because the API blipped.
    }

    const userRole = user.role || "student";

    if (userRole === "superAdmin" || userRole === "admin") {
      setIsAuthorized(true);
      setChecking(false);
      return;
    }

    const requiredRoles = allowedRoles.length > 0 ? allowedRoles : role ? [role] : [];
    const normalize = (r) => (r === "user" || r === "student" ? "student" : r);
    const normalizedUserRole = normalize(userRole);
    const normalizedRequired = requiredRoles.map(normalize);

    if (normalizedRequired.length > 0 && !normalizedRequired.includes(normalizedUserRole)) {
      switch (userRole) {
        case "trainingManager":
          router.replace("/dashboard/training-manager");
          break;
        case "mentor":
          router.replace("/dashboard/mentor");
          break;
        case "user":
        case "student":
          router.replace("/dashboard/user");
          break;
        default:
          router.replace("/login");
      }
      return;
    }

    setIsAuthorized(true);
    setChecking(false);
    // allowedRoles is a fresh array literal on every render at most call sites,
    // so it is intentionally not a dependency — including it re-runs the whole
    // check (and its /auth/me call) on every single render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, role, toLogin]);

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

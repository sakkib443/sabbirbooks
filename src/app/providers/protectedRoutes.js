"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiLoader } from "react-icons/fi";

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

// Decode JWT payload without library
function decodeToken(token) {
  try {
    const base64 = token.split('.')[1];
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch (e) {
    return null;
  }
}

// Check if token is expired
function isTokenExpired(token) {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;
  // exp is in seconds, Date.now() in ms
  return Date.now() >= payload.exp * 1000;
}

// Force logout helper
function forceLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

const ProtectedRoute = ({ children, role, allowedRoles = [] }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    // No token or user → redirect to login
    if (!token || !user) {
      forceLogout();
      router.replace("/login");
      return;
    }

    // Check if JWT is expired (client-side check)
    if (isTokenExpired(token)) {
      forceLogout();
      router.replace("/login?reason=session_expired");
      return;
    }

    // Verify token with server (one quick API call)
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Token invalid on server
        forceLogout();
        router.replace("/login?reason=session_expired");
        return;
      }
    } catch (e) {
      // Network error - still allow if token not expired locally
      // (so offline/server-down doesn't lock user out)
      console.warn('Auth check failed (network):', e);
    }

    // Token valid — check role
    try {
      const userObj = JSON.parse(user);
      const userRole = userObj.role || "student";

      // superAdmin & admin can access everything
      if (userRole === "superAdmin" || userRole === "admin") {
        setIsAuthorized(true);
        setChecking(false);
        return;
      }

      // Check if user has required role
      const requiredRoles = allowedRoles.length > 0 ? allowedRoles : (role ? [role] : []);
      const normalizedUserRole = (userRole === 'user' || userRole === 'student') ? 'student' : userRole;
      const normalizedRequiredRoles = requiredRoles.map(r => (r === 'user' || r === 'student') ? 'student' : r);

      if (normalizedRequiredRoles.length > 0 && !normalizedRequiredRoles.includes(normalizedUserRole)) {
        // Wrong role → redirect to their dashboard
        switch (userRole) {
          case "trainingManager":
            router.replace("/dashboard/training-manager");
            break;
          case "superAdmin":
          case "admin":
            router.replace("/dashboard/admin");
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
    } catch (e) {
      forceLogout();
      router.replace("/login");
    }
  }, [router, role, allowedRoles]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Periodic check every 60s — auto-logout if token expires while using
  useEffect(() => {
    if (!isAuthorized) return;

    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token || isTokenExpired(token)) {
        forceLogout();
        window.location.href = "/login?reason=session_expired";
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [isAuthorized]);

  // Listen to API responses globally for 401
  useEffect(() => {
    if (!isAuthorized) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        // Clone response to read body
        const cloned = response.clone();
        try {
          const data = await cloned.json();
          if (data.message?.includes('Unauthorized') || data.message?.includes('expired') || data.message?.includes('Invalid')) {
            forceLogout();
            window.location.href = "/login?reason=session_expired";
          }
        } catch (e) { }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isAuthorized]);

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

'use client';

import { useEffect } from 'react';
import { installFetchInterceptor, refreshAccessToken, getRefreshToken, getToken, isTokenExpiring } from '@/lib/session';

/**
 * Installs the fetch interceptor and keeps the access token alive in the
 * background. Rendered once, from Providers, so every page is covered.
 *
 * The heartbeat matters for a page left open: an admin who writes an answer for
 * forty minutes without a single request would otherwise come back to an expired
 * token and lose the save. Renewing on a timer means the first thing they click
 * after the break still works.
 */
export default function SessionKeeper() {
  useEffect(() => {
    installFetchInterceptor();

    const tick = () => {
      // Only when a session actually exists — this must never nag a logged-out
      // visitor reading the public pages.
      if (!getRefreshToken()) return;
      if (isTokenExpiring(getToken(), 5 * 60)) refreshAccessToken();
    };

    tick();
    const timer = setInterval(tick, 4 * 60 * 1000);

    // Laptop lids close and phones sleep; timers do not fire reliably while a
    // tab is hidden, so re-check the moment it comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}

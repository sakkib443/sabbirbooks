'use client';

/**
 * "View as" — the Super Admin looking at the panel as an Admin or a Manager.
 *
 * The choice is kept in localStorage and sent on every API request as the
 * x-view-as header (lib/session's fetch interceptor adds it). The server
 * honours it only on a Super Admin's token, and then answers exactly as it
 * would for that role — same menus, same 15-day / 3-day limits, same refusals.
 * Anyone else sending it is ignored, so it can never widen access.
 *
 * The stored user's `role` becomes the viewed role (so every existing check in
 * the panel behaves as that role) and `realRole` keeps 'superAdmin', which is
 * what offers the way back.
 */

export const VIEW_AS_KEY = 'sb_view_as';
export const VIEW_AS_ROLES = ['admin', 'manager'];

const isBrowser = () => typeof window !== 'undefined';

export const getViewAs = () => {
  if (!isBrowser()) return '';
  try {
    const v = localStorage.getItem(VIEW_AS_KEY) || '';
    return VIEW_AS_ROLES.includes(v) ? v : '';
  } catch {
    return '';
  }
};

/** True for the Super Admin, whichever panel they are looking at. */
export const isRealSuperAdmin = (user) => user?.role === 'superAdmin' || user?.realRole === 'superAdmin';

const rewriteStoredUser = (fn) => {
  for (const key of ['user', 'sb_user']) {
    try {
      const u = JSON.parse(localStorage.getItem(key) || 'null');
      if (u) localStorage.setItem(key, JSON.stringify(fn(u)));
    } catch {
      // A corrupt copy is left for the next /auth/me to overwrite.
    }
  }
};

/**
 * Switch panel: 'superAdmin', 'admin' or 'manager'. Capabilities are dropped
 * so the next /auth/me (which carries the header) fills in the right ones.
 */
export const setViewAs = (role) => {
  if (!isBrowser()) return;
  if (VIEW_AS_ROLES.includes(role)) {
    localStorage.setItem(VIEW_AS_KEY, role);
    rewriteStoredUser((u) => {
      const next = { ...u, role, realRole: 'superAdmin' };
      delete next.capabilities;
      return next;
    });
  } else {
    localStorage.removeItem(VIEW_AS_KEY);
    rewriteStoredUser((u) => {
      const next = { ...u, role: 'superAdmin' };
      delete next.capabilities;
      delete next.realRole;
      return next;
    });
  }
};

/** Forget the choice (on logout / login), so the next account starts plain. */
export const clearViewAs = () => {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(VIEW_AS_KEY);
  } catch {
    // nothing to clear
  }
};

export const VIEW_AS_LABEL = { superAdmin: 'Super Admin', admin: 'Admin', manager: 'Manager' };

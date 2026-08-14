"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  readStoredPreference,
  systemPrefersDark,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-core";

type ThemeContextValue = {
  /** What the user picked: light | dark | system. */
  theme: ThemePreference;
  /** What is actually painted right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // A non-throwing fallback keeps a stray <ThemeToggle /> from taking the
    // whole dashboard down if it is ever mounted outside the provider.
    return { theme: "system", resolvedTheme: "light", setTheme: () => {} };
  }
  return ctx;
}

/* ---------------------------------------------------------------------------
 * The preference lives in localStorage and the OS lives in matchMedia — two
 * external stores, neither of which React owns. useSyncExternalStore is the
 * primitive for exactly that: it renders the server snapshot during hydration
 * and then re-renders with the real client value, with no effect-driven
 * setState and no hydration mismatch to suppress.
 * ------------------------------------------------------------------------- */

// localStorage's "storage" event only fires in OTHER tabs, so same-tab writes
// have to be broadcast by hand.
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);

  const mql =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  mql?.addEventListener("change", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
    mql?.removeEventListener("change", onChange);
  };
}

const getPreference = (): ThemePreference => readStoredPreference();
const getResolved = (): ResolvedTheme => {
  const pref = readStoredPreference();
  if (pref !== "system") return pref;
  return systemPrefersDark() ? "dark" : "light";
};

// Server snapshots must be deterministic. "system"/"light" is the same pair the
// root layout renders, so the hydration pass agrees with the server HTML; the
// inline script has meanwhile already painted the real theme onto <html>.
const serverPreference = (): ThemePreference => "system";
const serverResolved = (): ResolvedTheme => "light";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getPreference, serverPreference);
  const resolvedTheme = useSyncExternalStore(subscribe, getResolved, serverResolved);

  // Re-assert rather than trust: the inline script sets the attribute at first
  // paint, but a soft navigation, an extension, or an OS change mid-session can
  // leave <html> out of step with the store.
  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled — the choice just will not persist.
    }
    // Paint immediately so the click feels instant, then let the store catch up.
    applyResolvedTheme(
      next === "system" ? (systemPrefersDark() ? "dark" : "light") : next
    );
    emit();
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

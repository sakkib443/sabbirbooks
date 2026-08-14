// Shared vocabulary for the theme system. Everything that has to agree about
// storage key / attribute name / resolution rules imports it from here — the
// pre-hydration inline script, the React provider and the toggle all read the
// same source, which is what keeps the first paint and the first render from
// disagreeing.

export const THEME_STORAGE_KEY = "theme";
export const THEME_ATTRIBUTE = "data-theme";

/** What the user picked. "system" is the default and follows the OS. */
export type ThemePreference = "light" | "dark" | "system";
/** What is actually painted. "system" has been resolved away. */
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * The no-flash script, as a string, so it can be inlined into <head> and run
 * synchronously while the HTML is still being parsed — before the browser has
 * painted anything. It resolves "system" here rather than in CSS, which is why
 * globals.css only needs a single `[data-theme="dark"]` block.
 *
 * Kept dependency-free and defensive: private-mode Safari throws on
 * localStorage access, and matchMedia is missing in very old engines.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)},a=${JSON.stringify(THEME_ATTRIBUTE)};
var p=null;try{p=localStorage.getItem(k)}catch(e){}
if(p!=="light"&&p!=="dark")p="system";
var d=p==="dark"||(p==="system"&&typeof matchMedia==="function"&&matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;
r.setAttribute(a,d?"dark":"light");
r.style.colorScheme=d?"dark":"light";
}catch(e){}})()`.replace(/\n/g, "");

/** Applies a resolved theme to <html>. Used by the provider after the script. */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute(THEME_ATTRIBUTE, resolved);
  root.style.colorScheme = resolved;
}

export function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

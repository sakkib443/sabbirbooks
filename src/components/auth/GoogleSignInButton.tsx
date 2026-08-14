"use client";

// ════════════════════════════════════════════════════════════════════════════
//  "Sign in with Google" — the browser half
// ════════════════════════════════════════════════════════════════════════════
//
// Google Identity Services (the small `gsi/client` script) does all the work:
// it runs the account chooser, and hands back a `credential` — an ID token that
// GOOGLE signed. We forward that one string to our server, which verifies the
// signature before it believes a word of it. The browser never tells the server
// who the user is, and could not be trusted to.
//
// ── When GOOGLE_CLIENT_ID is unset (today) ─────────────────────────────────
// This component returns null on the first line. No <Script>, so the gsi
// script is never fetched; no container, so nothing half-renders; and not one
// console call anywhere in the file, so nothing is logged either. The pages
// that use it look exactly as they did before the feature existed.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import { LuTriangleAlert, LuLoaderCircle } from "react-icons/lu";
import { cn } from "@/components/ui";
import { THEME_ATTRIBUTE } from "@/components/theme/theme-core";
import {
  GOOGLE_CLIENT_ID,
  apiGoogleSignIn,
  persistSession,
  type LoginData,
} from "./authClient";

// ── Minimal typings for the GSI global ───────────────────────────────────────
// Only the three calls used here. The official @types package would pull in the
// whole One Tap / OAuth2 surface for no benefit.
interface GsiCredentialResponse {
  credential?: string;
}

interface GsiAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GsiCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
    ux_mode?: "popup" | "redirect";
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      logo_alignment?: "left" | "center";
      width?: number;
      locale?: string;
    },
  ): void;
  cancel(): void;
}

const getGsi = (): GsiAccountsId | null => {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { google?: { accounts?: { id?: GsiAccountsId } } }).google;
  return g?.accounts?.id ?? null;
};

// GSI clamps the rendered button to 200–400px and wants a number of pixels.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const FALLBACK_WIDTH = 320;

// ── The site theme, as an external store ─────────────────────────────────────
// Google's button ships its own light and dark skins and picking the wrong one
// leaves a white slab in a dark card. The resolved theme lives on <html>, put
// there by the pre-hydration script in components/theme — it is genuinely
// external mutable state, so useSyncExternalStore is the right reader: it
// subscribes without a render-triggering effect and stays correct when the user
// flips the toggle with this page open.
// Declared at module scope so the identities are stable across renders.
type Skin = "light" | "dark";

const subscribeTheme = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [THEME_ATTRIBUTE],
  });
  return () => observer.disconnect();
};

const getThemeSnapshot = (): Skin =>
  document.documentElement.getAttribute(THEME_ATTRIBUTE) === "dark" ? "dark" : "light";

// There is no <html> on the server. "light" keeps the server render and the
// first client render in agreement; the real value arrives on subscribe.
const getThemeServerSnapshot = (): Skin => "light";

export interface GoogleSignInButtonProps {
  bengali?: boolean;
  /** Changes only the wording Google prints on its own button. */
  intent?: "signin" | "signup";
  /** Text in the "─ or ─" rule above the button. */
  dividerLabel?: string;
  /**
   * Fired AFTER the session has been persisted, so the page only has to decide
   * where to send the user. Kept out of this component on purpose: the
   * role→route table lives with the login page and must not be duplicated.
   */
  onSuccess: (data: LoginData) => void;
  /** Optional: mirror the failure into the page's own error banner. */
  onError?: (message: string) => void;
}

export function GoogleSignInButton({
  bengali,
  intent = "signin",
  dividerLabel,
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const bn = bengali ? "hind-siliguri" : "";

  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const lastWidthRef = useRef(0);

  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);

  const T = bengali
    ? {
        or: dividerLabel ?? "অথবা",
        signingIn: "গুগল দিয়ে সাইন ইন হচ্ছে...",
        scriptFailed: "গুগল সাইন-ইন লোড করা যায়নি। ইন্টারনেট বা অ্যাড-ব্লকার চেক করুন।",
        noCredential: "গুগল থেকে কোনো তথ্য পাওয়া যায়নি। আবার চেষ্টা করুন।",
        failed: "গুগল দিয়ে সাইন ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
        network: "সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করুন।",
      }
    : {
        or: dividerLabel ?? "or",
        signingIn: "Signing in with Google...",
        scriptFailed: "Could not load Google sign-in. Check your connection or ad blocker.",
        noCredential: "Google did not return a sign-in token. Please try again.",
        failed: "Google sign-in failed. Please try again.",
        network: "Could not reach the server. Check your connection.",
      };

  // ── The credential callback ──
  // A plain function, re-created every render so it always closes over the
  // current props and strings. It is never passed to Google directly: GSI's
  // initialize() runs once and must be handed something stable, so the latest
  // version is parked in a ref (written in an effect, not during render) and
  // called through that. The only caller is a user clicking Google's button,
  // which happens long after effects have flushed.
  const handleCredential = async (response: GsiCredentialResponse) => {
    const credential = response?.credential;
    if (!credential) {
      setError(T.noCredential);
      onError?.(T.noCredential);
      return;
    }

    setError("");
    setBusy(true);
    try {
      const result = await apiGoogleSignIn(credential);
      if (result.ok && result.success && result.data) {
        // Same storage keys as the password login — one session format for
        // the whole app, including the ported dashboards' legacy keys.
        persistSession(result.data);
        onSuccess(result.data);
        return;
      }
      // The server's message is the useful one here: "blocked", "already
      // linked to a different Google account", "not configured".
      const message = result.message || T.failed;
      setError(message);
      onError?.(message);
    } catch {
      setError(T.network);
      onError?.(T.network);
    } finally {
      setBusy(false);
    }
  };

  const handleCredentialRef = useRef(handleCredential);
  useEffect(() => {
    handleCredentialRef.current = handleCredential;
  });

  const measureWidth = useCallback(() => {
    const el = containerRef.current;
    const raw = el ? Math.round(el.getBoundingClientRect().width) : 0;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, raw || FALLBACK_WIDTH));
  }, []);

  const renderButton = useCallback(() => {
    const el = containerRef.current;
    const gsi = getGsi();
    if (!el || !gsi) return;

    if (!initializedRef.current) {
      gsi.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleCredentialRef.current(response),
        // No One Tap and no silent re-sign-in: the user presses the button or
        // nothing happens. auto_select would sign a returning visitor in
        // without them asking.
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        // Popup keeps the SPA mounted; redirect would need a server callback
        // route and would lose the ?redirect= query the login page reads.
        ux_mode: "popup",
      });
      initializedRef.current = true;
    }

    const width = measureWidth();
    lastWidthRef.current = width;
    // renderButton APPENDS — clear first or a re-render stacks buttons.
    el.innerHTML = "";
    gsi.renderButton(el, {
      type: "standard",
      // Google's branding guidelines do not allow a bespoke button, so this
      // stays their official widget. It is matched to the page by width,
      // theme and locale rather than by restyling.
      theme: theme === "dark" ? "filled_black" : "outline",
      size: "large",
      shape: "rectangular",
      logo_alignment: "center",
      text: intent === "signup" ? "signup_with" : "signin_with",
      width,
      locale: bengali ? "bn" : "en",
    });
  }, [measureWidth, theme, intent, bengali]);

  // Render (and re-render on theme / locale / intent change) once GSI is up.
  useEffect(() => {
    if (!scriptReady) return;
    renderButton();
  }, [scriptReady, renderButton]);

  // The card is responsive, so the button has to be. Only re-render when the
  // CLAMPED width actually moves, otherwise every pixel of resize would rebuild
  // the widget.
  useEffect(() => {
    if (!scriptReady) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (measureWidth() !== lastWidthRef.current) renderButton();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scriptReady, measureWidth, renderButton]);

  // Dismiss any open Google UI if the user navigates away mid-flow.
  useEffect(
    () => () => {
      try {
        getGsi()?.cancel();
      } catch {
        // Nothing useful to do, and nothing worth logging.
      }
    },
    [],
  );

  // ── The switch. Everything above is dead code without a client id. ──
  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-4">
      {/* "─── or ───" rule, using the same border/muted tokens as the card */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className={cn("text-xs font-medium uppercase tracking-wide text-muted-foreground", bn)}>
          {T.or}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className={cn("flex justify-center", busy && "pointer-events-none opacity-40")}
        />

        {/* Reserve the button's height until GSI paints, so the card does not
            jump. 40px is the height of the "large" Google button. */}
        {!scriptReady && !error && <div className="h-10" />}

        {busy && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground",
              bn,
            )}
            role="status"
          >
            <LuLoaderCircle className="animate-spin text-base" />
            <span>{T.signingIn}</span>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral",
            bn,
          )}
        >
          <LuTriangleAlert className="mt-0.5 shrink-0 text-base" />
          <span>{error}</span>
        </div>
      )}

      <Script
        id="google-gsi-client"
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        // onReady, not onLoad: onLoad fires only the first time the script is
        // fetched, so navigating /login → /register would leave the second page
        // with no button. onReady also fires on every remount.
        onReady={() => setScriptReady(true)}
        onError={() => setError(T.scriptFailed)}
      />
    </div>
  );
}

export default GoogleSignInButton;

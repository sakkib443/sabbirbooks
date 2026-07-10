"use client";

// Active devices panel. Lists the account's live sessions (GET /api/auth/sessions)
// and marks the current device (matched via the local x-device-id). The 2-device
// limit means at most two rows appear here. "Log out of all devices"
// (POST /api/auth/logout-all) clears every session — including this one — so we
// then wipe the local session and send the user back to /login.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LuMonitorSmartphone,
  LuSmartphone,
  LuMonitor,
  LuLoaderCircle,
  LuTriangleAlert,
  LuShieldCheck,
  LuLogOut,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Badge, Button, cn } from "@/components/ui";
import { getDeviceId } from "@/components/auth/authClient";
import { dashRequest, clearSession, type DashSession } from "./dashboardApi";
import { formatDate } from "./primitives";

// Best-effort friendly label from a User-Agent string.
function describeDevice(ua?: string): { label: string; icon: IconType } {
  const s = (ua || "").toLowerCase();
  if (!s) return { label: "Unknown device", icon: LuMonitorSmartphone };
  const mobile = /mobile|android|iphone|ipad|ipod/.test(s);
  let browser = "Browser";
  if (s.includes("edg")) browser = "Edge";
  else if (s.includes("chrome") && !s.includes("edg")) browser = "Chrome";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("safari") && !s.includes("chrome")) browser = "Safari";
  let os = "";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ipod")) os = "iOS";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("linux")) os = "Linux";
  const label = [browser, os].filter(Boolean).join(" · ") || "Browser";
  return { label, icon: mobile ? LuSmartphone : LuMonitor };
}

type Status = "loading" | "ready" | "error";

export default function DevicesPanel({ isBengali }: { isBengali: boolean }) {
  const bn = isBengali ? "hind-siliguri" : "";
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [sessions, setSessions] = useState<DashSession[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const S = isBengali
    ? {
        title: "সক্রিয় ডিভাইস",
        subtitle: "একটি অ্যাকাউন্ট সর্বোচ্চ ২টি ডিভাইসে ব্যবহার করা যায়।",
        thisDevice: "এই ডিভাইস",
        lastActive: "সর্বশেষ সক্রিয়",
        logoutAll: "সব ডিভাইস থেকে লগআউট",
        loggingOut: "লগআউট হচ্ছে...",
        confirmTitle: "সব ডিভাইস থেকে লগআউট করবেন?",
        confirmText: "এটি এই ডিভাইসসহ সব জায়গা থেকে লগআউট করবে। আবার লগইন করতে হবে।",
        confirm: "হ্যাঁ, লগআউট",
        cancel: "বাতিল",
        empty: "কোনো সক্রিয় সেশন পাওয়া যায়নি।",
        errMsg: "ডিভাইস লোড করা যায়নি।",
        retry: "আবার চেষ্টা করুন",
        limitNote: (n: number) => `${n}/২ ডিভাইস ব্যবহৃত`,
      }
    : {
        title: "Active devices",
        subtitle: "Each account can be signed in on up to 2 devices.",
        thisDevice: "This device",
        lastActive: "Last active",
        logoutAll: "Log out of all devices",
        loggingOut: "Logging out...",
        confirmTitle: "Log out of all devices?",
        confirmText: "This signs you out everywhere, including this device. You'll need to log in again.",
        confirm: "Yes, log out",
        cancel: "Cancel",
        empty: "No active sessions found.",
        errMsg: "Could not load your devices.",
        retry: "Try again",
        limitNote: (n: number) => `${n}/2 devices in use`,
      };

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await dashRequest<DashSession[]>("/auth/sessions");
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setSessions(Array.isArray(res.data) ? res.data : []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    setCurrentId(getDeviceId());
    load();
  }, [load]);

  const logoutAll = async () => {
    setLoggingOut(true);
    await dashRequest("/auth/logout-all", { method: "POST" });
    clearSession();
    router.replace("/login");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <LuMonitorSmartphone className="text-xl" />
          </span>
          <div>
            <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.title}</h2>
            <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>{S.subtitle}</p>
          </div>
        </div>
        {status === "ready" && sessions.length > 0 && (
          <Badge variant="primary" className={bn}>
            <LuShieldCheck className="text-sm" /> {S.limitNote(sessions.length)}
          </Badge>
        )}
      </div>

      {status === "loading" && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <LuLoaderCircle className="animate-spin text-2xl text-primary" />
        </div>
      )}

      {status === "error" && (
        <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral", bn)}>
          <span className="inline-flex items-center gap-2">
            <LuTriangleAlert /> {S.errMsg}
          </span>
          <button type="button" onClick={load} className="font-semibold underline">
            {S.retry}
          </button>
        </div>
      )}

      {status === "ready" && (
        <>
          {sessions.length === 0 ? (
            <p className={cn("py-6 text-center text-sm text-muted-foreground", bn)}>{S.empty}</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((sess) => {
                const dev = describeDevice(sess.userAgent);
                const isCurrent = sess.deviceId === currentId;
                const Icon = dev.icon;
                return (
                  <li
                    key={sess._id}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border p-4",
                      isCurrent ? "border-primary/40 bg-primary-soft/40" : "border-border bg-surface-soft/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                      )}
                    >
                      <Icon className="text-xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                        {dev.label}
                        {isCurrent && (
                          <Badge variant="accent" className={bn}>
                            {S.thisDevice}
                          </Badge>
                        )}
                      </p>
                      <p className={cn("mt-0.5 text-xs text-muted-foreground", bn)}>
                        {S.lastActive}: {formatDate(sess.lastActiveAt, isBengali)}
                        {sess.ip ? ` · ${sess.ip}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Log out of all devices */}
          {sessions.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              {!confirming ? (
                <Button variant="outline" onClick={() => setConfirming(true)} className={bn}>
                  <LuLogOut /> {S.logoutAll}
                </Button>
              ) : (
                <div className={cn("rounded-xl border border-coral/30 bg-coral/10 p-4", bn)}>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <LuTriangleAlert className="text-coral" /> {S.confirmTitle}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{S.confirmText}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={logoutAll}
                      disabled={loggingOut}
                      className={bn}
                    >
                      {loggingOut ? <LuLoaderCircle className="animate-spin" /> : <LuLogOut />}
                      {loggingOut ? S.loggingOut : S.confirm}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirming(false)}
                      disabled={loggingOut}
                      className={bn}
                    >
                      {S.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

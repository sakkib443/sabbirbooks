"use client";

/**
 * Signed-in avatar + dropdown for the site navbar.
 *
 * Replaces the old pair of "Dashboard" and "Logout" buttons, which took the
 * width of two buttons and never showed WHO was signed in — on a shared laptop
 * there was no way to tell without opening the dashboard.
 *
 * The Google avatar is rendered with a plain <img>, not next/image: the URL
 * comes from whatever provider the account used, and an unrecognised host makes
 * the optimizer return 400, which would break the navbar on every page. The
 * initials circle is the fallback when the image is missing or fails to load.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuLayoutDashboard,
  LuUser,
  LuBookOpen,
  LuPackage,
  LuLogOut,
  LuSettings,
  LuChevronDown,
} from "react-icons/lu";
import { ROLE_LABELS } from "@/lib/permissions";

const STAFF_ROLES = ["admin", "superAdmin", "trainingManager", "contentManager", "manager"];

const initialsOf = user => {
  const source = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || user?.email || "";
  const parts = source.trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

const displayName = user =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || user?.email || "Account";

export default function UserMenu({ user, onLogout, dashHref, className = "" }) {
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const wrapRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click and on Escape — a dropdown that only closes by
  // clicking the trigger again feels stuck.
  useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKey = e => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!user) return null;

  const avatar = user.image || user.profileImage || user.avatar || user.picture || "";
  const role = user.role === "user" ? "student" : user.role;
  const isStaff = STAFF_ROLES.includes(role);
  const showAvatar = avatar && !imgFailed;

  // Only link to pages that exist for this role. There is no personal profile
  // page in the admin panel — pointing "প্রোফাইল" at /dashboard/admin would just
  // repeat the dashboard link. Site settings is capability-gated, so a manager
  // never sees a link the API would refuse.
  const capabilities = Array.isArray(user.capabilities) ? user.capabilities : [];
  const links = [
    { href: dashHref, label: isStaff ? "অ্যাডমিন প্যানেল" : "ড্যাশবোর্ড", icon: LuLayoutDashboard },
  ];

  if (role === "mentor") {
    links.push({ href: "/dashboard/mentor/profile", label: "প্রোফাইল", icon: LuUser });
  } else if (!isStaff) {
    links.push(
      { href: "/dashboard/user/my-book", label: "আমার বই", icon: LuBookOpen },
      { href: "/dashboard/user/orders", label: "আমার অর্ডার", icon: LuPackage },
      { href: "/dashboard/user/profile", label: "প্রোফাইল", icon: LuUser }
    );
  } else if (capabilities.includes("settings.write")) {
    links.push({ href: "/dashboard/admin/settings", label: "সাইট সেটিংস", icon: LuSettings });
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Account menu — ${displayName(user)}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 transition-colors hover:border-primary/40"
      >
        {showAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            onError={() => setImgFailed(true)}
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initialsOf(user)}
          </span>
        )}
        <span className="hidden max-w-[110px] truncate text-sm font-medium text-foreground xl:block">
          {user.firstName || displayName(user)}
        </span>
        <LuChevronDown
          className={`text-sm text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          {/* Who is signed in — the whole point of the avatar */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                onError={() => setImgFailed(true)}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {initialsOf(user)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName(user)}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              {role && (
                <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {ROLE_LABELS[role] || role}
                </span>
              )}
            </div>
          </div>

          <nav className="py-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={close}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="text-base text-muted-foreground" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LuLogOut className="text-base" />
              লগআউট
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

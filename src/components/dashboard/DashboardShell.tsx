"use client";

// Student dashboard shell: auth guard + sidebar + topbar, wrapping every
// /dashboard page. Guard: on mount, redirect to /login unless an sb_token
// exists. While checking we render a neutral loader so no protected content
// flashes. Logout hits POST /api/auth/logout with the x-device-id header,
// clears sb_* and returns to /login.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LuLayoutDashboard,
  LuGraduationCap,
  LuShoppingBag,
  LuUserRound,
  LuLogOut,
  LuMenu,
  LuX,
  LuStethoscope,
  LuLoaderCircle,
  LuArrowLeft,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { useLanguage } from "@/context/LanguageContext";
import { Button, cn } from "@/components/ui";
import {
  getToken,
  getStoredUser,
  dashDisplayName,
  logoutThisDevice,
  type DashUser,
} from "./dashboardApi";

interface NavItem {
  href: string;
  label: string;
  labelBn: string;
  icon: IconType;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", labelBn: "সারসংক্ষেপ", icon: LuLayoutDashboard },
  { href: "/dashboard/my-courses", label: "My Courses", labelBn: "আমার কোর্স", icon: LuGraduationCap },
  { href: "/dashboard/my-orders", label: "My Orders", labelBn: "আমার অর্ডার", icon: LuShoppingBag },
  { href: "/dashboard/profile", label: "Profile", labelBn: "প্রোফাইল", icon: LuUserRound },
];

type GuardState = "checking" | "ok" | "denied";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [state, setState] = useState<GuardState>("checking");
  const [user, setUser] = useState<DashUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const S = isBengali
    ? {
        brand: "স্টুডেন্ট প্যানেল",
        panel: "স্টুডেন্ট ড্যাশবোর্ড",
        student: "শিক্ষার্থী",
        backToSite: "সাইটে ফিরুন",
        logout: "লগআউট",
        loggingOut: "লগআউট হচ্ছে...",
        openMenu: "মেনু খুলুন",
        closeMenu: "মেনু বন্ধ করুন",
      }
    : {
        brand: "Student Panel",
        panel: "Student Dashboard",
        student: "Student",
        backToSite: "Back to site",
        logout: "Log out",
        loggingOut: "Logging out...",
        openMenu: "Open menu",
        closeMenu: "Close menu",
      };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState("denied");
      router.replace("/login");
      return;
    }
    setUser(getStoredUser());
    setState("ok");
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isActive = useMemo(
    () => (href: string) =>
      href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  );

  const logout = async () => {
    setLoggingOut(true);
    await logoutThisDevice();
    router.replace("/login");
  };

  if (state !== "ok") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LuLoaderCircle className="animate-spin text-3xl text-primary" />
      </div>
    );
  }

  const name = dashDisplayName(user);

  const SidebarNav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-foreground/75 hover:bg-primary-soft hover:text-primary",
              bn
            )}
          >
            <span className="text-lg">
              <Icon />
            </span>
            {isBengali ? item.labelBn : item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">
        <LuStethoscope />
      </span>
      <span className={cn("font-heading text-base font-bold text-foreground", bn)}>{S.brand}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-surface-soft/40">
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-3 py-4 sm:px-5 lg:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-soft lg:flex">
          <div className="px-2 pb-4">{brand}</div>
          <div className="flex-1 overflow-y-auto">{SidebarNav}</div>
          <div className="border-t border-border pt-3">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                bn
              )}
            >
              <LuArrowLeft /> {S.backToSite}
            </Link>
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="sticky top-4 z-30 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted lg:hidden"
                aria-label={S.openMenu}
              >
                <LuMenu className="text-xl" />
              </button>
              <div className="lg:hidden">{brand}</div>
              <span className={cn("hidden text-sm font-medium text-muted-foreground lg:inline", bn)}>
                {S.panel}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={cn("max-w-[40vw] truncate text-sm font-semibold leading-tight text-foreground", bn)}>
                  {name}
                </p>
                <p className={cn("text-xs capitalize text-muted-foreground", bn)}>
                  {user?.role || S.student}
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {name.charAt(0).toUpperCase()}
              </span>
              <Button variant="outline" size="sm" onClick={logout} disabled={loggingOut} className={bn}>
                {loggingOut ? <LuLoaderCircle className="animate-spin" /> : <LuLogOut />}
                <span className="hidden sm:inline">{loggingOut ? S.loggingOut : S.logout}</span>
              </Button>
            </div>
          </header>

          <main className="pb-10">{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-card p-4 shadow-card">
            <div className="mb-4 flex items-center justify-between px-1">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={S.closeMenu}
              >
                <LuX className="text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{SidebarNav}</div>
            <div className="border-t border-border pt-3">
              <Link
                href="/"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  bn
                )}
              >
                <LuArrowLeft /> {S.backToSite}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

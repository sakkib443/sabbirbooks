"use client";

// Admin shell: auth guard + fixed sidebar + topbar, wrapping every /admin page.
// Guard: on mount, redirect to /login unless a token exists AND the stored user
// role is admin/superAdmin. While checking we render a neutral loader so no
// protected content flashes.
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LuLayoutDashboard,
  LuGraduationCap,
  LuBookOpen,
  LuTags,
  LuUsers,
  LuShoppingCart,
  LuTicket,
  LuQrCode,
  LuMail,
  LuLogOut,
  LuMenu,
  LuX,
  LuStethoscope,
} from "react-icons/lu";
import { Button, cn } from "@/components/ui";
import { ToastProvider } from "./Toast";
import { Spinner } from "./primitives";
import { useIsoEffect } from "./hooks";
import {
  getToken,
  getAdminUser,
  isAdminUser,
  adminDisplayName,
  clearSession,
  type AdminUser,
} from "./adminApi";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: <LuLayoutDashboard /> },
  { href: "/admin/courses", label: "Courses", icon: <LuGraduationCap /> },
  { href: "/admin/books", label: "Books", icon: <LuBookOpen /> },
  { href: "/admin/categories", label: "Categories", icon: <LuTags /> },
  { href: "/admin/mentors", label: "Mentors", icon: <LuUsers /> },
  { href: "/admin/orders", label: "Orders", icon: <LuShoppingCart /> },
  { href: "/admin/coupons", label: "Coupons", icon: <LuTicket /> },
  { href: "/admin/qr", label: "QR Resources", icon: <LuQrCode /> },
  { href: "/admin/contact", label: "Contact", icon: <LuMail /> },
];

type GuardState = "checking" | "ok" | "denied";

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuardState>("checking");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useIsoEffect(() => {
    const token = getToken();
    const u = getAdminUser();
    if (!token || !isAdminUser(u)) {
      setState("denied");
      router.replace("/login");
      return;
    }
    setUser(u);
    setState("ok");
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useIsoEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isActive = useMemo(
    () => (href: string) =>
      href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`),
    [pathname]
  );

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  if (state !== "ok") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="text-3xl text-primary" />
      </div>
    );
  }

  const SidebarNav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-foreground/75 hover:bg-primary-soft hover:text-primary"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">
        <LuStethoscope />
      </span>
      <span className="font-heading text-base font-bold text-foreground">Sabbir Admin</span>
    </Link>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-soft/40">
        <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-3 py-4 sm:px-5 lg:px-6">
          {/* Desktop sidebar */}
          <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-soft lg:flex">
            <div className="px-2 pb-4">{brand}</div>
            <div className="flex-1 overflow-y-auto">{SidebarNav}</div>
            <div className="border-t border-border pt-3">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LuLogOut className="rotate-180" /> Back to site
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
                  aria-label="Open menu"
                >
                  <LuMenu className="text-xl" />
                </button>
                <div className="lg:hidden">{brand}</div>
                <span className="hidden text-sm font-medium text-muted-foreground lg:inline">
                  Admin Dashboard
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold leading-tight text-foreground">
                    {adminDisplayName(user)}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">{user?.role || "admin"}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {adminDisplayName(user).charAt(0).toUpperCase()}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LuLogOut /> <span className="hidden sm:inline">Logout</span>
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
                  aria-label="Close menu"
                >
                  <LuX className="text-xl" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{SidebarNav}</div>
            </aside>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

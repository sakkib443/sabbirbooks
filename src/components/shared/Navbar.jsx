"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LuMenu, LuX, LuArrowRight } from "react-icons/lu";
import { HiOutlineUserCircle } from "react-icons/hi2";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/context/LanguageContext";
import { cn, buttonVariants } from "@/components/ui";
// Name and logo come from site settings so they can be changed from the admin
// panel — see components/shared/Brand.
import { BrandMark, Wordmark } from "./Brand";
import { PUBLIC_PAGES_ENABLED } from "@/config/site";
import UserMenu from "./UserMenu";
import { ROLE_LABELS } from "@/lib/permissions";

const Navbar = () => {
  const [isSticky, setIsSticky] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const { t, language } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sb_user");
      setUser(raw ? JSON.parse(raw) : null);
    } catch {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    try {
      ["sb_token", "sb_refresh", "sb_user", "token", "user"].forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    setUser(null);
    window.location.href = "/";
  };

  const isAdmin = user && (user.role === "admin" || user.role === "superAdmin");
  // Where this account's PANEL lives. Deliberately not homeRouteFor(), which
  // answers a different question — it sends a plain buyer to the storefront `/`
  // after login, and a menu entry labelled "Dashboard" must not do that.
  // The old ternary knew only admin/superAdmin/mentor, so every manager role
  // fell through to /dashboard/user, a panel they do not work in.
  const userRole = user?.role === "user" ? "student" : user?.role;
  const dashHref = !user
    ? "/login"
    : ["admin", "superAdmin", "trainingManager", "contentManager", "manager"].includes(userRole)
      ? "/dashboard/admin"
      : userRole === "mentor"
        ? "/dashboard/mentor"
        : "/dashboard/user";
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const bn = language === "bn" ? "hind-siliguri" : "";

  // The catalogue routes still redirect home while the shop is one book page
  // (see src/proxy.ts), and offering links that bounce is worse than offering
  // none — so those stay behind the flag. Home, about and contact are always
  // here, the last two because a payment gateway's review looks for them.
  //
  // /campus-ambassador is deliberately NOT listed. The shop recruits by sending
  // the link to people it wants, so the page is reachable by anyone who has it
  // and advertised to nobody who does not. It is left out of the menu, not
  // closed off — see src/config/site.js, which keeps the route live.
  const menu = [
    { href: "/", label: t("navbar.home") },
    ...(PUBLIC_PAGES_ENABLED
      ? [
          { href: "/courses", label: t("navbar.courses") },
          { href: "/books", label: t("navbar.books") },
        ]
      : []),
    { href: "/about", label: t("navbar.about") },
    { href: "/contact", label: t("navbar.contact") },
  ];

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isMobileMenuOpen ? "visible opacity-100" : "invisible opacity-0"
        )}
        onClick={closeMobileMenu}
      />

      {/* Mobile panel */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-dvh w-[82%] max-w-[340px] overflow-y-auto border-r border-border bg-card shadow-card transition-transform duration-400 ease-out lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-2.5">
            <BrandMark />
            <Wordmark />
          </Link>
          <button
            onClick={closeMobileMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close menu"
          >
            <LuX className="text-xl" />
          </button>
        </div>

        <div className="flex h-[calc(100%-73px)] flex-col p-5">
          <div className="mb-5">
            <LanguageSwitcher variant="compact" />
          </div>
          <nav className="flex-1">
            <ul className="space-y-1">
              {menu.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-l-4 px-4 py-3.5 text-[15px] font-medium transition-all",
                      bn,
                      isActive(href)
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {label}
                    {isActive(href) && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {user ? (
            <div className="space-y-2">
              {/* Same question the avatar answers on desktop: who is this? */}
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {user.image || user.profileImage || user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image || user.profileImage || user.avatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()
                  )}
                </span>
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-semibold text-foreground", bn)}>
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[user.role === "user" ? "student" : user.role] || user.email}
                  </p>
                </div>
              </div>
              <Link
                href={dashHref}
                onClick={closeMobileMenu}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full", bn)}
              >
                <HiOutlineUserCircle className="text-xl" />
                {isAdmin ? t("navbar.admin", "Admin Panel") : t("navbar.dashboard", "Dashboard")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  handleLogout();
                }}
                className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full", bn)}
              >
                {t("navbar.logout", "Logout")}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full", bn)}
            >
              <HiOutlineUserCircle className="text-xl" />
              {t("navbar.login")}
            </Link>
          )}
        </div>
      </aside>

      {/* Main navbar */}
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          isSticky
            ? "border-b border-border bg-background/85 shadow-soft backdrop-blur-xl"
            : "border-b border-transparent bg-background"
        )}
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-secondary" />
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: brand + nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-2.5">
              <BrandMark />
              <Wordmark />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {menu.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group relative px-3.5 py-2 text-[15px] font-medium transition-colors",
                    bn,
                    isActive(href) ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "absolute bottom-0.5 left-3.5 h-0.5 rounded-full bg-primary transition-all duration-300",
                      isActive(href) ? "w-5" : "w-0 group-hover:w-4"
                    )}
                  />
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: language + login + mobile toggle */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {user ? (
              <UserMenu
                user={user}
                dashHref={dashHref}
                onLogout={handleLogout}
                className={cn("hidden lg:block", bn)}
              />
            ) : (
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "primary", size: "sm" }), "hidden lg:inline-flex", bn)}
              >
                <HiOutlineUserCircle className="text-lg" />
                {t("navbar.login")}
                <LuArrowRight className="text-sm" />
              </Link>
            )}

            <div className="sm:hidden">
              <LanguageSwitcher />
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-primary/40 hover:text-primary lg:hidden"
              aria-label="Open menu"
            >
              <LuMenu className="text-xl" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;

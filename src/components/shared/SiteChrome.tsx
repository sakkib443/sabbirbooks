"use client";

import { usePathname } from "next/navigation";
import { LuHouse, LuBookOpen, LuShoppingBag, LuUser } from "react-icons/lu";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav, { BottomNavSpacer } from "./BottomNav";
import WhatsAppButton from "./WhatsAppButton";
import type { IconType } from "react-icons";

// Routes that render their own shell (admin panel, student dashboard, learn player)
// should NOT get the public Navbar/Footer.
const BARE_PREFIXES = ["/admin", "/dashboard", "/learn", "/book-preview"];

// The QR reader is a reading surface, not a page of the site: it opens from a
// printed page, fills the screen, and has its own header. Wrapping it in the
// storefront's navbar, footer and tab bar turns a book page into a web page.
const FULLSCREEN_PREFIXES = ["/b"];

/**
 * The storefront's phone tabs. Four is the most a thumb scans without reading:
 * where you are, what you can try, what you came to buy, and your own stuff.
 * "নমুনা" is the landing page's sample section — a hash, so it works from any
 * page and simply scrolls when you are already home.
 */
type Tab = { key: string; href: string; label: string; icon: IconType; exact?: boolean };

const PUBLIC_TABS: Tab[] = [
  { key: "home", href: "/", label: "হোম", icon: LuHouse, exact: true },
  { key: "sample", href: "/#sample", label: "নমুনা", icon: LuBookOpen },
  { key: "orders", href: "/dashboard/user/orders", label: "অর্ডার", icon: LuShoppingBag },
  { key: "account", href: "/dashboard/user", label: "অ্যাকাউন্ট", icon: LuUser },
];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const bare = BARE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const fullscreen = FULLSCREEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (bare || fullscreen) return <>{children}</>;

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      {/* The spacer sits after the footer so the tab bar never covers it. */}
      <BottomNavSpacer />
      <BottomNav items={PUBLIC_TABS} />
      {/* Every public screen, not just the landing page: a question can occur
          to someone on the book page or halfway through the policies. Left off
          the QR reader and the dashboards, which have their own shells. */}
      <WhatsAppButton />
    </>
  );
}

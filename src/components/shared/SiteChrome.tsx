"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Routes that render their own shell (admin panel, student dashboard, learn player)
// should NOT get the public Navbar/Footer.
const BARE_PREFIXES = ["/admin", "/dashboard", "/learn"];

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const bare = BARE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (bare) return <>{children}</>;

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

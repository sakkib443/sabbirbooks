"use client";

/**
 * The Meta Pixel on every page, and a PageView each time the visitor moves.
 *
 * One PageView per path, not per full page load: after the first page this site
 * navigates inside the browser, so the snippet's usual load-time PageView would
 * record one visit where the buyer actually opened three pages.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { isPixelLive, preparePixel, track } from "@/lib/metaPixel";

// Staff screens. Someone working the order queue all day is not a visitor, and
// counting them would inflate the very numbers the ads are judged by.
const NOT_TRACKED = ["/dashboard/admin", "/book-preview"];

// The stub exists before any component can fire an event and before the
// library is requested — the same order Meta's snippet guarantees in <head>.
preparePixel();

export default function MetaPixel() {
  const pathname = usePathname();
  const tracked = Boolean(pathname) && !NOT_TRACKED.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (tracked) track("PageView");
  }, [pathname, tracked]);

  if (!isPixelLive || !tracked) return null;
  return (
    <Script
      id="meta-pixel"
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="afterInteractive"
    />
  );
}

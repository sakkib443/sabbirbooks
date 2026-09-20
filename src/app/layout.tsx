import type { Metadata } from "next";
import { Poppins, Outfit, Sora, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteChrome from "@/components/shared/SiteChrome";
import ScrollToTop from "@/components/shared/ScrollToTop";
import ThemeScript from "@/components/theme/ThemeScript";
import MetaPixel from "@/components/analytics/MetaPixel";
import { SITE_URL } from "@/config/site";

/*
 * The faces this site actually sets text in — and only the weights it sets it
 * at.
 *
 * Every weight here is a file every visitor downloads before the page settles,
 * and this list used to be eight families at nine weights each: 25 files,
 * 532KB, on a landing page reached from a phone ad. Four of those families
 * (Roboto, Lobster, Caveat, Work Sans) were never set on anything public —
 * Work Sans is used by the course admin screens and is loaded there instead,
 * and the other three were not used at all.
 *
 * A weight that is asked for but not loaded is synthesised from the nearest
 * one, so the cost of being wrong here is a slightly-off heading, not a broken
 * page. The cost of being generous is a second of blank text on 3G.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-outfit",
});
// Sora — the hero's display face. Modern, geometric and a touch techy, it
// matches the cover's neon-clinical look and reads distinctly from Outfit.
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
});
// Hind Siliguri renders Bangla (Bengali) text cleanly.
// Bengali is the whole site's reading face, and a Bengali weight is a big file
// — the glyph set is large. Four weights, not five.
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
});

// Meta Business domain verification: Meta's crawler reads this tag on the home
// page to confirm the domain belongs to the shop's business account. It is a
// public code, not a secret. It sits outside the brand lookup below so it is in
// every response, even when the settings API is down. facebookexternalhit is
// one of the HTML-limited bots Next.js serves blocking metadata to, so the tag
// lands in <head> for Meta even though this metadata is generated.
const META_TAGS: Metadata["other"] = {
  "facebook-domain-verification": "mhe2gdj5p1c07y6p1rueqfo96bumt9",
};

// The tab title follows the brand configured in the admin panel, so renaming
// the site does not leave the old name in the browser tab. Cached for five
// minutes — this runs on every page render, and the name changes about once in
// the life of the site.
//
// The icons do not come from the admin panel any more. favicon.ico, icon.png
// and apple-icon.png beside this file are cut from the book cover, and a
// Settings favicon would only add a second, competing <link rel="icon">.
export async function generateMetadata(): Promise<Metadata> {
  const fallback: Metadata = {
    // Absolute URLs for the share image, icons and canonical links. Without it a
    // self-hosted build points them at localhost.
    metadataBase: new URL(SITE_URL),
    title: "Magic Viva",
    description: "A medical course and book platform.",
    other: META_TAGS,
  };

  const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/i, "");
  if (!api) return fallback;

  try {
    const res = await fetch(`${api}/api/settings`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    const body = await res.json();
    const s = body?.data;
    if (!s?.brandName) return fallback;

    return {
      metadataBase: fallback.metadataBase,
      title: { default: s.brandName, template: `%s · ${s.brandName}` },
      description:
        s.heroDescription || `${s.brandName} — medical courses, books and QR resources.`,
      other: META_TAGS,
    };
  } catch {
    // The site must still render when the API is down.
    return fallback;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: ThemeScript stamps data-theme / colorScheme onto
    // this element before React hydrates, so the DOM legitimately differs from
    // the server output. Without it React would discard the corrected DOM and
    // the theme would flash.
    //
    // lang="bn": the server renders every page in Bengali (LanguageContext's
    // default), so that is what search engines and screen readers are told.
    // A saved English preference updates it in the browser.
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${poppins.variable} ${outfit.variable} ${sora.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          {/* In the root layout, not in SiteChrome: the dashboards render their
              own shell and need every page to open at the top just as much as
              the storefront does. */}
          <ScrollToTop />
          {/* Every page: the storefront, checkout and the buyer's own dashboard
              are one journey as far as the ads are concerned. The component
              itself leaves the staff screens out. */}
          <MetaPixel />
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import {
  Poppins,
  Roboto,
  Lobster,
  Caveat,
  Work_Sans,
  Outfit,
  Sora,
  Hind_Siliguri,
} from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteChrome from "@/components/shared/SiteChrome";
import ThemeScript from "@/components/theme/ThemeScript";

// Google Fonts (ported from the Aptech Learning setup)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-roboto",
});
const lobster = Lobster({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-lobster",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caveat",
});
const worksans = Work_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-work",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
});
// Sora — the hero's display face. Modern, geometric and a touch techy, it
// matches the cover's neon-clinical look and reads distinctly from Outfit.
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
});
// Hind Siliguri renders Bangla (Bengali) text cleanly.
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
});

// Tab title, share previews and the favicon all follow the brand configured in
// the admin panel, so renaming the site does not leave the old name in the
// browser tab. Cached for five minutes — this runs on every page render, and the
// name changes about once in the life of the site.
export async function generateMetadata(): Promise<Metadata> {
  const fallback: Metadata = {
    title: "Magic Viva",
    description: "A medical course and book platform.",
  };

  const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/i, "");
  if (!api) return fallback;

  try {
    const res = await fetch(`${api}/api/settings`, { next: { revalidate: 300 } });
    if (!res.ok) return fallback;
    const body = await res.json();
    const s = body?.data;
    if (!s?.brandName) return fallback;

    const icon = s.favicon || s.logo;
    return {
      title: { default: s.brandName, template: `%s · ${s.brandName}` },
      description:
        s.heroDescription || `${s.brandName} — medical courses, books and QR resources.`,
      ...(icon ? { icons: { icon } } : {}),
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${roboto.variable} ${lobster.variable} ${caveat.variable} ${worksans.variable} ${outfit.variable} ${sora.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}

import type { NextConfig } from "next";

// The API server also serves uploaded media from /uploads (see server app.ts),
// so whatever host NEXT_PUBLIC_API_URL points at must be allowed for
// next/image. Derived at build time so prod/staging need no config edit.
const apiImageHost = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return [];
  try {
    const { protocol, hostname, port } = new URL(raw);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
        ...(port ? { port } : {}),
      },
    ];
  } catch {
    console.warn(`[next.config] NEXT_PUBLIC_API_URL is not a valid URL: ${raw}`);
    return [];
  }
})();

// The real backend origin (a *.sslip.io host in prod). The browser never talks
// to it directly — see src/config/api.js — so the client never has to resolve a
// host its network might block. Instead the browser hits our own /api and
// /uploads, and Next proxies them here, server-side, where sslip.io resolves.
const backendOrigin = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime stage.
  output: "standalone",
  // Same-origin proxy: keeps the backend's (sslip.io) host off the browser, so
  // a visitor whose network blocks sslip.io can still reach the API through the
  // site's own domain.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backendOrigin}/uploads/:path*` },
    ];
  },
  images: {
    // Remote hosts allowed for next/image. Extend as new sources are added.
    remotePatterns: [
      ...apiImageHost,
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "i.ibb.co.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Local API server (Sabbir Book backend) — serves uploaded media in dev.
      { protocol: "http", hostname: "localhost", port: "5000" },
    ],
  },
};

export default nextConfig;

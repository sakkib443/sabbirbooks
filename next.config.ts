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

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime stage.
  output: "standalone",
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

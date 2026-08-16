// Central API base for the Sabbir Book / Magic Viva client.
//
// In the BROWSER we deliberately talk to our OWN origin ("/api") and let a
// Next.js rewrite (see next.config.ts) proxy /api and /uploads through to the
// backend, server-side. The backend is reachable at a *.sslip.io host, and some
// ISPs / mobile carriers / DNS resolvers block sslip.io — so a visitor whose
// network blocks it could load the site but never reach the API ("Could not
// reach the server"). Keeping that host off the browser entirely means every
// visitor only ever needs to resolve the site's own domain, which they already
// can (they are looking at the site).
//
// On the SERVER (SSR / the rewrite itself) there is no same-origin to hit, so we
// use the real backend URL from NEXT_PUBLIC_API_URL.
const RAW = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/api\/?$/i, "");

const API_BASE_URL = typeof window !== "undefined" ? "/api" : RAW + "/api";

export { API_BASE_URL };
export default API_BASE_URL;

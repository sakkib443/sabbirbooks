// Central API configuration for the Sabbir Book client.
// NEXT_PUBLIC_API_URL is the BARE server host (no /api suffix), e.g.
// http://localhost:5000 in dev or https://sabbirbooks-server.vercel.app in prod.
// We append "/api" here so both our public pages (which import this config)
// and the ported Aptech dashboards (which inline the same expression) resolve
// to the identical base URL.
const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "/api";

export { API_BASE_URL };
export default API_BASE_URL;

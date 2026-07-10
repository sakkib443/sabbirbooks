// Central API configuration for the Sabbir Book client.
// NEXT_PUBLIC_API_URL is expected to already include the "/api" suffix
// (see .env.local / .env.example). Falls back to the local server default.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export { API_BASE_URL };
export default API_BASE_URL;

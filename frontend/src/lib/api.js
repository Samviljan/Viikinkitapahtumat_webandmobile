import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// Auth uses httpOnly cookies set by the backend (samesite=none + secure).
// We DO NOT store the JWT in localStorage to avoid XSS token theft.
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Tuntematon virhe.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

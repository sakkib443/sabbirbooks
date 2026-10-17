/**
 * The Book Orders screen's day: noon to noon, Bangladesh time.
 *
 * A date names the day that ENDS at its noon — "16 Sep" is every order placed
 * from 15 Sep 12:00 PM up to (not including) 16 Sep 12:00 PM. An order placed
 * after noon belongs to the next date's list. It was 3 PM until the orders grew
 * enough that a list closing at 3 could not be packed before the courier came
 * for it at 4. The dashboard and analytics still count calendar days, midnight
 * to midnight.
 *
 * Bangladesh is UTC+6 all year (no daylight saving), so every boundary is
 * built with a fixed +06:00 offset: the same order lands on the same day
 * whatever the admin's own device clock or timezone says.
 */

const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const CUTOFF_KEY = 'sb_day_cutoff';

/*
 * The cutoff hour is the shop's to set (18 Oct 2026) — Settings
 * shopDayCutoffHour, 0–23 (0 = midnight, i.e. calendar days), the same value
 * the server splits days at (sabbirbooks_server utils/shopDay). Kept here as
 * 1–24 (24 = midnight closing the date). The last known value is remembered
 * in localStorage so the very first list on a page load is already cut right;
 * loadShopDayCutoff() refreshes it from the server.
 */
const toInternal = (h) => {
  const n = Number(h);
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n === 0 ? 24 : n;
};
let cutoffHour = (() => {
  try {
    return (typeof window !== 'undefined' && toInternal(localStorage.getItem(CUTOFF_KEY) ?? 'x')) || 12;
  } catch {
    return 12;
  }
})();

/** The cutoff as Settings stores it (0–23). */
export const getCutoffHour = () => (cutoffHour === 24 ? 0 : cutoffHour);

/** Use a new cutoff (0–23) from now on, and remember it. */
export function setCutoffHour(h) {
  const v = toInternal(h);
  if (!v) return;
  cutoffHour = v;
  try {
    localStorage.setItem(CUTOFF_KEY, String(getCutoffHour()));
  } catch {
    // private mode — this page load still uses it
  }
}

/** "12 PM", "9 AM", "12 AM (midnight)" for an hour 0–23. */
export function hourLabel(h) {
  const n = Number(h);
  if (n === 0) return '12 AM (midnight)';
  if (n === 12) return '12 PM (noon)';
  return n < 12 ? `${n} AM` : `${n - 12} PM`;
}

/** YYYY-MM-DD in Bangladesh for an instant. */
export function bdDate(instant = new Date()) {
  return new Date(instant.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);
}

/** A YYYY-MM-DD date moved by n days. */
export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The instant a day closes: that date, 12:00 noon in Bangladesh. */
export function cutoffOf(day) {
  return new Date(new Date(`${day}T00:00:00+06:00`).getTime() + cutoffHour * HOUR_MS);
}

/** Orders placed in [from, to) for the days fromDay…toDay, both included. */
export function dayWindow(fromDay, toDay = fromDay) {
  return { from: cutoffOf(addDays(fromDay, -1)), to: cutoffOf(toDay) };
}

/**
 * Which day's list an instant belongs to — the inverse of cutoffOf.
 *
 * An order placed at 1 AM on the 20th belongs to the 20th (the day that closes
 * at that noon); one placed at 3 PM belongs to the 21st. Used to read back a
 * delivery date the admin set, which is stored as the instant its day opens.
 */
export function dayOf(instant) {
  const day = bdDate(instant);
  return instant.getTime() < cutoffOf(day).getTime() ? day : addDays(day, 1);
}

/** Has today's noon already passed in Bangladesh? New orders then count for tomorrow. */
export function pastCutoff(now = new Date()) {
  return now.getTime() >= cutoffOf(bdDate(now)).getTime();
}

/** "15 Sep, 12:00 pm" in Bangladesh time. */
export function formatBd(instant) {
  return instant.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Refresh the cutoff from the server's Settings. Resolves true when it
 * changed, so a screen already cut at the old hour can reload.
 */
export async function loadShopDayCutoff(apiBase) {
  try {
    const res = await fetch(`${apiBase}/settings`, { cache: 'no-store' });
    const json = await res.json();
    const h = json?.data?.shopDayCutoffHour;
    if (h === undefined || h === null) return false;
    const before = getCutoffHour();
    setCutoffHour(h);
    return before !== getCutoffHour();
  } catch {
    return false;
  }
}

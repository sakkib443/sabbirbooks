/**
 * The Book Orders screen's day: 3 PM to 3 PM, Bangladesh time.
 *
 * A date names the day that ENDS at its 3 PM — "16 Sep" is every order placed
 * from 15 Sep 3:00 PM up to (not including) 16 Sep 3:00 PM. An order placed
 * after 3 PM belongs to the next date's list. The shop asked for this; the
 * dashboard and analytics still count calendar days, midnight to midnight.
 *
 * Bangladesh is UTC+6 all year (no daylight saving), so every boundary is
 * built with a fixed +06:00 offset: the same order lands on the same day
 * whatever the admin's own device clock or timezone says.
 */

export const CUTOFF_HOUR = 15;
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

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

/** The instant a day closes: that date, 3:00 PM in Bangladesh. */
export function cutoffOf(day) {
  return new Date(`${day}T${String(CUTOFF_HOUR).padStart(2, '0')}:00:00+06:00`);
}

/** Orders placed in [from, to) for the days fromDay…toDay, both included. */
export function dayWindow(fromDay, toDay = fromDay) {
  return { from: cutoffOf(addDays(fromDay, -1)), to: cutoffOf(toDay) };
}

/** Has today's 3 PM already passed in Bangladesh? New orders then count for tomorrow. */
export function pastCutoff(now = new Date()) {
  return now.getTime() >= cutoffOf(bdDate(now)).getTime();
}

/** "15 Sep, 3:00 PM" in Bangladesh time. */
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

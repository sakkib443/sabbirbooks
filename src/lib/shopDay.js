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

export const CUTOFF_HOUR = 12;
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

/** The instant a day closes: that date, 12:00 noon in Bangladesh. */
export function cutoffOf(day) {
  return new Date(`${day}T${String(CUTOFF_HOUR).padStart(2, '0')}:00:00+06:00`);
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

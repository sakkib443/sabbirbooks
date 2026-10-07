/**
 * Is this a number a person could actually be reached on?
 *
 * The same rule the server applies (server: src/app/utils/phone.ts) — kept
 * here so a typo is caught before the round-trip, and worded the same way so
 * the two never disagree about what is acceptable.
 *
 * A number from any country is accepted. A number that LOOKS Bangladeshi —
 * digits beginning with 0, with or without an 88 in front — is still held to
 * the local shape, because nearly every number typed into this site is
 * Bangladeshi and "01712 34567" with a digit missing is a typo worth
 * catching. A country code that merely starts with 88, such as Taiwan's +886,
 * is not caught by that: the 0 has to be there.
 */

const PHONE_SHAPE = /^\+?[\d\s().-]+$/;
const BANGLADESHI = /^(?:88)?01[3-9]\d{8}$/;
const LOOKS_BANGLADESHI = /^(?:88)?0\d+$/;

/** Shortest plausible national number, and E.164's own ceiling. */
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

export function isReachableNumber(raw) {
  const value = String(raw ?? '').trim();
  if (!value || !PHONE_SHAPE.test(value)) return false;

  const digits = value.replace(/\D/g, '');
  if (LOOKS_BANGLADESHI.test(digits)) return BANGLADESHI.test(digits);

  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS;
}

/** What to tell someone whose number was refused. */
export const WHATSAPP_HINT = {
  bn: 'সঠিক WhatsApp নম্বর দিন — ০১৭১২৩৪৫৬৭৮, অথবা দেশের বাইরের নম্বর হলে কান্ট্রি কোড সহ (+919876543210)',
  en: 'Enter a valid WhatsApp number — 01712345678, or with the country code if it is not Bangladeshi (+919876543210)',
};

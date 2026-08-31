/**
 * Who the shop legally is.
 *
 * The policy pages, the footer and the checkout consent line all state these
 * facts, and a payment gateway's review reads them against each other — a phone
 * number in the footer that disagrees with the one in the refund policy is the
 * kind of mismatch that fails a compliance check. So they are written once,
 * here, and imported.
 *
 * SSLCommerz's merchant review specifically looks for: a reachable phone
 * number, an email on the site's own domain, a physical trading address, and a
 * refund/return policy that names a real window. Change a value here and every
 * page that quotes it follows.
 */

/** The trading name customers see. Kept separate from settings.siteName, which
 *  an admin can rename at will — a legal page must not shift under them. */
export const BUSINESS_NAME = 'Magic Viva';
export const BUSINESS_NAME_BN = 'ম্যাজিক ভাইভা';

export const SUPPORT_PHONE = '01799075202';
/** International form, for tel: and wa.me links. */
export const SUPPORT_PHONE_INTL = '+8801799075202';
export const WHATSAPP_NUMBER = '8801799075202';

export const SUPPORT_EMAIL = 'info@sabbirbook.com';

/** Shown on every policy page. A gateway review wants a street address, not a
 *  city — replace the line below with the full trading address when it is
 *  confirmed, and all four policy pages update with it. */
export const BUSINESS_ADDRESS = 'Dhaka, Bangladesh';
export const BUSINESS_ADDRESS_BN = 'ঢাকা, বাংলাদেশ';

/** Support window quoted in the policies, so the refund and delivery pages
 *  cannot promise different hours. */
export const SUPPORT_HOURS = 'Saturday–Thursday, 10:00 AM – 8:00 PM';
export const SUPPORT_HOURS_BN = 'শনিবার–বৃহস্পতিবার, সকাল ১০টা – রাত ৮টা';

/** The company that builds and runs the site. Credited in the footer. */
export const BUILT_BY = 'Ejobs IT';
export const BUILT_BY_URL = 'https://ejobsit.com';

/** Every policy page, in the order the footer lists them. One array so a new
 *  policy cannot be added to the site and forgotten in the footer or in the
 *  checkout consent line. */
export const LEGAL_PAGES = [
  { slug: 'terms-and-conditions', en: 'Terms & Conditions', bn: 'শর্তাবলি' },
  { slug: 'privacy-policy', en: 'Privacy Policy', bn: 'প্রাইভেসি পলিসি' },
  { slug: 'refund-policy', en: 'Refund & Return Policy', bn: 'রিফান্ড ও রিটার্ন পলিসি' },
  { slug: 'delivery-policy', en: 'Delivery Policy', bn: 'ডেলিভারি পলিসি' },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]['slug'];

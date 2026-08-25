// Bangladesh districts and divisions, and the courier-zone rule that follows
// from a district.
//
// The lists are only ever SUGGESTIONS (rendered as a <datalist>), never a closed
// set: the shipping fields stay free text so a buyer whose district we spell
// differently — or who ships somewhere we have not listed — can still order.
// The spellings match the ones the medical-college directory stores, because
// that is where a prefilled district comes from and a prefill that does not
// match its own suggestion list looks broken.

import type { DeliveryArea } from "./types";

export const BD_DIVISIONS = [
  "ঢাকা",
  "চট্টগ্রাম",
  "রাজশাহী",
  "খুলনা",
  "বরিশাল",
  "সিলেট",
  "রংপুর",
  "ময়মনসিংহ",
] as const;

export const BD_DISTRICTS = [
  // ঢাকা
  "ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "নরসিংদী", "মানিকগঞ্জ", "মুন্সিগঞ্জ",
  "টাঙ্গাইল", "কিশোরগঞ্জ", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "রাজবাড়ী",
  "শরীয়তপুর",
  // চট্টগ্রাম
  "চট্টগ্রাম", "কক্সবাজার", "কুমিল্লা", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "ফেনী",
  "লক্ষ্মীপুর", "নোয়াখালী", "খাগড়াছড়ি", "রাঙ্গামাটি", "বান্দরবান",
  // রাজশাহী
  "রাজশাহী", "বগুড়া", "জয়পুরহাট", "নওগাঁ", "নাটোর", "চাঁপাইনবাবগঞ্জ", "পাবনা",
  "সিরাজগঞ্জ",
  // খুলনা
  "খুলনা", "বাগেরহাট", "চুয়াডাঙ্গা", "যশোর", "ঝিনাইদহ", "কুষ্টিয়া", "মাগুরা",
  "মেহেরপুর", "নড়াইল", "সাতক্ষীরা",
  // বরিশাল
  "বরিশাল", "বরগুনা", "ভোলা", "ঝালকাঠি", "পটুয়াখালী", "পিরোজপুর",
  // সিলেট
  "সিলেট", "হবিগঞ্জ", "মৌলভীবাজার", "সুনামগঞ্জ",
  // রংপুর
  "রংপুর", "দিনাজপুর", "গাইবান্ধা", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী",
  "পঞ্চগড়", "ঠাকুরগাঁও",
  // ময়মনসিংহ
  "ময়মনসিংহ", "জামালপুর", "নেত্রকোণা", "শেরপুর",
] as const;

/**
 * Which courier zone a district belongs to.
 *
 * An exact match on the one canonical spelling, mirroring `areaForDistrict` in
 * the server's order.service.ts character for character. Being cleverer here —
 * accepting "Dhaka", or anything containing "ঢাকা" — would quote the buyer the
 * cheaper inside-Dhaka rate on an order the server then prices as outside
 * Dhaka, and a total that changes after you press pay is exactly the surprise
 * this whole screen exists to avoid. Anything unrecognised lands on the dearer
 * zone, which is the safe direction to be wrong in.
 */
export const districtToArea = (district?: string): DeliveryArea =>
  (district ?? "").trim() === "ঢাকা" ? "inside-dhaka" : "outside-dhaka";

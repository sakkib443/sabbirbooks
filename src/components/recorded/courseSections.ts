// The course page's parts, by name (11 Nov 2026) — one list, so the public
// page (RecordedCourseDetail) and the admin course editor (CourseEditor) call
// every part the same thing and keep the same order.
import { SUPPORT_PHONE } from "@/config/business";

export const COURSE_SECTIONS = {
  bn: { overview: "কোর্স ওভারভিউ", curriculum: "কোর্স কারিকুলাম", includes: "কোর্সে যা পাবেন", benefits: "সুবিধা", how: "কীভাবে কিনবেন", faq: "প্রশ্নোত্তর" },
  en: { overview: "Course overview", curriculum: "Course curriculum", includes: "What you get", benefits: "Benefits", how: "How to buy", faq: "FAQ" },
};

/** The site's standard Benefits, shown when a course leaves its own empty. */
export const DEFAULT_BENEFITS = {
  bn: ["যেকোনো সময়, যতবার খুশি দেখুন", "মোবাইল ও কম্পিউটারে", "একবার কিনলে আজীবন অ্যাক্সেস", "নিজের গতিতে শিখুন"],
  en: ["Watch any time, as often as you like", "On mobile and computer", "Buy once, lifetime access", "Learn at your own pace"],
};

/** The site's standard FAQ, shown when a course leaves its own empty. */
export const DEFAULT_FAQ: Record<"bn" | "en", [string, string][]> = {
  bn: [
    ["কেনার পর কোথায় দেখব?", "লগইন করে “আমার কোর্স” থেকে। মোবাইল বা কম্পিউটার, যেকোনোটায় দেখা যাবে।"],
    ["কতদিন দেখা যাবে?", "একবার কিনলে আজীবন — যতবার খুশি দেখতে পারবেন।"],
    ["পেমেন্ট কীভাবে করব?", "অনলাইনে (কার্ড, বিকাশ, নগদ) অথবা বিকাশ/নগদে Send Money করে TrxID দিয়ে। অনলাইন পেমেন্টে সাথে সাথে খোলে, Send Money-তে অ্যাডমিন মিলিয়ে নিলে খোলে।"],
    ["কোনো সমস্যা হলে?", `কল বা WhatsApp করুন: ${SUPPORT_PHONE}`],
  ],
  en: [
    ["Where do I watch after buying?", "Log in and open “My courses” — on mobile or computer."],
    ["How long can I watch?", "Buy once, lifetime access — watch as often as you like."],
    ["How do I pay?", "Online (card, bKash, Nagad), or by bKash/Nagad Send Money with the TrxID. Online payments open at once; Send Money opens once an admin checks it."],
    ["Something wrong?", `Call or WhatsApp us: ${SUPPORT_PHONE}`],
  ],
};

/** "How to buy" — the same for every course (the shop's payment process). */
export const HOW_TO_BUY = {
  bn: ["“এখনই ভর্তি হন” চাপুন, লগইন করুন", "অনলাইনে বা বিকাশ/নগদে পেমেন্ট করুন", "পেমেন্ট মিললেই কোর্স খুলে যাবে"],
  en: ["Press “Enroll now” and log in", "Pay online, or by bKash/Nagad", "The course opens once paid"],
};

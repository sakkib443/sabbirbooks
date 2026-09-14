/**
 * Search copy for the landing book — what Google reads, and the words students
 * actually type ("anatomy viva book", "1st prof anatomy viva", "viva card").
 *
 * Keyed by the book's slug on purpose. The keywords describe this one book; a
 * different book put on the landing page later must not inherit "Anatomy" in
 * its title and FAQ, so a slug without an entry here simply gets none of it.
 *
 * Every claim is one the book's own page already makes — the card counts, the
 * practical topics, the QR content — so the visible text, the page title and
 * the FAQ structured data can never say something the shop does not.
 */

export interface SeoPoint {
  title: string;
  body: string;
}

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoCopy {
  eyebrow: string;
  heading: string;
  intro: string;
  points: SeoPoint[];
  closing: string;
  faqHeading: string;
  faq: SeoFaq[];
}

export interface LandingSeo {
  /** The <title>. Under ~60 characters so Google shows it whole. */
  title: string;
  description: string;
  keywords: string[];
  coverAlt: string;
  bn: SeoCopy;
  en: SeoCopy;
}

const ANATOMY_MAGIC_VIVA: LandingSeo = {
  title: 'MAGIC VIVA ANATOMY — Anatomy Viva Book for MBBS 1st Prof',
  description:
    'MBBS 1st Prof-এর Anatomy Viva Book: Board-I 70 ও Board-II 100 viva card, anatomy viva questions and answers, practical ও oral viva। সারা দেশে ক্যাশ অন ডেলিভারি।',
  keywords: [
    'Anatomy viva',
    'Anatomy viva card',
    'Anatomy prof card',
    'Anatomy viva card question',
    'Anatomy Viva Book',
    'Anatomy Viva Guide',
    'Anatomy Viva Questions and Answers',
    'Anatomy Viva Preparation',
    'Anatomy Viva Book for MBBS',
    'MBBS Anatomy Viva Book',
    '1st Professional Anatomy Viva',
    '1st Prof Anatomy Viva Book',
    'Anatomy Viva Bangladesh',
    'MBBS Anatomy Viva Bangladesh',
    'Medical Student Anatomy Viva',
    'Anatomy Practical Viva',
    'Anatomy Oral Viva',
    'Anatomy Viva Questions',
    'Anatomy Viva Short Questions',
    'Anatomy Viva Notes',
    'Anatomy Viva Revision Book',
    'Magic Viva',
  ],
  coverAlt: 'MAGIC VIVA ANATOMY — Anatomy Viva Book for MBBS 1st Prof, Board-I 70 ও Board-II 100 viva card',
  bn: {
    eyebrow: 'Anatomy Viva Guide',
    heading: 'Anatomy Viva Book for MBBS — 1st Prof-এর প্রস্তুতি এক বইয়ে',
    intro:
      'MAGIC VIVA ANATOMY বাংলাদেশের MBBS শিক্ষার্থীদের জন্য লেখা 1st Prof Anatomy Viva Book। নতুন সিলেবাস অনুযায়ী Board-I-এ ৭০টি আর Board-II-তে ১০০টি Anatomy Viva Card — কার্ড ধরে সাজানো Anatomy Viva Questions and Answers, যাতে Oral Viva আর Practical Viva-র প্রস্তুতি একসাথে হয়।',
    points: [
      {
        title: 'Anatomy Viva Card',
        body: 'Board-I ৭০ আর Board-II ১০০ কার্ড — 1st Professional Anatomy Viva-র প্রশ্ন বোর্ড ধরে ভাগ করা Prof Card। ২০২৬-এ নতুন ৩০টি কার্ড যোগ হয়েছে।',
      },
      {
        title: 'Anatomy Practical Viva',
        body: 'OSPE, Dissection, Surface Marking আর Radiology — Practical-এর সমাধান এক জায়গাতেই।',
      },
      {
        title: 'Oral Viva ও Short Questions',
        body: 'Anatomy Oral Viva-য় আসা ছোট ছোট প্রশ্ন (Anatomy Viva Short Questions) আর তার গোছানো উত্তর, সাথে Written-এর ৯০% কাভার।',
      },
      {
        title: 'Anatomy Viva Notes ও Revision',
        body: 'প্রতিটি টপিকের QR স্ক্যান করলে ছবি, ভিডিও আর বাড়তি নোট। মাত্র ৩ ঘণ্টায় দুই বোর্ডের সব স্পেশাল ফিগার রিভিশন দেওয়া যায়।',
      },
    ],
    closing:
      'বাংলাদেশের MBBS Anatomy Viva-র নতুন সিলেবাস মেনে লেখা — Medical Student-দের Anatomy Viva Preparation আর পরীক্ষার আগের রিভিশনের জন্য একটাই বই।',
    faqHeading: 'প্রশ্ন ও উত্তর',
    faq: [
      {
        q: 'MAGIC VIVA ANATOMY বইটি কাদের জন্য?',
        a: 'MBBS 1st Professional পরীক্ষার্থীদের জন্য। বাংলাদেশের নতুন সিলেবাস অনুযায়ী লেখা এই Anatomy Viva Book দিয়ে Oral Viva আর Practical Viva — দুটোরই প্রস্তুতি নেওয়া যায়।',
      },
      {
        q: 'বইয়ে কয়টি Anatomy Viva Card আছে?',
        a: 'Board-I-এ ৭০টি আর Board-II-তে ১০০টি কার্ড, viva-র প্রশ্ন আর উত্তর কার্ড ধরে সাজানো। ২০২৬ সালে নতুন ৩০টি কার্ড যোগ হয়েছে।',
      },
      {
        q: 'Anatomy Practical Viva-র প্রস্তুতি কি এই বইয়ে আছে?',
        a: 'হ্যাঁ। OSPE, Dissection, Surface Marking আর Radiology — Practical-এর এই অংশগুলোর সমাধান বইয়েই দেওয়া আছে।',
      },
      {
        q: 'বইয়ের QR কোড দিয়ে কী দেখা যায়?',
        a: 'প্রতিটি টপিকের পাশে ছাপা QR ফোনে স্ক্যান করলে ওই টপিকের প্রশ্নের উত্তর, ছবি আর ভিডিও খুলে যায়। QR কনটেন্ট দেখতে বইটি কেনা থাকতে হয়।',
      },
      {
        q: 'কীভাবে অর্ডার করব? ডেলিভারি কোথায় হয়?',
        a: '"অর্ডার করুন" বাটনে চাপ দিয়ে নাম, মোবাইল নম্বর, মেডিকেল কলেজ আর ঠিকানা দিলেই অর্ডার হয়ে যায় — অ্যাকাউন্ট খুলতে হয় না। সারা বাংলাদেশে ক্যাশ অন ডেলিভারিতে বই পাঠানো হয়।',
      },
    ],
  },
  en: {
    eyebrow: 'Anatomy Viva Guide',
    heading: 'Anatomy Viva Book for MBBS — 1st Prof preparation in one book',
    intro:
      'MAGIC VIVA ANATOMY is a 1st Prof Anatomy Viva Book written for MBBS students in Bangladesh. Following the new syllabus, it has 70 Anatomy Viva Cards for Board-I and 100 for Board-II — Anatomy Viva Questions and Answers arranged card by card, so oral and practical viva are prepared together.',
    points: [
      {
        title: 'Anatomy Viva Card',
        body: '70 cards for Board-I and 100 for Board-II — the 1st Professional Anatomy Viva questions split by board, as prof cards. 30 new cards were added in 2026.',
      },
      {
        title: 'Anatomy Practical Viva',
        body: 'OSPE, dissection, surface marking and radiology — the practical, solved in one place.',
      },
      {
        title: 'Oral Viva & Short Questions',
        body: 'The short questions an Anatomy Oral Viva asks, with well-organised answers — and 90% of the written exam covered too.',
      },
      {
        title: 'Anatomy Viva Notes & Revision',
        body: "Scan a topic's QR code for figures, videos and extra notes. Revise every special figure from both boards in about three hours.",
      },
    ],
    closing:
      "Written to Bangladesh's new MBBS Anatomy Viva syllabus — one book for a medical student's Anatomy Viva preparation and last-minute revision.",
    faqHeading: 'Questions & answers',
    faq: [
      {
        q: 'Who is MAGIC VIVA ANATOMY for?',
        a: "MBBS 1st Professional exam candidates. Written to Bangladesh's new syllabus, this Anatomy Viva Book prepares you for both the oral and the practical viva.",
      },
      {
        q: 'How many Anatomy Viva Cards does the book have?',
        a: '70 cards for Board-I and 100 for Board-II, with the viva questions and answers arranged card by card. 30 new cards were added in 2026.',
      },
      {
        q: 'Does the book cover the Anatomy Practical Viva?',
        a: 'Yes. OSPE, dissection, surface marking and radiology — the practical is solved in the book itself.',
      },
      {
        q: "What do the book's QR codes open?",
        a: "Scan the QR code printed beside a topic and that topic's answers, figures and videos open on your phone. You need to own the book to open QR content.",
      },
      {
        q: 'How do I order, and where do you deliver?',
        a: 'Tap "Order now" and enter your name, mobile number, medical college and address — no account needed. Books are delivered across Bangladesh, cash on delivery.',
      },
    ],
  },
};

const BY_SLUG: Record<string, LandingSeo> = {
  'anatomy-magic-viva': ANATOMY_MAGIC_VIVA,
};

export function landingSeoFor(book?: { slug?: string } | null): LandingSeo | null {
  return (book?.slug && BY_SLUG[book.slug]) || null;
}

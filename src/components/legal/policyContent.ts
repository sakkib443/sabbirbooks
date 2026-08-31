/**
 * The four policy documents, in both languages.
 *
 * They live in a data module rather than in src/locales/*.json because those
 * files are UI strings — button labels and headings, looked up one key at a
 * time. A policy is one document that has to be read as a whole, and splitting
 * its clauses across two large JSON files is how a Bengali clause quietly ends
 * up saying something the English one does not.
 *
 * Every factual claim here — the phone number, the return window, who holds the
 * card data — is either imported from config/business or is a statement about
 * how this site actually works. Anything a reviewer can check by using the site
 * must stay true to the code: the delivery page's "access opens on delivery"
 * mirrors hasBookAccess, and the refund window mirrors what support honours.
 */
import {
  BUSINESS_ADDRESS,
  BUSINESS_ADDRESS_BN,
  BUSINESS_NAME,
  BUSINESS_NAME_BN,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_HOURS_BN,
  SUPPORT_PHONE,
} from '@/config/business';

export type PolicySection = { heading: string; body: string[] };
export type PolicyDoc = {
  title: string;
  /** One line under the title saying what the document is for. */
  intro: string;
  sections: PolicySection[];
};
export type BilingualPolicy = { en: PolicyDoc; bn: PolicyDoc };

/** Shown under every policy title. The date the wording last changed — not a
 *  build timestamp, which would tell a reader the terms changed when only a
 *  stylesheet did. Update it when you edit the text. */
export const POLICY_UPDATED = { en: '31 August 2026', bn: '৩১ আগস্ট ২০২৬' };

const TERMS: BilingualPolicy = {
  en: {
    title: 'Terms & Conditions',
    intro: `These terms govern your use of ${BUSINESS_NAME} and any purchase you make here. By placing an order you accept them.`,
    sections: [
      {
        heading: '1. Who we are',
        body: [
          `${BUSINESS_NAME} sells printed medical reference books for students in Bangladesh, together with the digital answer content those books link to. We operate from ${BUSINESS_ADDRESS} and can be reached on ${SUPPORT_PHONE} or at ${SUPPORT_EMAIL}.`,
          `In these terms, "we" and "us" mean ${BUSINESS_NAME}; "you" means the person placing an order or reading content on this site.`,
        ],
      },
      {
        heading: '2. What you are buying',
        body: [
          'Each product page states whether the item is a printed book, digital access, or both. A printed book is delivered to the address you give at checkout. Digital content is the answer material — text, figures and video — that the QR codes printed inside the book open.',
          'Digital access is tied to your account, not to the paper copy. It is granted to the account that placed the order and is not transferable. Reselling, sharing or republishing that content, in whole or in part, is not permitted.',
          'Chapters we mark as free samples open for anyone, with or without an account. Every other chapter opens only for a reader who has bought the book.',
        ],
      },
      {
        heading: '3. Your account',
        body: [
          'You need an account to order and to read the digital content you have bought. Keep your login details to yourself — anything done through your account is treated as done by you.',
          'The details you give us must be accurate. A wrong phone number or address is the single most common reason a parcel fails to arrive, and we cannot deliver to an address that does not exist.',
          'We may suspend an account that shares paid content, attempts to bypass access checks, or is used fraudulently.',
        ],
      },
      {
        heading: '4. Prices, offers and payment',
        body: [
          'All prices are in Bangladeshi Taka (BDT) and include VAT where it applies. Delivery charges are shown separately at checkout before you confirm.',
          'Offers, pre-order discounts and coupon codes are applied by our server at the moment you place the order, and the amount shown in your order summary is the amount charged. An offer can be withdrawn or changed at any time before you place an order; it never changes after.',
          'You may pay cash on delivery, or online through SSLCommerz. We do not see or store your card or mobile-wallet credentials — those are entered on the gateway\'s own secure page.',
          'If a price or stock level is shown wrongly because of a clear error, we may cancel the affected order and refund you in full rather than fulfil it at the wrong price. We will tell you before we do.',
        ],
      },
      {
        heading: '5. Orders and cancellation',
        body: [
          'An order is a request to buy. It is confirmed when we accept it — for cash on delivery that means our confirmation, and for online payment it means a successful payment.',
          'You can cancel a free order any time before it is dispatched by calling us. Once a parcel is with the courier it can no longer be cancelled, but you may still refuse it at the door or return it under our Refund & Return Policy.',
          'We may decline an order if the item is out of stock, if the delivery address is outside our courier network, or if we have reason to believe the order is fraudulent.',
        ],
      },
      {
        heading: '6. Content and copyright',
        body: [
          'The books, the answer content, the figures, the videos, the layout of this site and the QR system that links them are ours or are used with permission. You may read and use them for your own study.',
          'You may not copy, redistribute, upload, screenshot in bulk, or sell any part of the paid content. Doing so ends your access without a refund and may be pursued further.',
        ],
      },
      {
        heading: '7. What we do not promise',
        body: [
          'The content is study material prepared with care, but it is not medical advice and must not be used to guide the care of a patient. Always follow your institution\'s curriculum and your supervisors.',
          'We aim to keep the site available at all times, but we do not guarantee uninterrupted service. Maintenance, a courier failure, or a fault at a payment provider can interrupt it.',
        ],
      },
      {
        heading: '8. Changes to these terms',
        body: [
          'We may update these terms. The date at the top of this page shows when they last changed, and the version shown here at the time you order is the version that applies to that order.',
        ],
      },
      {
        heading: '9. Governing law',
        body: [
          'These terms are governed by the laws of Bangladesh, and any dispute is subject to the jurisdiction of the courts of Bangladesh.',
        ],
      },
    ],
  },
  bn: {
    title: 'শর্তাবলি',
    intro: `${BUSINESS_NAME_BN} ব্যবহার এবং এখান থেকে কেনাকাটার ক্ষেত্রে এই শর্তগুলো প্রযোজ্য। অর্ডার করার মাধ্যমে আপনি এগুলো মেনে নিচ্ছেন।`,
    sections: [
      {
        heading: '১. আমরা কারা',
        body: [
          `${BUSINESS_NAME_BN} বাংলাদেশের মেডিকেল শিক্ষার্থীদের জন্য ছাপা রেফারেন্স বই এবং সেই বইয়ের সাথে যুক্ত ডিজিটাল উত্তর-কনটেন্ট বিক্রি করে। আমাদের ঠিকানা ${BUSINESS_ADDRESS_BN}; যোগাযোগ ${SUPPORT_PHONE} অথবা ${SUPPORT_EMAIL}।`,
          `এই শর্তাবলিতে "আমরা" বলতে ${BUSINESS_NAME_BN} এবং "আপনি" বলতে অর্ডারকারী বা এই সাইটের পাঠককে বোঝানো হয়েছে।`,
        ],
      },
      {
        heading: '২. আপনি কী কিনছেন',
        body: [
          'প্রতিটি প্রোডাক্ট পেজে লেখা থাকে জিনিসটা ছাপা বই, ডিজিটাল অ্যাক্সেস, নাকি দুটোই। ছাপা বই আপনার দেওয়া ঠিকানায় পৌঁছে দেওয়া হয়। ডিজিটাল কনটেন্ট বলতে বইয়ের ভেতরের QR কোড স্ক্যান করলে যে উত্তর — লেখা, ছবি ও ভিডিও — খোলে সেটা।',
          'ডিজিটাল অ্যাক্সেস কাগজের কপির সাথে নয়, আপনার অ্যাকাউন্টের সাথে যুক্ত। যে অ্যাকাউন্ট থেকে অর্ডার হয়েছে সেটিই অ্যাক্সেস পায় এবং তা হস্তান্তরযোগ্য নয়। এই কনটেন্টের কোনো অংশ পুনর্বিক্রয়, শেয়ার বা পুনঃপ্রকাশ করা যাবে না।',
          'যে অধ্যায়গুলো আমরা ফ্রি নমুনা হিসেবে চিহ্নিত করেছি সেগুলো অ্যাকাউন্ট ছাড়াই যে কেউ পড়তে পারবেন। বাকি সব অধ্যায় শুধু বই কিনেছেন এমন পাঠকের জন্য খোলে।',
        ],
      },
      {
        heading: '৩. আপনার অ্যাকাউন্ট',
        body: [
          'অর্ডার করতে এবং কেনা ডিজিটাল কনটেন্ট পড়তে একটি অ্যাকাউন্ট লাগবে। লগইনের তথ্য নিজের কাছে রাখুন — আপনার অ্যাকাউন্ট থেকে যা কিছু হয় তা আপনার করা বলেই ধরা হবে।',
          'আপনার দেওয়া তথ্য সঠিক হতে হবে। ভুল ফোন নম্বর বা ঠিকানাই পার্সেল না পৌঁছানোর সবচেয়ে সাধারণ কারণ, আর যে ঠিকানা নেই সেখানে আমরা পৌঁছাতে পারি না।',
          'কেউ পেইড কনটেন্ট শেয়ার করলে, অ্যাক্সেস চেক এড়ানোর চেষ্টা করলে বা প্রতারণামূলকভাবে অ্যাকাউন্ট ব্যবহার করলে আমরা তা স্থগিত করতে পারি।',
        ],
      },
      {
        heading: '৪. দাম, অফার ও পেমেন্ট',
        body: [
          'সব দাম বাংলাদেশি টাকায় (BDT) এবং প্রযোজ্য ক্ষেত্রে ভ্যাটসহ। ডেলিভারি চার্জ কনফার্ম করার আগেই চেকআউটে আলাদা করে দেখানো হয়।',
          'অফার, প্রি-অর্ডার ছাড় ও কুপন কোড অর্ডার করার মুহূর্তে আমাদের সার্ভারে হিসাব হয়, এবং অর্ডার সামারিতে যে অঙ্ক দেখানো হয় ঠিক সেটাই নেওয়া হয়। অর্ডার করার আগে যেকোনো সময় অফার বদলাতে বা তুলে নেওয়া হতে পারে; অর্ডার করার পরে কখনো নয়।',
          'আপনি ক্যাশ অন ডেলিভারিতে দিতে পারেন, অথবা SSLCommerz-এর মাধ্যমে অনলাইনে। আপনার কার্ড বা মোবাইল ওয়ালেটের তথ্য আমরা দেখি না, সংরক্ষণও করি না — সেগুলো গেটওয়ের নিজস্ব নিরাপদ পেজে দেওয়া হয়।',
          'স্পষ্ট ভুলের কারণে দাম বা স্টক ভুল দেখালে আমরা ভুল দামে সরবরাহ না করে অর্ডারটি বাতিল করে পুরো টাকা ফেরত দিতে পারি। তার আগে আপনাকে জানানো হবে।',
        ],
      },
      {
        heading: '৫. অর্ডার ও বাতিল',
        body: [
          'অর্ডার হলো কেনার অনুরোধ। আমরা গ্রহণ করলে সেটি নিশ্চিত হয় — ক্যাশ অন ডেলিভারির ক্ষেত্রে আমাদের কনফার্মেশনে, আর অনলাইন পেমেন্টে সফল পেমেন্টে।',
          'পার্সেল কুরিয়ারে যাওয়ার আগে ফোন করে যেকোনো সময় বিনা খরচে অর্ডার বাতিল করতে পারেন। কুরিয়ারে চলে গেলে আর বাতিল করা যায় না, তবে দরজায় নিতে অস্বীকার করতে পারেন কিংবা রিফান্ড ও রিটার্ন পলিসি অনুযায়ী ফেরত দিতে পারেন।',
          'পণ্য স্টকে না থাকলে, ঠিকানা আমাদের কুরিয়ার নেটওয়ার্কের বাইরে হলে, বা অর্ডারটি প্রতারণামূলক মনে করার কারণ থাকলে আমরা তা ফিরিয়ে দিতে পারি।',
        ],
      },
      {
        heading: '৬. কনটেন্ট ও কপিরাইট',
        body: [
          'বই, উত্তর-কনটেন্ট, ছবি, ভিডিও, এই সাইটের ডিজাইন এবং সেগুলোকে যুক্ত করা QR ব্যবস্থা আমাদের, অথবা অনুমতি নিয়ে ব্যবহার করা। নিজের পড়াশোনার জন্য আপনি এগুলো পড়তে ও ব্যবহার করতে পারবেন।',
          'পেইড কনটেন্টের কোনো অংশ কপি, বিতরণ, আপলোড, ঢালাওভাবে স্ক্রিনশট বা বিক্রি করা যাবে না। করলে রিফান্ড ছাড়াই অ্যাক্সেস বন্ধ হবে এবং আইনানুগ ব্যবস্থা নেওয়া হতে পারে।',
        ],
      },
      {
        heading: '৭. যা আমরা নিশ্চয়তা দিই না',
        body: [
          'এই কনটেন্ট যত্ন নিয়ে তৈরি পড়ার উপকরণ, কিন্তু এটি চিকিৎসা-পরামর্শ নয় এবং রোগীর চিকিৎসা পরিচালনার ভিত্তি হিসেবে ব্যবহার করা যাবে না। সবসময় আপনার প্রতিষ্ঠানের কারিকুলাম ও শিক্ষকদের অনুসরণ করুন।',
          'সাইটটি সবসময় সচল রাখার চেষ্টা করি, তবে নিরবচ্ছিন্ন সেবার নিশ্চয়তা দিই না। রক্ষণাবেক্ষণ, কুরিয়ারের সমস্যা বা পেমেন্ট প্রোভাইডারের ত্রুটিতে সেবা বিঘ্নিত হতে পারে।',
        ],
      },
      {
        heading: '৮. শর্তাবলির পরিবর্তন',
        body: [
          'আমরা এই শর্তাবলি হালনাগাদ করতে পারি। পাতার উপরে থাকা তারিখটি বলে দেয় সর্বশেষ কবে বদলেছে, এবং আপনি যখন অর্ডার করেন তখন যে সংস্করণটি এখানে ছিল সেটিই ওই অর্ডারের জন্য প্রযোজ্য।',
        ],
      },
      {
        heading: '৯. প্রযোজ্য আইন',
        body: [
          'এই শর্তাবলি বাংলাদেশের আইন দ্বারা পরিচালিত এবং যেকোনো বিরোধ বাংলাদেশের আদালতের এখতিয়ারভুক্ত।',
        ],
      },
    ],
  },
};

const PRIVACY: BilingualPolicy = {
  en: {
    title: 'Privacy Policy',
    intro: `What ${BUSINESS_NAME} collects about you, why, and what we never do with it.`,
    sections: [
      {
        heading: '1. What we collect',
        body: [
          'When you create an account: your name, email address, phone number and the medical college you attend. The college is required before you can order, because it is how we route deliveries and how the shop understands where its readers are.',
          'When you order: your delivery address (division, district, upazila and street address), the items you bought, and the payment method you chose.',
          'When you read: which QR topics you opened and when. This tells us which chapters are being used and lets us show you where you left off.',
          'Technical data your browser sends on every visit — IP address, device and browser type — which we use to keep the service secure and working.',
        ],
      },
      {
        heading: '2. What we never collect',
        body: [
          'We never see your card number, CVV, PIN, OTP or mobile-wallet PIN. Online payments are handled entirely by SSLCommerz on their own page; what comes back to us is whether the payment succeeded, its amount, and a transaction reference — nothing you typed.',
          'No one from our team will ever ask you for an OTP or a PIN. If someone does, they are not us.',
        ],
      },
      {
        heading: '3. Why we use it',
        body: [
          'To take and deliver your order, and to give the courier the address they need.',
          'To open the digital content you bought to the right account, and to keep it closed to accounts that did not buy it.',
          'To email you when an order is placed and when it is confirmed, and to reach you by phone if a delivery needs sorting out.',
          'To understand, in aggregate, which chapters are read most — so the next edition is better.',
        ],
      },
      {
        heading: '4. Who else sees it',
        body: [
          'The courier that delivers your parcel receives your name, phone number and address, and nothing else.',
          'SSLCommerz receives the order amount and reference so it can process your payment.',
          'Our email provider handles the delivery of order emails to your inbox.',
          'Nobody else. We do not sell your data, we do not rent it, and we do not hand it to advertisers.',
        ],
      },
      {
        heading: '5. How long we keep it',
        body: [
          'Order records are kept as long as the law requires us to keep sales records, and so that you can see your own order history.',
          'Your account and its content access stay until you ask us to delete them.',
        ],
      },
      {
        heading: '6. How it is protected',
        body: [
          'The site is served over HTTPS. Passwords are stored hashed, never in readable form.',
          'The answer figures and videos are not public files — each one is served through an access check, so a link copied out of the page does not work for someone who has not bought the book.',
        ],
      },
      {
        heading: '7. Your choices',
        body: [
          `You can see and edit your profile from your dashboard at any time. To correct an order's details, or to have your account and personal data deleted, write to ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE} — ${SUPPORT_HOURS}.`,
          'Deleting your account also ends access to any digital content bought through it. We will say so before we act on the request.',
        ],
      },
      {
        heading: '8. Cookies',
        body: [
          'We use cookies and browser storage to keep you signed in, remember your language choice, and keep your cart between visits. We do not use advertising or cross-site tracking cookies.',
        ],
      },
      {
        heading: '9. Children',
        body: [
          'This site is meant for medical students and professionals. We do not knowingly collect data from children under 13.',
        ],
      },
    ],
  },
  bn: {
    title: 'প্রাইভেসি পলিসি',
    intro: `${BUSINESS_NAME_BN} আপনার কী তথ্য নেয়, কেন নেয়, আর কোনটা কখনোই করে না।`,
    sections: [
      {
        heading: '১. আমরা কী সংগ্রহ করি',
        body: [
          'অ্যাকাউন্ট খোলার সময়: আপনার নাম, ইমেইল, ফোন নম্বর এবং আপনি যে মেডিকেল কলেজে পড়েন তার নাম। অর্ডার করার আগে কলেজ দেওয়া বাধ্যতামূলক — এর ভিত্তিতেই ডেলিভারি সাজানো হয় এবং কোথায় আমাদের পাঠকেরা আছেন তা বোঝা যায়।',
          'অর্ডারের সময়: আপনার ডেলিভারি ঠিকানা (বিভাগ, জেলা, উপজেলা ও বিস্তারিত ঠিকানা), কী কিনেছেন, এবং কোন পেমেন্ট পদ্ধতি বেছেছেন।',
          'পড়ার সময়: কোন QR টপিক কখন খুলেছেন। এতে বোঝা যায় কোন অধ্যায়গুলো বেশি পড়া হচ্ছে, আর আপনি কোথায় থেমেছিলেন তা দেখানো যায়।',
          'প্রতিটি ভিজিটে ব্রাউজার যে কারিগরি তথ্য পাঠায় — আইপি ঠিকানা, ডিভাইস ও ব্রাউজারের ধরন — যা সেবাটি নিরাপদ ও সচল রাখতে ব্যবহার করি।',
        ],
      },
      {
        heading: '২. যা আমরা কখনোই নিই না',
        body: [
          'আপনার কার্ড নম্বর, CVV, PIN, OTP বা মোবাইল ওয়ালেটের পিন আমরা কখনো দেখি না। অনলাইন পেমেন্ট পুরোপুরি SSLCommerz তাদের নিজস্ব পেজে সম্পন্ন করে; আমাদের কাছে শুধু ফিরে আসে পেমেন্ট সফল হয়েছে কি না, কত টাকা, আর একটি ট্রানজেকশন রেফারেন্স — আপনার টাইপ করা কিছুই নয়।',
          'আমাদের কেউ কখনো আপনার কাছে OTP বা PIN চাইবে না। কেউ চাইলে বুঝবেন সে আমরা নই।',
        ],
      },
      {
        heading: '৩. কেন ব্যবহার করি',
        body: [
          'আপনার অর্ডার নিতে ও পৌঁছে দিতে, এবং কুরিয়ারকে প্রয়োজনীয় ঠিকানা দিতে।',
          'কেনা ডিজিটাল কনটেন্ট সঠিক অ্যাকাউন্টে খুলে দিতে, আর যারা কেনেননি তাদের জন্য বন্ধ রাখতে।',
          'অর্ডার হলে ও কনফার্ম হলে আপনাকে ইমেইল করতে, এবং ডেলিভারি নিয়ে কিছু ঠিক করার দরকার হলে ফোনে যোগাযোগ করতে।',
          'সামষ্টিকভাবে বুঝতে কোন অধ্যায়গুলো বেশি পড়া হয় — যাতে পরের সংস্করণ আরও ভালো হয়।',
        ],
      },
      {
        heading: '৪. আর কে দেখে',
        body: [
          'যে কুরিয়ার পার্সেল পৌঁছে দেয় তারা পায় আপনার নাম, ফোন নম্বর ও ঠিকানা — এর বাইরে কিছু নয়।',
          'SSLCommerz পেমেন্ট প্রক্রিয়া করার জন্য অর্ডারের অঙ্ক ও রেফারেন্স পায়।',
          'আমাদের ইমেইল সরবরাহকারী অর্ডারের মেইলগুলো আপনার ইনবক্সে পৌঁছে দেয়।',
          'আর কেউ নয়। আমরা আপনার তথ্য বিক্রি করি না, ভাড়া দিই না, বিজ্ঞাপনদাতাদের হাতেও তুলে দিই না।',
        ],
      },
      {
        heading: '৫. কতদিন রাখি',
        body: [
          'বিক্রয়ের হিসাব আইন অনুযায়ী যতদিন রাখা দরকার, এবং আপনি যেন নিজের অর্ডারের ইতিহাস দেখতে পারেন — ততদিন অর্ডারের রেকর্ড রাখা হয়।',
          'আপনার অ্যাকাউন্ট ও কনটেন্ট অ্যাক্সেস থাকে যতক্ষণ না আপনি মুছে ফেলতে বলেন।',
        ],
      },
      {
        heading: '৬. কীভাবে সুরক্ষিত',
        body: [
          'সাইটটি HTTPS-এ চলে। পাসওয়ার্ড হ্যাশ করে রাখা হয়, পড়ার মতো অবস্থায় কখনো নয়।',
          'উত্তরের ছবি ও ভিডিও উন্মুক্ত ফাইল নয় — প্রতিটি একটি অ্যাক্সেস চেকের মধ্য দিয়ে সরবরাহ হয়, তাই পাতা থেকে কপি করা লিংক এমন কারও কাজে লাগে না যিনি বইটি কেনেননি।',
        ],
      },
      {
        heading: '৭. আপনার নিয়ন্ত্রণ',
        body: [
          `ড্যাশবোর্ড থেকে যেকোনো সময় নিজের প্রোফাইল দেখতে ও সম্পাদনা করতে পারেন। অর্ডারের তথ্য সংশোধন করতে বা অ্যাকাউন্ট ও ব্যক্তিগত তথ্য মুছে ফেলতে ${SUPPORT_EMAIL}-এ লিখুন অথবা ${SUPPORT_PHONE}-এ ফোন করুন — ${SUPPORT_HOURS_BN}।`,
          'অ্যাকাউন্ট মুছে ফেললে সেটির মাধ্যমে কেনা ডিজিটাল কনটেন্টের অ্যাক্সেসও শেষ হয়ে যাবে। অনুরোধ কার্যকর করার আগে আমরা তা জানিয়ে দেব।',
        ],
      },
      {
        heading: '৮. কুকিজ',
        body: [
          'আপনাকে লগইন অবস্থায় রাখতে, ভাষার পছন্দ মনে রাখতে এবং ভিজিটের মাঝে কার্ট ধরে রাখতে আমরা কুকিজ ও ব্রাউজার স্টোরেজ ব্যবহার করি। বিজ্ঞাপন বা ক্রস-সাইট ট্র্যাকিং কুকি ব্যবহার করি না।',
        ],
      },
      {
        heading: '৯. শিশু',
        body: [
          'এই সাইট মেডিকেল শিক্ষার্থী ও পেশাজীবীদের জন্য। ১৩ বছরের কম বয়সীদের তথ্য আমরা জেনেশুনে সংগ্রহ করি না।',
        ],
      },
    ],
  },
};

const REFUND: BilingualPolicy = {
  en: {
    title: 'Refund & Return Policy',
    intro: 'When you can send a book back, when we refund, and how long the money takes.',
    sections: [
      {
        heading: '1. Check the parcel at the door',
        body: [
          'Please open and check the book while the courier is still there. If it is damaged, misprinted, or not what you ordered, refuse the parcel — that is the fastest resolution and costs you nothing.',
        ],
      },
      {
        heading: '2. Returning after delivery',
        body: [
          `You may ask to return a book within 3 days of receiving it if it is damaged, has printing or binding faults, is missing pages, or is the wrong item. Call ${SUPPORT_PHONE} or email ${SUPPORT_EMAIL} within that window with your order number and a photo of the problem.`,
          'The book must come back unused and complete, with any packaging it arrived in.',
          'Because the QR codes inside a book unlock digital content that cannot be returned, we do not accept change-of-mind returns on a book that has been opened and used. A sealed, unused book may still be returned within the same 3 days.',
        ],
      },
      {
        heading: '3. Who pays the return shipping',
        body: [
          'If the fault is ours — damage, a printing defect, or the wrong item sent — we pay the return courier charge and send a replacement or refund in full.',
          'If the return is for any other reason, the return courier charge is yours, and the original delivery charge is not refunded.',
        ],
      },
      {
        heading: '4. Refunds',
        body: [
          'Once we receive the returned book and confirm its condition, we start the refund within 2 working days.',
          'Online payments are refunded to the same card, wallet or bank account the payment came from, through SSLCommerz. Depending on your bank or wallet, the money usually appears within 7 to 10 working days.',
          'For a cash-on-delivery order, we refund by bKash, Nagad, or bank transfer to an account in your name, which we will confirm with you first.',
          'A refund covers the price you paid for the item. The original delivery charge is refunded only when the return is our fault.',
        ],
      },
      {
        heading: '5. Cancelled and failed orders',
        body: [
          'If you cancel before dispatch, or we cancel because an item is out of stock, any online payment is refunded in full to its original source.',
          'If money leaves your account but the order does not appear, do not pay again. Send us the transaction ID and we will trace it — a payment that did not reach us is returned by the gateway automatically, and one that did will be turned into your order.',
        ],
      },
      {
        heading: '6. Digital access',
        body: [
          'Digital access opens once your printed book is delivered, or once payment succeeds for a digital-only purchase. Access that has been opened and used is not refundable on its own.',
          'If the content does not open when it should, tell us — that is a fault we fix, not a refund you have to ask for.',
        ],
      },
      {
        heading: '7. How to reach us',
        body: [
          `${SUPPORT_PHONE} · ${SUPPORT_EMAIL} · ${SUPPORT_HOURS}. Please have your order number ready.`,
        ],
      },
    ],
  },
  bn: {
    title: 'রিফান্ড ও রিটার্ন পলিসি',
    intro: 'কখন বই ফেরত দেওয়া যাবে, কখন টাকা ফেরত পাবেন, আর কত দিন লাগবে।',
    sections: [
      {
        heading: '১. দরজাতেই পার্সেল দেখে নিন',
        body: [
          'কুরিয়ার সামনে থাকতেই বইটি খুলে দেখে নিন। ছেঁড়া, ছাপার ত্রুটি, বা যা অর্ডার করেছিলেন তা না হলে পার্সেলটি নিতে অস্বীকার করুন — এটাই দ্রুততম সমাধান এবং এতে আপনার কোনো খরচ নেই।',
        ],
      },
      {
        heading: '২. ডেলিভারির পরে ফেরত',
        body: [
          `বই হাতে পাওয়ার ৩ দিনের মধ্যে ফেরত চাইতে পারেন যদি সেটি ক্ষতিগ্রস্ত হয়, ছাপা বা বাঁধাইয়ে ত্রুটি থাকে, পাতা কম থাকে, বা ভুল জিনিস আসে। এই সময়ের মধ্যে অর্ডার নম্বর ও সমস্যার ছবিসহ ${SUPPORT_PHONE}-এ ফোন করুন অথবা ${SUPPORT_EMAIL}-এ মেইল করুন।`,
          'বইটি অব্যবহৃত ও সম্পূর্ণ অবস্থায়, যে মোড়কে এসেছিল তা সহ ফেরত দিতে হবে।',
          'বইয়ের ভেতরের QR কোড এমন ডিজিটাল কনটেন্ট খুলে দেয় যা ফেরত নেওয়া যায় না, তাই খোলা ও ব্যবহৃত বইয়ের ক্ষেত্রে "মত বদলেছে" কারণে ফেরত নেওয়া হয় না। সিলগালা ও অব্যবহৃত বই একই ৩ দিনের মধ্যে ফেরত দেওয়া যাবে।',
        ],
      },
      {
        heading: '৩. ফেরতের কুরিয়ার খরচ কে দেবে',
        body: [
          'দোষ আমাদের হলে — ক্ষতিগ্রস্ত বই, ছাপার ত্রুটি, বা ভুল জিনিস পাঠানো — ফেরতের কুরিয়ার খরচ আমরা দেব এবং বদলে নতুন বই পাঠাব অথবা পুরো টাকা ফেরত দেব।',
          'অন্য যেকোনো কারণে ফেরত দিলে ফেরতের কুরিয়ার খরচ আপনার, এবং প্রথমবারের ডেলিভারি চার্জ ফেরত দেওয়া হয় না।',
        ],
      },
      {
        heading: '৪. টাকা ফেরত',
        body: [
          'ফেরত আসা বই আমাদের হাতে পৌঁছানো ও অবস্থা যাচাইয়ের পর ২ কার্যদিবসের মধ্যে রিফান্ড শুরু করা হয়।',
          'অনলাইন পেমেন্ট SSLCommerz-এর মাধ্যমে যে কার্ড, ওয়ালেট বা ব্যাংক অ্যাকাউন্ট থেকে টাকা এসেছিল সেখানেই ফেরত যায়। আপনার ব্যাংক বা ওয়ালেট অনুযায়ী সাধারণত ৭ থেকে ১০ কার্যদিবসের মধ্যে টাকা পৌঁছায়।',
          'ক্যাশ অন ডেলিভারির ক্ষেত্রে বিকাশ, নগদ বা ব্যাংক ট্রান্সফারে আপনার নিজের নামের অ্যাকাউন্টে ফেরত দেওয়া হয়, যা আগে আপনার সাথে নিশ্চিত করে নেওয়া হবে।',
          'রিফান্ডে পণ্যের দাম ফেরত দেওয়া হয়। প্রথম ডেলিভারি চার্জ ফেরত পাবেন কেবল তখনই, যখন ফেরতের কারণ আমাদের ত্রুটি।',
        ],
      },
      {
        heading: '৫. বাতিল ও ব্যর্থ অর্ডার',
        body: [
          'পাঠানোর আগে আপনি বাতিল করলে, কিংবা স্টক না থাকায় আমরা বাতিল করলে, অনলাইনে দেওয়া পুরো টাকা যেখান থেকে এসেছিল সেখানেই ফেরত যায়।',
          'অ্যাকাউন্ট থেকে টাকা কেটে গেলেও অর্ডার না দেখালে দ্বিতীয়বার পেমেন্ট করবেন না। ট্রানজেকশন আইডিটি আমাদের পাঠান, আমরা খুঁজে বের করব — যে পেমেন্ট আমাদের কাছে পৌঁছায়নি গেটওয়ে সেটি স্বয়ংক্রিয়ভাবে ফেরত দেয়, আর যেটি পৌঁছেছে সেটিকে আপনার অর্ডারে পরিণত করা হবে।',
        ],
      },
      {
        heading: '৬. ডিজিটাল অ্যাক্সেস',
        body: [
          'ছাপা বই ডেলিভারি হলে, অথবা শুধু ডিজিটাল কেনার ক্ষেত্রে পেমেন্ট সফল হলে ডিজিটাল অ্যাক্সেস খুলে যায়। একবার খোলা ও ব্যবহৃত অ্যাক্সেস আলাদাভাবে ফেরতযোগ্য নয়।',
          'কনটেন্ট যখন খোলার কথা তখন না খুললে আমাদের জানান — ওটা আমাদের সারানোর ত্রুটি, আপনার রিফান্ড চাওয়ার বিষয় নয়।',
        ],
      },
      {
        heading: '৭. যোগাযোগ',
        body: [
          `${SUPPORT_PHONE} · ${SUPPORT_EMAIL} · ${SUPPORT_HOURS_BN}। অনুগ্রহ করে অর্ডার নম্বরটি হাতের কাছে রাখুন।`,
        ],
      },
    ],
  },
};

const DELIVERY: BilingualPolicy = {
  en: {
    title: 'Delivery Policy',
    intro: 'How your book reaches you, what it costs, and when the digital content opens.',
    sections: [
      {
        heading: '1. Where we deliver',
        body: [
          'We deliver anywhere in Bangladesh through our courier partners. Inside Dhaka city and outside it are charged differently; the exact charge for your address is shown at checkout before you confirm.',
        ],
      },
      {
        heading: '2. How long it takes',
        body: [
          'Inside Dhaka: usually 1–3 working days after your order is confirmed.',
          'Outside Dhaka: usually 3–5 working days after your order is confirmed.',
          'A pre-order ships when that edition is printed and released. The product page states the expected date, and we tell you if it moves.',
          'Public holidays, hartals and weather can delay a courier. If a parcel is running late we will call you.',
        ],
      },
      {
        heading: '3. Delivery charge',
        body: [
          'The charge is added on top of the item price and shown as a separate line in your order summary. It is not hidden inside the book price and it is not added afterwards.',
          'Cash-on-delivery orders may carry a different charge from prepaid ones; whichever applies to you is the one shown at checkout.',
        ],
      },
      {
        heading: '4. Getting the parcel',
        body: [
          'The courier will call the phone number on your order, so please keep it switched on. If they cannot reach you they will try again; after repeated failures the parcel comes back to us and the order is cancelled.',
          'Please check the book at the door — see the Refund & Return Policy for what to do if something is wrong.',
        ],
      },
      {
        heading: '5. When digital access opens',
        body: [
          'For a printed book, the QR content opens once the order is marked delivered. That is deliberate: the codes are printed inside the book, and access follows the book.',
          'For a digital purchase, access opens as soon as payment succeeds.',
          'Chapters marked as free samples are open to everyone at all times, with or without an order.',
        ],
      },
      {
        heading: '6. Tracking your order',
        body: [
          `You can see your order and its current status any time from your dashboard. We also email you when the order is placed and again when it is confirmed. For anything else, call ${SUPPORT_PHONE} — ${SUPPORT_HOURS}.`,
        ],
      },
    ],
  },
  bn: {
    title: 'ডেলিভারি পলিসি',
    intro: 'বই কীভাবে আপনার কাছে পৌঁছাবে, খরচ কত, আর ডিজিটাল কনটেন্ট কখন খুলবে।',
    sections: [
      {
        heading: '১. কোথায় পৌঁছে দিই',
        body: [
          'কুরিয়ার পার্টনারদের মাধ্যমে বাংলাদেশের যেকোনো জায়গায় পৌঁছে দিই। ঢাকা সিটির ভেতরে ও বাইরে চার্জ আলাদা; আপনার ঠিকানার জন্য প্রযোজ্য চার্জ কনফার্ম করার আগেই চেকআউটে দেখানো হয়।',
        ],
      },
      {
        heading: '২. কত সময় লাগে',
        body: [
          'ঢাকার ভেতরে: অর্ডার কনফার্ম হওয়ার পর সাধারণত ১–৩ কার্যদিবস।',
          'ঢাকার বাইরে: অর্ডার কনফার্ম হওয়ার পর সাধারণত ৩–৫ কার্যদিবস।',
          'প্রি-অর্ডার পাঠানো হয় ওই সংস্করণ ছাপা ও প্রকাশ হওয়ার পর। প্রোডাক্ট পেজে প্রত্যাশিত তারিখ লেখা থাকে, এবং তারিখ বদলালে আমরা জানিয়ে দিই।',
          'সরকারি ছুটি, হরতাল বা আবহাওয়ায় কুরিয়ার দেরি হতে পারে। পার্সেল দেরি হলে আমরা ফোন করে জানাব।',
        ],
      },
      {
        heading: '৩. ডেলিভারি চার্জ',
        body: [
          'চার্জটি পণ্যের দামের উপরে যোগ হয় এবং অর্ডার সামারিতে আলাদা লাইনে দেখানো হয়। এটি বইয়ের দামের ভেতরে লুকানো নয়, পরেও যোগ করা হয় না।',
          'ক্যাশ অন ডেলিভারি ও অগ্রিম পেমেন্টে চার্জ আলাদা হতে পারে; আপনার ক্ষেত্রে যেটি প্রযোজ্য সেটিই চেকআউটে দেখানো হয়।',
        ],
      },
      {
        heading: '৪. পার্সেল বুঝে নেওয়া',
        body: [
          'কুরিয়ার আপনার অর্ডারে দেওয়া নম্বরে ফোন করবে, তাই ফোনটি খোলা রাখুন। না পেলে তারা আবার চেষ্টা করবে; বারবার ব্যর্থ হলে পার্সেল আমাদের কাছে ফিরে আসে এবং অর্ডার বাতিল হয়ে যায়।',
          'দরজাতেই বইটি দেখে নিন — কিছু সমস্যা থাকলে কী করবেন তা রিফান্ড ও রিটার্ন পলিসিতে লেখা আছে।',
        ],
      },
      {
        heading: '৫. ডিজিটাল অ্যাক্সেস কখন খোলে',
        body: [
          'ছাপা বইয়ের ক্ষেত্রে অর্ডার "ডেলিভার্ড" হিসেবে চিহ্নিত হলে QR কনটেন্ট খোলে। এটা ইচ্ছাকৃত: কোডগুলো বইয়ের ভেতরে ছাপা, তাই অ্যাক্সেস বইয়ের সাথেই যায়।',
          'ডিজিটাল কেনার ক্ষেত্রে পেমেন্ট সফল হওয়ার সাথে সাথেই অ্যাক্সেস খোলে।',
          'ফ্রি নমুনা হিসেবে চিহ্নিত অধ্যায়গুলো সবসময় সবার জন্য খোলা — অর্ডার থাকুক বা না থাকুক।',
        ],
      },
      {
        heading: '৬. অর্ডার ট্র্যাক করা',
        body: [
          `ড্যাশবোর্ড থেকে যেকোনো সময় নিজের অর্ডার ও তার বর্তমান অবস্থা দেখতে পারবেন। অর্ডার হলে এবং কনফার্ম হলে আমরা ইমেইলও পাঠাই। এর বাইরে কিছু জানতে ${SUPPORT_PHONE}-এ ফোন করুন — ${SUPPORT_HOURS_BN}।`,
        ],
      },
    ],
  },
};

/** Every policy, keyed by the slug its route uses. */
export const POLICIES = {
  'terms-and-conditions': TERMS,
  'privacy-policy': PRIVACY,
  'refund-policy': REFUND,
  'delivery-policy': DELIVERY,
} as const;

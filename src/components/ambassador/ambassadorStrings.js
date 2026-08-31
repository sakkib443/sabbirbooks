/**
 * Every word on the Campus Ambassador page, in both languages.
 *
 * One table per language rather than keys in src/locales/*.json: this is a
 * single self-contained page with ~70 strings of its own, and threading them
 * through the shared UI dictionary makes both files harder to read without
 * making this page any easier to translate. The checkout does the same.
 *
 * The option VALUES (not the labels) are the server's enums — see
 * ambassador.validation.ts. Translating a value rather than its label is how a
 * form silently starts failing validation in one language only, so they live in
 * the shared arrays below and never inside a language table.
 */

/** Values the server accepts. Labels come from the language tables. */
export const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Intern'];

export const REACH_BANDS = ['<25', '25-50', '50-100', '100-200', '200-300', '300+'];

export const PROMO_CHANNELS = [
  'facebook-profile',
  'facebook-groups',
  'batch-groups',
  'messenger-groups',
  'whatsapp-groups',
  'instagram',
  'classmates',
  'campus-community',
  'other',
];

/** The six undertakings. Every one must be ticked — the server checks too. */
export const AGREEMENT_KEYS = [
  'accurateInfo',
  'approvalRequired',
  'responsibleUse',
  'honestPromotion',
  'noFalseClaims',
  'shopMayTerminate',
];

const EN = {
  // ── Programme ──────────────────────────────────────────────
  badge: 'Campus Ambassador Program',
  heroTitle: 'Bring MAGIC VIVA ANATOMY to your campus',
  heroSub:
    'We are looking for medical students who can introduce the book to their classmates, juniors and seniors. Get your own coupon code, give your friends a discount, and earn on every copy sold under it.',
  perks: [
    {
      title: 'Your own coupon code',
      body: 'Built from your college and your name — DMCSAKIB20 — so everyone knows whose code it is.',
    },
    {
      title: '৳20 off for your friends',
      body: 'Anyone who orders with your code pays ৳20 less. It stacks on top of whatever offer is already running.',
    },
    {
      title: '৳30 to you, per copy',
      body: 'Every book sold under your code earns you ৳30. Your dashboard shows every sale and what you have earned.',
    },
  ],
  howTitle: 'How it works',
  how: [
    'Fill in the form below. It takes about three minutes.',
    'Our team reviews your application.',
    'Once approved, your coupon code goes live and you get a login to track your sales.',
    'Share your code. Watch your earnings add up.',
  ],
  loginNote:
    'After approval you sign in with your email address; your phone number is your first password, and you can change it from your dashboard.',

  // ── Form ───────────────────────────────────────────────────
  formTitle: 'Application form',
  formIntro:
    'Please fill this in carefully. Your ambassador status and coupon code become active only after approval.',
  required: 'required',
  optional: 'optional',

  s1: 'Personal information',
  fullName: 'Full name',
  fullNamePh: 'e.g. Sakib Hasan',
  phone: 'Phone number',
  phonePh: '01XXXXXXXXX',
  whatsapp: 'WhatsApp number',
  whatsappSame: 'Same as my phone number',
  email: 'Email address',
  emailPh: 'you@example.com',
  facebook: 'Facebook profile link',
  facebookPh: 'facebook.com/yourprofile',
  instagram: 'Instagram profile link',
  instagramPh: 'instagram.com/yourprofile',

  s2: 'Academic information',
  college: 'Medical college',
  collegePh: 'Start typing your college name…',
  collegeNone: 'No college matches that',
  batch: 'Current batch',
  batchHelp: 'Which batch of your college you are in.',
  batchPh: 'e.g. KMC-33',
  year: 'Current year / professional',
  yearPh: 'Select one',
  years: {
    '1st Year': '1st Year',
    '2nd Year': '2nd Year',
    '3rd Year': '3rd Year',
    '4th Year': '4th Year',
    '5th Year': '5th Year',
    Intern: 'Intern',
  },
  city: 'Your current city',
  cityPh: 'e.g. Dhaka',
  idCard: 'Student verification',
  idCardHelp:
    'A clear photo of your college ID card. Only our team and you can see it — it is never public.',
  idCardPick: 'Choose a photo',
  idCardChange: 'Choose a different photo',
  idCardUploading: 'Uploading…',
  idCardDone: 'Uploaded',

  s3: 'Your campus reach',
  reach: 'Roughly how many medical students can you reach directly?',
  reaches: {
    '<25': 'Less than 25',
    '25-50': '25–50',
    '50-100': '50–100',
    '100-200': '100–200',
    '200-300': '200–300',
    '300+': 'More than 300',
  },
  channels: 'Where can you promote MAGIC VIVA ANATOMY?',
  channelsHelp: 'Select all that apply.',
  channelLabels: {
    'facebook-profile': 'Personal Facebook profile',
    'facebook-groups': 'Facebook groups',
    'batch-groups': 'Batch groups',
    'messenger-groups': 'Messenger groups',
    'whatsapp-groups': 'WhatsApp groups',
    instagram: 'Instagram',
    classmates: 'Directly among classmates',
    'campus-community': 'College / campus community',
    other: 'Other',
  },
  channelOther: 'Where else?',
  groupAdmin: 'Are you an admin or moderator of any relevant Facebook or WhatsApp group?',

  s4: 'Previous experience',
  priorExp:
    'Have you worked as a campus ambassador, brand ambassador, representative or promoter before?',
  expNote: 'Tell us briefly about it',
  expNotePh: 'Which brand, what you did, how long…',

  s6: 'Promotion preferences',
  comfortable: 'Are you comfortable sharing promotional content our team provides?',
  suggestions: 'Any ideas for promoting the book on your campus?',
  suggestionsPh: 'We read every one of these.',

  s7: 'Ambassador agreement',
  agreeIntro: 'Please read these before submitting. All six are required.',
  agreements: {
    accurateInfo: 'I have given accurate and genuine information in this application.',
    approvalRequired:
      'I understand that my ambassador status and coupon code become active only after approval.',
    responsibleUse: 'I will use my ambassador coupon code responsibly and will not misuse it.',
    honestPromotion: 'I will promote MAGIC VIVA ANATOMY honestly and professionally.',
    noFalseClaims:
      'I will not make false claims or unauthorised promises about the book, its discount, delivery or offers.',
    shopMayTerminate:
      'I understand that MAGIC VIVA ANATOMY may approve, reject, suspend or terminate an ambassador account.',
  },

  yes: 'Yes',
  no: 'No',
  submit: 'Submit application',
  submitting: 'Submitting…',

  // ── Result ─────────────────────────────────────────────────
  doneTitle: 'Application received',
  doneBody:
    'Our team will review it and get in touch. Your coupon code becomes active once your application is approved.',
  doneIdLabel: 'Your application ID',
  doneIdHelp: 'Keep this — quote it if you contact us about your application.',
  doneHome: 'Back to the book',

  errTitle: 'Could not submit',
  fixErrors: 'Please check the highlighted fields.',
};

const BN = {
  badge: 'ক্যাম্পাস অ্যাম্বাসেডর প্রোগ্রাম',
  heroTitle: 'আপনার ক্যাম্পাসে MAGIC VIVA ANATOMY পৌঁছে দিন',
  heroSub:
    'আমরা এমন মেডিকেল শিক্ষার্থী খুঁজছি যারা বইটি তাদের সহপাঠী, জুনিয়র ও সিনিয়রদের কাছে পৌঁছে দিতে পারবেন। নিজের নামে কুপন কোড পান, বন্ধুদের ছাড় দিন, আর প্রতিটি বিক্রিতে আয় করুন।',
  perks: [
    {
      title: 'নিজের নামের কুপন কোড',
      body: 'আপনার কলেজ আর নাম দিয়ে তৈরি — DMCSAKIB20 — যাতে সবাই বোঝে কোডটা কার।',
    },
    {
      title: 'বন্ধুদের জন্য ৳২০ ছাড়',
      body: 'আপনার কোড দিয়ে অর্ডার করলে ২০ টাকা কম লাগবে। চলমান অফারের উপরেই এই ছাড় যোগ হবে।',
    },
    {
      title: 'প্রতি কপিতে আপনার ৳৩০',
      body: 'আপনার কোডে বিক্রি হওয়া প্রতিটি বইয়ে ৩০ টাকা আপনার। ড্যাশবোর্ডে প্রতিটি সেল ও আয় দেখতে পাবেন।',
    },
  ],
  howTitle: 'কীভাবে কাজ করে',
  how: [
    'নিচের ফর্মটি পূরণ করুন — তিন মিনিটের কাজ।',
    'আমাদের টিম আপনার আবেদন যাচাই করবে।',
    'অনুমোদন হলেই আপনার কুপন কোড চালু হবে, আর সেল দেখার জন্য একটা লগইন পাবেন।',
    'কোডটা শেয়ার করুন। আয় জমতে দেখুন।',
  ],
  loginNote:
    'অনুমোদনের পর ইমেইল দিয়ে লগইন করবেন; প্রথম পাসওয়ার্ড হবে আপনার ফোন নম্বর, যেটা পরে ড্যাশবোর্ড থেকে বদলে নিতে পারবেন।',

  formTitle: 'আবেদন ফর্ম',
  formIntro:
    'অনুগ্রহ করে যত্ন নিয়ে পূরণ করুন। অনুমোদনের পরেই আপনার অ্যাম্বাসেডর স্ট্যাটাস ও কুপন কোড চালু হবে।',
  required: 'আবশ্যক',
  optional: 'ঐচ্ছিক',

  s1: 'ব্যক্তিগত তথ্য',
  fullName: 'পূর্ণ নাম',
  fullNamePh: 'যেমন: সাকিব হাসান',
  phone: 'ফোন নম্বর',
  phonePh: '01XXXXXXXXX',
  whatsapp: 'হোয়াটসঅ্যাপ নম্বর',
  whatsappSame: 'ফোন নম্বরের মতোই',
  email: 'ইমেইল ঠিকানা',
  emailPh: 'you@example.com',
  facebook: 'ফেসবুক প্রোফাইল লিংক',
  facebookPh: 'facebook.com/yourprofile',
  instagram: 'ইনস্টাগ্রাম প্রোফাইল লিংক',
  instagramPh: 'instagram.com/yourprofile',

  s2: 'শিক্ষাগত তথ্য',
  college: 'মেডিকেল কলেজ',
  collegePh: 'কলেজের নাম লিখতে শুরু করুন…',
  collegeNone: 'এই নামে কোনো কলেজ পাওয়া যায়নি',
  batch: 'বর্তমান ব্যাচ',
  batchHelp: 'আপনার কলেজের কততম ব্যাচ।',
  batchPh: 'যেমন: KMC-33',
  year: 'বর্তমান বর্ষ / প্রফেশনাল',
  yearPh: 'নির্বাচন করুন',
  years: {
    '1st Year': 'প্রথম বর্ষ',
    '2nd Year': 'দ্বিতীয় বর্ষ',
    '3rd Year': 'তৃতীয় বর্ষ',
    '4th Year': 'চতুর্থ বর্ষ',
    '5th Year': 'পঞ্চম বর্ষ',
    Intern: 'ইন্টার্ন',
  },
  city: 'বর্তমানে যে শহরে আছেন',
  cityPh: 'যেমন: ঢাকা',
  idCard: 'শিক্ষার্থী যাচাই',
  idCardHelp:
    'কলেজ আইডি কার্ডের একটি স্পষ্ট ছবি। শুধু আমাদের টিম আর আপনি দেখতে পাবেন — এটি কখনো পাবলিক হয় না।',
  idCardPick: 'ছবি নির্বাচন করুন',
  idCardChange: 'অন্য ছবি নির্বাচন করুন',
  idCardUploading: 'আপলোড হচ্ছে…',
  idCardDone: 'আপলোড হয়েছে',

  s3: 'আপনার ক্যাম্পাস রিচ',
  reach: 'আনুমানিক কতজন মেডিকেল শিক্ষার্থীর কাছে সরাসরি পৌঁছাতে পারবেন?',
  reaches: {
    '<25': '২৫ জনের কম',
    '25-50': '২৫–৫০',
    '50-100': '৫০–১০০',
    '100-200': '১০০–২০০',
    '200-300': '২০০–৩০০',
    '300+': '৩০০-এর বেশি',
  },
  channels: 'কোথায় কোথায় প্রচার করতে পারবেন?',
  channelsHelp: 'যতগুলো প্রযোজ্য সবগুলো নির্বাচন করুন।',
  channelLabels: {
    'facebook-profile': 'নিজের ফেসবুক প্রোফাইল',
    'facebook-groups': 'ফেসবুক গ্রুপ',
    'batch-groups': 'ব্যাচ গ্রুপ',
    'messenger-groups': 'মেসেঞ্জার গ্রুপ',
    'whatsapp-groups': 'হোয়াটসঅ্যাপ গ্রুপ',
    instagram: 'ইনস্টাগ্রাম',
    classmates: 'সরাসরি সহপাঠীদের মধ্যে',
    'campus-community': 'কলেজ / ক্যাম্পাস কমিউনিটি',
    other: 'অন্যান্য',
  },
  channelOther: 'আর কোথায়?',
  groupAdmin: 'আপনি কি সংশ্লিষ্ট কোনো ফেসবুক বা হোয়াটসঅ্যাপ গ্রুপের অ্যাডমিন/মডারেটর?',

  s4: 'পূর্ব অভিজ্ঞতা',
  priorExp:
    'আগে কখনো ক্যাম্পাস অ্যাম্বাসেডর, ব্র্যান্ড অ্যাম্বাসেডর, প্রতিনিধি বা প্রমোটার হিসেবে কাজ করেছেন?',
  expNote: 'সংক্ষেপে জানান',
  expNotePh: 'কোন ব্র্যান্ড, কী করেছেন, কতদিন…',

  s6: 'প্রচারের পছন্দ',
  comfortable: 'আমাদের টিমের দেওয়া প্রচারণামূলক কনটেন্ট শেয়ার করতে আপনি স্বচ্ছন্দ?',
  suggestions: 'আপনার ক্যাম্পাসে বইটি প্রচারের কোনো পরামর্শ আছে?',
  suggestionsPh: 'প্রতিটি পরামর্শ আমরা পড়ি।',

  s7: 'অ্যাম্বাসেডর সম্মতি',
  agreeIntro: 'জমা দেওয়ার আগে পড়ে নিন। ছয়টিই আবশ্যক।',
  agreements: {
    accurateInfo: 'এই আবেদনে আমি সঠিক ও প্রকৃত তথ্য দিয়েছি।',
    approvalRequired:
      'আমি বুঝেছি, অনুমোদনের পরেই আমার অ্যাম্বাসেডর স্ট্যাটাস ও কুপন কোড চালু হবে।',
    responsibleUse: 'আমি আমার কুপন কোড দায়িত্বের সাথে ব্যবহার করব, অপব্যবহার করব না।',
    honestPromotion: 'আমি MAGIC VIVA ANATOMY সৎ ও পেশাদারভাবে প্রচার করব।',
    noFalseClaims:
      'বই, ছাড়, ডেলিভারি বা অফার নিয়ে আমি মিথ্যা দাবি বা অননুমোদিত প্রতিশ্রুতি দেব না।',
    shopMayTerminate:
      'আমি বুঝেছি, MAGIC VIVA ANATOMY যেকোনো অ্যাম্বাসেডর অ্যাকাউন্ট অনুমোদন, বাতিল, স্থগিত বা বন্ধ করতে পারে।',
  },

  yes: 'হ্যাঁ',
  no: 'না',
  submit: 'আবেদন জমা দিন',
  submitting: 'জমা হচ্ছে…',

  doneTitle: 'আবেদন জমা হয়েছে',
  doneBody:
    'আমাদের টিম যাচাই করে আপনার সাথে যোগাযোগ করবে। আবেদন অনুমোদিত হলেই আপনার কুপন কোড চালু হবে।',
  doneIdLabel: 'আপনার আবেদন নম্বর',
  doneIdHelp: 'এটি রেখে দিন — আবেদন নিয়ে যোগাযোগ করলে এই নম্বরটি জানাবেন।',
  doneHome: 'বইয়ে ফিরে যান',

  errTitle: 'জমা দেওয়া যায়নি',
  fixErrors: 'চিহ্নিত ঘরগুলো দেখে নিন।',
};

export const ambassadorStrings = (isBengali) => (isBengali ? BN : EN);

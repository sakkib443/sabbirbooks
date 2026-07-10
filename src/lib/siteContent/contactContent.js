// Default content for the Contact page — used by the admin editor (initial values)
// AND the public page (fallback when nothing is saved yet). Single source of truth.
export const CONTACT_DEFAULTS = {
  hero: {
    badge: 'Get in touch', badgeBn: 'যোগাযোগ করুন',
    title: "Let's ", titleBn: 'চলুন ',
    highlight: 'Connect', highlightBn: 'সংযুক্ত হই',
    subtitle: 'Have a question or want to enroll? Reach out — our team is here to help you every step of the way.',
    subtitleBn: 'কোনো প্রশ্ন আছে বা ভর্তি হতে চান? যোগাযোগ করুন — আমাদের টিম প্রতিটি ধাপে আপনার পাশে আছে।',
  },
  info: {
    email: 'info@sabbirbook.com',
    phone: '+880 1838-150832',
    visitText: 'Narsingdi · Bhairab · Brahmanbaria',
    visitTextBn: 'নরসিংদী · ভৈরব · ব্রাহ্মণবাড়িয়া',
    officeHours: 'Sat–Thu, 9AM–8PM',
    officeHoursBn: 'শনি–বৃহঃ, সকাল ৯টা–রাত ৮টা',
  },
  branches: [
    {
      nameEn: 'Bhairab Branch', nameBn: 'ভৈরব ব্রাঞ্চ',
      addressEn: 'Jakir Hossain Bhaban, Bhairab Bus Stand, east side of Rafiqul Islam Mohila College',
      addressBn: 'জাকির হোসেন ভবন, ভৈরব বাসস্ট্যান্ড, রফিকুল ইসলাম মহিলা কলেজের পূর্ব পাশে',
      phones: ['01611154532', '01711154532'],
    },
    {
      nameEn: 'Narsingdi Branch', nameBn: 'নরসিংদী ব্রাঞ্চ',
      addressEn: 'Sultan Uddin Complex (3rd floor), Barir Mor, Nilakkha Chattar',
      addressBn: 'সুলতান উদ্দিন কমপ্লেক্স (৩য় তলা), বাড়ির মোড়, নিলক্ষা চত্বর',
      phones: ['01711154531', '01711661666'],
    },
    {
      nameEn: 'Brahmanbaria Branch', nameBn: 'ব্রাহ্মণবাড়িয়া ব্রাঞ্চ',
      addressEn: 'Brahmanbaria Sadar', addressBn: 'ব্রাহ্মণবাড়িয়া সদর',
      phones: ['01711154532'],
    },
  ],
  map: {
    embedUrl: 'https://www.google.com/maps?q=Aptech+Learning,+Narsingdi,+Bangladesh&output=embed',
  },
  social: {
    facebook: 'https://www.facebook.com/aptechlearning',
    youtube: 'https://aptechlearningbd.com',
    linkedin: 'https://aptechlearningbd.com',
    whatsapp: '8801838150832',
    followTitle: 'Follow Us', followTitleBn: 'আমাদের ফলো করুন',
    followDesc: 'Stay connected on social media for updates.', followDescBn: 'আপডেটের জন্য সোশ্যাল মিডিয়ায় যুক্ত থাকুন।',
    quickTitle: 'Need Quick Help?', quickTitleBn: 'দ্রুত সাহায্য দরকার?',
    quickDesc: 'Message us on WhatsApp for a fast reply.', quickDescBn: 'দ্রুত উত্তরের জন্য WhatsApp-এ মেসেজ দিন।',
  },
};

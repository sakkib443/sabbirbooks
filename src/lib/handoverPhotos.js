/**
 * Settings' handoverPhotos as slides. An upload is stored with whichever host
 * the server was called when it went up; only the path is kept, so it loads
 * through this site's /uploads proxy whatever that host was.
 */
export function handoverPhotosFrom(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => p && typeof p.url === 'string' && p.url.trim())
    .map((p) => ({
      src: p.url.trim().replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, ''),
      bn: p.bn || '',
      en: p.en || p.bn || '',
      pos: p.pos || undefined,
    }));
}

export const DEFAULT_HANDOVER_PHOTOS = [
  // First by the shop's choice (15 Oct). Nearly square, so the 3:4 frame
  // crops its sides — held right of centre to keep the book in the picture.
  {
    src: '/hero-handover-5.jpg',
    bn: 'একজন শিক্ষিকার হাতে ম্যাজিক ভাইভা অ্যানাটমি বইটি',
    en: 'A teacher holding the Magic Viva Anatomy book',
    pos: '62% 50%',
  },
  {
    src: '/hero-handover.jpg',
    bn: 'ম্যাজিক ভাইভা অ্যানাটমি বইটি হাতে তুলে দেওয়া হচ্ছে',
    en: 'The Magic Viva Anatomy book being handed over',
  },
  // Second by the shop's choice: it was last, and they wanted it seen early.
  {
    src: '/hero-handover-4.jpg',
    bn: 'ডিএমসি স্কুলে বইটি হাতে দুজন শিক্ষার্থী',
    en: 'Two students holding the book at DMC School',
  },
  {
    src: '/hero-handover-2.jpg',
    bn: 'লেখক একজন শিক্ষকের হাতে ম্যাজিক ভাইভা অ্যানাটমি বইটি তুলে দিচ্ছেন',
    en: 'The author handing the book to a teacher',
  },
  {
    src: '/hero-handover-3.jpg',
    bn: 'অ্যানাটমি ল্যাবে বইটি হাতে দুজন — পাশে কঙ্কাল ও হাড়ের নমুনা',
    en: 'The book held in an anatomy lab, beside a skeleton and bone specimens',
  },
];

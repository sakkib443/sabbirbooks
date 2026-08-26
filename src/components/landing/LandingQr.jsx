'use client';

/**
 * How the QR system works, in three steps.
 *
 * This is the part of the product a buyer cannot see from a cover photo, and it
 * is the reason the book costs what it costs — so it gets explained plainly
 * rather than listed as a feature bullet. Bilingual: the copy follows the page
 * language toggle.
 */

import { LuBookOpen, LuScanLine, LuVideo } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';

const T = {
  bn: {
    heading: 'বইয়ের সাথে QR — যা কাগজে ধরে না, তা ফোনে',
    sub: 'ছবি, ভিডিও আর বাড়তি তথ্য বইয়ের ভেতরেই রাখা যায় না। তাই প্রতিটি টপিকের সাথে একটি QR কোড — স্ক্যান করলেই বাকিটা।',
    note: 'QR কনটেন্ট দেখতে বইটি কেনা থাকতে হয় — তাই একই বই অনেকে মিলে ব্যবহার করা যায় না।',
    steps: [
      { title: 'বইয়ের পাতায় QR কোড', body: 'প্রতিটি টপিকের পাশে একটি করে QR কোড ছাপা আছে।' },
      { title: 'ফোন দিয়ে স্ক্যান করুন', body: 'ক্যামেরা ধরলেই ওই টপিকের পাতা খুলে যাবে — আলাদা অ্যাপ লাগবে না।' },
      { title: 'উত্তর, ছবি ও ভিডিও', body: 'ওই টপিকের প্রশ্নের উত্তর, ছবি আর ভিডিও সব এক জায়গায়।' },
    ],
  },
  en: {
    heading: 'QR with the book — what paper cannot hold, your phone can',
    sub: 'Figures, videos and extra notes will not fit inside a printed page. So every topic carries a QR code — scan it, and the rest opens up.',
    note: 'You need to own the book to open its QR content — so one copy cannot be shared around.',
    steps: [
      { title: 'A QR code on the page', body: 'Every topic in the book is printed with its own QR code beside it.' },
      { title: 'Scan it with your phone', body: 'Point the camera and that topic opens — no separate app needed.' },
      { title: 'Answers, figures & video', body: "The topic's answers, figures and videos, all in one place." },
    ],
  },
};

const ICONS = [LuBookOpen, LuScanLine, LuVideo];

export default function LandingQr() {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className={`font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl ${bn}`}>
          {L.heading}
        </h2>
        <p className={`mt-3 text-muted-foreground ${bn}`}>{L.sub}</p>
      </div>

      <ol className="mt-10 grid gap-5 sm:grid-cols-3">
        {L.steps.map((step, i) => {
          const Icon = ICONS[i];
          return (
            <li
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              {/* The number carries the sequence; the icon carries the idea. */}
              <span className="absolute right-5 top-5 font-heading text-3xl font-bold text-primary/15">
                {i + 1}
              </span>
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="text-xl" />
              </span>
              <h3 className={`font-heading font-bold text-foreground ${bn}`}>{step.title}</h3>
              <p className={`mt-1.5 text-sm leading-relaxed text-muted-foreground ${bn}`}>{step.body}</p>
            </li>
          );
        })}
      </ol>

      <p className={`mx-auto mt-6 max-w-2xl rounded-xl bg-surface-soft px-4 py-3 text-center text-sm text-muted-foreground ${bn}`}>
        {L.note}
      </p>
    </section>
  );
}

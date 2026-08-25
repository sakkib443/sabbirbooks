'use client';

/**
 * "এই বইয়ে কী কী আছে" — built from the book's own content, not from copy.
 *
 * Every number and every chapter name here is already in the database because
 * the admin typed the book in: boards, chapters, topics, questions. Nothing is
 * claimed that the book does not contain, which is the whole point — a buyer
 * deciding on a ৳450 book wants the table of contents, and the shop should not
 * have to retype it into a marketing field to show it.
 *
 * Renders nothing when the book has no QR content yet, rather than showing a
 * row of zeros.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  LuArrowRight,
  LuBookOpen,
  LuChevronDown,
  LuGift,
  LuLayers,
  LuListChecks,
  LuQrCode,
} from 'react-icons/lu';

/** Bengali digits — these sit next to Bengali labels and must not read as English. */
const bn = (n) => String(n ?? 0).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

export default function LandingContents({ outline }) {
  // Open the board that holds the free chapter, not simply the first one: the
  // free row is the only thing here a visitor can act on, and it is worth
  // nothing collapsed behind a heading they never tap.
  const [openPart, setOpenPart] = useState(() => {
    const i = outline?.parts?.findIndex((p) => p.chapters.some((c) => c.isFree)) ?? -1;
    return i >= 0 ? i : 0;
  });

  if (!outline?.totals?.chapters) return null;

  const { totals, parts } = outline;

  const stats = [
    { icon: LuLayers, value: totals.parts, label: 'বোর্ড' },
    { icon: LuBookOpen, value: totals.chapters, label: 'অধ্যায়' },
    { icon: LuQrCode, value: totals.topics, label: 'QR কোড' },
    { icon: LuListChecks, value: totals.questions, label: 'প্রশ্ন-উত্তর' },
  ].filter((s) => s.value > 0);

  return (
    <section id="contents" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl hind-siliguri">
            এই বইয়ে কী কী আছে
          </h2>
          <p className="mt-3 text-muted-foreground hind-siliguri">
            পুরো সিলেবাস অধ্যায় ধরে সাজানো — নিচে বইয়ের সূচিপত্র দেখে নিন।
          </p>
        </div>

        {/* The numbers, straight from the book's own content. */}
        <dl className="mt-9 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-5 text-center shadow-soft"
            >
              <Icon className="mx-auto mb-2 text-xl text-primary" />
              <dd className="font-heading text-3xl font-bold text-foreground">{bn(value)}</dd>
              <dt className="mt-0.5 text-sm text-muted-foreground hind-siliguri">{label}</dt>
            </div>
          ))}
        </dl>

        {/* The table of contents. Boards collapse, because ten chapters open at
            once is a wall of text on a phone. */}
        <div className="mt-10 space-y-3">
          {parts.map((part, i) => {
            const open = openPart === i;
            const chapterCount = part.chapters.length;
            return (
              <div
                key={`${part.title}-${i}`}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setOpenPart(open ? -1 : i)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft font-heading text-sm font-bold text-primary">
                    {bn(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading font-bold text-foreground">
                      {part.title}
                    </span>
                    <span className="text-sm text-muted-foreground hind-siliguri">
                      {bn(chapterCount)} অধ্যায়
                    </span>
                  </span>
                  <LuChevronDown
                    className={`shrink-0 text-muted-foreground transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {open && (
                  <ul className="divide-y divide-border border-t border-border">
                    {part.chapters.map((ch, j) => (
                      <li
                        key={`${ch.title}-${j}`}
                        className="flex items-center gap-3 px-5 py-3 sm:px-6"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] text-foreground hind-siliguri">
                            {ch.chapterNo ? `${ch.chapterNo}. ` : ''}
                            {ch.title}
                          </span>
                          {/* A chapter whose topics are not entered yet is still
                              a real chapter of the printed book, so it stays in
                              the list — but "০ টপিক · ০ প্রশ্ন" under it reads
                              as a gap in the book rather than a gap in the data
                              entry, which is the opposite of the point. */}
                          {(ch.topicCount > 0 || ch.questionCount > 0) && (
                            <span className="text-xs text-muted-foreground hind-siliguri">
                              {ch.topicCount > 0 && `${bn(ch.topicCount)} টপিক`}
                              {ch.topicCount > 0 && ch.questionCount > 0 && ' · '}
                              {ch.questionCount > 0 && `${bn(ch.questionCount)} প্রশ্ন`}
                            </span>
                          )}
                        </span>
                        {/* A free chapter is the strongest thing on this list —
                            it turns "trust me" into "go and check", so the badge
                            is the link rather than a label next to one. */}
                        {ch.isFree &&
                          (ch.freeQrCode ? (
                            <Link
                              href={`/b/${ch.freeQrCode}`}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 hind-siliguri"
                            >
                              <LuGift className="text-[11px]" /> ফ্রি — পড়ুন
                            </Link>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent hind-siliguri">
                              <LuGift className="text-[11px]" /> ফ্রি
                            </span>
                          ))}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {totals.freeChapters > 0 && (
          <div className="mt-6 rounded-2xl border border-accent/25 bg-accent-soft/50 px-5 py-6 text-center">
            <p className="text-sm text-foreground hind-siliguri">
              {bn(totals.freeChapters)}টি অধ্যায় <strong>না কিনেও</strong> পুরোটা পড়তে পারবেন —
              লগইনও লাগবে না।
            </p>
            {outline.firstFreeQrCode && (
              <>
                <Link
                  href={`/b/${outline.firstFreeQrCode}`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-bold text-white shadow-soft transition-all hover:opacity-90 hind-siliguri"
                >
                  ফ্রি অধ্যায়টি এখনই পড়ুন
                  <LuArrowRight />
                </Link>
                <p className="mt-2.5 text-xs text-muted-foreground hind-siliguri">
                  বইয়ের QR স্ক্যান করলে ঠিক এই পাতাতেই আসবেন — প্রশ্ন, উত্তর, ছবি ও ভিডিওসহ।
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

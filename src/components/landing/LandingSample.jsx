'use client';

/**
 * "বইটি দেখে নিন" — the sample, read in the browser.
 *
 * The hero's cover and its "নমুনা দেখুন" button both scroll here. The heavy
 * lifting is BookPreview's: an inline PDF viewer (the whole sample opens in the
 * page, cover page first), a thumbnail gallery with a lightbox, and a
 * full-screen reader. Viewing comes first and download second — a buyer wants
 * to look before they decide, and only then keep a copy.
 */

import { LuBookOpen, LuDownload } from 'react-icons/lu';
import { BookPreview } from '@/components/books/BookPreview';

export default function LandingSample({ book }) {
  const hasSample = Boolean(book?.previewPdfUrl || book?.previewImages?.length);
  if (!hasSample) return null;

  return (
    <section id="sample" className="scroll-mt-20 border-y border-border bg-surface-soft">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary hind-siliguri">
            <LuBookOpen /> নমুনা
          </span>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl hind-siliguri">
            কেনার আগে বইটি দেখে নিন
          </h2>
          <p className="mt-3 text-muted-foreground hind-siliguri">
            কভার থেকে শুরু করে বইয়ের কয়েকটি পাতা এখানেই দেখতে পারবেন — ওয়েবসাইট
            ছেড়ে কোথাও যেতে হবে না। পছন্দ হলে ডাউনলোড করে পরেও পড়তে পারবেন।
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-4xl">
          <BookPreview
            images={book.previewImages}
            pdfUrl={book.previewPdfUrl}
            title={book.title}
            bn="hind-siliguri"
            labels={LABELS}
          />
        </div>

        {book.previewPdfUrl && (
          <div className="mt-6 flex justify-center">
            {/* Download is the secondary action — the page above already lets
                them read it. A plain <a download> keeps the file, no login. */}
            <a
              href={book.previewPdfUrl}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
            >
              <LuDownload /> নমুনাটি ডাউনলোড করুন
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

// BookPreview takes every string as a prop, so it can speak Bengali here
// without the component itself knowing about languages. Keys must match its
// exported BookPreviewLabels exactly.
const LABELS = {
  heading: 'বইয়ের ভেতরে',
  subtitle: 'নমুনা পাতাগুলো দেখে নিন',
  samplePages: 'নমুনা পাতা',
  pdfTitle: 'নমুনা অধ্যায়',
  pdfDesc: 'বইয়ের কিছু অংশ এখানেই পড়ুন',
  openPdf: 'PDF খুলুন',
  readALittle: 'সম্পূর্ণ নমুনা দেখুন',
  close: 'বন্ধ করুন',
  prev: 'আগের',
  next: 'পরের',
  counter: (current, total) => `${current} / ${total}`,
};

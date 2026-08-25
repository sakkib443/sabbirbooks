'use client';

/**
 * "একটু পড়ে দেখুন" — sample pages, read in the browser or downloaded.
 *
 * The reader component already exists and already does the hard parts (image
 * lightbox, in-page PDF viewer, keyboard nav), so this section frames it rather
 * than reimplementing it. A download link sits alongside because a medical
 * student on a phone often wants the file to read later, offline.
 */

import { LuBookOpen, LuDownload } from 'react-icons/lu';
import BookPreview from '@/components/books/BookPreview';

export default function LandingSample({ book, shareHref }) {
  const hasSample = Boolean(book?.previewPdfUrl || book?.previewImages?.length);
  if (!hasSample) return null;

  return (
    <section id="sample" className="scroll-mt-20 border-y border-border bg-surface-soft">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary hind-siliguri">
            <LuBookOpen /> ফ্রি নমুনা
          </span>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl hind-siliguri">
            কেনার আগে একটু পড়ে দেখুন
          </h2>
          <p className="mt-3 text-muted-foreground hind-siliguri">
            বইয়ের কিছু অংশ এখানেই পড়তে পারবেন — ওয়েবসাইট ছেড়ে কোথাও যেতে হবে না।
            চাইলে ডাউনলোড করে পরেও পড়তে পারবেন।
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <BookPreview
            images={book.previewImages}
            pdfUrl={book.previewPdfUrl}
            title={book.title}
            bn="hind-siliguri"
            labels={LABELS}
          />
        </div>

        {book.previewPdfUrl && (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={book.previewPdfUrl}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
            >
              <LuDownload /> নমুনাটি ডাউনলোড করুন
            </a>
            {shareHref && (
              <a
                href={shareHref}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary hind-siliguri"
              >
                আলাদা পাতায় খুলুন
              </a>
            )}
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
  readALittle: 'একটু পড়ে দেখুন',
  close: 'বন্ধ করুন',
  prev: 'আগের',
  next: 'পরের',
  counter: (current, total) => `${current} / ${total}`,
};

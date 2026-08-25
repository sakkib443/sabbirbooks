'use client';

/**
 * The sample itself, read in the page.
 *
 * Split out of the route because the reader is interactive (lightbox, PDF
 * viewer) while the route around it must stay a server component so its Open
 * Graph tags reach Facebook's crawler.
 *
 * A download link sits under the reader: a student on a phone often wants the
 * file for later, and a browser PDF viewer is unreliable on mobile — offering
 * the file outright is more honest than hoping the embed works.
 */

import { LuDownload } from 'react-icons/lu';
import BookPreview from '@/components/books/BookPreview';
import type { LandingBook } from '@/lib/landingBook';

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
  counter: (current: number, total: number) => `${current} / ${total}`,
};

export default function ReadView({ book }: { book: LandingBook }) {
  return (
    <section className="mt-10">
      <BookPreview
        images={book.previewImages}
        pdfUrl={book.previewPdfUrl}
        title={book.title}
        bn="hind-siliguri"
        labels={LABELS}
      />

      {book.previewPdfUrl && (
        <div className="mt-6 text-center">
          <a
            href={book.previewPdfUrl}
            download
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
          >
            <LuDownload /> নমুনাটি ডাউনলোড করুন
          </a>
        </div>
      )}
    </section>
  );
}

'use client';

/**
 * "কেনার আগে বইটি পড়ে দেখুন" — the sample, PDF-first.
 *
 * The client wanted the sample PDF itself to be the headline here, not a couple
 * of page thumbnails beside it. So the whole section is one large embedded
 * viewer: the full sample opens in the page and scrolls, cover page first. A
 * "বড় করে দেখুন" toggle blows it up to a full-screen overlay, and download sits
 * beside it for anyone who wants a copy to keep.
 *
 * The hero's cover and its "নমুনা দেখুন" button both scroll here.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LuBookOpen, LuDownload, LuExpand, LuX, LuExternalLink } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';

// pdf.js is large and touches `window`, so it is kept out of the server bundle
// and off the landing page's first paint entirely.
const PdfViewer = dynamic(() => import('@/components/shared/PdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[440px] w-full items-center justify-center bg-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  ),
});

const T = {
  bn: {
    tag: 'নমুনা',
    heading: 'কেনার আগে বইটি পড়ে দেখুন',
    sub: 'বইয়ের নমুনা অংশটি এখানেই পড়তে পারবেন — কভার থেকে শুরু করে, ওয়েবসাইট ছেড়ে কোথাও যেতে হবে না। পছন্দ হলে ডাউনলোড করে পরেও পড়তে পারবেন।',
    sampleChapter: 'নমুনা অধ্যায়',
    zoom: 'বড় করে দেখুন',
    download: 'ডাউনলোড',
    close: 'বন্ধ করুন',
    failedTitle: 'নমুনাটি এখানে দেখানো যাচ্ছে না',
    failedBody: 'ফাইলটি নতুন ট্যাবে খুলে নিন, অথবা ডাউনলোড করে পড়ুন।',
    openTab: 'নতুন ট্যাবে খুলুন',
  },
  en: {
    tag: 'Sample',
    heading: 'Read the book before you buy',
    sub: 'Read the sample right here — from the cover on, with no need to leave the site. Like it? Download a copy to read later too.',
    sampleChapter: 'Sample chapter',
    zoom: 'View larger',
    download: 'Download',
    close: 'Close',
    failedTitle: "The sample can't be shown here",
    failedBody: 'Open it in a new tab, or download a copy to read.',
    openTab: 'Open in a new tab',
  },
};

export default function LandingSample({ book }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';
  const pdfUrl = book?.previewPdfUrl;
  const [full, setFull] = useState(false);
  // Only if pdf.js itself cannot open the file — a corrupt upload, or a browser
  // too old for it. The reader is offered the file rather than a grey box.
  const [failed, setFailed] = useState(false);

  // Lock the page scroll while the full-screen viewer is up, and let Escape
  // close it — the same affordances a reader expects from any lightbox.
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);

  if (!pdfUrl) return null;

  return (
    <section id="sample" className="scroll-mt-20 border-y border-border bg-surface-soft">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className={`mb-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary ${bn}`}>
            <LuBookOpen /> {L.tag}
          </span>
          <h2 className={`font-heading text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl ${bn}`}>
            {L.heading}
          </h2>
          <p className={`mt-3 text-muted-foreground ${bn}`}>
            {L.sub}
          </p>
        </div>

        {/* The viewer — the main event. */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hind-siliguri">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <LuBookOpen className="text-base" />
              </span>
              {L.sampleChapter}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFull(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
              >
                <LuExpand className="text-sm" /> {L.zoom}
              </button>
              <a
                href={pdfUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover hind-siliguri"
              >
                <LuDownload className="text-sm" /> {L.download}
              </a>
            </div>
          </div>

          {failed ? (
            <PdfFallback L={L} bn={bn} pdfUrl={pdfUrl} />
          ) : (
            // The viewer scrolls inside its own box rather than growing the
            // page: the sample is 31 pages, and a section that pushes the rest
            // of the landing page below all of them is not a section any more.
            <PdfViewer
              url={pdfUrl}
              onError={() => setFailed(true)}
              className="h-[68vh] max-h-[840px] min-h-[440px] w-full"
            />
          )}
        </div>
      </div>

      {/* Full-screen viewer. */}
      {full && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-foreground/90 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold text-white hind-siliguri">{L.sampleChapter}</span>
            <div className="flex items-center gap-2">
              <a
                href={pdfUrl}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 hind-siliguri"
              >
                <LuDownload className="text-sm" /> {L.download}
              </a>
              <button
                type="button"
                onClick={() => setFull(false)}
                aria-label={L.close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <LuX />
              </button>
            </div>
          </div>
          {failed ? (
            <div className="w-full flex-1 overflow-y-auto bg-white">
              <PdfFallback L={L} bn={bn} pdfUrl={pdfUrl} />
            </div>
          ) : (
            <PdfViewer
              url={pdfUrl}
              onError={() => setFailed(true)}
              className="w-full flex-1"
            />
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Shown only when pdf.js cannot open the file at all. It hands the reader the
 * PDF two ways rather than leaving them looking at an empty frame wondering
 * whether the shop is broken.
 */
function PdfFallback({ L, bn, pdfUrl }) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-4 bg-muted px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-card">
        <LuBookOpen className="text-xl" />
      </span>
      <div>
        <p className={`font-semibold text-foreground ${bn}`}>{L.failedTitle}</p>
        <p className={`mt-1 text-sm text-muted-foreground ${bn}`}>{L.failedBody}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary ${bn}`}
        >
          <LuExternalLink className="text-sm" /> {L.openTab}
        </a>
        <a
          href={pdfUrl}
          download
          className={`inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover ${bn}`}
        >
          <LuDownload className="text-sm" /> {L.download}
        </a>
      </div>
    </div>
  );
}

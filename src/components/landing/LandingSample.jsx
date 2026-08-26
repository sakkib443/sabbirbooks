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
import { LuBookOpen, LuDownload, LuExpand, LuX } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';

const T = {
  bn: {
    tag: 'নমুনা',
    heading: 'কেনার আগে বইটি পড়ে দেখুন',
    sub: 'বইয়ের নমুনা অংশটি এখানেই পড়তে পারবেন — কভার থেকে শুরু করে, ওয়েবসাইট ছেড়ে কোথাও যেতে হবে না। পছন্দ হলে ডাউনলোড করে পরেও পড়তে পারবেন।',
    sampleChapter: 'নমুনা অধ্যায়',
    zoom: 'বড় করে দেখুন',
    download: 'ডাউনলোড',
    close: 'বন্ধ করুন',
  },
  en: {
    tag: 'Sample',
    heading: 'Read the book before you buy',
    sub: 'Read the sample right here — from the cover on, with no need to leave the site. Like it? Download a copy to read later too.',
    sampleChapter: 'Sample chapter',
    zoom: 'View larger',
    download: 'Download',
    close: 'Close',
  },
};

/** A sample PDF is a direct `.pdf` here; the browser renders it inline and lets
 *  the reader scroll every page. Hide the viewer's own chrome and fit the width. */
const withViewerParams = (url) => `${url}#toolbar=0&navpanes=0&view=FitH`;

export default function LandingSample({ book }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const bn = isBengali ? 'hind-siliguri' : '';
  const pdfUrl = book?.previewPdfUrl;
  const [full, setFull] = useState(false);

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

          <iframe
            src={withViewerParams(pdfUrl)}
            title="নমুনা অধ্যায়"
            className="h-[68vh] max-h-[840px] min-h-[440px] w-full bg-muted"
          />
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
          <iframe
            src={withViewerParams(pdfUrl)}
            title="নমুনা অধ্যায় — সম্পূর্ণ"
            className="w-full flex-1 bg-white"
          />
        </div>
      )}
    </section>
  );
}

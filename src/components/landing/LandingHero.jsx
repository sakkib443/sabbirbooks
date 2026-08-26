'use client';

/**
 * The hero.
 *
 * A centred intro over a soft medical-teal wash, then one clean panel that
 * gathers the three things a buyer weighs — the book, the video, the reasons —
 * so they read as a single composed object rather than scattered cards. Cover
 * and offer on the left, video over the feature grid on the right; a coral
 * badge carries the discount, a soft glow lifts the cover, the price sits in the
 * brand teal.
 *
 * The cover and the "নমুনা দেখুন" button both scroll to the sample section.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  LuArrowRight,
  LuBookOpen,
  LuCheck,
  LuPlay,
  LuShieldCheck,
  LuStar,
  LuTruck,
} from 'react-icons/lu';
import { formatTk } from '@/lib/landingBook';
import { useLanguage } from '@/context/LanguageContext';

const T = {
  bn: {
    eyebrow: '১ম প্রফ · Anatomy Viva',
    preOrderOn: 'প্রি-অর্ডার চলছে',
    saved: 'সাশ্রয়',
    preOrder: 'প্রি-অর্ডার করুন',
    order: 'অর্ডার করুন',
    viewSample: 'নমুনা দেখুন',
    viewBook: 'বইটি দেখুন',
    cod: 'ক্যাশ অন ডেলিভারি',
    delivery: 'সারা দেশে ডেলিভারি',
    why: 'কেন এই বইটি',
    insidePages: 'বইয়ের ভেতরের পাতা',
    samplePage: 'নমুনা পাতা',
  },
  en: {
    eyebrow: '1st Prof · Anatomy Viva',
    preOrderOn: 'Pre-order open',
    saved: 'saved',
    preOrder: 'Pre-order now',
    order: 'Order now',
    viewSample: 'View sample',
    viewBook: 'Look inside',
    cod: 'Cash on delivery',
    delivery: 'Delivered nationwide',
    why: 'Why this book',
    insidePages: 'Inside the book',
    samplePage: 'Sample page',
  },
};

/** youtu.be/ID, watch?v=ID and /shorts/ID all have to become an embed URL. */
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const short = u.pathname.match(/\/shorts\/([\w-]+)/);
      if (short) return `https://www.youtube.com/embed/${short[1]}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {
    /* fall through — treat it as a direct file */
  }
  return url;
}

const isDirectVideo = (url) => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url || '');

export default function LandingHero({
  book,
  price,
  features = [],
  headline,
  subheadline,
  checkoutHref,
}) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const hasSample = Boolean(book?.previewPdfUrl || book?.previewImages?.length);
  const hasVideo = Boolean(book?.promoVideoUrl);

  return (
    <section className="relative overflow-hidden bg-medical-mesh">
      <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-50" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute right-[-120px] top-1/3 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        {/* ── The words, centred ────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-sm font-semibold tracking-wide text-primary font-display">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {L.eyebrow}{book?.isPreOrder ? ` · ${L.preOrderOn}` : ''}
          </span>

          <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground text-balance sm:text-4xl lg:text-[3.25rem]">
            {headline || book?.title}
          </h1>

          {subheadline && (
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground font-display">
              {subheadline}
            </p>
          )}
        </div>

        {/* ── The showcase panel: buy stack | proof stack ───────────── */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6 lg:mt-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-stretch lg:gap-8">
            {/* Left: the product & the offer ───────────────────────── */}
            <div className="animate-fade-up flex flex-col">
              <CoverCard book={book} price={price} sampleHref={hasSample ? '#sample' : null} />

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="font-heading text-[2rem] font-bold leading-none text-primary sm:text-4xl">
                  {formatTk(price.payable)}
                </span>
                {price.saved > 0 && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">{formatTk(price.price)}</span>
                    <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-sm font-bold text-accent hind-siliguri">
                      {formatTk(price.saved)} {L.saved}
                    </span>
                  </>
                )}
              </div>

              {book?.preOrderNote && (
                <p className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-muted-foreground hind-siliguri">
                  <LuTruck className="shrink-0 text-primary" /> {book.preOrderNote}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href={checkoutHref}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 hind-siliguri"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-sheen" />
                  <span className="relative flex items-center gap-2">
                    {book?.isPreOrder ? L.preOrder : L.order}
                    <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>

                {hasSample && (
                  <a
                    href="#sample"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
                  >
                    <LuBookOpen /> {L.viewSample}
                  </a>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground hind-siliguri">
                <span className="inline-flex items-center gap-1.5">
                  <LuShieldCheck className="text-accent" /> {L.cod}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LuTruck className="text-accent" /> {L.delivery}
                </span>
              </div>
            </div>

            {/* Right: the proof — watch it, then why ──────────────────── */}
            <div className="animate-fade-up delay-200 flex flex-col gap-4">
              {hasVideo ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-soft">
                  {isDirectVideo(book.promoVideoUrl) ? (
                    <video
                      src={book.promoVideoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      poster={book.coverImage || undefined}
                      className="aspect-video w-full bg-black"
                    />
                  ) : (
                    <div className="relative aspect-video w-full">
                      <iframe
                        src={toEmbedUrl(book.promoVideoUrl)}
                        title={book.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              ) : (
                <PreviewPages book={book} />
              )}

              <FeaturePanel features={features} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The book, floating in its card.
 *
 * A cover uploaded before the public-media fix answers 401 to every visitor
 * this page is for, so it falls through to a titled placeholder rather than a
 * broken-image glyph. A coral badge carries the discount; a soft teal glow lifts
 * the cover; the whole thing links to the sample.
 */
function CoverCard({ book, price, sampleHref }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const [failed, setFailed] = useState(false);
  const showCover = Boolean(book?.coverImage) && !failed;

  const inner = (
    <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
      {/* soft glow halo */}
      <div className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-primary/15 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-border shadow-card motion-safe:animate-float-soft">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={book.title}
            onError={() => setFailed(true)}
            className="w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-primary-soft px-6 text-center">
            <LuBookOpen className="text-6xl text-primary" />
            <span className="font-heading text-lg font-bold text-foreground hind-siliguri">{book?.title}</span>
          </div>
        )}

        {sampleHref && (
          <>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 pb-3.5 text-sm font-bold text-white hind-siliguri">
              <LuBookOpen /> {L.viewBook}
            </span>
          </>
        )}
      </div>

      {price?.percent > 0 && (
        <span className="absolute -right-2 -top-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1.5 text-sm font-bold text-white shadow-lg hind-siliguri">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {price.percent}% {isBengali ? 'ছাড়' : 'off'}
        </span>
      )}
    </div>
  );

  if (!sampleHref) return inner;

  return (
    <a
      href={sampleHref}
      title="নমুনা পাতাগুলো দেখুন"
      className="group relative block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      {inner}
    </a>
  );
}

/**
 * The selling points.
 *
 * The strongest claim (highlighted, else heaviest) is lifted into a coral
 * banner; the rest sit in a grid of equal-height chips, each with the same tick,
 * so the block reads as an even list.
 */
function FeaturePanel({ features }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  if (!features.length) return null;

  const ordered = [...features].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
  const lead = ordered.find((f) => f.highlight) ?? ordered[0];
  const rest = ordered.filter((f) => f !== lead);

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface-soft p-4 lg:p-5">
      <h2 className="font-heading text-base font-bold text-foreground hind-siliguri">{L.why}</h2>

      {lead && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-coral/30 bg-coral/5 p-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-white">
            <LuStar className="text-[11px]" />
          </span>
          <p className="text-sm font-semibold leading-relaxed text-coral hind-siliguri">{lead.text}</p>
        </div>
      )}

      <ul className="mt-2.5 grid flex-1 auto-rows-min gap-2 sm:grid-cols-2 sm:auto-rows-fr">
        {rest.map((f, i) => (
          <li
            key={`${f.text}-${i}`}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <LuCheck className="text-[11px]" />
            </span>
            <span className="text-sm leading-relaxed text-foreground hind-siliguri">{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Uploaded preview pages, shown when there is no promo video. */
function PreviewPages({ book }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const images = book?.previewImages?.filter(Boolean) || [];
  if (!images.length) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-border bg-surface-soft text-muted-foreground">
        <LuPlay className="text-4xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-soft p-4">
      <p className="mb-3 text-sm font-semibold text-foreground hind-siliguri">{L.insidePages}</p>
      <div className="grid grid-cols-2 gap-3">
        {images.slice(0, 4).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={`${book.title} — ${L.samplePage} ${i + 1}`}
            loading="lazy"
            className="w-full rounded-lg border border-border object-cover"
          />
        ))}
      </div>
    </div>
  );
}

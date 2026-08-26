'use client';

/**
 * The shop's whole offer, in one screen.
 *
 * A headline band across the top, then three equal columns a buyer reads left
 * to right: the book itself with the price and the buttons, why it is worth it,
 * and a look inside. The three are the same width and stretch to the same
 * height on desktop, so the row reads as one composed block rather than three
 * loose cards — the cover defines the height, the middle and right columns fill
 * to meet it.
 *
 * The cover and the "নমুনা দেখুন" button both scroll to the sample section,
 * where the PDF opens inside the page. Nothing here downloads anything; that is
 * offered second, next to the viewer, for a reader who wants to keep a copy.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  LuArrowRight,
  LuBookOpen,
  LuShieldCheck,
  LuTruck,
} from 'react-icons/lu';
import { formatTk } from '@/lib/landingBook';

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
  const hasSample = Boolean(book?.previewPdfUrl || book?.previewImages?.length);
  const hasVideo = Boolean(book?.promoVideoUrl);

  return (
    <section className="relative overflow-hidden bg-medical-mesh">
      <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        {/* ── The headline, across the whole width ──────────────────── */}
        <div className="max-w-3xl">
          {price.percent > 0 && (
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-4 py-1.5 text-sm font-bold text-coral hind-siliguri">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
              </span>
              {book?.isPreOrder ? 'প্রি-অর্ডার চলছে' : 'বিশেষ ছাড়'} · {price.percent}% ছাড়
            </span>
          )}

          <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground text-balance sm:text-4xl lg:text-[2.75rem] hind-siliguri">
            {headline || book?.title}
          </h1>

          {subheadline && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground hind-siliguri">
              {subheadline}
            </p>
          )}
        </div>

        {/* ── Left: the product · Right: see it & why ───────────────
            Two columns, not three. A portrait cover and a landscape video are
            different shapes and never fill an equal-width column to the same
            height; forcing three equal columns left the video's column half
            empty. So the cover and its offer own the left, and the right stacks
            the video over the feature grid — both sides full, the same height,
            which is what makes the row read as one composed block. */}
        <div className="mt-9 grid gap-8 lg:mt-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-stretch lg:gap-10">
          {/* Left: the product ─────────────────────────────────────── */}
          <div className="animate-fade-up flex flex-col">
            <CoverCard book={book} sampleHref={hasSample ? '#sample' : null} />

            <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="font-heading text-3xl font-bold text-primary sm:text-4xl">
                {formatTk(price.payable)}
              </span>
              {price.saved > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatTk(price.price)}
                  </span>
                  <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-sm font-bold text-accent hind-siliguri">
                    {formatTk(price.saved)} সাশ্রয়
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
                  {book?.isPreOrder ? 'প্রি-অর্ডার করুন' : 'অর্ডার করুন'}
                  <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              {hasSample && (
                <a
                  href="#sample"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
                >
                  <LuBookOpen /> নমুনা দেখুন
                </a>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground hind-siliguri">
              <span className="inline-flex items-center gap-1.5">
                <LuShieldCheck className="text-accent" /> ক্যাশ অন ডেলিভারি
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LuTruck className="text-accent" /> সারা দেশে ডেলিভারি
              </span>
            </div>
          </div>

          {/* Right: see it, then why ───────────────────────────────── */}
          <div className="animate-fade-up delay-200 flex flex-col gap-6">
            {hasVideo ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-[#08222a] shadow-card">
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

            {/* The selling points, filling the space under the video so the
                right column matches the cover's height. */}
            <FeatureColumn features={features} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The book, as a link to its sample.
 *
 * A cover uploaded before the public-media fix is served from the protected
 * path and answers 401 to every visitor this page is for. Rather than show a
 * broken-image glyph on the largest element of the page, fall through to the
 * same placeholder used when no cover was set at all — the link still works.
 */
function CoverCard({ book, sampleHref }) {
  const [failed, setFailed] = useState(false);
  const showCover = Boolean(book?.coverImage) && !failed;

  const inner = (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImage}
          alt={book.title}
          onError={() => setFailed(true)}
          className="w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-primary-soft px-6 text-center text-primary">
          <LuBookOpen className="text-6xl" />
          <span className="font-heading text-lg font-bold text-foreground hind-siliguri">
            {book?.title}
          </span>
        </div>
      )}

      {sampleHref && (
        <>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 pb-4 text-base font-bold text-white hind-siliguri">
            <LuBookOpen /> বইটি দেখুন
          </span>
        </>
      )}
    </div>
  );

  if (!sampleHref) return <div className="relative">{inner}</div>;

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
 * The selling points, under the video in the right column.
 *
 * Ordered by the weight the admin gave them, so the strongest claim is read
 * first; a highlighted one is coloured rather than enlarged. A two-column grid
 * on desktop (one on mobile) so the list fills the width under a landscape
 * video, and flex-1 so it stretches to bring the column level with the cover.
 * The highlighted point spans both columns — it is the headline claim and
 * should not be boxed into half the width.
 */
function FeatureColumn({ features }) {
  if (!features.length) return null;

  const ordered = [...features].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-5 shadow-soft lg:p-6">
      <h2 className="font-heading text-lg font-bold text-foreground hind-siliguri">
        কেন এই বইটি
      </h2>
      <ul className="mt-4 grid flex-1 auto-rows-min gap-2.5 sm:grid-cols-2">
        {ordered.map((f, i) => (
          <li
            key={`${f.text}-${i}`}
            className={`rounded-xl border p-3 text-[15px] leading-relaxed hind-siliguri ${
              f.highlight
                ? 'border-coral/30 bg-coral/5 font-semibold text-coral sm:col-span-2'
                : 'border-border bg-surface-soft text-foreground'
            }`}
          >
            <span className="flex gap-2.5">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  f.highlight ? 'bg-coral' : 'bg-primary'
                }`}
              />
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Uploaded preview pages, shown when there is no promo video. */
function PreviewPages({ book }) {
  const images = book?.previewImages?.filter(Boolean) || [];
  if (!images.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="mb-3 text-sm font-semibold text-foreground hind-siliguri">
        বইয়ের ভেতরের পাতা
      </p>
      <div className="grid grid-cols-2 gap-3">
        {images.slice(0, 4).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={`${book.title} — নমুনা পাতা ${i + 1}`}
            loading="lazy"
            className="w-full rounded-lg border border-border object-cover"
          />
        ))}
      </div>
    </div>
  );
}

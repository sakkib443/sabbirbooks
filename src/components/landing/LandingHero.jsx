'use client';

/**
 * The shop's whole offer, in one screen.
 *
 * Three columns, in the order a buyer decides in: what the book looks like and
 * how to get it, why it is worth it, and what it is — cover, features, video.
 * Everything that used to live in separate sections further down is here
 * because the page has one job and scrolling to reach the argument loses people
 * who never scroll.
 *
 * The cover is a link, not decoration: tapping it opens the sample PDF, which
 * is the only part of the book a visitor may read without buying it.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  LuArrowRight,
  LuBookOpen,
  LuDownload,
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
  const sampleHref = book?.previewPdfUrl || null;
  const hasVideo = Boolean(book?.promoVideoUrl);

  return (
    <section className="relative overflow-hidden bg-medical-mesh">
      <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
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

        {/* ── Cover · features · video ──────────────────────────────── */}
        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,0.9fr)_minmax(0,1.15fr)] lg:gap-8">
          <div className="animate-fade-up">
            <CoverCard book={book} sampleHref={sampleHref} />

            {/* Price sits with the buttons, not with the headline: this is the
                moment the decision is made, and the number has to be in it. */}
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

            {/* The two buttons, directly under the cover. */}
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href={checkoutHref}
                className="group relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 hind-siliguri"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-sheen" />
                <span className="relative flex items-center gap-2">
                  {book?.isPreOrder ? 'প্রি-অর্ডার করুন' : 'অর্ডার করুন'}
                  <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              {sampleHref && (
                <a
                  href={sampleHref}
                  download
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
                >
                  <LuDownload /> নমুনা ডাউনলোড
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

          <FeatureColumn features={features} />

          <div className="animate-fade-up delay-200">
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
              // No video uploaded yet. The preview pages the admin already
              // uploaded stand in — an empty third of the screen would read as
              // a broken layout, and these are pictures of the actual book.
              <PreviewPages book={book} />
            )}
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
          {/* Bottom-anchored so it never covers the title artwork, and dark
              enough to stay readable over whatever the cover happens to be. */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 pb-4 text-base font-bold text-white hind-siliguri">
            <LuBookOpen /> একটু পড়ে দেখুন
          </span>
        </>
      )}
    </div>
  );

  if (!sampleHref) return <div className="relative mx-auto max-w-sm lg:max-w-none">{inner}</div>;

  return (
    <a
      href={sampleHref}
      target="_blank"
      rel="noopener noreferrer"
      title="নমুনা পাতাগুলো পড়ুন"
      className="group relative mx-auto block max-w-sm rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 lg:max-w-none"
    >
      {inner}
    </a>
  );
}

/**
 * The selling points, in the narrow middle column.
 *
 * Ordered by the weight the admin gave them, so the strongest claim is read
 * first; a highlighted one is coloured rather than enlarged, because this
 * column has no room to grow. Deliberately dense — the client asked for the
 * features "in very little space", between the cover and the video.
 */
function FeatureColumn({ features }) {
  if (!features.length) return null;

  const ordered = [...features].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));

  return (
    <div className="animate-fade-up delay-100">
      <h2 className="font-heading text-lg font-bold text-foreground hind-siliguri">
        কেন এই বইটি
      </h2>
      <ul className="mt-3 space-y-2.5">
        {ordered.map((f, i) => (
          <li
            key={`${f.text}-${i}`}
            className={`rounded-xl border p-3 text-[15px] leading-relaxed hind-siliguri ${
              f.highlight
                ? 'border-coral/30 bg-coral/5 font-semibold text-coral'
                : 'border-border bg-card text-foreground'
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

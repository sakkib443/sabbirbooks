'use client';

/**
 * The hero — "the anatomy stage".
 *
 * The book's cover is dark teal with cyan neon and a time motif; a pale
 * background fought it. So the hero is a deep teal-black stage instead, the same
 * world the cover lives in, and the cover floats in it under a cyan glow like a
 * spotlit product. The three things a buyer weighs — the book, the proof, the
 * reasons — sit together inside one glass panel so the block reads as a single
 * composed object rather than scattered cards. A faint ECG line runs beneath it,
 * the one bit of the subject's own instrument left visible.
 *
 * The stage commits to its dark look in either site theme (it paints every
 * colour itself); the light sections below it are theme-aware as usual.
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
    <section className="relative overflow-hidden bg-[#05171d] text-white">
      {/* ── Atmosphere: cyan glow, a fine grid, a heartbeat line ─────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[#0e9aa7]/25 blur-[110px]" />
        <div className="absolute right-[-120px] top-1/3 h-[26rem] w-[26rem] rounded-full bg-[#22d3ee]/18 blur-[120px]" />
        <div className="absolute bottom-[-140px] left-1/3 h-80 w-80 rounded-full bg-[#12b886]/14 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '46px 46px',
          }}
        />
        <EcgLine />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* ── The words ─────────────────────────────────────────────── */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-cyan-200 backdrop-blur hind-siliguri">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            ১ম প্রফ · Anatomy Viva{book?.isPreOrder ? ' · প্রি-অর্ডার চলছে' : ''}
          </span>

          <h1 className="mt-4 font-heading text-3xl font-bold leading-[1.1] tracking-tight text-balance sm:text-4xl lg:text-5xl hind-siliguri">
            {headline || book?.title}
          </h1>

          {subheadline && (
            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/65 hind-siliguri">
              {subheadline}
            </p>
          )}
        </div>

        {/* ── The showcase panel: buy stack | proof stack ───────────── */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6 lg:mt-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-stretch lg:gap-8">
            {/* Left: the product & the offer ───────────────────────── */}
            <div className="animate-fade-up flex flex-col">
              <CoverCard book={book} price={price} sampleHref={hasSample ? '#sample' : null} />

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="font-heading text-[2rem] font-bold leading-none text-cyan-300 sm:text-4xl">
                  {formatTk(price.payable)}
                </span>
                {price.saved > 0 && (
                  <>
                    <span className="text-lg text-white/40 line-through">{formatTk(price.price)}</span>
                    <span className="rounded-lg bg-emerald-400/15 px-2 py-0.5 text-sm font-bold text-emerald-300 hind-siliguri">
                      {formatTk(price.saved)} সাশ্রয়
                    </span>
                  </>
                )}
              </div>

              {book?.preOrderNote && (
                <p className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70 hind-siliguri">
                  <LuTruck className="shrink-0 text-cyan-300" /> {book.preOrderNote}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href={checkoutHref}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#12b886] to-[#22d3ee] px-6 py-3.5 text-base font-bold text-[#04161c] shadow-[0_10px_30px_-8px_rgba(34,211,238,0.55)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30 hind-siliguri"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent motion-safe:animate-sheen" />
                  <span className="relative flex items-center gap-2">
                    {book?.isPreOrder ? 'প্রি-অর্ডার করুন' : 'অর্ডার করুন'}
                    <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>

                {hasSample && (
                  <a
                    href="#sample"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition-colors hover:border-cyan-300/50 hover:text-cyan-200 hind-siliguri"
                  >
                    <LuBookOpen /> নমুনা দেখুন
                  </a>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/55 hind-siliguri">
                <span className="inline-flex items-center gap-1.5">
                  <LuShieldCheck className="text-cyan-300" /> ক্যাশ অন ডেলিভারি
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LuTruck className="text-cyan-300" /> সারা দেশে ডেলিভারি
                </span>
              </div>
            </div>

            {/* Right: the proof — watch it, then why ──────────────────── */}
            <div className="animate-fade-up delay-200 flex flex-col gap-4">
              {hasVideo ? (
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]">
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

      {/* A soft seam into the light sections that follow. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}

/**
 * The book, floating on the stage.
 *
 * A cover uploaded before the public-media fix answers 401 to every visitor
 * this page is for, so it falls through to a titled placeholder rather than a
 * broken-image glyph. A coral badge carries the discount; a cyan glow lifts the
 * cover off the dark ground; the whole thing links to the sample.
 */
function CoverCard({ book, price, sampleHref }) {
  const [failed, setFailed] = useState(false);
  const showCover = Boolean(book?.coverImage) && !failed;

  const inner = (
    <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
      {/* glow halo */}
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-cyan-400/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.85)] motion-safe:animate-float-soft">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverImage}
            alt={book.title}
            onError={() => setFailed(true)}
            className="w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-[#0a2b33] px-6 text-center">
            <LuBookOpen className="text-6xl text-cyan-300" />
            <span className="font-heading text-lg font-bold text-white hind-siliguri">{book?.title}</span>
          </div>
        )}

        {sampleHref && (
          <>
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 pb-3.5 text-sm font-bold text-white hind-siliguri">
              <LuBookOpen /> বইটি দেখুন
            </span>
          </>
        )}
      </div>

      {price?.percent > 0 && (
        <span className="absolute -right-2 -top-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-[#ff6b6b] px-3 py-1.5 text-sm font-bold text-white shadow-lg hind-siliguri">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {price.percent}% ছাড়
        </span>
      )}
    </div>
  );

  if (!sampleHref) return inner;

  return (
    <a
      href={sampleHref}
      title="নমুনা পাতাগুলো দেখুন"
      className="group relative block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
    >
      {inner}
    </a>
  );
}

/**
 * The selling points, as glass chips.
 *
 * The strongest claim (highlighted, else heaviest) is lifted into a coral
 * banner; the rest sit in a grid of equal-height chips, each with the same cyan
 * tick, so the block reads as an even list on the dark panel.
 */
function FeaturePanel({ features }) {
  if (!features.length) return null;

  const ordered = [...features].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
  const lead = ordered.find((f) => f.highlight) ?? ordered[0];
  const rest = ordered.filter((f) => f !== lead);

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:p-5">
      <h2 className="font-heading text-base font-bold text-white hind-siliguri">কেন এই বইটি</h2>

      {lead && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 p-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6b6b] text-white">
            <LuStar className="text-[11px]" />
          </span>
          <p className="text-sm font-semibold leading-relaxed text-[#ffc2c2] hind-siliguri">{lead.text}</p>
        </div>
      )}

      <ul className="mt-2.5 grid flex-1 auto-rows-min gap-2 sm:grid-cols-2 sm:auto-rows-fr">
        {rest.map((f, i) => (
          <li
            key={`${f.text}-${i}`}
            className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
              <LuCheck className="text-[11px]" />
            </span>
            <span className="text-sm leading-relaxed text-white/85 hind-siliguri">{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Uploaded preview pages, shown when there is no promo video. */
function PreviewPages({ book }) {
  const images = book?.previewImages?.filter(Boolean) || [];
  if (!images.length) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/50">
        <LuPlay className="text-4xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-sm font-semibold text-white/90 hind-siliguri">বইয়ের ভেতরের পাতা</p>
      <div className="grid grid-cols-2 gap-3">
        {images.slice(0, 4).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt={`${book.title} — নমুনা পাতা ${i + 1}`}
            loading="lazy"
            className="w-full rounded-lg border border-white/10 object-cover"
          />
        ))}
      </div>
    </div>
  );
}

/** A faint heartbeat trace across the stage — the subject's own instrument. */
function EcgLine() {
  return (
    <svg
      className="absolute bottom-10 left-0 w-full opacity-[0.15]"
      viewBox="0 0 1200 80"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 40 H360 l18 -26 l16 52 l14 -40 l12 20 H620 l18 -30 l16 60 l14 -46 l12 22 H1200"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1200"
        className="motion-safe:[animation:ecg-dash_5s_linear_infinite]"
      />
    </svg>
  );
}

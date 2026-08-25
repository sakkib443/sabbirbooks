'use client';

/**
 * The top of the shop's only page: the book on the left, its video on the right.
 *
 * Everything a visitor needs to decide is above the fold — what the book is,
 * what it costs, what they save, and the button. The video sits opposite rather
 * than below because a reader who wants to be convinced looks for it, and a
 * reader who is already convinced should not have to scroll past it to buy.
 */

import Link from 'next/link';
import { LuArrowRight, LuBookOpen, LuPlay, LuShieldCheck, LuTruck } from 'react-icons/lu';
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

export default function LandingHero({ book, price, headline, subheadline, checkoutHref }) {
  const hasVideo = Boolean(book?.promoVideoUrl);

  return (
    <section className="relative overflow-hidden bg-medical-mesh">
      <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          {/* ── Left: the offer ─────────────────────────────────────────── */}
          <div className="animate-fade-up order-2 lg:order-1">
            {price.percent > 0 && (
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-4 py-1.5 text-sm font-bold text-coral hind-siliguri">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
                </span>
                {book?.isPreOrder ? 'প্রি-অর্ডার চলছে' : 'বিশেষ ছাড়'} · {price.percent}% ছাড়
              </span>
            )}

            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground text-balance sm:text-4xl lg:text-5xl hind-siliguri">
              {headline || book?.title}
            </h1>

            {subheadline && (
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground hind-siliguri sm:text-lg">
                {subheadline}
              </p>
            )}

            {/* Price. The struck-through original is what makes the discount
                read as a discount rather than as just a number. */}
            <div className="mt-7 flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="font-heading text-4xl font-bold text-primary sm:text-5xl">
                {formatTk(price.payable)}
              </span>
              {price.saved > 0 && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatTk(price.price)}
                  </span>
                  <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-sm font-bold text-accent hind-siliguri">
                    {formatTk(price.saved)} সাশ্রয়
                  </span>
                </>
              )}
            </div>

            {book?.preOrderNote && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface-soft px-3 py-2 text-sm text-muted-foreground hind-siliguri">
                <LuTruck className="shrink-0 text-primary" /> {book.preOrderNote}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={checkoutHref}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:bg-primary-hover hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 hind-siliguri"
              >
                {/* A slow sheen across the button — the one bit of motion on the
                    CTA, so the eye lands there without the page feeling busy. */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-sheen" />
                <span className="relative flex items-center gap-2">
                  {book?.isPreOrder ? 'প্রি-অর্ডার করুন' : 'অর্ডার করুন'}
                  {price.percent > 0 && ` · ${price.percent}% ছাড়ে`}
                  <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              {book?.previewPdfUrl && (
                <a
                  href="#sample"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-4 text-base font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary hind-siliguri"
                >
                  <LuBookOpen /> একটু পড়ে দেখুন
                </a>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground hind-siliguri">
              <span className="inline-flex items-center gap-1.5">
                <LuShieldCheck className="text-accent" /> ক্যাশ অন ডেলিভারি
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LuTruck className="text-accent" /> সারা দেশে ডেলিভারি
              </span>
            </div>
          </div>

          {/* ── Right: the video, or the cover when there is none ────────── */}
          <div className="animate-fade-up delay-200 order-1 lg:order-2">
            {hasVideo ? (
              <div className="relative overflow-hidden rounded-2xl border border-border bg-[#08222a] shadow-card">
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
              <CoverCard book={book} />
            )}

            {/* With a video above, the cover still needs to be seen — a book is
                bought partly on how it looks. */}
            {hasVideo && book?.coverImage && (
              <div className="mt-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="h-24 w-[72px] shrink-0 rounded-lg border border-border object-cover"
                />
                <div className="min-w-0">
                  <p className="font-heading font-bold text-foreground">{book.title}</p>
                  {book.author && (
                    <p className="mt-0.5 text-sm text-muted-foreground hind-siliguri">
                      {book.author}
                    </p>
                  )}
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary hind-siliguri">
                    <LuPlay className="text-[11px]" /> ভিডিওতে বইটি দেখুন
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CoverCard({ book }) {
  return (
    <div className="relative mx-auto max-w-sm">
      <div className="pointer-events-none absolute -inset-6 rounded-full bg-primary/15 blur-3xl" />
      {book?.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImage}
          alt={book.title}
          className="relative w-full rounded-2xl border border-border object-contain shadow-card motion-safe:animate-float-soft"
        />
      ) : (
        <div className="relative flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-border bg-primary-soft text-primary">
          <LuBookOpen className="text-6xl" />
        </div>
      )}
    </div>
  );
}

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

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LuArrowRight,
  LuBanknote,
  LuBookOpen,
  LuCheck,
  LuPlay,
  LuShieldCheck,
  LuStar,
  LuTruck,
  LuVolume2,
  LuVolumeX,
} from 'react-icons/lu';
import { formatTk } from '@/lib/landingBook';
import { useLanguage } from '@/context/LanguageContext';
import { renderRich } from '@/lib/richText';

const T = {
  bn: {
    eyebrow: '1st Prof · Anatomy Viva',
    preOrderOn: 'প্রি-অর্ডার চলছে',
    saved: 'সাশ্রয়',
    preOrder: 'প্রি-অর্ডার করুন',
    order: 'অর্ডার করুন',
    viewSample: 'নমুনা দেখুন',
    viewBook: 'পড়ে দেখুন',
    cod: 'ক্যাশ অন ডেলিভারি',
    delivery: 'সারা দেশে ডেলিভারি',
    why: 'কেন এই বইটি',
    insidePages: 'বইয়ের ভেতরের পাতা',
    samplePage: 'নমুনা পাতা',
    offerOn: (v) => `${v} ছাড় চলছে`,
    onlineExtra: (v) => `অনলাইনে পেমেন্ট করলে আরও ${v} ছাড়`,
  },
  en: {
    eyebrow: '1st Prof · Anatomy Viva',
    preOrderOn: 'Pre-order open',
    saved: 'saved',
    preOrder: 'Pre-order now',
    order: 'Order now',
    viewSample: 'View sample',
    viewBook: 'Read a sample',
    cod: 'Cash on delivery',
    delivery: 'Delivered nationwide',
    why: 'Why this book',
    insidePages: 'Inside the book',
    samplePage: 'Sample page',
    offerOn: (v) => `${v} off now`,
    onlineExtra: (v) => `${v} more off when you pay online`,
  },
};

// "25%" for a percentage offer, "৳150" for a fixed one.
const discText = (kind, percent, amount) =>
  kind === 'fixed' ? formatTk(amount) : `${percent}%`;

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

/**
 * The same embed URL, but asking the player to start on its own.
 *
 * `mute=1` is not a preference, it is the price of admission: no browser will
 * autoplay a video that can make noise, and one that asks anyway is simply
 * left paused. `playsinline=1` is the phone half of the same rule — without it
 * iOS hijacks the video into its own fullscreen player the moment it starts.
 *
 * `enablejsapi=1` is what lets the sound button reach the player afterwards.
 * The rest is housekeeping: no channel suggestions on top of our own page.
 *
 * A non-YouTube embed (Vimeo, or a URL we could not parse) is returned with
 * whatever autoplay hints it understands, and falls back to a normal player if
 * it understands none of them.
 */
function embedForAutoplay(url) {
  const base = toEmbedUrl(url);
  const params =
    'autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3';
  return base.includes('?') ? `${base}&${params}` : `${base}?${params}`;
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

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-6">
        {/*
          ── One grid, two readings ─────────────────────────────────────
          A phone reads this in DOM order — video, words, book, reasons —
          because the shop wants the video to be the first thing on the screen
          when the site opens, before anything else.

          A desktop reads it in a different order, and CSS Grid is what makes
          that possible without a second copy of the video: every block below
          names its own column and row at `lg`, so the words move back to the
          top and the video takes the whole right-hand side. One iframe, one
          DOM, two layouts — duplicating the player would mean two YouTube
          embeds loading and playing on every visit.

              lg    ┌──────────────── words ────────────────┐
                    ├─── book ───┬──────── video ───────────┤
                    │   price    ├────── the reasons ───────┤
                    └────────────┴──────────────────────────┘

          The right column is the wide one (1.22fr against 0.78fr) — that is
          the whole point of the change. The video used to be one of three
          narrow columns; now it is nearly twice the width it was.
        */}
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-7">
          {/* ── The video ─────────────────────────────────────────────
              First in the DOM, so a phone opens on it. On a desktop it is
              placed into the second column of the second row instead. */}
          {hasVideo && (
            <div className="animate-fade-up lg:col-start-2 lg:row-start-2">
              <HeroVideo book={book} />
            </div>
          )}

          {/* ── The words ───────────────────────────────────────────── */}
          <div className="mx-auto max-w-2xl text-center lg:col-span-2 lg:row-start-1 lg:mb-1">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-primary/25 bg-primary-soft px-5 py-2.5 text-base font-bold tracking-wide text-primary font-display shadow-sm motion-safe:animate-float-soft sm:text-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              {L.eyebrow}
              {(() => {
                // The active offer, shown after the eyebrow — the pre-order
                // badge, a named campaign, or a plain "N% off now"; nothing
                // when there is no offer.
                const chip = price?.isPreOrder
                  ? L.preOrderOn
                  : price?.label ||
                    (price?.saved > 0 ? L.offerOn(discText(price.kind, price.percent, price.amount)) : '');
                return chip ? ` · ${chip}` : '';
              })()}
            </span>

            {/* The same gradient the logo's "Viva" is painted in — reached
                through the shared class, not by writing the colour again, so
                the headline follows if the brand ever changes. */}
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.08] tracking-tight text-gradient-medical text-balance sm:text-4xl lg:text-[3.25rem]">
              {headline || book?.title}
            </h1>

            {subheadline && (
              <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground font-display">
                {subheadline}
              </p>
            )}
          </div>

          {/* ── The book, the price, the button ─────────────────────── */}
          <div className="animate-fade-up flex flex-col rounded-3xl border border-border bg-card p-4 shadow-card sm:p-5 lg:col-start-1 lg:row-start-2 lg:row-span-2">
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

            {price?.online && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent-soft/60 px-3 py-1.5 text-sm font-semibold text-accent hind-siliguri">
                <LuBanknote className="shrink-0" /> {L.onlineExtra(discText(price.online.kind, price.online.percent, price.online.amount))}
              </p>
            )}

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
                  {(price?.isPreOrder ?? book?.isPreOrder) ? L.preOrder : L.order}
                  <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              {/* The "নমুনা দেখুন" button used to sit here. It and the cover
                  did the same thing, and two buttons for one action is one
                  button too many — the cover IS the button now. */}
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

          {/* No video uploaded — the inside pages take the same slot. Kept
              after the words in the DOM, because a strip of still pages is not
              worth pushing the headline down a phone screen for. */}
          {!hasVideo && (
            <div className="animate-fade-up delay-200 lg:col-start-2 lg:row-start-2">
              <PreviewPages book={book} />
            </div>
          )}

          {/* ── Why this book ───────────────────────────────────────── */}
          <div className="animate-fade-up delay-200 flex flex-col lg:col-start-2 lg:row-start-3">
            <FeaturePanel features={features} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The promo video, playing before anyone asks — and unmuting itself the first
 * moment it is allowed to.
 *
 * THE RULE, because it is the one thing about this that surprises people:
 * no browser will start a video that can make sound. Not muted-by-default,
 * not "ask nicely" — a page that autoplays with audio is simply left paused,
 * silently, and the visitor sees a still frame. Chrome, Safari and Firefox all
 * do this, there is no flag, and it is why every autoplaying video on the web
 * (Facebook, Instagram, YouTube's own front page) starts muted.
 *
 * So sound cannot be on at the instant the page opens. What CAN happen is
 * this: the moment the visitor touches the page at all — any tap, any click,
 * any key — the browser grants "user activation" and audio is allowed from
 * then on. This component waits for exactly that and unmutes on its own, so
 * for most visitors the sound arrives a second or two in without them asking
 * for it. The button stays for everyone else, and for the one case the
 * listener cannot see: a tap that lands INSIDE the player, which belongs to
 * YouTube's document, not ours.
 *
 * Unmuting is sent over postMessage rather than by loading YouTube's IFrame
 * API script — the same command the API would send, without the extra script
 * on the critical path; `enablejsapi=1` in the URL is what opens that channel.
 * It is sent three times over a second because a command that arrives before
 * the player is ready is dropped without a word, and the visitor's tap may
 * well land before then.
 */
function HeroVideo({ book }) {
  const { isBengali } = useLanguage();
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  const url = book?.promoVideoUrl || '';
  const direct = isDirectVideo(url);

  // Stable across renders so the effect below can depend on it without
  // re-subscribing on every keystroke elsewhere on the page.
  const unmute = useCallback(() => {
    if (direct) {
      const el = videoRef.current;
      if (!el) return;
      el.muted = false;
      el.volume = 1;
      // The gesture that allows sound also allows play, so this doubles as the
      // retry for a first autoplay the browser refused.
      void el.play().catch(() => {});
    } else {
      const send = () => {
        const w = frameRef.current?.contentWindow;
        if (!w) return;
        const cmd = (func, args = []) =>
          w.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
        cmd('unMute');
        cmd('setVolume', [100]);
        cmd('playVideo');
      };
      // Now, and twice more — an early tap can beat the player to being ready,
      // and a command sent then is discarded silently.
      send();
      setTimeout(send, 400);
      setTimeout(send, 1200);
    }
    setMuted(false);
  }, [direct]);

  /**
   * Turn the sound on at the first sign of a visitor, without asking.
   *
   * `pointerdown` covers a mouse and a touch; `keydown` covers a keyboard. All
   * three count as user activation, which is the browser's condition for
   * letting audio start. `once` means this never fires twice, and the listener
   * removes itself either way, so nothing is left attached to the window.
   */
  useEffect(() => {
    if (!muted) return undefined;
    const onFirstTouch = () => unmute();
    const opts = { once: true, passive: true };
    window.addEventListener('pointerdown', onFirstTouch, opts);
    window.addEventListener('keydown', onFirstTouch, opts);
    window.addEventListener('touchstart', onFirstTouch, opts);
    return () => {
      window.removeEventListener('pointerdown', onFirstTouch);
      window.removeEventListener('keydown', onFirstTouch);
      window.removeEventListener('touchstart', onFirstTouch);
    };
  }, [muted, unmute]);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-black shadow-card">
      {direct ? (
        <video
          ref={videoRef}
          src={url}
          autoPlay
          muted
          playsInline
          controls
          preload="auto"
          poster={book.coverImage || undefined}
          className="aspect-video w-full bg-black"
        />
      ) : (
        <div className="relative aspect-video w-full">
          <iframe
            ref={frameRef}
            src={embedForAutoplay(url)}
            title={book.title}
            // NOT lazy: a lazily-loaded iframe can be skipped entirely on a
            // phone, and this one has to be playing by the time the page is
            // looked at.
            loading="eager"
            className="absolute inset-0 h-full w-full"
            // `autoplay` has to be granted here as well as asked for in the
            // URL — without it in this list the browser blocks the player.
            allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}

      {muted ? (
        <button
          type="button"
          onClick={unmute}
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30 hind-siliguri motion-safe:animate-float-soft"
        >
          <LuVolumeX className="text-base" />
          {isBengali ? 'সাউন্ড চালু করুন' : 'Turn on sound'}
        </button>
      ) : (
        <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          <LuVolume2 /> {isBengali ? 'সাউন্ড চালু' : 'Sound on'}
        </span>
      )}
    </div>
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
    <div className="relative mx-auto w-full max-w-[320px] lg:max-w-[300px]">
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

      {price?.saved > 0 && (
        <span className="absolute -right-2 -top-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1.5 text-sm font-bold text-white shadow-lg hind-siliguri">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          {discText(price.kind, price.percent, price.amount)} {isBengali ? 'ছাড়' : 'off'}
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
 * banner; the rest sit below it, each with the same tick, so the block reads as
 * an even list.
 *
 * One column, not two: this panel is the middle of three on a desktop now, so
 * it is narrower than it used to be and a two-up grid would break every line in
 * an awkward place. On a phone it is full width and one column is right there
 * too.
 *
 * The text runs through renderRich, so a shop can colour part of a line —
 * "[[green b|মাত্র 267 পেজে]]" — from the admin panel. A line with no marks is
 * returned as the plain string it always was.
 */
function FeaturePanel({ features }) {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  if (!features.length) return null;

  const ordered = [...features].sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
  const lead = ordered.find((f) => f.highlight) ?? ordered[0];
  const rest = ordered.filter((f) => f !== lead);

  return (
    <div className="flex flex-1 flex-col rounded-3xl border border-border bg-card p-4 shadow-card lg:p-5">
      <h2 className="font-heading text-base font-bold text-foreground hind-siliguri">{L.why}</h2>

      {lead && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-coral/30 bg-coral/5 p-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral text-white">
            <LuStar className="text-[11px]" />
          </span>
          <p className="text-sm font-semibold leading-relaxed text-coral hind-siliguri">
            {renderRich(lead.text)}
          </p>
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
            <span className="text-sm leading-relaxed text-foreground hind-siliguri">
              {renderRich(f.text)}
            </span>
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

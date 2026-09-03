"use client";

/**
 * /b/<code> — what a QR code printed in the book opens.
 *
 * Mobile first, deliberately: this page is reached by pointing a phone camera
 * at a paper page, so the phone layout is the real one and the desktop
 * two-column view is the variation.
 *
 * Only the scanned topic's questions are ever shown. That is enforced by the
 * API (bookContent.service.scanTopic returns one topic and never queries its
 * siblings) — this page could not widen the scope even if it tried.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LuBookOpen,
  LuChevronLeft,
  LuDownload,
  LuFileText,
  LuImage,
  LuInfo,
  LuLoaderCircle,
  LuLock,
  LuTriangleAlert,
  LuTruck,
  LuVideo,
  LuX,
} from "react-icons/lu";
import API_BASE_URL from "@/config/api";
import AnswerStyles from "@/components/books/AnswerStyles";
import Lightbox from "@/components/books/Lightbox";
import { priceBook, type BookOffers } from "@/lib/bookOffers";

type Video = {
  _id?: string;
  title?: string;
  url: string;
  provider: string;
  fileName?: string;
  fileSize?: number;
};
type Attachment = {
  _id?: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
};

type Question = {
  _id: string;
  questionNo: string;
  questionText?: string;
  answerHtml?: string;
  videos: Video[];
  attachments: Attachment[];
  images: string[];
};

type ScanData = {
  book: { _id: string; title: string; slug?: string; coverImage?: string } | null;
  part: { title: string } | null;
  chapter: { chapterNo?: string; title: string } | null;
  topic: { _id: string; topicNo?: string; title: string; isImplicit: boolean; qrCode: string };
  questions: Question[];
  totalCount: number;
};

type LockedBook = {
  _id: string;
  title: string;
  slug?: string;
  author?: string;
  coverImage?: string;
  price?: number;
  // Everything priceBook() needs. The legacy price/offerPrice pair is kept
  // because books that never moved to named offers still price from it.
  offerPrice?: number;
  offers?: BookOffers;
  isPreOrder?: boolean;
  preOrderDiscountPercent?: number;
};

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: ScanData }
  | { kind: "locked"; book: LockedBook | null }
  // Bought, paid, but the parcel hasn't arrived. Same zero content as
  // "locked" — a different screen so the buyer isn't told to buy again.
  | { kind: "awaiting"; book: LockedBook | null }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

/** youtu.be/ID and watch?v=ID both need turning into an embeddable URL. */
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
  } catch {
    /* fall through to the raw url */
  }
  return url;
}

/** Small heading that separates figures / video / extra info / downloads. */
function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-emerald-400">{icon}</span>
      <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
        {children}
      </h3>
      <span className="flex-1 h-px bg-[#282828]" />
    </div>
  );
}

/**
 * A minimal top bar for the states that stand alone on a full screen — locked,
 * awaiting delivery, not found. The reader state has its own header; these had
 * the site's navbar until the QR route went fullscreen, and without something
 * here a visitor who is simply signed out has no way back or in.
 */
/**
 * What the book costs, on the card that asks someone to buy it.
 *
 * Run through priceBook — the one function the landing page, the book page and
 * the checkout all price from. Reading `offerPrice` off the book directly is
 * what put ৳600 here for a book selling at ৳550: that field is the legacy pair's
 * half, and a book that has moved to named offers stops updating it.
 */
function BookPriceLine({ book }: { book: LockedBook | null }) {
  if (!book?.price) return <div className="mb-6" />;
  // One copy: this card sells the idea, not a quantity. `headlinePayable` and
  // not `payable`, because the online-payment extra is only real once they pick
  // that method at the checkout — promising it here would be a price they might
  // not get.
  const p = priceBook(book, { quantity: 1 });

  return (
    <div className="mb-6">
      <p className="flex items-center justify-center gap-2">
        <span className="text-lg font-bold text-emerald-400">৳{p.headlinePayable}</span>
        {p.headlineSaved > 0 && (
          <span className="text-sm text-slate-500 line-through">৳{p.list}</span>
        )}
      </p>
      {p.headline.label && (
        <p className="mt-1 text-[11px] text-slate-400">{p.headline.label}</p>
      )}
    </div>
  );
}

function MiniBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-[#282828] bg-[#0f0f0f]/95 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
        <LuBookOpen className="text-emerald-400" /> Magic Viva
      </Link>
      <Link
        href="/login"
        className="rounded-lg border border-[#333] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
      >
        লগইন
      </Link>
    </div>
  );
}

export default function BookTopicScanPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code;

  const [state, setState] = useState<State>({ kind: "loading" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  // Populated the first time the reader reaches the last question of the
  // current topic — the API call happens then rather than at page load so a
  // reader who never finishes the topic never triggers it.
  const [nextTopic, setNextTopic] = useState<{
    qrCode: string;
    topicNo?: string;
    topicTitle?: string;
    chapterNo?: string;
    chapterTitle?: string;
    allowed: boolean;
  } | null>(null);
  const [loadingNext, setLoadingNext] = useState(false);

  const load = useCallback(async () => {
    if (!code) return;
    setState({ kind: "loading" });

    // No token is fine. A chapter the shop has marked FREE opens for anyone
    // holding the printed page, and only the server knows which chapter this QR
    // belongs to — so ask it, signed in or not, and let it decide. Bouncing to
    // /login first would hide the free sample behind the very account the
    // sample exists to sell.
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      const res = await fetch(`${API_BASE_URL}/book-content/scan/${code}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();

      // Only a signed-in reader whose session expired should be sent to log in
      // again; a stranger who simply has no access gets the 403 card below.
      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/b/${code}`)}`);
        return;
      }
      if (res.status === 403) {
        setState({
          kind: body.code === "BOOK_AWAITING_DELIVERY" ? "awaiting" : "locked",
          book: body.book ?? null,
        });
        return;
      }
      if (res.status === 404) {
        setState({ kind: "notfound" });
        return;
      }
      if (!res.ok || !body.success) {
        setState({ kind: "error", message: body.message || "Could not load this topic" });
        return;
      }

      setState({ kind: "ok", data: body.data });
      setActiveIndex(0);
      setNextTopic(null);
    } catch {
      setState({ kind: "error", message: "Network error — check your connection" });
    }
  }, [code, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch the next topic once, when the reader lands on the last question. If
  // the topic has no questions at all, treat "on the empty topic" as being at
  // the end and fetch too.
  useEffect(() => {
    if (state.kind !== "ok") return;
    const totalQuestions = state.data.questions.length;
    const atEnd = totalQuestions === 0 || activeIndex === totalQuestions - 1;
    if (!atEnd || nextTopic || loadingNext) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    const topicId = state.data.topic._id;

    setLoadingNext(true);
    fetch(`${API_BASE_URL}/book-content/next-topic/${topicId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(body => {
        if (body.success && body.data) setNextTopic(body.data);
      })
      .catch(() => {
        // Silent — the button just won't appear; the topic is still readable.
      })
      .finally(() => setLoadingNext(false));
  }, [state, activeIndex, nextTopic, loadingNext]);

  // ─── Loading ──────────────────────────────────────────────
  if (state.kind === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <LuLoaderCircle className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  /**
   * ─── Locked ───────────────────────────────────────────────
   *
   * Two completely different people land here and the server cannot tell them
   * apart: somebody holding a paid-for book who has not typed its code in, and
   * somebody who scanned a friend's copy and has never bought anything.
   *
   * It used to say "you have not bought this book — buy it", which was right
   * for the second person and an insult to the first. Now that a delivered
   * order no longer opens the book by itself, the FIRST person is the common
   * case: they paid ৳500, the parcel arrived, and this is what they see.
   *
   * So the screen offers both, in that order — the code first, because most
   * people scanning a QR out of a book are holding that book.
   */
  if (state.kind === "locked") {
    const book = state.book;
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-slate-200 flex items-center justify-center px-4 py-10">
        <MiniBar />
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            <LuLock className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">বইটি এখনো চালু করা হয়নি</h1>
          <p className="text-sm text-slate-400 mb-6">
            আপনার বইয়ের ভেতরে একটি গোপন কোড আছে। সেটি একবার বসালেই এই অ্যাকাউন্টে
            সব উত্তর খুলে যাবে।
          </p>

          {/* A plain <img>, not next/image, on purpose. next/image THROWS on a
              host missing from remotePatterns, which turns one unrecognised
              cover URL into a blank crashed page — on the very screen whose job
              is to sell the book. A thumbnail is not worth that risk. */}
          {book?.coverImage && (
            <div className="relative w-28 h-40 mx-auto mb-4 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={book.coverImage} alt={book.title} className="h-full w-full object-cover" />
            </div>
          )}
          {book && <p className="text-white font-medium mb-4">{book.title}</p>}

          <Link
            href="/activate"
            className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-3 transition"
          >
            বইয়ের কোড দিয়ে চালু করুন
          </Link>

          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-slate-500 mb-3">বইটি এখনো কেনেননি?</p>
            {/* Priced through the same function as the landing page and the
                checkout. Reading `offerPrice` directly was quoting the legacy
                field, which on a book with named offers is stale — this card
                was showing ৳600 for a book selling at ৳550. */}
            <BookPriceLine book={book} />
            <Link
              href={book?.slug ? `/books/${book.slug}` : "/books"}
              className="inline-flex items-center justify-center w-full rounded-lg border border-white/15 hover:border-white/30 text-slate-200 font-medium px-5 py-2.5 transition"
            >
              বইটি কিনুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /**
   * ─── Bought, parcel still in transit ──────────────────────
   *
   * This screen used to promise that the content would open by itself once the
   * parcel arrived. It will not any more — the code inside the book is what
   * opens it. Saying otherwise here would leave the buyer waiting for something
   * that is never going to happen, so it now says what will actually be needed.
   */
  if (state.kind === "awaiting") {
    const book = state.book;
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-slate-200 flex items-center justify-center px-4 py-10">
        <MiniBar />
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-5">
            <LuTruck className="w-6 h-6 text-sky-400" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">বইটি এখনো পৌঁছায়নি</h1>
          <p className="text-sm text-slate-400 mb-2">
            আপনার অর্ডারটি আমরা পেয়েছি। বই হাতে পেলে ভেতরের গোপন কোডটি বসিয়ে
            নেবেন — তখনই সব উত্তর খুলে যাবে।
          </p>
          <p className="text-xs text-slate-500 mb-6">
            আবার কিনতে হবে না। কোডটি বইয়ের ভেতরেই আছে।
          </p>

          {book && <p className="text-white font-medium mb-6">{book.title}</p>}

          <Link
            href="/dashboard/user/orders"
            className="inline-flex items-center justify-center w-full rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-medium px-5 py-3 transition"
          >
            অর্ডারের অবস্থা দেখুন
          </Link>
        </div>
      </div>
    );
  }

  // ─── Bad code ─────────────────────────────────────────────
  if (state.kind === "notfound") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-slate-200 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-5">
            <LuTriangleAlert className="w-6 h-6 text-slate-400" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">কোডটি পাওয়া যায়নি</h1>
          <p className="text-sm text-slate-400 mb-6">
            এই QR কোডটি ভুল, অথবা এর টপিক এখনো প্রকাশিত হয়নি। বইয়ের কোডটি আবার স্ক্যান করুন।
          </p>
          <Link href="/" className="text-emerald-400 text-sm hover:underline">
            হোমে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────
  if (state.kind === "error") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-slate-200 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-semibold text-white mb-2">সমস্যা হয়েছে</h1>
          <p className="text-sm text-slate-400 mb-6">{state.message}</p>
          <button
            onClick={load}
            className="rounded-lg bg-[#282828] hover:bg-[#333] px-5 py-2.5 text-sm transition"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  // ─── Topic viewer ─────────────────────────────────────────
  const { data } = state;
  const { topic, chapter, part, questions } = data;
  const active = questions[activeIndex];

  // Each block renders only when it has something in it, so the question can
  // carry any combination of the four without leaving an orphan heading.
  const hasImages = (active?.images?.length ?? 0) > 0;
  const hasVideos = (active?.videos?.length ?? 0) > 0;
  const hasFiles = (active?.attachments?.length ?? 0) > 0;
  const hasExtra = Boolean(active?.answerHtml?.trim());
  const hasAnything = hasImages || hasVideos || hasExtra || hasFiles;

  const crumb = [part?.title, chapter && `${chapter.chapterNo ?? ""} ${chapter.title}`.trim()]
    .filter(Boolean)
    .join(" › ");

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-slate-200">
      <AnswerStyles dark />
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndexChange={(i) => setLightbox((l) => (l ? { ...l, index: i } : l))}
          onClose={() => setLightbox(null)}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0f0f0f]/95 backdrop-blur border-b border-[#282828]">
        <div className="px-4 py-3 max-w-6xl mx-auto">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 truncate">{crumb}</p>
          <h1 className="text-base font-semibold text-white truncate flex items-center gap-2">
            <LuBookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
            {/* An implicit topic just repeats the chapter name — don't say it twice. */}
            {topic.isImplicit ? chapter?.title : `${topic.topicNo ?? ""} ${topic.title}`.trim()}
          </h1>
        </div>

        {/* Question strip — the primary navigation on a phone. */}
        {questions.length > 0 && (
          <div className="lg:hidden border-t border-[#282828] px-3 py-2 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {questions.map((q, i) => (
                <button
                  key={q._id}
                  onClick={() => setActiveIndex(i)}
                  className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition ${
                    i === activeIndex
                      ? "bg-emerald-500 text-black"
                      : "bg-[#1c1c1c] text-slate-400 hover:bg-[#282828]"
                  }`}
                >
                  {q.questionNo}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto lg:flex lg:gap-6 lg:px-4 lg:py-6">
        {/* Content */}
        <main className="flex-1 px-4 py-5 lg:px-0 lg:py-0 min-w-0">
          {questions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm">
                এই টপিকে এখনো কোনো প্রশ্ন যোগ করা হয়নি।
              </p>
              {nextTopic && (
                <div className="mt-6 max-w-md mx-auto">
                  {nextTopic.allowed ? (
                    <Link
                      href={`/b/${nextTopic.qrCode}`}
                      className="w-full flex items-center justify-between gap-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-4 transition"
                    >
                      <span className="flex flex-col items-start min-w-0">
                        <span className="text-[11px] uppercase tracking-wide opacity-70">
                          পরবর্তী টপিক
                        </span>
                        <span className="text-sm truncate">
                          {nextTopic.chapterNo ? `${nextTopic.chapterNo}. ` : ""}
                          {nextTopic.topicNo ? `${nextTopic.topicNo} ` : ""}
                          {nextTopic.topicTitle}
                        </span>
                      </span>
                      <LuChevronLeft className="w-5 h-5 rotate-180 shrink-0" />
                    </Link>
                  ) : (
                    <div className="w-full flex items-center gap-3 rounded-xl bg-[#1c1c1c] border border-[#282828] text-slate-400 px-5 py-4">
                      <LuLock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-sm">
                        পরবর্তী টপিকটি দেখতে বইটি কিনতে হবে।
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            active && (
              <article>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-emerald-400 font-semibold shrink-0">
                    প্রশ্ন {active.questionNo}
                  </span>
                </div>

                {active.questionText ? (
                  <h2 className="text-lg font-medium text-white leading-relaxed mb-5">
                    {active.questionText}
                  </h2>
                ) : (
                  <p className="text-sm text-slate-500 italic mb-5">
                    প্রশ্নটি এখনো যোগ করা হয়নি।
                  </p>
                )}

                {/* Reading order, deliberately: figures → video → extra info →
                    downloads. The reader is holding the printed book, which
                    already carries the real answer; the text here is only
                    supplementary, so the material paper cannot show — pictures,
                    then video — goes first. This block used to lead with that
                    text back when it was treated as THE answer. Don't move it
                    back up without first changing what it is. */}
                <div className="space-y-7">
                  {hasImages && (
                    <section>
                      <SectionLabel icon={<LuImage className="w-3.5 h-3.5" />}>
                        ছবি ({active.images.length})
                      </SectionLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {active.images.map((src, i) => (
                          <button
                            key={`${src}-${i}`}
                            type="button"
                            onClick={() => setLightbox({ images: active.images, index: i })}
                            className="group relative w-full aspect-square rounded-lg overflow-hidden bg-[#1c1c1c] border border-[#282828] hover:border-emerald-500/60 transition"
                          >
                            {/* Plain <img>, not next/image: these URLs point at
                                whatever host the API is deployed on, and a missing
                                remotePatterns entry would turn the whole gallery
                                into an error instead of a picture. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`ছবি ${i + 1}`}
                              loading="lazy"
                              draggable={false}
                              onContextMenu={(e) => e.preventDefault()}
                              onDragStart={(e) => e.preventDefault()}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 select-none"
                              style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
                            />
                            <span className="absolute top-1.5 left-1.5 text-[10px] font-medium bg-black/60 text-white rounded px-1.5 py-0.5">
                              {i + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {hasVideos && (
                    <section>
                      <SectionLabel icon={<LuVideo className="w-3.5 h-3.5" />}>
                        ভিডিও ({active.videos.length})
                      </SectionLabel>
                      <div className="space-y-4">
                        {active.videos.map((v, i) => (
                          <div key={v._id ?? i}>
                            {v.title && (
                              <p className="text-sm text-slate-300 mb-2 font-medium">{v.title}</p>
                            )}

                            {v.provider === "upload" ? (
                              <>
                                {/* Served from our own /uploads by express.static,
                                    which honours Range requests — so seeking works. */}
                                <video
                                  src={v.url}
                                  controls
                                  preload="metadata"
                                  playsInline
                                  controlsList="nodownload"
                                  className="w-full rounded-lg bg-black aspect-video"
                                />
                                <a
                                  href={v.url}
                                  download
                                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mt-2 transition"
                                >
                                  <LuDownload className="w-3.5 h-3.5" /> ভিডিওটি ডাউনলোড করুন
                                </a>
                              </>
                            ) : (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                                <iframe
                                  src={toEmbedUrl(v.url)}
                                  title={v.title || `video-${i}`}
                                  className="absolute inset-0 w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Deliberately not labelled "উত্তর" — the answer is on the
                      paper page in the reader's hands. This is what did not fit
                      there. */}
                  {hasExtra && (
                    <section>
                      <SectionLabel icon={<LuInfo className="w-3.5 h-3.5" />}>
                        অতিরিক্ত তথ্য
                      </SectionLabel>
                      <p className="text-xs text-slate-500 mb-3">
                        মূল উত্তরটি বইয়ের পাতাতেই আছে — এখানে বাড়তি ব্যাখ্যা ও তথ্য।
                      </p>
                      <div
                        className="sb-answer prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: active.answerHtml ?? "" }}
                      />
                    </section>
                  )}

                  {hasFiles && (
                    <section>
                      <SectionLabel icon={<LuFileText className="w-3.5 h-3.5" />}>
                        ফাইল ({active.attachments.length})
                      </SectionLabel>
                      <div className="space-y-2">
                        {active.attachments.map((a, i) => (
                          <a
                            key={a._id ?? i}
                            href={a.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg bg-[#1c1c1c] hover:bg-[#282828] px-4 py-3 transition"
                          >
                            <LuFileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-sm truncate flex-1">{a.title}</span>
                            <LuDownload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Nothing attached at all — one line, so the question isn't
                      followed by bare padding. */}
                  {!hasAnything && (
                    <div className="rounded-lg border border-dashed border-[#333] px-4 py-6 text-center">
                      <p className="text-sm text-slate-500">
                        এই প্রশ্নে এখনো ছবি, ভিডিও বা অতিরিক্ত তথ্য যোগ করা হয়নি।
                      </p>
                    </div>
                  )}
                </div>

                {/* Prev / next — easier than aiming at a small chip on a phone. */}
                <div className="flex items-center justify-between gap-3 mt-8 pt-5 border-t border-[#282828]">
                  <button
                    disabled={activeIndex === 0}
                    onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                    className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-30 hover:text-white transition"
                  >
                    <LuChevronLeft className="w-4 h-4" /> আগের
                  </button>
                  <span className="text-xs text-slate-500">
                    {activeIndex + 1} / {questions.length}
                  </span>
                  <button
                    disabled={activeIndex === questions.length - 1}
                    onClick={() => setActiveIndex(i => Math.min(questions.length - 1, i + 1))}
                    className="flex items-center gap-1 text-sm text-slate-400 disabled:opacity-30 hover:text-white transition"
                  >
                    পরের <LuChevronLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>

                {/* Next topic — only shown on the last question. Cross-topic
                    navigation is deliberately absent everywhere else so a
                    reader stays inside the scanned scope; the button appears
                    once they have actually finished the topic. */}
                {activeIndex === questions.length - 1 && nextTopic && (
                  <div className="mt-6">
                    {nextTopic.allowed ? (
                      <Link
                        href={`/b/${nextTopic.qrCode}`}
                        className="w-full flex items-center justify-between gap-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-4 transition"
                      >
                        <span className="flex flex-col items-start min-w-0">
                          <span className="text-[11px] uppercase tracking-wide opacity-70">
                            পরবর্তী টপিক
                          </span>
                          <span className="text-sm truncate">
                            {nextTopic.chapterNo ? `${nextTopic.chapterNo}. ` : ""}
                            {nextTopic.topicNo ? `${nextTopic.topicNo} ` : ""}
                            {nextTopic.topicTitle}
                          </span>
                        </span>
                        <LuChevronLeft className="w-5 h-5 rotate-180 shrink-0" />
                      </Link>
                    ) : (
                      <div className="w-full flex items-center gap-3 rounded-xl bg-[#1c1c1c] border border-[#282828] text-slate-400 px-5 py-4">
                        <LuLock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-sm">
                          পরবর্তী টপিকটি দেখতে বইটি কিনতে হবে।
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          )}
        </main>

        {/* Desktop sidebar — this topic's questions only. */}
        <aside className="hidden lg:block w-[300px] shrink-0">
          <div className="sticky top-24 rounded-xl bg-[#161616] border border-[#282828] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282828]">
              <p className="text-xs uppercase tracking-wide text-slate-500">এই টপিকের প্রশ্ন</p>
              <p className="text-sm text-slate-300 mt-0.5">
                মোট {data.totalCount} টি
              </p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-1">
              {questions.map((q, i) => (
                <button
                  key={q._id}
                  onClick={() => setActiveIndex(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition ${
                    i === activeIndex ? "bg-[#222]" : "hover:bg-[#1c1c1c]"
                  }`}
                >
                  <span
                    className={`mt-0.5 min-w-6 h-6 rounded text-xs font-medium flex items-center justify-center shrink-0 ${
                      i === activeIndex
                        ? "bg-emerald-500 text-black"
                        : "bg-[#282828] text-slate-400"
                    }`}
                  >
                    {q.questionNo}
                  </span>
                  <span className="text-sm text-slate-300 line-clamp-2">
                    {q.questionText || <span className="text-slate-600 italic">শিরোনাম নেই</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

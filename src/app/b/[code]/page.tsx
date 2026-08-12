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
import Image from "next/image";
import {
  LuBookOpen,
  LuChevronLeft,
  LuDownload,
  LuFileText,
  LuImage,
  LuLoaderCircle,
  LuLock,
  LuTriangleAlert,
  LuVideo,
  LuX,
} from "react-icons/lu";
import API_BASE_URL from "@/config/api";
import AnswerStyles from "@/components/books/AnswerStyles";
import Lightbox from "@/components/books/Lightbox";

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
  answeredCount: number;
  totalCount: number;
};

type LockedBook = {
  _id: string;
  title: string;
  slug?: string;
  author?: string;
  coverImage?: string;
  price?: number;
  offerPrice?: number;
};

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: ScanData }
  | { kind: "locked"; book: LockedBook | null }
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

/** Small heading that separates answer / figures / video / downloads. */
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

export default function BookTopicScanPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code;

  const [state, setState] = useState<State>({ kind: "loading" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    setState({ kind: "loading" });

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(`/b/${code}`)}`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/book-content/scan/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();

      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/b/${code}`)}`);
        return;
      }
      if (res.status === 403) {
        setState({ kind: "locked", book: body.book ?? null });
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
    } catch {
      setState({ kind: "error", message: "Network error — check your connection" });
    }
  }, [code, router]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Loading ──────────────────────────────────────────────
  if (state.kind === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <LuLoaderCircle className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  // ─── Not purchased ────────────────────────────────────────
  if (state.kind === "locked") {
    const book = state.book;
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-slate-200 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
            <LuLock className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">এই বইটি আপনার কেনা নেই</h1>
          <p className="text-sm text-slate-400 mb-6">
            QR কোডের কনটেন্ট দেখতে হলে বইটি কিনতে হবে।
          </p>

          {book?.coverImage && (
            <div className="relative w-28 h-40 mx-auto mb-4 rounded-lg overflow-hidden">
              <Image src={book.coverImage} alt={book.title} fill className="object-cover" />
            </div>
          )}
          {book && (
            <p className="text-white font-medium mb-1">{book.title}</p>
          )}
          {book && (book.offerPrice ?? book.price) ? (
            <p className="text-emerald-400 text-sm mb-6">
              ৳{book.offerPrice ?? book.price}
            </p>
          ) : (
            <div className="mb-6" />
          )}

          <Link
            href={book?.slug ? `/books/${book.slug}` : "/books"}
            className="inline-flex items-center justify-center w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-5 py-3 transition"
          >
            বইটি কিনুন
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

                {/* Reading order, deliberately: answer → figures → video →
                    downloads. The video used to sit above the answer, so the
                    first thing a reader met after the question was a player,
                    with the actual answer pushed below the fold. */}
                {active.answerHtml?.trim() ? (
                  <div
                    className="sb-answer prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: active.answerHtml }}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed border-[#333] px-4 py-6 text-center">
                    <p className="text-sm text-slate-500">উত্তরটি শীঘ্রই যোগ করা হবে।</p>
                  </div>
                )}

                {active.images?.length > 0 && (
                  <section className="mt-7">
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
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 text-[10px] font-medium bg-black/60 text-white rounded px-1.5 py-0.5">
                            {i + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {active.videos?.length > 0 && (
                  <section className="mt-7">
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

                {active.attachments?.length > 0 && (
                  <section className="mt-7">
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
                {data.answeredCount} / {data.totalCount} উত্তর দেওয়া হয়েছে
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

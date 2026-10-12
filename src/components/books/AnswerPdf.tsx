"use client";

/**
 * A PDF attached to an answer, shown the way the home page shows its sample.
 *
 * The client's words: the sample on the home page "just works" — you see it at
 * once, can enlarge it and can download it — while a topic's PDF hid behind a
 * button and, opened in a tab, sat on a grey page. So this is that section,
 * cut down for the dark reader: the pages right there in the answer (pdf.js,
 * fetched a page at a time), a full-screen view, and a download that saves the
 * file through the phone's download manager.
 *
 * The viewer loads only when the reader gets near it, as on the home page: an
 * answer can carry several PDFs, and one the reader never scrolls to should
 * cost them nothing.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { LuDownload, LuExpand, LuExternalLink, LuFileText, LuX } from "react-icons/lu";
import { downloadLink, fileNameFor } from "@/lib/answerFiles";

const Spinner = () => (
  <div className="flex h-full min-h-[320px] w-full items-center justify-center">
    <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#333] border-t-emerald-400" />
  </div>
);

// pdf.js is heavy and most readers never open most PDFs: loaded on demand only.
const PdfViewer = dynamic(() => import("@/components/shared/PdfViewer"), {
  ssr: false,
  loading: Spinner,
});

const BOX = "h-[60vh] max-h-[720px] min-h-[380px] w-full bg-[#1c1c1c]";

export default function AnswerPdf({ title, url }: { title: string; url: string }) {
  const [full, setFull] = useState(false);
  // Only if pdf.js itself cannot open the file: the reader is offered the file
  // rather than an empty box.
  const [failed, setFailed] = useState(false);

  // Has the reader got near it? Without IntersectionObserver (an old browser),
  // load straight away.
  const boxRef = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (nearby || !boxRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearby(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(boxRef.current);
    return () => io.disconnect();
  }, [nearby]);

  // Full screen: no page scroll behind it, and Escape closes it.
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const save = { href: downloadLink(url, title), download: fileNameFor({ title, fileUrl: url }) };

  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#161616]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#282828] px-3 py-2.5">
        <span className="flex min-w-0 flex-1 basis-40 items-center gap-2 text-sm text-slate-200">
          <LuFileText className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="break-words">{title}</span>
        </span>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setFull(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#333] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-emerald-500/60 hover:text-emerald-400 sm:flex-none"
          >
            <LuExpand className="h-3.5 w-3.5" /> বড় করে দেখুন
          </button>
          <a
            {...save}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 sm:flex-none"
          >
            <LuDownload className="h-3.5 w-3.5" /> ডাউনলোড
          </a>
        </div>
      </div>

      <div ref={boxRef}>
        {failed ? (
          <Fallback url={url} save={save} />
        ) : nearby ? (
          // Scrolls inside its own box, so a forty-page PDF does not push the
          // rest of the answer — and the next question's button — out of reach.
          <PdfViewer url={url} onError={() => setFailed(true)} className={BOX} />
        ) : (
          <div className={BOX}>
            <Spinner />
          </div>
        )}
      </div>

      {full && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f0f]">
          <div className="flex items-center gap-2 border-b border-[#282828] px-4 py-3">
            <LuFileText className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="flex-1 truncate text-sm text-slate-200">{title}</span>
            <a
              {...save}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-emerald-400"
            >
              <LuDownload className="h-3.5 w-3.5" /> ডাউনলোড
            </a>
            <button
              type="button"
              onClick={() => setFull(false)}
              aria-label="বন্ধ করুন"
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition hover:text-white"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>
          {failed ? (
            <div className="flex-1 overflow-y-auto">
              <Fallback url={url} save={save} />
            </div>
          ) : (
            <PdfViewer url={url} onError={() => setFailed(true)} className="w-full flex-1 bg-[#161616]" />
          )}
        </div>
      )}
    </div>
  );
}

/** Shown only when pdf.js cannot open the file: hand the reader the PDF two ways. */
function Fallback({ url, save }: { url: string; save: { href: string; download: string } }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 bg-[#1c1c1c] px-6 py-10 text-center">
      <p className="text-sm text-slate-300">এখানে দেখানো গেল না — নতুন ট্যাবে খুলুন বা ডাউনলোড করে পড়ুন।</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-md border border-[#333] px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-emerald-500/60 hover:text-emerald-400"
        >
          <LuExternalLink className="h-3.5 w-3.5" /> নতুন ট্যাবে খুলুন
        </a>
        <a
          {...save}
          className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400"
        >
          <LuDownload className="h-3.5 w-3.5" /> ডাউনলোড
        </a>
      </div>
    </div>
  );
}

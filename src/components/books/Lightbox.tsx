"use client";

/**
 * Full-screen image viewer for answer figures.
 *
 * Anatomy diagrams are the reason this exists: at gallery size they are
 * unreadable, and a phone reader's only alternative was long-pressing the image
 * and opening it in a new tab, which loses their place in the topic.
 */

import { useCallback, useEffect } from "react";
import { LuChevronLeft, LuDownload, LuX } from "react-icons/lu";

export default function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const go = useCallback(
    (delta: number) => {
      // Wrap around — on a phone, flicking past the last figure landing on the
      // first is friendlier than a dead button.
      const next = (index + delta + images.length) % images.length;
      onIndexChange(next);
    },
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while this is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  const src = images[index];
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-slate-300 shrink-0">
        <span className="text-sm tabular-nums">
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-1">
          <a
            href={src}
            download
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            title="ছবিটি ডাউনলোড করুন"
          >
            <LuDownload className="w-5 h-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            title="বন্ধ করুন"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 px-2 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`ছবি ${index + 1}`}
          className="max-h-full max-w-full object-contain select-none"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="আগের ছবি"
          >
            <LuChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="পরের ছবি"
          >
            <LuChevronLeft className="w-6 h-6 rotate-180" />
          </button>
        </>
      )}
    </div>
  );
}

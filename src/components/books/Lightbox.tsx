"use client";

/**
 * Full-screen image viewer for answer figures.
 *
 * Anatomy diagrams are the reason this exists: at gallery size they are
 * unreadable, and a phone reader's only alternative was long-pressing the image
 * and opening it in a new tab, which loses their place in the topic.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuX } from "react-icons/lu";

// Below this, treat a touch as a tap or wobble rather than a swipe. Small
// enough to feel responsive on a phone, large enough to survive shaky hands.
const SWIPE_THRESHOLD_PX = 45;

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

  // Swipe: horizontal changes image, vertical closes. Dominant axis wins so a
  // diagonal flick reads as whichever it was more of. Tracked with refs (touch
  // start) and state (live offset) so the image tugs under the finger and then
  // snaps back on a partial swipe.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    setDrag({ dx: 0, dy: 0 });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    setDrag({ dx: t.clientX - touchStart.current.x, dy: t.clientY - touchStart.current.y });
  };
  const onTouchEnd = () => {
    const start = touchStart.current;
    const d = drag;
    touchStart.current = null;
    setDrag(null);
    if (!start || !d) return;

    const absX = Math.abs(d.dx);
    const absY = Math.abs(d.dy);
    if (absX < SWIPE_THRESHOLD_PX && absY < SWIPE_THRESHOLD_PX) return;

    if (absX > absY) {
      go(d.dx < 0 ? 1 : -1);
    } else {
      // Up OR down closes — either flick is a "get out" gesture.
      onClose();
    }
  };

  const src = images[index];
  if (!src) return null;

  const dragStyle = drag
    ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, transition: "none" as const }
    : { transform: "translate(0,0)", transition: "transform 180ms ease-out" };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col select-none"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-4 py-3 text-slate-300 shrink-0">
        <span className="text-sm tabular-nums">
          {index + 1} / {images.length}
        </span>
        {/* Download button intentionally omitted — figures are protected
            content. Right-click Save and long-press Save Image are blocked on
            the image below; a determined user can still screenshot, but the
            casual "save it" path is closed. */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="বন্ধ করুন"
        >
          <LuX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 px-2 pb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`ছবি ${index + 1}`}
          className="max-h-full max-w-full object-contain select-none touch-pan-y"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          style={{ ...dragStyle, WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
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

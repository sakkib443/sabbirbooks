"use client";

/**
 * Full-screen image viewer for answer figures — with zoom.
 *
 * Anatomy diagrams are the reason this exists: at gallery size they are
 * unreadable, and a phone reader's only alternative was long-pressing the image
 * and opening it in a new tab, which loses their place in the topic. Opening it
 * full-screen was only half the answer, though — a labelled diagram photographed
 * for print is still unreadable at 390px wide. So it zooms: pinch, double-tap,
 * or the buttons, and drag to move around once magnified.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuX, LuZoomIn, LuZoomOut, LuRotateCcw } from "react-icons/lu";

// Below this, treat a touch as a tap or wobble rather than a swipe. Small
// enough to feel responsive on a phone, large enough to survive shaky hands.
const SWIPE_THRESHOLD_PX = 45;

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
// What a double-tap jumps to. Enough to read a label on a phone, not so much
// that the reader lands somewhere they cannot recognise.
const TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

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
  // How far in, and where the reader has dragged to. Pan is in screen pixels,
  // applied before the scale, so it means the same thing at every zoom level.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomed = zoom > 1.01;
  const stageRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (delta: number) => {
      // Wrap around — on a phone, flicking past the last figure landing on the
      // first is friendlier than a dead button.
      const next = (index + delta + images.length) % images.length;
      // A zoomed-in view of figure 3 means nothing once figure 4 is on screen,
      // so every move starts the next one whole.
      setZoom(1);
      setPan({ x: 0, y: 0 });
      onIndexChange(next);
    },
    [index, images.length, onIndexChange]
  );

  /**
   * Keep the picture on screen.
   *
   * At 2x there is half an image-width of slack in each direction; past that
   * the reader is dragging empty black, and getting back to the diagram
   * becomes its own puzzle. The allowance is generous rather than exact —
   * the image is letterboxed inside the stage, so the true edges are not worth
   * measuring for what is, in the end, a guard rail.
   */
  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const box = stageRef.current?.getBoundingClientRect();
    const maxX = ((box?.width ?? 0) * (z - 1)) / 2;
    const maxY = ((box?.height ?? 0) * (z - 1)) / 2;
    return { x: clamp(p.x, -maxX, maxX), y: clamp(p.y, -maxY, maxY) };
  }, []);

  const zoomTo = useCallback(
    (next: number) => {
      const z = clamp(next, MIN_ZOOM, MAX_ZOOM);
      setZoom(z);
      setPan((p) => (z <= 1.01 ? { x: 0, y: 0 } : clampPan(p, z)));
    },
    [clampPan]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "+" || e.key === "=") zoomTo(zoom + 0.5);
      if (e.key === "-") zoomTo(zoom - 0.5);
      if (e.key === "0") zoomTo(1);
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while this is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose, zoom, zoomTo]);

  /*
   * Touch: one finger swipes (or pans, once zoomed), two fingers pinch.
   *
   * Swiping is deliberately only available at 1x. Zoomed in, a horizontal drag
   * is how the reader moves across the diagram — stealing it to change figures
   * would make the magnified view unusable, which is the view they zoomed in
   * to get.
   */
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTap = useRef(0);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  // A finger or the mouse button is down. Rendered state rather than a ref,
  // because the cursor and the transition are drawn from it.
  const [interacting, setInteracting] = useState(false);

  const spread = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinch.current = { dist: spread(e.touches), zoom };
      touchStart.current = null;
      setDrag(null);
      setInteracting(true);
      return;
    }
    const t = e.touches[0];
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      // Double-tap toggles: in if we are out, all the way out if we are in.
      zoomTo(zoomed ? 1 : TAP_ZOOM);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    touchStart.current = { x: t.clientX, y: t.clientY };
    panStart.current = { ...pan };
    setDrag({ dx: 0, dy: 0 });
    setInteracting(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const ratio = spread(e.touches) / (pinch.current.dist || 1);
      zoomTo(pinch.current.zoom * ratio);
      return;
    }
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (zoomed && panStart.current) {
      setPan(clampPan({ x: panStart.current.x + dx, y: panStart.current.y + dy }, zoom));
      return;
    }
    setDrag({ dx, dy });
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinch.current && e.touches.length < 2) pinch.current = null;
    const start = touchStart.current;
    const d = drag;
    touchStart.current = null;
    panStart.current = null;
    setDrag(null);
    setInteracting(e.touches.length > 0);
    if (!start || !d || zoomed) return;

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

  // Mouse: wheel zooms, and a zoomed picture can be dragged around.
  const mouseFrom = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    mouseFrom.current = { x: e.clientX, y: e.clientY, pan: { ...pan } };
    setInteracting(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const from = mouseFrom.current;
    if (!from) return;
    setPan(clampPan({ x: from.pan.x + (e.clientX - from.x), y: from.pan.y + (e.clientY - from.y) }, zoom));
  };
  const endMouse = () => {
    mouseFrom.current = null;
    setInteracting(false);
  };

  const src = images[index];
  if (!src) return null;

  // Un-zoomed, the whole picture tugs under a swiping finger. Zoomed, the pan
  // is the transform and the swipe is switched off, so the two never fight.
  const transform = zoomed
    ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
    : `translate(${drag?.dx ?? 0}px, ${drag?.dy ?? 0}px)`;

  const zoomButton =
    "p-2 rounded-lg text-slate-300 hover:bg-white/10 transition disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
      style={{ touchAction: "none" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={(e) => {
        e.preventDefault();
        zoomTo(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
          {images.length > 1 ? `${index + 1} / ${images.length}` : "ছবি"}
          {zoomed && <span className="ml-1.5 text-slate-400">{zoom.toFixed(1)}x</span>}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => zoomTo(zoom - 0.5)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="ছোট করুন"
            className={zoomButton}
          >
            <LuZoomOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => zoomTo(zoom + 0.5)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="বড় করুন"
            className={zoomButton}
          >
            <LuZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => zoomTo(1)}
            disabled={!zoomed}
            aria-label="আগের মাপে"
            className={zoomButton}
          >
            <LuRotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="ml-1 rounded-lg p-2 text-slate-300 transition hover:bg-white/10"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endMouse}
        onMouseLeave={endMouse}
        onDoubleClick={() => zoomTo(zoomed ? 1 : TAP_ZOOM)}
      >
        {/* Tapping the backdrop closes; tapping the picture must not. */}
        <button
          type="button"
          aria-label="বন্ধ করুন"
          onClick={onClose}
          className="absolute inset-0 cursor-default"
          tabIndex={-1}
        />

        {/* eslint-disable-next-line @next/next/no-img-element -- answer figures are
            arbitrary uploads on an unknown host, and this viewer needs the raw
            intrinsic size to zoom into. */}
        <img
          src={src}
          alt=""
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className={`relative max-h-full max-w-full select-none object-contain ${
            zoomed ? (interacting ? "cursor-grabbing" : "cursor-grab") : ""
          } ${interacting ? "" : "transition-transform duration-200"}`}
          style={{ transform, transformOrigin: "center" }}
        />

        {images.length > 1 && !zoomed && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="আগের ছবি"
              className="absolute left-2 rounded-full bg-black/50 p-2.5 text-slate-200 transition hover:bg-black/70"
            >
              <LuChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="পরের ছবি"
              className="absolute right-2 rotate-180 rounded-full bg-black/50 p-2.5 text-slate-200 transition hover:bg-black/70"
            >
              <LuChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <p className="px-4 pb-4 pt-1 text-center text-[11px] leading-relaxed text-slate-500">
        {zoomed
          ? "টেনে সরান • দুইবার ট্যাপ করলে আগের মাপে"
          : "দুই আঙুলে বা দুইবার ট্যাপ করে জুম করুন"}
      </p>
    </div>
  );
}

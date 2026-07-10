/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LuImages,
  LuFileText,
  LuExternalLink,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuZoomIn,
} from "react-icons/lu";
import { cn } from "@/components/ui";

export interface BookPreviewLabels {
  heading: string;
  subtitle: string;
  samplePages: string;
  pdfTitle: string;
  pdfDesc: string;
  openPdf: string;
  close: string;
  prev: string;
  next: string;
  counter: (current: number, total: number) => string;
}

// Preview viewer: sample-image gallery with an accessible lightbox + a sample-PDF link card.
export function BookPreview({
  images = [],
  pdfUrl,
  title,
  labels,
  bn = "",
}: {
  images?: string[];
  pdfUrl?: string;
  title: string;
  labels: BookPreviewLabels;
  bn?: string;
}) {
  const gallery = images.filter(Boolean);
  const [active, setActive] = useState<number | null>(null);
  const isOpen = active !== null;

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setActive((i) => {
        if (i === null || gallery.length === 0) return i;
        return (i + dir + gallery.length) % gallery.length;
      }),
    [gallery.length]
  );

  // Keyboard navigation + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close, step]);

  if (gallery.length === 0 && !pdfUrl) return null;

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LuImages className="text-lg" />
        </span>
        <div>
          <h2 className={cn("font-heading text-xl font-bold text-foreground", bn)}>
            {labels.heading}
          </h2>
          <p className={cn("text-sm text-muted-foreground", bn)}>{labels.subtitle}</p>
        </div>
      </div>

      {/* Sample-image thumbnails */}
      {gallery.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {gallery.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${labels.samplePages} ${i + 1}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-primary-soft shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <img
                src={src}
                alt={`${title} — ${labels.samplePages} ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all group-hover:bg-foreground/25 group-hover:opacity-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-primary">
                  <LuZoomIn />
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Sample PDF */}
      {pdfUrl && (
        <div className="mt-5 flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <LuFileText className="text-xl" />
            </span>
            <div>
              <p className={cn("font-heading text-sm font-semibold text-foreground", bn)}>
                {labels.pdfTitle}
              </p>
              <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>{labels.pdfDesc}</p>
            </div>
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/40 bg-transparent px-5 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary-soft hover:border-primary",
              bn
            )}
          >
            <LuExternalLink className="text-sm" />
            {labels.openPdf}
          </a>
        </div>
      )}

      {/* Lightbox */}
      {active !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-sm animate-fade-up"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={labels.heading}
        >
          <button
            type="button"
            onClick={close}
            aria-label={labels.close}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card transition-colors hover:bg-card"
          >
            <LuX className="text-xl" />
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label={labels.prev}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card transition-colors hover:bg-card sm:left-6"
              >
                <LuChevronLeft className="text-xl" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label={labels.next}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card transition-colors hover:bg-card sm:right-6"
              >
                <LuChevronRight className="text-xl" />
              </button>
            </>
          )}

          <figure className="flex max-h-full max-w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={gallery[active]}
              alt={`${title} — ${labels.samplePages} ${active + 1}`}
              className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-glow"
            />
            {gallery.length > 1 && (
              <figcaption className="mt-3 rounded-full bg-card/90 px-4 py-1.5 text-xs font-semibold text-foreground">
                {labels.counter(active + 1, gallery.length)}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </section>
  );
}

export default BookPreview;

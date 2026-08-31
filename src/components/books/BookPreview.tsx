/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  LuImages,
  LuFileText,
  LuExternalLink,
  LuBookOpen,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuZoomIn,
} from "react-icons/lu";
import { cn } from "@/components/ui";

// pdf.js, not an <iframe>: iOS Safari and Android Chrome will not render a PDF
// inside a frame, and most of this shop's readers are on a phone. Kept out of
// the server bundle and off first paint — see the component's own notes.
const PdfViewer = dynamic(() => import("@/components/shared/PdfViewer"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

// A sample PDF may be a direct `.pdf`, a Cloudinary *raw* upload (which needs a
// `.pdf` suffix before a browser will render it), or some other URL that only a
// viewer can embed. Same normaliser the dashboard materials viewer uses, so the
// embed behaves identically everywhere in the app.
const getPdfRenderUrl = (url: string): string => {
  if (!url) return url;
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf") || lower.includes(".pdf?") || lower.includes(".pdf#")) return url;
  if (lower.includes("res.cloudinary.com") && lower.includes("/raw/upload/")) return url + ".pdf";
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
};

export interface BookPreviewLabels {
  heading: string;
  subtitle: string;
  samplePages: string;
  pdfTitle: string;
  pdfDesc: string;
  openPdf: string;
  readALittle: string;
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
  const [pdfOpen, setPdfOpen] = useState(false);
  const isOpen = active !== null;

  const close = useCallback(() => setActive(null), []);
  const closePdf = useCallback(() => setPdfOpen(false), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setActive((i) => {
        if (i === null || gallery.length === 0) return i;
        return (i + dir + gallery.length) % gallery.length;
      }),
    [gallery.length]
  );

  // Keyboard + body scroll lock while EITHER overlay is open (image lightbox or
  // the in-page PDF viewer). Arrow keys only page the image gallery.
  useEffect(() => {
    if (!isOpen && !pdfOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        closePdf();
      } else if (isOpen && e.key === "ArrowRight") step(1);
      else if (isOpen && e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, pdfOpen, close, closePdf, step]);

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

      {/* Sample PDF — an in-page peek at the first page that opens a full viewer
          on the SAME page (no new tab), mirroring the image thumbnails above. */}
      {pdfUrl && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface-soft">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
            <button
              type="button"
              onClick={() => setPdfOpen(true)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/40 bg-transparent px-5 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary-soft hover:border-primary",
                bn
              )}
            >
              <LuBookOpen className="text-sm" />
              {labels.readALittle}
            </button>
          </div>

          {/* First-page peek. The iframe is inert (pointer-events-none); the whole
              tile is the button, so a tap anywhere opens the reader. */}
          <button
            type="button"
            onClick={() => setPdfOpen(true)}
            aria-label={labels.readALittle}
            className="group relative block w-full border-t border-border"
          >
            <div className="relative h-56 w-full overflow-hidden bg-primary-soft sm:h-72">
              {/* Just the cover: this tile is a peek, and rendering all 31
                  pages behind a 224px window would pull the whole sample down
                  for a thumbnail. */}
              <PdfViewer
                url={getPdfRenderUrl(pdfUrl)}
                maxPages={1}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent p-4 pt-20">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-card/95 px-4 py-2 text-sm font-semibold text-primary shadow-card transition-transform group-hover:-translate-y-0.5",
                    bn
                  )}
                >
                  <LuBookOpen /> {labels.readALittle}
                </span>
              </span>
            </div>
          </button>
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

      {/* In-page PDF viewer — opens over the page, not on a separate route. */}
      {pdfOpen && pdfUrl && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-foreground/85 p-3 backdrop-blur-sm animate-fade-up sm:p-6"
          onClick={closePdf}
          role="dialog"
          aria-modal="true"
          aria-label={labels.pdfTitle}
        >
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 pb-2 text-card">
            <p className={cn("truncate text-sm font-semibold", bn)}>{labels.pdfTitle}</p>
            <div className="flex items-center gap-2">
              {/* Fallback for the rare browser that will not embed a PDF inline. */}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "hidden items-center gap-1.5 rounded-lg bg-card/15 px-3 py-1.5 text-xs font-medium text-card transition-colors hover:bg-card/25 sm:inline-flex",
                  bn
                )}
              >
                <LuExternalLink className="text-xs" /> {labels.openPdf}
              </a>
              <button
                type="button"
                onClick={closePdf}
                aria-label={labels.close}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-card transition-colors hover:bg-card"
              >
                <LuX className="text-lg" />
              </button>
            </div>
          </div>
          <div
            className="mx-auto w-full max-w-4xl flex-1 overflow-hidden rounded-xl bg-card shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <PdfViewer url={getPdfRenderUrl(pdfUrl)} className="h-full w-full" />
          </div>
        </div>
      )}
    </section>
  );
}

export default BookPreview;

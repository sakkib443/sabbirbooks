'use client';

/**
 * A PDF that actually renders on a phone.
 *
 * `<iframe src="…​.pdf">` only works on desktop. iOS Safari and Android Chrome
 * refuse to render a PDF inside a frame — the visitor gets a grey box with a
 * broken-document icon, which is what the shop's own sample section was showing
 * to most of its readers, since most of them are students on a phone.
 *
 * So the pages are drawn with pdf.js instead: the same engine Firefox ships and
 * Chrome's own viewer is built on, running as a worker and painting each page
 * into a <canvas>. That works in every browser, and it is the only approach
 * that does.
 *
 * Two things keep it cheap enough for a 5 MB sample on mobile data:
 *   • pdf.js issues HTTP range requests, so it pulls the pages it is asked for
 *     rather than the whole file (express.static answers ranges — see app.ts).
 *   • a page is only painted once it is near the viewport, and its canvas is
 *     released once it is far away again. A twenty-page sample never holds
 *     twenty full-resolution bitmaps at once.
 *
 * The module is deliberately heavy — load it with next/dynamic({ssr:false}) so
 * pdf.js never reaches the server bundle or a first paint.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';

/** Set once, on first use — assigning it per-instance restarts the worker. */
let pdfjsPromise = null;

const loadPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // Bundled rather than fetched from a CDN: the worker's version must match
      // the library's exactly, and a CDN copy is one silent bump away from
      // "The API version does not match the Worker version".
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
};

/**
 * One open document per URL, shared by every viewer showing it.
 *
 * The inline viewer and the full-screen one show the same file; each opening
 * its own copy meant "বড় করে দেখুন" fetched the whole PDF from the start again,
 * on a phone, while the first copy was still loading. Counted, and destroyed
 * only when the last viewer using it goes.
 */
const openDocs = new Map();

const acquireDoc = async (url) => {
  let entry = openDocs.get(url);
  if (!entry) {
    const pdfjs = await loadPdfjs();
    entry = openDocs.get(url); // another viewer may have opened it meanwhile
    if (!entry) {
      const task = pdfjs.getDocument({
        url,
        // The sample is served from our own origin through the /uploads
        // rewrite, so no credentials are needed and none are sent.
        withCredentials: false,
        // Fetch only what is looked at. By default pdf.js also streams the
        // WHOLE file in the background from the moment it opens, competing on
        // a phone with the very pages the reader is waiting for. With these two
        // off, pages arrive as the reader scrolls to them. A server that cannot
        // answer a range simply gets the whole file as before.
        disableStream: true,
        disableAutoFetch: true,
        // Fewer, larger range requests: a round trip saved is worth more than
        // the few extra kilobytes a 256 KB chunk can over-fetch.
        rangeChunkSize: 256 * 1024,
      });
      entry = { task, refs: 0 };
      openDocs.set(url, entry);
      // A failed open must not stay cached, or a retry gets the same failure.
      task.promise.catch(() => openDocs.get(url) === entry && openDocs.delete(url));
    }
  }
  entry.refs += 1;
  return entry;
};

const releaseDoc = (url, entry) => {
  entry.refs -= 1;
  if (entry.refs > 0) return;
  if (openDocs.get(url) === entry) openDocs.delete(url);
  // destroy() aborts the in-flight range requests too, so navigating away
  // mid-download does not keep pulling a 5 MB file over someone's data.
  entry.task.destroy?.();
};

/**
 * Cap on the backing-store resolution. A phone reports devicePixelRatio 3, and
 * painting an A4 page at 3× is a 2500×3500 bitmap — enough to make an older
 * handset drop the tab. 2× is already past what the screen resolves.
 */
const MAX_DPR = 2;

/**
 * How far outside the scroll box a page starts painting. Generous on purpose:
 * the pages are fetched over the network a range at a time, and an anatomy page
 * with full-bleed figures is not instant, so a reader who scrolls at a normal
 * speed should arrive at a page that started loading a screen or two ago.
 */
const PRERENDER_MARGIN = '1200px';

/**
 * @param {{
 *   url: string,
 *   className?: string,
 *   onError?: (e: Error) => void,
 *   maxPages?: number,
 * }} props
 *   maxPages caps how many pages are listed — for a thumbnail peek that wants
 *   the cover and nothing else, rather than a scrollable document.
 */
export default function PdfViewer({ url, className = '', onError, maxPages }) {
  const [doc, setDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(null);
  // Page one's shape, used for every page until that page is painted. Asking
  // each page for its own up front meant opening a forty-page PDF fired forty
  // lookups before page one could show — the long wait on a phone.
  const [firstRatio, setFirstRatio] = useState(1.414);
  // The viewer owns its scroll box so it can hand it to each page's
  // IntersectionObserver as the root. With the default root (the viewport) the
  // scroll box clips everything outside it, the prerender margin buys nothing,
  // and every page starts loading only once the reader is already staring at
  // its blank space.
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let entry = null;

    (async () => {
      try {
        entry = await acquireDoc(url);
        if (cancelled) {
          releaseDoc(url, entry);
          entry = null;
          return;
        }
        const loaded = await entry.task.promise;
        if (cancelled) return;
        const first = await loaded.getPage(1);
        if (cancelled) return;
        const v = first.getViewport({ scale: 1 });
        setFirstRatio(v.height / v.width);
        setDoc(loaded);
        setNumPages(loaded.numPages);
      } catch (e) {
        if (cancelled) return;
        setError(e);
        onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      if (entry) releaseDoc(url, entry);
    };
    // onError is a render-time callback in practice; re-subscribing on it would
    // tear the document down on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (error) return null; // the caller decides what to show instead

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto overscroll-contain bg-muted ${className}`}
    >
      {!doc && (
        <div className="flex h-full min-h-[320px] w-full items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}
      {doc &&
        Array.from({ length: Math.min(numPages, maxPages || numPages) }, (_, i) => (
          <PdfPage key={i} doc={doc} pageNumber={i + 1} rootRef={scrollRef} initialRatio={firstRatio} />
        ))}
    </div>
  );
}

/** One page. Paints when it comes near, and lets the bitmap go when it leaves. */
function PdfPage({ doc, pageNumber, rootRef, initialRatio }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);
  // The in-flight RenderTask, so a second paint can cancel it rather than
  // collide with it.
  const taskRef = useRef(null);
  // The CSS width the canvas was last painted at, so a ResizeObserver callback
  // that reports the same width does not trigger a pointless repaint.
  const widthRef = useRef(0);
  const [near, setNear] = useState(false);
  // Drives the per-page spinner. Without it a page that is fetching its content
  // over the network shows as a blank white sheet, which reads as broken rather
  // than as loading — the exact complaint that started this.
  const [drawn, setDrawn] = useState(false);
  // Kept so the placeholder reserves the right height before the page is
  // painted — without it every page is the same guessed height and the
  // scrollbar jumps as each one resolves.
  const [ratio, setRatio] = useState(initialRatio || 1.414); // page one's shape until this page says otherwise

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root: rootRef?.current ?? null, rootMargin: PRERENDER_MARGIN }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  const paint = useCallback(async () => {
    const canvas = canvasRef.current;
    const holder = holderRef.current;
    if (!canvas || !holder) return;

    const cssWidth = holder.clientWidth;
    if (!cssWidth) return;

    // One render at a time, per canvas. pdf.js refuses to draw into a canvas
    // whose previous task has not settled ("Cannot use the same canvas during
    // multiple render() operations"), and a ResizeObserver fires once the
    // moment it starts observing — so the first paint always raced itself and
    // left a half-drawn page behind. Cancel and wait for the old one to settle
    // before touching the canvas at all; resizing it mid-render corrupts the
    // same way.
    const prev = taskRef.current;
    if (prev) {
      prev.cancel();
      await prev.promise.catch(() => {});
      if (taskRef.current !== prev) return; // a newer paint already took over
      taskRef.current = null;
    }

    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    // This page's real shape, known only now that it was fetched: a landscape
    // page in a portrait PDF reserves the right height from here on.
    setRatio(base.height / base.width);
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    widthRef.current = cssWidth;

    // `canvas` alone, never alongside `canvasContext`. pdf.js takes the context
    // only when the canvas is explicitly null, so passing both silently paints
    // nothing — a canvas of the right size holding entirely transparent pixels.
    //
    // `background` is not optional here: a PDF page carries no background of its
    // own, so without it the sheet is whatever the canvas started as, and text
    // drawn in black lands on transparency.
    const task = page.render({ canvas, viewport, background: '#ffffff' });
    taskRef.current = task;
    await task.promise;
    setDrawn(true);
  }, [doc, pageNumber]);

  useEffect(() => {
    if (!near) {
      // Free the bitmap. A canvas keeps its backing store until it is resized
      // to nothing, so this is what stops a long sample from growing without
      // bound as the reader scrolls.
      taskRef.current?.cancel();
      taskRef.current = null;
      widthRef.current = 0;
      setDrawn(false);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      return;
    }

    let cancelled = false;
    // A page that fails to paint stays blank rather than breaking the rest, but
    // it is never swallowed: a silent catch here is what made a whole viewer of
    // transparent canvases look like a loading state instead of a bug.
    const report = (e) => {
      // RenderingCancelledException is the normal result of scrolling away
      // mid-paint, not a failure worth reporting.
      if (!cancelled && e?.name !== 'RenderingCancelledException') {
        console.error(`[PdfViewer] page ${pageNumber} failed to render`, e);
      }
    };

    paint().catch(report);

    // Repaint at the new width when the container changes size — a phone
    // rotating, or the full-screen viewer opening. Width-guarded: the observer
    // fires once immediately on observe(), and repainting for a width that has
    // not changed is what put a second render on the same canvas.
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (cancelled || !w || w === widthRef.current) return;
      paint().catch(report);
    });
    if (holderRef.current) ro.observe(holderRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      taskRef.current?.cancel();
    };
  }, [near, paint, pageNumber]);

  return (
    <div
      ref={holderRef}
      className="relative mx-auto w-full bg-white"
      // Reserves the page's height before it paints, so the scroll position
      // does not jump as pages resolve.
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      <canvas ref={canvasRef} className="block w-full" />
      {!drawn && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LuLoaderCircle className="animate-spin text-2xl text-muted-foreground/50" />
        </span>
      )}
    </div>
  );
}

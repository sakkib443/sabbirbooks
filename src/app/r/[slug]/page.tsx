/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LuBookOpen, LuEye, LuHeartPulse, LuChevronRight } from "react-icons/lu";
import { Badge, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import API_BASE_URL from "@/config/api";
import { ResourceBlock, type QrBlock } from "@/components/qr/ResourceBlock";
import { QrSkeleton, QrNotFound, QrError } from "@/components/qr/QrStates";

// ------------------------------------------------------------------
// Response shape from GET /api/qr/:slug
// ------------------------------------------------------------------
interface QrBook {
  title: string;
  author?: string;
  coverImage?: string;
  slug: string;
}

interface QrResource {
  slug: string;
  book?: QrBook;
  bookTitle?: string;
  questionNo: number | string;
  questionText?: string;
  title: string;
  blocks: QrBlock[];
  views: number;
}

type Status = "loading" | "ok" | "notfound" | "error";

export default function QrLandingPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<QrResource | null>(null);

  // Bilingual strings — no locale-JSON edits needed.
  const S = isBengali
    ? {
        question: "প্রশ্ন",
        views: "বার দেখা হয়েছে",
        by: "লেখক",
        home: "হোমে ফিরে যান",
        brand: "স্ক্যান রিসোর্স",
        poweredBy: "সাবির বুক দ্বারা পরিচালিত",
        nfTitle: "রিসোর্সটি পাওয়া যায়নি",
        nfMsg: "এই QR কোডের রিসোর্সটি পাওয়া যায়নি বা এটি এখনো প্রকাশিত হয়নি। বইয়ের কোডটি আবার স্ক্যান করে দেখুন।",
        errTitle: "কিছু একটা সমস্যা হয়েছে",
        errMsg: "রিসোর্সটি লোড করা যায়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
        emptyMsg: "এই রিসোর্সে এখনো কোনো কন্টেন্ট যোগ করা হয়নি।",
      }
    : {
        question: "Question",
        views: "views",
        by: "by",
        home: "Back to Home",
        brand: "Scan Resource",
        poweredBy: "Powered by Sabbir Book",
        nfTitle: "Resource not found",
        nfMsg: "The resource for this QR code could not be found, or it hasn't been published yet. Try scanning the code in your book again.",
        errTitle: "Something went wrong",
        errMsg: "We couldn't load this resource. Please check your connection and try again.",
        retry: "Try again",
        emptyMsg: "No content has been added to this resource yet.",
      };

  const load = useCallback(async () => {
    if (!slug) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE_URL}/qr/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });

      if (res.status === 404) {
        setStatus("notfound");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      const json = await res.json();
      if (json?.success && json?.data) {
        setData(json.data as QrResource);
        setStatus("ok");
      } else {
        setStatus("notfound");
      }
    } catch {
      setStatus("error");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "notfound") {
    return (
      <Frame>
        <QrNotFound title={S.nfTitle} message={S.nfMsg} homeLabel={S.home} bn={bn} />
        <BrandFooter label={S.poweredBy} bn={bn} />
      </Frame>
    );
  }

  if (status === "error") {
    return (
      <Frame>
        <QrError
          title={S.errTitle}
          message={S.errMsg}
          retryLabel={S.retry}
          homeLabel={S.home}
          onRetry={load}
          bn={bn}
        />
        <BrandFooter label={S.poweredBy} bn={bn} />
      </Frame>
    );
  }

  if (status === "loading" || !data) {
    return (
      <Frame>
        <BrandBar label={S.brand} bn={bn} />
        <QrSkeleton />
      </Frame>
    );
  }

  // ---- OK ---------------------------------------------------------
  const bookTitle = data.book?.title || data.bookTitle;
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];

  return (
    <Frame>
      <BrandBar label={S.brand} bn={bn} />

      {/* Header card */}
      <header className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
        {/* Book row */}
        {(data.book || bookTitle) && (
          <div className="mb-4 flex items-center gap-3">
            <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
              {data.book?.coverImage ? (
                <img
                  src={data.book.coverImage}
                  alt={bookTitle || ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <LuBookOpen className="text-primary/70" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              {bookTitle && (
                <p className={cn("line-clamp-2 text-sm font-semibold text-foreground", bn)}>
                  {bookTitle}
                </p>
              )}
              {data.book?.author && (
                <p className={cn("mt-0.5 line-clamp-1 text-xs text-muted-foreground", bn)}>
                  {S.by} {data.book.author}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Question meta */}
        <div className="flex flex-wrap items-center gap-2">
          {data.questionNo !== undefined && data.questionNo !== null && data.questionNo !== "" && (
            <Badge variant="primary" className={bn}>
              {S.question} {data.questionNo}
            </Badge>
          )}
          {typeof data.views === "number" && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LuEye className="text-sm" />
              {data.views.toLocaleString(isBengali ? "bn-BD" : "en-US")} {S.views}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          className={cn(
            "mt-3 font-heading text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl",
            bn
          )}
        >
          {data.title}
        </h1>

        {/* Question text */}
        {data.questionText && (
          <p
            className={cn(
              "mt-3 border-l-4 border-primary/40 bg-primary-soft/40 py-2 pl-3 pr-2 text-[15px] leading-relaxed text-foreground/80",
              bn
            )}
          >
            {data.questionText}
          </p>
        )}
      </header>

      {/* Body blocks */}
      <section className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
        {blocks.length > 0 ? (
          <div className="space-y-6">
            {blocks.map((block, i) => (
              <ResourceBlock key={i} block={block} bn={bn} />
            ))}
          </div>
        ) : (
          <p className={cn("py-6 text-center text-sm text-muted-foreground", bn)}>{S.emptyMsg}</p>
        )}
      </section>

      {/* Home link */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-soft transition-colors hover:border-primary/40 hover:text-primary",
            bn
          )}
        >
          {S.home}
          <LuChevronRight className="text-base" />
        </Link>
      </div>

      <BrandFooter label={S.poweredBy} bn={bn} />
    </Frame>
  );
}

// ------------------------------------------------------------------
// Shared page frame (narrow, mobile-first reading column).
// ------------------------------------------------------------------
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface-soft">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
    </main>
  );
}

// ------------------------------------------------------------------
// Small "Sabbir Book" brand bar shown at the top of the reading page.
// ------------------------------------------------------------------
function BrandBar({ label, bn }: { label: string; bn: string }) {
  return (
    <Link
      href="/"
      className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <LuHeartPulse className="text-base" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-heading text-[15px] font-bold text-foreground">Sabbir Book</span>
        <span className={cn("text-[11px] font-medium text-muted-foreground", bn)}>{label}</span>
      </span>
    </Link>
  );
}

// ------------------------------------------------------------------
// Footer branding.
// ------------------------------------------------------------------
function BrandFooter({ label, bn }: { label: string; bn: string }) {
  return (
    <footer className="mt-8 flex items-center justify-center gap-1.5 pb-2 text-center">
      <LuHeartPulse className="text-sm text-primary/70" />
      <Link
        href="/"
        className={cn("text-xs font-medium text-muted-foreground transition-colors hover:text-primary", bn)}
      >
        {label}
      </Link>
    </footer>
  );
}

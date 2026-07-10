"use client";

import Link from "next/link";
import { LuHouse, LuSearchX, LuRotateCw, LuStethoscope } from "react-icons/lu";
import { cn } from "@/components/ui";

// ------------------------------------------------------------------
// Loading skeleton — shimmering placeholders while /api/qr/:slug loads.
// Kept intentionally close to the real layout to avoid a jarring swap.
// ------------------------------------------------------------------
export function QrSkeleton() {
  const bar = "animate-pulse rounded-lg bg-muted";
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* header card */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex gap-4">
          <div className={cn(bar, "h-24 w-16 shrink-0 rounded-xl")} />
          <div className="flex-1 space-y-3 py-1">
            <div className={cn(bar, "h-4 w-24")} />
            <div className={cn(bar, "h-5 w-3/4")} />
            <div className={cn(bar, "h-4 w-1/2")} />
          </div>
        </div>
      </div>
      {/* body blocks */}
      <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className={cn(bar, "h-4 w-full")} />
        <div className={cn(bar, "h-4 w-11/12")} />
        <div className={cn(bar, "h-4 w-4/5")} />
        <div className={cn(bar, "h-48 w-full rounded-2xl")} />
        <div className={cn(bar, "h-4 w-full")} />
        <div className={cn(bar, "h-4 w-2/3")} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Shared empty-state shell for not-found / error.
// ------------------------------------------------------------------
function StateShell({
  icon,
  title,
  message,
  homeLabel,
  action,
  bn,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  homeLabel: string;
  action?: React.ReactNode;
  bn: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
        {icon}
      </div>
      <h1 className={cn("mt-6 font-heading text-2xl font-bold text-foreground", bn)}>{title}</h1>
      <p className={cn("mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground", bn)}>
        {message}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {action}
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-soft transition-colors hover:border-primary/40 hover:text-primary",
            bn
          )}
        >
          <LuHouse className="text-base" />
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Not-found (404 / draft / missing slug).
// ------------------------------------------------------------------
export function QrNotFound({
  title,
  message,
  homeLabel,
  bn,
}: {
  title: string;
  message: string;
  homeLabel: string;
  bn: string;
}) {
  return (
    <StateShell
      icon={<LuSearchX className="text-4xl" />}
      title={title}
      message={message}
      homeLabel={homeLabel}
      bn={bn}
    />
  );
}

// ------------------------------------------------------------------
// Error (network / server) — offers a retry.
// ------------------------------------------------------------------
export function QrError({
  title,
  message,
  retryLabel,
  homeLabel,
  onRetry,
  bn,
}: {
  title: string;
  message: string;
  retryLabel: string;
  homeLabel: string;
  onRetry: () => void;
  bn: string;
}) {
  return (
    <StateShell
      icon={<LuStethoscope className="text-4xl" />}
      title={title}
      message={message}
      homeLabel={homeLabel}
      bn={bn}
      action={
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover",
            bn
          )}
        >
          <LuRotateCw className="text-base" />
          {retryLabel}
        </button>
      }
    />
  );
}

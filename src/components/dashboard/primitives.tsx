"use client";

// Small shared building blocks for the student dashboard pages:
// page heading, stat card, and loading / empty / error states — all
// bilingual-friendly (pass the `bn` font class through `className`).
import type { ReactNode } from "react";
import Link from "next/link";
import { LuLoaderCircle, LuTriangleAlert, LuInbox } from "react-icons/lu";
import type { IconType } from "react-icons";
import { buttonVariants, cn } from "@/components/ui";

// ── Money / date helpers ────────────────────────────────────────────────────
export function formatBDT(v?: string | number | null): string {
  if (v === undefined || v === null || v === "") return "৳0";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return "৳" + n.toLocaleString("en-US");
}

export function formatDate(s?: string, bengali = false): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(bengali ? "bn-BD" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Page heading ────────────────────────────────────────────────────────────
export function PageHeading({
  icon: Icon,
  title,
  subtitle,
  bn = "",
  action,
}: {
  icon?: IconType;
  title: ReactNode;
  subtitle?: ReactNode;
  bn?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon className="text-2xl" />
          </span>
        )}
        <div>
          <h1 className={cn("font-heading text-2xl font-bold tracking-tight text-foreground", bn)}>
            {title}
          </h1>
          {subtitle && (
            <p className={cn("mt-1 text-sm text-muted-foreground", bn)}>{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  bn = "",
}: {
  icon: IconType;
  label: ReactNode;
  value: ReactNode;
  tone?: "primary" | "accent" | "coral";
  bn?: string;
}) {
  const toneCls =
    tone === "accent"
      ? "bg-accent-soft text-accent"
      : tone === "coral"
      ? "bg-coral/12 text-coral"
      : "bg-primary-soft text-primary";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", toneCls)}>
        <Icon className="text-2xl" />
      </span>
      <div className="min-w-0">
        <p className="font-heading text-2xl font-bold leading-none text-foreground">{value}</p>
        <p className={cn("mt-1.5 text-sm text-muted-foreground", bn)}>{label}</p>
      </div>
    </div>
  );
}

// ── Loading ─────────────────────────────────────────────────────────────────
export function Loader({ label, bn = "" }: { label?: ReactNode; bn?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LuLoaderCircle className="animate-spin text-3xl text-primary" />
      {label && <p className={cn("text-sm", bn)}>{label}</p>}
    </div>
  );
}

// ── Error ───────────────────────────────────────────────────────────────────
export function ErrorState({
  message,
  onRetry,
  retryLabel,
  bn = "",
}: {
  message: ReactNode;
  onRetry?: () => void;
  retryLabel?: ReactNode;
  bn?: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-coral/30 bg-coral/10 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/15 text-coral">
        <LuTriangleAlert className="text-2xl" />
      </div>
      <p className={cn("text-sm text-foreground", bn)}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-5",
            bn
          )}
        >
          {retryLabel || "Retry"}
        </button>
      )}
    </div>
  );
}

// ── Empty ───────────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon = LuInbox,
  title,
  text,
  ctaHref,
  ctaLabel,
  bn = "",
}: {
  icon?: IconType;
  title: ReactNode;
  text?: ReactNode;
  ctaHref?: string;
  ctaLabel?: ReactNode;
  bn?: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-soft">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="text-3xl" />
      </div>
      <h2 className={cn("font-heading text-xl font-bold text-foreground", bn)}>{title}</h2>
      {text && <p className={cn("mx-auto mt-2 max-w-sm text-sm text-muted-foreground", bn)}>{text}</p>}
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6", bn)}
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

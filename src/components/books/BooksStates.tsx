"use client";

import type { ReactNode } from "react";
import { LuLibrary } from "react-icons/lu";
import { cn } from "@/components/ui";

// Grid column classes shared by the real grid and its skeleton so they line up.
export const BOOK_GRID_COLS = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6";

// Single book-cover skeleton tile.
function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="aspect-[2/3] w-full animate-pulse bg-muted" />
      <div className="space-y-2.5 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-2/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function BooksSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className={BOOK_GRID_COLS}>
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Friendly empty / no-results state.
export function BooksEmptyState({
  title,
  text,
  action,
  icon,
  bn = "",
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: ReactNode;
  bn?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon ?? <LuLibrary className="text-2xl" />}
      </div>
      <h3 className={cn("font-heading text-lg font-semibold text-foreground", bn)}>{title}</h3>
      <p className={cn("mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground", bn)}>{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

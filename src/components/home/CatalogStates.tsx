import type { ReactNode } from "react";
import { LuInbox } from "react-icons/lu";
import { cn } from "@/components/ui";

// Graceful empty state for the Featured Courses / Books grids.
export function EmptyState({
  icon,
  title,
  text,
  bn = "",
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  bn?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        {icon ?? <LuInbox className="text-2xl" />}
      </div>
      <h3 className={cn("font-heading text-lg font-semibold text-foreground", bn)}>{title}</h3>
      <p className={cn("mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground", bn)}>{text}</p>
    </div>
  );
}

// Loading skeleton tile — `ratio` controls the media aspect (video vs. book cover).
export function CardSkeleton({ ratio = "video" }: { ratio?: "video" | "cover" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className={cn("w-full animate-pulse bg-muted", ratio === "video" ? "aspect-video" : "aspect-[2/3]")} />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, ratio = "video" }: { count?: number; ratio?: "video" | "cover" }) {
  return (
    <div
      className={cn(
        "grid gap-6",
        ratio === "video"
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} ratio={ratio} />
      ))}
    </div>
  );
}

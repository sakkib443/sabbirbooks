"use client";

// Small presentational primitives shared across admin pages:
// loading / empty / error states, a page header, and a status badge.
import type { ReactNode } from "react";
import { LuLoaderCircle, LuInbox, LuTriangleAlert, LuRotateCw } from "react-icons/lu";
import { Badge, Button, cn } from "@/components/ui";
import { statusVariant, prettyLabel } from "./helpers";

export function Spinner({ className }: { className?: string }) {
  return <LuLoaderCircle className={cn("animate-spin", className)} />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
      <Spinner className="text-3xl text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-2xl text-primary">
        {icon ?? <LuInbox />}
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-coral/12 text-2xl text-coral">
        <LuTriangleAlert />
      </div>
      <div>
        <p className="font-semibold text-foreground">Something went wrong</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {message || "Failed to load data. Please try again."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <LuRotateCw /> Retry
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Status pill that colour-maps common publish / order / message statuses.
export function StatusBadge({ status }: { status?: string }) {
  return <Badge variant={statusVariant(status)}>{prettyLabel(status)}</Badge>;
}

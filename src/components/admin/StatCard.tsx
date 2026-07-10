"use client";

import type { ReactNode } from "react";
import { Card, cn } from "@/components/ui";
import { Spinner } from "./primitives";

// Compact metric tile for the Overview dashboard.
export function StatCard({
  label,
  value,
  icon,
  hint,
  loading = false,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  loading?: boolean;
  tone?: "primary" | "accent" | "secondary" | "coral";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent",
    secondary: "bg-secondary/10 text-secondary",
    coral: "bg-coral/12 text-coral",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="mt-2 font-heading text-2xl font-bold text-foreground">
            {loading ? <Spinner className="text-xl text-muted-foreground" /> : value}
          </div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
              tones[tone]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default StatCard;

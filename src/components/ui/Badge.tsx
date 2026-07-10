import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type BadgeVariant = "primary" | "accent" | "secondary" | "coral" | "outline" | "muted";

const badgeVariants: Record<BadgeVariant, string> = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  secondary: "bg-secondary/10 text-secondary",
  coral: "bg-coral/12 text-coral",
  outline: "border border-border text-muted-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({
  className,
  variant = "primary",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export default Badge;

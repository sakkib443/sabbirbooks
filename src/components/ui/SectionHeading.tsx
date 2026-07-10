import type { ReactNode } from "react";
import { cn } from "./cn";

// Consistent eyebrow + title + subtitle block for section tops.
// Pass `bengali` to switch to the Hind Siliguri face for Bangla copy.
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  bengali = false,
  icon,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  bengali?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const bn = bengali ? "hind-siliguri" : "";
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow && (
        <div className={cn("mb-3 inline-flex items-center gap-2", align === "center" && "justify-center")}>
          <span className="h-px w-6 bg-primary/50" />
          {icon && <span className="text-primary">{icon}</span>}
          <span className={cn("text-xs font-bold uppercase tracking-[0.16em] text-primary", bn)}>
            {eyebrow}
          </span>
          <span className="h-px w-6 bg-primary/50" />
        </div>
      )}
      <h2
        className={cn(
          "font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl",
          bn
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-3.5 leading-relaxed text-muted-foreground", bn)}>{subtitle}</p>
      )}
    </div>
  );
}

export default SectionHeading;

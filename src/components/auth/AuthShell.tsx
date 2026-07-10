"use client";

import type { ReactNode } from "react";
import { LuActivity } from "react-icons/lu";
import { Container, cn } from "@/components/ui";

interface AuthShellProps {
  bengali?: boolean;
  brand?: string; // small brand line above the title
  eyebrow?: string; // pill above the heading
  title: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode; // the form / card body
  footer?: ReactNode; // below-card content (e.g. link to the other page)
}

// Centered, medical-themed layout used by both the login and register pages.
export function AuthShell({
  bengali,
  brand = "Sabbir Book",
  eyebrow,
  title,
  subtitle,
  icon,
  children,
  footer,
}: AuthShellProps) {
  const bn = bengali ? "hind-siliguri" : "";
  return (
    <main className="relative overflow-hidden bg-medical-mesh">
      {/* subtle grid + soft color blooms for a clinical, trustworthy feel */}
      <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <Container className="relative flex min-h-[85vh] items-center justify-center py-14 sm:py-16">
        <div className="w-full max-w-md">
          {/* Brand + heading */}
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
              {icon ?? <LuActivity className="text-2xl" />}
            </span>
            <span className={cn("text-sm font-semibold tracking-wide text-primary", bn)}>{brand}</span>
            {eyebrow && (
              <span
                className={cn(
                  "mt-3 inline-flex items-center rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary",
                  bn
                )}
              >
                {eyebrow}
              </span>
            )}
            <h1 className={cn("mt-3 font-heading text-2xl font-bold text-foreground sm:text-3xl", bn)}>
              {title}
            </h1>
            {subtitle && (
              <p className={cn("mt-2 max-w-sm text-sm text-muted-foreground", bn)}>{subtitle}</p>
            )}
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
            {children}
          </div>

          {footer && (
            <div className={cn("mt-6 text-center text-sm text-muted-foreground", bn)}>{footer}</div>
          )}
        </div>
      </Container>
    </main>
  );
}

export default AuthShell;

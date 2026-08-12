"use client";

/**
 * The first payment decision: pay now, or pay the courier on delivery.
 *
 * Kept separate from PaymentMethod (which picks *which wallet*) because they are
 * different questions — choosing bKash over Nagad only matters once "pay now"
 * has been chosen at all. Cash on delivery is the option most Bangladeshi buyers
 * reach for first, so it is shown as a peer of online payment rather than buried
 * as a footnote.
 */

import { LuBanknote, LuCheck, LuSmartphone } from "react-icons/lu";
import { cn } from "@/components/ui";
import type { PayMode } from "./types";

interface Labels {
  heading: string;
  subtitle: string;
  codTitle: string;
  codText: string;
  onlineTitle: string;
  onlineText: string;
  codUnavailable: string;
}

export function PayModeSelector({
  value,
  onChange,
  codAllowed,
  onlineAllowed,
  disabled,
  codReason,
  bn,
  S,
}: {
  value: PayMode;
  onChange: (m: PayMode) => void;
  codAllowed: boolean;
  onlineAllowed: boolean;
  disabled?: boolean;
  // Why COD is off, when it is — e.g. a digital book has no parcel to hand over.
  codReason?: string;
  bn: string;
  S: Labels;
}) {
  const options: {
    id: PayMode;
    title: string;
    text: string;
    icon: React.ReactNode;
    enabled: boolean;
    reason?: string;
  }[] = [
    {
      id: "cod",
      title: S.codTitle,
      text: S.codText,
      icon: <LuBanknote className="text-xl" />,
      enabled: codAllowed,
      reason: codReason || S.codUnavailable,
    },
    {
      id: "online",
      title: S.onlineTitle,
      text: S.onlineText,
      icon: <LuSmartphone className="text-xl" />,
      enabled: onlineAllowed,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
      <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={S.heading}>
        {options.map((opt) => {
          const active = value === opt.id && opt.enabled;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled || !opt.enabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-primary bg-primary-soft/60 ring-2 ring-primary/25"
                  : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/30",
                (disabled || !opt.enabled) && "cursor-not-allowed opacity-55 hover:border-border hover:bg-background"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
                )}
              >
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold text-foreground", bn)}>{opt.title}</span>
                <span className={cn("mt-0.5 block text-xs leading-relaxed text-muted-foreground", bn)}>
                  {opt.enabled ? opt.text : opt.reason}
                </span>
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {active && <LuCheck className="text-xs" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PayModeSelector;

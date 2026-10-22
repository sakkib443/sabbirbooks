"use client";

/**
 * Pay the courier, or pay now — two tabs side by side (22 Oct 2026: the shop
 * asked for a short checkout). The whole tab is the button; no heading, no
 * "how it works" text. The extra for paying now (when an online offer runs)
 * sits on its tab, where it is read while the choice is being made.
 */

import { LuBanknote, LuZap } from "react-icons/lu";
import { cn } from "@/components/ui";
import type { PayMode } from "./types";

interface Labels {
  heading: string;
  codTitle: string;
  gatewayTitle: string;
  codUnavailable: string;
}

export function PayModeSelector({
  value,
  onChange,
  codAllowed,
  gatewayAllowed,
  onlineOfferLine,
  disabled,
  codReason,
  bn,
  S,
}: {
  value: PayMode;
  onChange: (m: PayMode) => void;
  codAllowed: boolean;
  /** Hosted checkout — only ever true once the server holds real credentials. */
  gatewayAllowed: boolean;
  /** "৳20 off" / "5% off" for paying now; absent when no online offer runs. */
  onlineOfferLine?: string;
  disabled?: boolean;
  // Why COD is off, when it is — e.g. a digital book has no parcel to hand over.
  codReason?: string;
  bn: string;
  S: Labels;
}) {
  const options = [
    { id: "cod" as PayMode, title: S.codTitle, icon: <LuBanknote />, enabled: codAllowed, note: codAllowed ? "" : codReason || S.codUnavailable },
    // Only shown when a gateway is configured: a "pay now" the shop cannot
    // honour is worse than not offering it.
    ...(gatewayAllowed
      ? [{ id: "gateway" as PayMode, title: S.gatewayTitle, icon: <LuZap />, enabled: true, note: onlineOfferLine || "" }]
      : []),
  ];

  return (
    <div
      className={cn("grid gap-2", options.length > 1 ? "grid-cols-2" : "grid-cols-1")}
      role="radiogroup"
      aria-label={S.heading}
    >
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
              "flex min-h-[46px] flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 text-center transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary-soft/40",
              (disabled || !opt.enabled) && "cursor-not-allowed opacity-55 hover:border-border hover:bg-card",
              bn
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-bold leading-tight">
              {opt.icon} {opt.title}
            </span>
            {opt.note && (
              <span
                className={cn(
                  "mt-0.5 text-[11px] font-semibold leading-none",
                  active ? "text-primary-foreground/90" : "text-accent"
                )}
              >
                {opt.note}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PayModeSelector;

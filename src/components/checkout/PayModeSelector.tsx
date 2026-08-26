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

import { LuBanknote, LuCheck, LuInfo, LuZap } from "react-icons/lu";
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
  gatewayTitle: string;
  gatewayText: string;
  gatewayBadge: string;
}

export function PayModeSelector({
  value,
  onChange,
  codAllowed,
  onlineAllowed,
  gatewayAllowed,
  disabled,
  codReason,
  bn,
  S,
}: {
  value: PayMode;
  onChange: (m: PayMode) => void;
  codAllowed: boolean;
  onlineAllowed: boolean;
  /** Hosted checkout — only ever true once the server holds real credentials. */
  gatewayAllowed: boolean;
  disabled?: boolean;
  // Why COD is off, when it is — e.g. a digital book has no parcel to hand over.
  codReason?: string;
  bn: string;
  S: Labels;
}) {
  // Two ways to pay: cash on delivery, or the hosted gateway (bKash / cards /
  // Nagad, all on SSLCommerz's own secure page). The old manual "Send Money"
  // option is retired — the gateway covers the same wallets without the buyer
  // copying a transaction id, and without an admin verifying it by hand.
  void onlineAllowed;
  const options: {
    id: PayMode;
    title: string;
    text: string;
    icon: React.ReactNode;
    enabled: boolean;
    reason?: string;
    badge?: string;
    info?: string;
  }[] = [
    {
      id: "cod",
      title: S.codTitle,
      text: S.codText,
      icon: <LuBanknote className="text-xl" />,
      enabled: codAllowed,
      reason: codReason || S.codUnavailable,
    },
    // Only rendered at all when a gateway is configured. With no credentials the
    // card is absent rather than present-and-disabled: a greyed-out "pay
    // instantly" the shop cannot honour is worse than not mentioning it.
    ...(gatewayAllowed
      ? [
          {
            id: "gateway" as PayMode,
            title: S.gatewayTitle,
            text: S.gatewayText,
            icon: <LuZap className="text-xl" />,
            enabled: true,
            badge: S.gatewayBadge,
            info: S.gatewayText,
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
      <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>

      <div
        className={cn("mt-4 grid gap-3", options.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2")}
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
                <span className={cn("flex flex-wrap items-center gap-1.5 font-semibold text-foreground", bn)}>
                  {opt.title}
                  {opt.info && (
                    <span
                      title={opt.info}
                      className="inline-flex text-muted-foreground/80 transition-colors hover:text-primary"
                      aria-label={opt.info}
                    >
                      <LuInfo className="text-sm" />
                    </span>
                  )}
                  {opt.badge && (
                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {opt.badge}
                    </span>
                  )}
                </span>
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

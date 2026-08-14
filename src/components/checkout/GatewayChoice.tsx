"use client";

/**
 * Which hosted checkout to open, when the shop has more than one switched on.
 *
 * Renders nothing at all unless there is a genuine choice to make. Most shops run
 * one gateway, and a radio group with a single option is just a control that
 * cannot be operated — the caller falls back to `preferredGateway()` in that case
 * and the buyer is never asked a question with one answer.
 */

import { LuCheck, LuShieldCheck } from "react-icons/lu";
import { cn } from "@/components/ui";
import type { GatewayId } from "./paymentOptions";

interface Labels {
  heading: string;
  subtitle: string;
  bkash: string;
  bkashText: string;
  sslcommerz: string;
  sslcommerzText: string;
  sandboxNote: string;
}

export function GatewayChoice({
  value,
  onChange,
  options,
  /** Any chosen gateway is pointed at its sandbox — test money, not real money. */
  sandbox,
  disabled,
  bn,
  S,
}: {
  value: GatewayId;
  onChange: (g: GatewayId) => void;
  options: GatewayId[];
  sandbox?: boolean;
  disabled?: boolean;
  bn: string;
  S: Labels;
}) {
  if (options.length < 2) return null;

  const meta: Record<GatewayId, { title: string; text: string }> = {
    bkash: { title: S.bkash, text: S.bkashText },
    sslcommerz: { title: S.sslcommerz, text: S.sslcommerzText },
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
      <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={S.heading}>
        {options.map((id) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-primary bg-primary-soft/60 ring-2 ring-primary/25"
                  : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/30",
                disabled && "cursor-not-allowed opacity-55"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold text-foreground", bn)}>{meta[id].title}</span>
                <span className={cn("mt-0.5 block text-xs leading-relaxed text-muted-foreground", bn)}>
                  {meta[id].text}
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

      {sandbox && (
        <p className={cn("mt-3 flex items-center gap-1.5 text-xs text-muted-foreground", bn)}>
          <LuShieldCheck className="shrink-0 text-accent" /> {S.sandboxNote}
        </p>
      )}
    </div>
  );
}

export default GatewayChoice;

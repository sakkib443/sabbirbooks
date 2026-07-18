"use client";

import { LuSmartphone, LuCheck } from "react-icons/lu";
import { cn } from "@/components/ui";
import { MANUAL_CHANNELS, type ManualChannel } from "./types";

interface Labels {
  heading: string;
  subtitle: string;
  channelName: (id: ManualChannel) => string;
}

// Manual mobile-wallet selector. Only channels the admin has configured a
// receiving number for are shown (passed in via `available`).
export function PaymentMethod({
  value,
  onChange,
  available,
  disabled,
  bn,
  S,
}: {
  value: ManualChannel;
  onChange: (m: ManualChannel) => void;
  available: ManualChannel[];
  disabled?: boolean;
  bn: string;
  S: Labels;
}) {
  const options = MANUAL_CHANNELS.filter((c) => available.includes(c.id));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
      <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={S.heading}>
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-primary bg-primary-soft/60 ring-2 ring-primary/25"
                  : "border-border bg-background hover:border-primary/40 hover:bg-primary-soft/30",
                disabled && "cursor-not-allowed opacity-55"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
                )}
              >
                <LuSmartphone className="text-xl" />
              </span>
              <span className={cn("min-w-0 flex-1 font-semibold text-foreground", bn)}>
                {S.channelName(opt.id)}
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
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

export default PaymentMethod;

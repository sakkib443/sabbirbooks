"use client";

import { LuSmartphone, LuCreditCard, LuCheck } from "react-icons/lu";
import { Badge, cn } from "@/components/ui";
import type { PaymentMethod as Method } from "./types";

interface Labels {
  heading: string;
  subtitle: string;
  bkash: string;
  bkashDesc: string;
  sslcommerz: string;
  sslDesc: string;
  demo: string;
}

const OPTIONS: { id: Method; icon: React.ReactNode }[] = [
  { id: "bkash", icon: <LuSmartphone className="text-xl" /> },
  { id: "sslcommerz", icon: <LuCreditCard className="text-xl" /> },
];

export function PaymentMethod({
  value,
  onChange,
  disabled,
  bn,
  S,
}: {
  value: Method;
  onChange: (m: Method) => void;
  disabled?: boolean;
  bn: string;
  S: Labels;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
      <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={S.heading}>
        {OPTIONS.map((opt) => {
          const active = value === opt.id;
          const label = opt.id === "bkash" ? S.bkash : S.sslcommerz;
          const desc = opt.id === "bkash" ? S.bkashDesc : S.sslDesc;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              className={cn(
                "group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
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
                {opt.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn("font-semibold text-foreground", bn)}>{label}</span>
                  <Badge variant="muted" className="px-2 py-0.5 text-[10px]">
                    {S.demo}
                  </Badge>
                </span>
                <span className={cn("mt-0.5 block text-xs text-muted-foreground", bn)}>{desc}</span>
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

"use client";

import { useState } from "react";
import { LuCopy, LuCheck, LuHash, LuPhone, LuClock, LuNotebookPen, LuInfo } from "react-icons/lu";
import { Input, cn } from "@/components/ui";
import type { ManualChannel, ManualDetails } from "./types";

export interface ManualLabels {
  heading: string;
  subtitle: string;
  sendTo: (channel: string) => string;
  copy: string;
  copied: string;
  txnId: string;
  txnIdPh: string;
  senderNumber: string;
  senderNumberPh: string;
  sentAt: string;
  note: string;
  notePh: string;
  optional: string;
  channelName: (id: ManualChannel) => string;
}

type ManualErrors = Partial<Record<"transactionId" | "senderNumber" | "sentAt", string>>;

// The buyer-facing manual-payment panel: shows the admin's receiving number for
// the chosen wallet, then collects the Send-Money proof (txn id + sender no. + time).
export function ManualPaymentDetails({
  channel,
  receivingNumber,
  instructions,
  details,
  onChange,
  errors,
  disabled,
  bn,
  S,
}: {
  channel: ManualChannel;
  receivingNumber: string;
  instructions?: string;
  details: ManualDetails;
  onChange: (patch: Partial<ManualDetails>) => void;
  errors: ManualErrors;
  disabled?: boolean;
  bn: string;
  S: ManualLabels;
}) {
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(receivingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
      <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>

      {/* Receiving number */}
      <div className="mt-4 rounded-xl border border-primary/25 bg-primary-soft/40 p-4">
        <p className={cn("text-xs font-semibold uppercase tracking-wide text-primary", bn)}>
          {S.sendTo(S.channelName(channel))}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="font-mono text-xl font-bold tracking-wide text-foreground">
            {receivingNumber || "—"}
          </span>
          <button
            type="button"
            onClick={copyNumber}
            disabled={!receivingNumber}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-background px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50",
              bn
            )}
          >
            {copied ? <LuCheck /> : <LuCopy />}
            {copied ? S.copied : S.copy}
          </button>
        </div>
        {instructions && (
          <p className={cn("mt-2 flex items-start gap-1.5 text-xs text-muted-foreground", bn)}>
            <LuInfo className="mt-0.5 shrink-0 text-primary" />
            {instructions}
          </p>
        )}
      </div>

      {/* Proof form */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field bn={bn} label={S.txnId} icon={<LuHash />} error={errors.transactionId}>
            <Input
              placeholder={S.txnIdPh}
              value={details.transactionId}
              disabled={disabled}
              aria-invalid={!!errors.transactionId}
              onChange={(e) => onChange({ transactionId: e.target.value })}
            />
          </Field>
        </div>
        <Field bn={bn} label={S.senderNumber} icon={<LuPhone />} error={errors.senderNumber}>
          <Input
            placeholder={S.senderNumberPh}
            type="tel"
            inputMode="tel"
            value={details.senderNumber}
            disabled={disabled}
            aria-invalid={!!errors.senderNumber}
            onChange={(e) => onChange({ senderNumber: e.target.value })}
          />
        </Field>
        <Field bn={bn} label={S.sentAt} icon={<LuClock />} error={errors.sentAt}>
          <Input
            type="datetime-local"
            value={details.sentAt}
            disabled={disabled}
            aria-invalid={!!errors.sentAt}
            onChange={(e) => onChange({ sentAt: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field bn={bn} label={`${S.note} · ${S.optional}`} icon={<LuNotebookPen />}>
            <Input
              placeholder={S.notePh}
              value={details.note ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ note: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  error,
  bn,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  bn: string;
}) {
  return (
    <label className="block">
      <span className={cn("mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground", bn)}>
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      {children}
      {error && <span className={cn("mt-1 block text-xs text-coral", bn)}>{error}</span>}
    </label>
  );
}

export default ManualPaymentDetails;

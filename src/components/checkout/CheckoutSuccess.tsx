"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LuCircleCheckBig,
  LuDownload,
  LuTruck,
  LuGraduationCap,
  LuArrowRight,
  LuLoaderCircle,
  LuTriangleAlert,
  LuReceipt,
  LuClock,
  LuHash,
} from "react-icons/lu";
import { Button, buttonVariants, cn } from "@/components/ui";
import { fetchDownloadUrl } from "./checkoutApi";
import { ManualChannel, OrderResult, SuccessResult, formatTk } from "./types";

interface Labels {
  bn: string;
  title: string;
  courseSub: string;
  bookDigitalSub: string;
  bookPrintedSub: string;
  refLabel: string;
  orderLabel: string;
  paidLabel: string;
  methodLabel: string;
  statusLabel: string;
  download: string;
  downloading: string;
  downloadReady: string;
  goToCourses: string;
  shippingNote: string;
  continueCourses: string;
  continueBooks: string;
  downloadErr: string;
  network: string;
  // Pending (manual payment awaiting verification)
  pendingTitle: string;
  pendingCourseSub: string;
  pendingBookDigitalSub: string;
  pendingBookPrintedSub: string;
  pendingRefLabel: string;
  pendingChannelLabel: string;
  pendingStatusLabel: string;
  pendingStatusValue: string;
  viewMyOrders: string;
  amountLabel: string;
  channelName: (id: ManualChannel) => string;
  methodNames: Record<string, string>;
}

export function CheckoutSuccess({ result, L }: { result: SuccessResult; L: Labels }) {
  const bn = L.bn;

  // Manual payment → pending verification screen (distinct from the paid flow).
  if (result.kind === "manual") {
    return <PendingBody result={result} L={L} />;
  }

  const subtitle =
    result.kind === "course"
      ? L.courseSub
      : result.order.deliveryType === "digital"
        ? L.bookDigitalSub
        : L.bookPrintedSub;

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <LuCircleCheckBig className="text-3xl" />
        </div>
        <h1 className={cn("font-heading text-2xl font-bold text-foreground sm:text-3xl", bn)}>
          {L.title}
        </h1>
        <p className={cn("mx-auto mt-2 max-w-md text-muted-foreground", bn)}>{subtitle}</p>

        {result.kind === "course" ? (
          <CourseBody result={result} L={L} />
        ) : (
          <BookBody order={result.order} L={L} />
        )}
      </div>
    </div>
  );
}

// ── Pending body (manual payment awaiting admin verification) ────────────────
function PendingBody({
  result,
  L,
}: {
  result: Extract<SuccessResult, { kind: "manual" }>;
  L: Labels;
}) {
  const bn = L.bn;
  const subtitle =
    result.itemKind === "course"
      ? L.pendingCourseSub
      : result.isPrintedBook
        ? L.pendingBookPrintedSub
        : L.pendingBookDigitalSub;
  const continueHref = result.itemKind === "course" ? "/courses" : "/books";
  const continueLabel = result.itemKind === "course" ? L.continueCourses : L.continueBooks;
  const myHref = result.itemKind === "course" ? "/dashboard/user/payments" : "/dashboard/user";

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LuClock className="text-3xl" />
        </div>
        <h1 className={cn("font-heading text-2xl font-bold text-foreground sm:text-3xl", bn)}>
          {L.pendingTitle}
        </h1>
        <p className={cn("mx-auto mt-2 max-w-md text-muted-foreground", bn)}>{subtitle}</p>

        <div className="mt-6 rounded-xl border border-border bg-surface-soft p-4 text-left">
          <Row bn={bn} icon={<LuHash />} label={result.title} value="" isTitle />
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <Row bn={bn} icon={<LuReceipt />} label={L.pendingRefLabel} value={result.reference} mono />
            <Row bn={bn} label={L.pendingChannelLabel} value={L.channelName(result.channel)} />
            <Row bn={bn} label={L.amountLabel} value={formatTk(result.amount)} strong />
            <Row bn={bn} label={L.pendingStatusLabel} value={L.pendingStatusValue} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={myHref}
            className={cn(buttonVariants({ variant: "accent", size: "lg" }), "flex-1", bn)}
          >
            <LuReceipt /> {L.viewMyOrders}
          </Link>
          <Link
            href={continueHref}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1", bn)}
          >
            {continueLabel} <LuArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Course success body ─────────────────────────────────────────────────────
function CourseBody({
  result,
  L,
}: {
  result: Extract<SuccessResult, { kind: "course" }>;
  L: Labels;
}) {
  const bn = L.bn;
  return (
    <>
      <div className="mt-6 rounded-xl border border-border bg-surface-soft p-4 text-left">
        <Row bn={bn} icon={<LuGraduationCap />} label={result.courseTitle} value="" isTitle />
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <Row bn={bn} icon={<LuReceipt />} label={L.refLabel} value={result.reference} mono />
          {result.method !== "free" && (
            <>
              <Row bn={bn} label={L.methodLabel} value={L.methodNames[result.method] ?? result.method} />
              <Row bn={bn} label={L.paidLabel} value={formatTk(result.amount)} strong />
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "accent", size: "lg" }), "flex-1", bn)}
        >
          <LuGraduationCap /> {L.goToCourses}
        </Link>
        <Link
          href="/courses"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1", bn)}
        >
          {L.continueCourses} <LuArrowRight />
        </Link>
      </div>
    </>
  );
}

// ── Book success body ────────────────────────────────────────────────────────
function BookBody({ order, L }: { order: OrderResult; L: Labels }) {
  const bn = L.bn;
  const isDigital = order.deliveryType === "digital";
  const digitalItem = order.items.find((it) => it.format === "digital");

  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");

  const onDownload = async () => {
    if (!digitalItem) return;
    setDlError("");
    setDownloading(true);
    try {
      const { secureFileUrl } = await fetchDownloadUrl(order._id, digitalItem.book, L.downloadErr);
      window.open(secureFileUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : L.downloadErr;
      setDlError(msg === "__NETWORK__" ? L.network : msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="mt-6 rounded-xl border border-border bg-surface-soft p-4 text-left">
        <Row bn={bn} label={L.orderLabel} value={order.orderNumber} mono />
        <div className="mt-2 space-y-2">
          <Row bn={bn} label={L.paidLabel} value={formatTk(order.total)} strong />
          {order.payment?.method && (
            <Row
              bn={bn}
              label={L.methodLabel}
              value={L.methodNames[order.payment.method] ?? order.payment.method}
            />
          )}
          <Row bn={bn} label={L.statusLabel} value={humanStatus(order.status, L)} />
        </div>
      </div>

      {isDigital ? (
        <div className="mt-6">
          <Button size="lg" variant="primary" className="w-full" disabled={downloading} onClick={onDownload}>
            {downloading ? (
              <>
                <LuLoaderCircle className="animate-spin text-lg" /> {L.downloading}
              </>
            ) : (
              <>
                <LuDownload className="text-lg" /> {L.download}
              </>
            )}
          </Button>
          <p className={cn("mt-2 text-center text-xs text-muted-foreground", bn)}>{L.downloadReady}</p>
          {dlError && (
            <p
              role="alert"
              className={cn(
                "mt-3 flex items-center justify-center gap-2 rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral",
                bn
              )}
            >
              <LuTriangleAlert className="shrink-0" /> {dlError}
            </p>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "mt-6 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary-soft/50 p-4 text-left",
            bn
          )}
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LuTruck />
          </span>
          <p className="text-sm text-foreground">{L.shippingNote}</p>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/books"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full", bn)}
        >
          {L.continueBooks} <LuArrowRight />
        </Link>
      </div>
    </>
  );
}

function humanStatus(status: string, L: Labels): string {
  return L.methodNames[`status_${status}`] ?? status;
}

function Row({
  label,
  value,
  icon,
  bn,
  mono,
  strong,
  isTitle,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  bn: string;
  mono?: boolean;
  strong?: boolean;
  isTitle?: boolean;
}) {
  if (isTitle) {
    return (
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            {icon}
          </span>
        )}
        <span className={cn("font-semibold text-foreground", bn)}>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", bn)}>
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </span>
      <span
        className={cn(
          "text-right text-foreground",
          mono && "font-mono text-xs",
          strong ? "font-bold text-primary" : "font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default CheckoutSuccess;

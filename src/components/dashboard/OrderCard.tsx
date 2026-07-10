"use client";

// A single book order card. Renders the order number, items, totals and
// payment/fulfillment status. Digital items on a PAID order get a Download
// button (GET /api/orders/:id/download/:bookId → { title, secureFileUrl });
// printed items show the shipping status + address.
import { useState } from "react";
import {
  LuPackage,
  LuDownload,
  LuBookOpen,
  LuFileDown,
  LuTruck,
  LuMapPin,
  LuLoaderCircle,
  LuTriangleAlert,
  LuCircleCheck,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Badge, Button, cn } from "@/components/ui";
import { dashRequest, type DashOrder } from "./dashboardApi";
import { formatBDT, formatDate } from "./primitives";

type Tone = "primary" | "accent" | "coral" | "secondary" | "outline" | "muted";

function orderStatusMeta(
  status: string,
  isBengali: boolean
): { label: string; tone: Tone; icon: IconType } {
  switch (status) {
    case "pending":
      return { label: isBengali ? "পেমেন্টের অপেক্ষায়" : "Awaiting payment", tone: "coral", icon: LuTriangleAlert };
    case "paid":
      return { label: isBengali ? "পরিশোধিত" : "Paid", tone: "accent", icon: LuCircleCheck };
    case "processing":
      return { label: isBengali ? "প্রক্রিয়াধীন" : "Processing", tone: "primary", icon: LuPackage };
    case "shipped":
      return { label: isBengali ? "পাঠানো হয়েছে" : "Shipped", tone: "primary", icon: LuTruck };
    case "delivered":
      return { label: isBengali ? "ডেলিভারি সম্পন্ন" : "Delivered", tone: "accent", icon: LuCircleCheck };
    case "access-granted":
      return { label: isBengali ? "অ্যাক্সেস চালু" : "Access granted", tone: "accent", icon: LuCircleCheck };
    case "cancelled":
      return { label: isBengali ? "বাতিল" : "Cancelled", tone: "muted", icon: LuTriangleAlert };
    default:
      return { label: status, tone: "muted", icon: LuPackage };
  }
}

export default function OrderCard({
  order,
  isBengali,
}: {
  order: DashOrder;
  isBengali: boolean;
}) {
  const bn = isBengali ? "hind-siliguri" : "";
  const [busyBook, setBusyBook] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const S = isBengali
    ? {
        order: "অর্ডার",
        digital: "ডিজিটাল",
        printed: "ছাপা বই",
        qty: "পরিমাণ",
        download: "ডাউনলোড",
        downloading: "প্রস্তুত হচ্ছে...",
        payMethod: "পেমেন্ট",
        total: "মোট",
        subtotal: "সাবটোটাল",
        discount: "ছাড়",
        shipTo: "ডেলিভারি ঠিকানা",
        paidBadge: "পরিশোধিত",
        unpaidBadge: "অপরিশোধিত",
        dlErr: "ডাউনলোড লিংক পাওয়া যায়নি।",
        dlNetErr: "সার্ভারে সংযোগ করা যায়নি।",
        notPaidYet: "পেমেন্ট সম্পন্ন হলে ডাউনলোড করা যাবে।",
      }
    : {
        order: "Order",
        digital: "Digital",
        printed: "Printed",
        qty: "Qty",
        download: "Download",
        downloading: "Preparing...",
        payMethod: "Payment",
        total: "Total",
        subtotal: "Subtotal",
        discount: "Discount",
        shipTo: "Ship to",
        paidBadge: "Paid",
        unpaidBadge: "Unpaid",
        dlErr: "Could not get the download link.",
        dlNetErr: "Could not reach the server.",
        notPaidYet: "Download unlocks once payment is complete.",
      };

  const meta = orderStatusMeta(order.status, isBengali);
  const isPaid = order.payment?.status === "paid";
  const hasPrinted = order.items.some((it) => it.format === "printed");

  const handleDownload = async (bookId: string) => {
    setError(null);
    setBusyBook(bookId);
    const res = await dashRequest<{ title: string; secureFileUrl: string }>(
      `/orders/${order._id}/download/${bookId}`
    );
    setBusyBook(null);
    if (res.message === "__NETWORK__") {
      setError(S.dlNetErr);
      return;
    }
    if (!res.ok || !res.data?.secureFileUrl) {
      setError(res.message || S.dlErr);
      return;
    }
    window.open(res.data.secureFileUrl, "_blank", "noopener,noreferrer");
  };

  const MetaIcon = meta.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-soft/50 px-5 py-4">
        <div className="min-w-0">
          <p className={cn("text-xs font-medium uppercase tracking-wide text-muted-foreground", bn)}>
            {S.order}
          </p>
          <p className="font-mono text-sm font-bold text-foreground">{order.orderNumber}</p>
          <p className={cn("mt-0.5 text-xs text-muted-foreground", bn)}>
            {formatDate(order.createdAt, isBengali)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={meta.tone} className={bn}>
            <MetaIcon className="text-sm" /> {meta.label}
          </Badge>
          <Badge variant={isPaid ? "accent" : "outline"} className={bn}>
            {isPaid ? S.paidBadge : S.unpaidBadge}
          </Badge>
        </div>
      </div>

      {/* Items */}
      <ul className="divide-y divide-border">
        {order.items.map((it, i) => {
          const isDigital = it.format === "digital";
          const canDownload = isDigital && isPaid;
          const busy = busyBook === it.book;
          return (
            <li key={`${it.book}-${i}`} className="flex items-center gap-4 px-5 py-4">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  isDigital ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                )}
              >
                {isDigital ? <LuFileDown className="text-xl" /> : <LuBookOpen className="text-xl" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-semibold text-foreground", bn)}>{it.title}</p>
                <p className={cn("mt-0.5 text-xs text-muted-foreground", bn)}>
                  <span className="capitalize">{isDigital ? S.digital : S.printed}</span>
                  {" · "}
                  {S.qty} {it.quantity} · {formatBDT(it.price)}
                </p>
              </div>
              {isDigital &&
                (canDownload ? (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleDownload(it.book)}
                    disabled={busy}
                    className={bn}
                  >
                    {busy ? <LuLoaderCircle className="animate-spin" /> : <LuDownload />}
                    <span className="hidden sm:inline">{busy ? S.downloading : S.download}</span>
                  </Button>
                ) : (
                  <span className={cn("hidden max-w-[9rem] text-right text-xs text-muted-foreground sm:block", bn)}>
                    {S.notPaidYet}
                  </span>
                ))}
            </li>
          );
        })}
      </ul>

      {/* Download error */}
      {error && (
        <div className={cn("mx-5 mb-4 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral", bn)}>
          <LuTriangleAlert className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Shipping (printed) */}
      {hasPrinted && order.shippingAddress && (
        <div className="border-t border-border px-5 py-4">
          <p className={cn("mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", bn)}>
            <LuMapPin className="text-sm text-primary" /> {S.shipTo}
          </p>
          <p className={cn("text-sm text-foreground", bn)}>
            {order.shippingAddress.name}
            {order.shippingAddress.phone ? ` · ${order.shippingAddress.phone}` : ""}
          </p>
          <p className={cn("text-sm text-muted-foreground", bn)}>
            {[order.shippingAddress.address, order.shippingAddress.city].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* Totals */}
      <div className="border-t border-border bg-surface-soft/40 px-5 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className={cn("text-muted-foreground", bn)}>{S.subtotal}</span>
          <span className="text-foreground">{formatBDT(order.subtotal)}</span>
        </div>
        {order.discount ? (
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className={cn("text-muted-foreground", bn)}>{S.discount}</span>
            <span className="text-accent">-{formatBDT(order.discount)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className={cn("text-sm font-semibold text-foreground", bn)}>{S.total}</span>
          <span className="font-heading text-lg font-bold text-primary">{formatBDT(order.total)}</span>
        </div>
        {order.payment?.method && (
          <p className={cn("mt-1 text-right text-xs capitalize text-muted-foreground", bn)}>
            {S.payMethod}: {order.payment.method}
          </p>
        )}
      </div>
    </div>
  );
}

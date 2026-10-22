/* eslint-disable @next/next/no-img-element */
"use client";

import { LuBookOpen, LuStethoscope } from "react-icons/lu";
import { cn } from "@/components/ui";
import {
  CheckoutBook,
  CheckoutCourse,
  CheckoutType,
  effectiveBookPrice,
  effectiveCoursePrice,
  formatTk,
  toNumber,
} from "./types";

interface Labels {
  heading: string;
  course: string;
  printed: string;
  digital: string;
  unitPrice: string;
  quantity: string;
  total: string;
  payable: string;
  free: string;
  save: string;
  delivery: string;
  preOrder: string;
}

/**
 * The order summary — compact (22 Oct 2026, the shop asked for half the height
 * on a phone): a small square cover beside the title, then
 *
 *   price · books          (side by side)
 *   delivery charge
 *   ─ total                (price × books + delivery — the first sum shown)
 *   − each discount
 *   ═ payable              (only when there is a discount; else the total is it)
 *
 * No subtotal of the books alone. The arithmetic matches the server's, which
 * adds delivery to the discounted books: (a − d) + c = a + c − d.
 */
export function OrderSummary({
  type,
  course,
  book,
  quantity,
  bn,
  S,
  deliveryCharge = 0,
  showDelivery = false,
  unit: unitOverride,
  discountLines,
  isPreOrder = false,
}: {
  type: CheckoutType;
  course?: CheckoutCourse | null;
  book?: CheckoutBook | null;
  quantity: number;
  bn: string;
  S: Labels;
  // Printed books only — a course or a download ships nothing.
  deliveryCharge?: number;
  showDelivery?: boolean;
  isCod?: boolean;
  // The catalogue unit price for a book (before offers); every discount shows
  // as its own named row. CheckoutView is the one place that prices a book.
  unit?: number;
  discountLines?: { label: string; amount: number }[];
  isPreOrder?: boolean;
}) {
  const isCourse = type === "course" && !!course;
  const isBook = type === "book" && !!book;

  const title = isCourse ? course!.title : book?.title ?? "";
  const image = isCourse ? course?.image : book?.coverImage;
  const isDigital = isBook && book?.format === "digital";

  const unit = isCourse ? effectiveCoursePrice(course!) : isBook ? unitOverride ?? effectiveBookPrice(book!) : 0;
  const original = isCourse ? toNumber(course!.fee) : 0;
  // A course discount shows as a struck price; a book's are named rows below.
  const hasCourseDiscount = isCourse && original > unit && unit > 0;
  const qty = isBook ? quantity : 1;
  const isFree = unit <= 0;
  const lines = discountLines ?? [];
  const discountTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const gross = unit * qty + (showDelivery ? deliveryCharge : 0);
  const payable = gross - discountTotal;
  const hasDiscounts = discountTotal > 0;

  const kind = isCourse ? S.course : isDigital ? S.digital : S.printed;

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
      {/* Item: a small square cover beside the title */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-primary-soft">
          {image ? (
            <img src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/60">
              {isCourse ? <LuStethoscope /> : <LuBookOpen />}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", bn)}>
            {S.heading}
          </p>
          <h3 className={cn("truncate text-sm font-semibold text-foreground", bn)}>{title}</h3>
          <p className={cn("text-[11px] text-muted-foreground", bn)}>
            {kind}
            {isPreOrder && <span className="font-semibold text-coral"> · {S.preOrder}</span>}
          </p>
        </div>
      </div>

      <dl className="mt-2.5 space-y-1 border-t border-border pt-2 text-sm">
        {/* Price and number of books, side by side */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <dt className={cn("text-muted-foreground", bn)}>{S.unitPrice}</dt>
            <dd className="font-medium text-foreground">
              {hasCourseDiscount && (
                <span className="mr-1 text-xs text-muted-foreground line-through">{formatTk(original)}</span>
              )}
              {isFree ? <span className="text-accent">{S.free}</span> : formatTk(unit)}
            </dd>
          </div>
          {isBook && (
            <div className="flex items-center gap-1.5">
              <dt className={cn("text-muted-foreground", bn)}>{S.quantity}</dt>
              <dd className="font-medium text-foreground">× {qty}</dd>
            </div>
          )}
        </div>

        {showDelivery && (
          <Row label={S.delivery} bn={bn}>
            {deliveryCharge === 0 ? <span className="text-accent">{S.free}</span> : formatTk(deliveryCharge)}
          </Row>
        )}

        {/* The first sum: books + delivery. With no discount it is the payable. */}
        <div className="flex items-center justify-between border-t border-dashed border-border pt-1.5">
          <dt className={cn(hasDiscounts ? "text-foreground" : "font-heading text-base font-bold text-foreground", bn)}>
            {hasDiscounts ? S.total : S.payable}
          </dt>
          <dd className={cn(hasDiscounts ? "font-semibold text-foreground" : "font-heading text-lg font-bold text-primary")}>
            {isFree && !showDelivery ? S.free : formatTk(gross)}
          </dd>
        </div>

        {hasDiscounts && (
          <>
            {lines.map((line, i) => (
              <Row key={`${line.label}-${i}`} label={line.label} bn={bn} tone="text-accent">
                −{formatTk(line.amount)}
              </Row>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <dt className={cn("font-heading text-base font-bold text-foreground", bn)}>{S.payable}</dt>
              <dd className="font-heading text-lg font-bold text-primary">{formatTk(payable)}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}

function Row({ label, bn, tone = "", children }: { label: string; bn: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("min-w-0 truncate", tone || "text-muted-foreground", bn)}>{label}</dt>
      <dd className={cn("shrink-0 font-medium", tone || "text-foreground")}>{children}</dd>
    </div>
  );
}

export default OrderSummary;

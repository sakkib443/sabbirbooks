/* eslint-disable @next/next/no-img-element */
"use client";

import { LuBookOpen, LuStethoscope, LuMonitorSmartphone, LuBookMarked, LuCalendarClock } from "react-icons/lu";
import { Badge, cn } from "@/components/ui";
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
  book: string;
  printed: string;
  digital: string;
  by: string;
  unitPrice: string;
  quantity: string;
  subtotal: string;
  total: string;
  free: string;
  save: string;
  delivery: string;
  codNote: string;
  duration: (m: number) => string;
  preOrder: string;
}

export function OrderSummary({
  type,
  course,
  book,
  quantity,
  bn,
  S,
  deliveryCharge = 0,
  showDelivery = false,
  isCod = false,
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
  // The catalogue unit price for a book (before offers). Passed so the subtotal
  // is the list price and every discount shows as its own named row below —
  // there is exactly one place in the client (CheckoutView) that prices a book.
  unit?: number;
  // Named offer rows — the headline offer, then the online-payment offer when it
  // applies. Each already in taka for the current quantity.
  discountLines?: { label: string; amount: number }[];
  isPreOrder?: boolean;
}) {
  // Derive the line item + pricing for whichever product type we're buying.
  const isCourse = type === "course" && !!course;
  const isBook = type === "book" && !!book;

  const title = isCourse ? course!.title : book?.title ?? "";
  const image = isCourse ? course?.image : book?.coverImage;
  const isDigital = isBook && book?.format === "digital";

  const unit = isCourse
    ? effectiveCoursePrice(course!)
    : isBook
      ? unitOverride ?? effectiveBookPrice(book!)
      : 0;
  const original = isCourse
    ? toNumber(course!.fee)
    : isBook
      ? toNumber(book!.price)
      : 0;
  // A course discount still shows as a struck price; a book's discounts are
  // itemised as named offer rows below, so its unit stays the catalogue price.
  const hasDiscount = isCourse && original > unit && unit > 0;
  const qty = isBook ? quantity : 1;
  const subtotal = unit * qty;
  const isFree = unit <= 0;
  const lines = discountLines ?? [];
  const discountTotal = lines.reduce((sum, l) => sum + l.amount, 0);
  // Same order of operations as the server: delivery is added to the ALREADY
  // discounted subtotal. Getting this wrong is how a page total comes to
  // disagree with the invoice.
  const total = subtotal - discountTotal + (showDelivery ? deliveryCharge : 0);
  // A discount needs the subtotal spelled out above it, or "−৳275" hangs off
  // nothing and the arithmetic cannot be followed.
  const showBreakdown = showDelivery || discountTotal > 0;

  const preOrderBadge = isPreOrder ? (
    <Badge variant="coral" className={bn}>
      <LuCalendarClock /> {S.preOrder}
    </Badge>
  ) : null;

  const kindBadge = isCourse ? (
    <Badge variant="primary" className={bn}>
      <LuStethoscope /> {S.course}
    </Badge>
  ) : isDigital ? (
    <Badge variant="accent" className={bn}>
      <LuMonitorSmartphone /> {S.digital}
    </Badge>
  ) : (
    <Badge variant="secondary" className={bn}>
      <LuBookMarked /> {S.printed}
    </Badge>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>

      {/* Line item */}
      <div className="mt-4 flex gap-4">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-xl border border-border bg-primary-soft",
            isCourse ? "h-20 w-28" : "h-28 w-20"
          )}
        >
          {image ? (
            <img src={image} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/60">
              {isCourse ? <LuStethoscope className="text-2xl" /> : <LuBookOpen className="text-2xl" />}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {kindBadge}
            {preOrderBadge}
          </div>
          <h3 className={cn("line-clamp-2 font-semibold leading-snug text-foreground", bn)}>
            {title}
          </h3>
          {isBook && book?.author && (
            <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>
              {S.by} {book.author}
            </p>
          )}
          {isCourse && course?.durationMonth ? (
            <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>
              {S.duration(course.durationMonth)}
            </p>
          ) : null}
        </div>
      </div>

      {/* Price breakdown */}
      <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className={cn("text-muted-foreground", bn)}>{S.unitPrice}</dt>
          <dd className="flex items-center gap-2 font-medium text-foreground">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">{formatTk(original)}</span>
            )}
            {isFree ? <span className="text-accent">{S.free}</span> : formatTk(unit)}
          </dd>
        </div>

        {isBook && (
          <div className="flex items-center justify-between">
            <dt className={cn("text-muted-foreground", bn)}>{S.quantity}</dt>
            <dd className="font-medium text-foreground">× {qty}</dd>
          </div>
        )}

        {hasDiscount && (
          <div className="flex items-center justify-between">
            <dt className={cn("text-muted-foreground", bn)}>{S.save}</dt>
            <dd className="font-medium text-accent">−{formatTk((original - unit) * qty)}</dd>
          </div>
        )}

        {showBreakdown && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <dt className={cn("text-muted-foreground", bn)}>{S.subtotal}</dt>
            <dd className="font-medium text-foreground">{formatTk(subtotal)}</dd>
          </div>
        )}

        {lines.map((line, i) => (
          <div key={`${line.label}-${i}`} className="flex items-center justify-between">
            <dt className={cn("text-accent", bn)}>{line.label}</dt>
            <dd className="font-semibold text-accent">−{formatTk(line.amount)}</dd>
          </div>
        ))}

        {showDelivery && (
          <div className="flex items-center justify-between">
            <dt className={cn("text-muted-foreground", bn)}>{S.delivery}</dt>
            <dd className="font-medium text-foreground">
              {deliveryCharge === 0 ? (
                <span className="text-accent">{S.free}</span>
              ) : (
                formatTk(deliveryCharge)
              )}
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <dt className={cn("font-heading text-base font-bold text-foreground", bn)}>{S.total}</dt>
          <dd className="font-heading text-xl font-bold text-primary">
            {isFree && !showBreakdown ? S.free : formatTk(total)}
          </dd>
        </div>

        {isCod && (
          <p className={cn("rounded-lg bg-accent-soft/50 px-3 py-2 text-xs text-foreground", bn)}>
            {S.codNote}
          </p>
        )}
      </dl>
    </div>
  );
}

export default OrderSummary;

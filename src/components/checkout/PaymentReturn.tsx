"use client";

/**
 * Where the buyer lands after a hosted gateway round-trip.
 *
 * This screen REPORTS an outcome, it never decides one. The order was already
 * settled (or not) server-side by the gateway's callback and IPN before the
 * browser got here, and the status in the query string is only a hint about what
 * to render. Nothing here can mark an order paid — which is the point, because
 * everything in this URL is attacker-editable.
 *
 * Reached at /payment/return?status=success|failed|cancelled&orderId=&ref=&trx=
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LuCircleCheck, LuCircleX, LuInfo, LuArrowLeft } from "react-icons/lu";
import { Container, buttonVariants, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { paymentReturnLabels } from "./CheckoutView";

type Outcome = "success" | "failed" | "cancelled";

const normalise = (raw: string | null): Outcome =>
  raw === "success" ? "success" : raw === "cancelled" ? "cancelled" : "failed";

export default function PaymentReturn() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const params = useSearchParams();
  const L = paymentReturnLabels(isBengali);

  const outcome = normalise(params.get("status"));
  const orderId = params.get("orderId");
  const ref = params.get("ref");

  const tone = {
    success: {
      icon: <LuCircleCheck className="text-3xl" />,
      wrap: "bg-accent-soft text-accent",
      title: L.successTitle,
      sub: L.successSub,
    },
    failed: {
      icon: <LuCircleX className="text-3xl" />,
      wrap: "bg-coral/15 text-coral",
      title: L.failTitle,
      sub: L.failSub,
    },
    cancelled: {
      icon: <LuInfo className="text-3xl" />,
      wrap: "bg-primary-soft text-primary",
      title: L.cancelTitle,
      sub: L.cancelSub,
    },
  }[outcome];

  return (
    <main className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-soft">
          <div
            className={cn(
              "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl",
              tone.wrap
            )}
          >
            {tone.icon}
          </div>

          <h1 className={cn("font-heading text-2xl font-bold text-foreground", bn)}>{tone.title}</h1>
          <p className={cn("mx-auto mt-2 max-w-sm text-sm text-muted-foreground", bn)}>{tone.sub}</p>

          {ref && (
            <div className="mt-5 rounded-xl border border-border bg-background px-4 py-3">
              <p className={cn("text-xs text-muted-foreground", bn)}>{L.refLabel}</p>
              <p className="mt-0.5 font-semibold tabular-nums text-foreground">{ref}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {/* A settled order is worth linking straight at; a failed one is not,
                so the primary action there is to try again rather than to go and
                stare at an unpaid order. */}
            {outcome === "success" && orderId ? (
              <Link
                href={`/dashboard/user/orders/${orderId}`}
                className={cn(buttonVariants({ variant: "primary" }), bn)}
              >
                {L.viewOrder}
              </Link>
            ) : (
              <Link href="/books" className={cn(buttonVariants({ variant: "primary" }), bn)}>
                {L.tryAgain}
              </Link>
            )}
            <Link href="/books" className={cn(buttonVariants({ variant: "outline" }), bn)}>
              <LuArrowLeft /> {L.backToBooks}
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}

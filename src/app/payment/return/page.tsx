import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui";
import PaymentReturn from "@/components/checkout/PaymentReturn";

export const metadata: Metadata = {
  title: "Payment · Magic Viva",
  description: "Your payment result.",
  // A payment result is per-buyer and reached from an external redirect —
  // nothing here should ever end up in a search index.
  robots: { index: false, follow: false },
};

// Where bKash and SSLCommerz send the buyer back to. Deliberately thin: the
// server has already settled (or refused) the payment by the time this renders,
// and everything this page shows comes from @/components/checkout/PaymentReturn.
//
// PaymentReturn reads the URL query via useSearchParams, so it must sit inside a
// <Suspense> boundary in Next 16.
export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<PaymentReturnFallback />}>
      <PaymentReturn />
    </Suspense>
  );
}

function PaymentReturnFallback() {
  return (
    <main className="py-16 sm:py-24">
      <Container>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-12 shadow-soft">
          <div className="mx-auto mb-5 h-16 w-16 animate-pulse rounded-2xl bg-muted" />
          <div className="mx-auto h-7 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-3 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mt-6 h-11 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </Container>
    </main>
  );
}

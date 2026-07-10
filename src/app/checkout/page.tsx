import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/ui";
import CheckoutView from "@/components/checkout/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout · Sabbir Book",
  description: "Securely enroll in a course or order a book.",
};

// CheckoutView reads the URL query (?type=course&id / ?type=book&slug) via
// useSearchParams, so it must sit inside a <Suspense> boundary in Next 16.
export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutView />
    </Suspense>
  );
}

// Static, hook-free fallback rendered while the client view hydrates.
function CheckoutFallback() {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-8">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-28 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="order-1 space-y-4 lg:order-2">
            <div className="h-56 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </Container>
    </main>
  );
}

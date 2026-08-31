import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Refund & Return Policy",
  description:
    "When a book can be returned, who pays the return courier, how refunds are sent back, and how long the money takes.",
};

export default function RefundPolicyRoute() {
  return <PolicyPage slug="refund-policy" />;
}

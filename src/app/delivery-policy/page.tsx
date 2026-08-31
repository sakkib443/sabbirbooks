import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Delivery Policy",
  description:
    "Where Magic Viva delivers, how long it takes, what the delivery charge is, and when the QR content opens.",
};

export default function DeliveryPolicyRoute() {
  return <PolicyPage slug="delivery-policy" />;
}

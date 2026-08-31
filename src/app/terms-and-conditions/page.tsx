import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern buying from Magic Viva and reading the digital content the printed book's QR codes open.",
};

export default function TermsRoute() {
  return <PolicyPage slug="terms-and-conditions" />;
}

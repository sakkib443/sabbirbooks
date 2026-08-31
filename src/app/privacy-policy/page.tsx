import type { Metadata } from "next";
import PolicyPage from "@/components/legal/PolicyPage";

// The document itself is bilingual and picks its language on the client, but
// the metadata cannot — crawlers and the gateway's reviewer see one title, so
// it is the English one. The root layout appends the brand.
export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Magic Viva collects about you, why, who else sees it, and how to have it corrected or deleted.",
};

export default function PrivacyPolicyRoute() {
  return <PolicyPage slug="privacy-policy" />;
}

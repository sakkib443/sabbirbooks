import type { Metadata } from "next";
import AmbassadorApply from "@/components/ambassador/AmbassadorApply";

// The programme is advertised off-site — a Facebook post, a poster in a common
// room — so this page is a landing page as much as a form, and its description
// is what shows in the link preview.
export const metadata: Metadata = {
  title: "Campus Ambassador",
  description:
    "Bring MAGIC VIVA ANATOMY to your campus. Get your own coupon code, give classmates ৳20 off, and earn ৳30 on every copy sold under it.",
};

// The pitch is rendered by AmbassadorApply rather than here, so that submitting
// can replace both it and the form with the confirmation.
export default function CampusAmbassadorPage() {
  return (
    <main className="pb-8">
      <AmbassadorApply />
    </main>
  );
}

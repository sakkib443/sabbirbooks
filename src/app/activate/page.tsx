import type { Metadata } from "next";
import ActivateBook from "@/components/activate/ActivateBook";

// Printed inside the book and on the scratch panel's instructions, so the URL
// is short and the description is what a reader sees if they share the link.
export const metadata: Metadata = {
  title: "Activate your book",
  description:
    "Enter the hidden code inside your copy of MAGIC VIVA ANATOMY to unlock every QR answer on this account.",
};

export default function ActivatePage() {
  return (
    <main className="pb-8">
      <ActivateBook />
    </main>
  );
}

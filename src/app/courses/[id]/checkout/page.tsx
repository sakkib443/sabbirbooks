import CourseCheckout from "@/components/recorded/CourseCheckout";

export const metadata = { title: "কোর্স চেকআউট", robots: { index: false } };

// A course's own checkout (25 Oct 2026) — separate from the book's.
export default function CourseCheckoutPage() {
  return <CourseCheckout />;
}

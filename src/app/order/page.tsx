import { redirect } from "next/navigation";
import { getLandingBook } from "@/lib/landingBook";

/**
 * /order — "order the book" from the menu (22 Oct 2026).
 *
 * The checkout needs the book's slug, which only the landing settings know, so
 * the menu links here and this sends the buyer on to that book's checkout.
 * Anything on the query (a ?coupon=CODE) is carried along.
 */
export default async function OrderShortcut({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const book = await getLandingBook();
  if (!book?.slug) redirect("/");

  const params = new URLSearchParams({ type: "book", slug: book.slug });
  const extra = await searchParams;
  for (const [k, v] of Object.entries(extra)) {
    if (k === "type" || k === "slug" || typeof v !== "string") continue;
    params.set(k, v);
  }
  redirect(`/checkout?${params.toString()}`);
}

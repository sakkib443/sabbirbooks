// Shared Book types + tiny helpers for the Books client pages.
// Mirrors the backend IBook *public* fields (secureFileUrl is never exposed).

export interface Book {
  _id?: string;
  id?: number;
  title: string;
  slug: string;
  author?: string;
  description?: string;
  coverImage?: string;
  price?: number;
  offerPrice?: number;
  category?: string;
  language?: "bn" | "en" | "both" | string;
  format?: "printed" | "digital" | string;
  stock?: number;
  previewImages?: string[];
  previewPdfUrl?: string;
  status?: string;
  rating?: number;
  totalSold?: number;
}

// Bengali Taka amount, e.g. 550 -> "৳550". Returns null for undefined prices.
export const formatBDT = (v?: number): string | null =>
  typeof v === "number" ? "৳" + v.toLocaleString("en-US") : null;

// Whole-number discount percent when an offer price is set and lower.
export const discountPercent = (price?: number, offer?: number): number | null => {
  if (typeof price !== "number" || typeof offer !== "number") return null;
  if (offer <= 0 || offer >= price) return null;
  return Math.round(((price - offer) / price) * 100);
};

// The single source of truth for the checkout hand-off (checkout is another agent's page).
export const bookCheckoutHref = (slug: string): string =>
  `/checkout?type=book&slug=${encodeURIComponent(slug)}`;

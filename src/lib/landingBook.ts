/**
 * Which book the public landing page is about, fetched on the server.
 *
 * Runs during render (and during generateMetadata, so the Facebook preview and
 * the page always describe the same book). Never throws: a shop whose API is
 * briefly down should still serve a page, not a stack trace.
 */

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '');

export interface LandingFeature {
  text: string;
  weight?: number;
  highlight?: boolean;
}

export interface LandingBook {
  _id: string;
  title: string;
  slug: string;
  author?: string;
  description?: string;
  coverImage?: string;
  price?: number;
  offerPrice?: number;
  format?: string;
  stock?: number;
  previewImages?: string[];
  previewPdfUrl?: string;
  isPreOrder?: boolean;
  preOrderDiscountPercent?: number;
  preOrderNote?: string;
  expectedReleaseDate?: string;
  promoVideoUrl?: string;
  features?: LandingFeature[];
}

export interface LandingSettings {
  brandName?: string;
  brandNameBn?: string;
  logo?: string;
  favicon?: string;
  landingBookSlug?: string;
  landingHeadline?: string;
  landingSubheadline?: string;
  orderSupportPhone?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  deliveryNote?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
}

const json = async (url: string, revalidate = 60) => {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export async function getLandingSettings(): Promise<LandingSettings> {
  const body = await json(`${API}/api/settings`, 300);
  return (body?.data as LandingSettings) || {};
}

/**
 * The configured book, or the best stand-in.
 *
 * Falls back deliberately rather than rendering an empty page: an admin who has
 * not set landingBookSlug yet still gets a working site, and the featured flag
 * is the next most likely intent.
 */
export async function getLandingBook(settings?: LandingSettings): Promise<LandingBook | null> {
  const s = settings ?? (await getLandingSettings());

  if (s.landingBookSlug) {
    const body = await json(`${API}/api/books/${encodeURIComponent(s.landingBookSlug)}`);
    if (body?.data) return body.data as LandingBook;
  }

  const list = await json(`${API}/api/books?limit=24`);
  const books: LandingBook[] = Array.isArray(list?.data) ? list.data : [];
  if (!books.length) return null;

  return (
    books.find((b) => (b as { isFeatured?: boolean }).isFeatured) ??
    books.find((b) => b.isPreOrder) ??
    books[0]
  );
}

/** What the buyer actually pays, and what they save. */
export function landingPrice(book: LandingBook | null) {
  if (!book) return { price: 0, payable: 0, saved: 0, percent: 0 };

  const price = Number(book.price) || 0;
  const offer = Number(book.offerPrice) || 0;

  // A pre-order discount is applied by the server at checkout, on top of the
  // catalogue price. An offer price, when it is a real reduction, wins instead —
  // the two are not stacked, which matches how the order service prices a line.
  if (book.isPreOrder) {
    const pct = Number(book.preOrderDiscountPercent) || 0;
    const base = offer > 0 && offer < price ? offer : price;
    const saved = Math.round((base * pct) / 100);
    return { price: base, payable: base - saved, saved, percent: pct };
  }

  if (offer > 0 && offer < price) {
    return {
      price,
      payable: offer,
      saved: price - offer,
      percent: Math.round(((price - offer) / price) * 100),
    };
  }

  return { price, payable: price, saved: 0, percent: 0 };
}

export const formatTk = (n: number) => '৳' + Math.round(n || 0).toLocaleString('en-US');

// ─── Book offers & pricing (client mirror of the server) ─────────────────────
//
// The server's book.pricing.ts is the authority — it prices every real order.
// This is the display-side twin, kept deliberately identical so the storefront
// and the checkout summary quote exactly what the invoice will charge.
//
// Three named percentage offers per book:
//   normal   — everyday discount, the headline price on the storefront
//   preorder — the headline while the book is sold before printing
//   online   — an EXTRA reduction, applied only when paying online (not COD)
//
// A book saved before this system (no `offers`) keeps its exact old price through
// the legacy branch below, matching the server, so nothing on the live page moves
// until the admin actually configures offers.

export interface BookOffer {
  enabled?: boolean;
  label?: string;
  type?: "percent" | "fixed";
  percent?: number;
  amount?: number;
}

export interface BookOffers {
  normal?: BookOffer | null;
  preorder?: BookOffer | null;
  online?: BookOffer | null;
}

export interface OfferBook {
  price?: number;
  offerPrice?: number | null;
  isPreOrder?: boolean;
  preOrderDiscountPercent?: number;
  offers?: BookOffers | null;
}

export interface ResolvedOffer {
  enabled: boolean;
  /** The admin's own name for the offer, trimmed; '' when they left it blank. */
  label: string;
  /** How the cut is measured — a percent of the price, or a flat taka amount. */
  type: "percent" | "fixed";
  percent: number;
  amount: number;
}

export interface ResolvedOffers {
  normal: ResolvedOffer;
  preorder: ResolvedOffer;
  online: ResolvedOffer;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clampPct = (v: unknown): number => Math.min(90, Math.max(0, Math.round(num(v))));
const clampMoney = (v: unknown): number => Math.max(0, Math.round(num(v)));
const trim = (v: unknown): string => (v ?? "").toString().trim();
const offerType = (v: unknown): "percent" | "fixed" => (v === "fixed" ? "fixed" : "percent");

// The taka an offer takes off a base price — a fixed offer never exceeds the base.
export const offerDiscount = (base: number, offer: ResolvedOffer): number =>
  offer.type === "fixed" ? Math.min(offer.amount, Math.max(0, base)) : (base * offer.percent) / 100;

/** True once the admin has configured the offers object on this book. */
export const hasOffers = (book?: OfferBook | null): boolean => {
  const o = book?.offers;
  return !!o && (!!o.normal || !!o.preorder || !!o.online);
};

/**
 * The three offers as effective values, reading the legacy pre-order / offerPrice
 * fields as the fallback source. Labels come back as the admin typed them (blank
 * when unset — the caller supplies a language-appropriate default).
 */
export const resolveOffers = (book?: OfferBook | null): ResolvedOffers => {
  const o = book?.offers || {};
  const price = num(book?.price);
  const offerPrice = book?.offerPrice != null ? num(book.offerPrice) : null;
  const legacyNormal = offerPrice != null && offerPrice > 0 && offerPrice < price;

  return {
    preorder: {
      enabled: o.preorder?.enabled != null ? !!o.preorder.enabled : book?.isPreOrder === true,
      label: trim(o.preorder?.label),
      type: offerType(o.preorder?.type),
      percent: clampPct(o.preorder?.percent ?? book?.preOrderDiscountPercent ?? 0),
      amount: clampMoney(o.preorder?.amount),
    },
    normal: {
      enabled: o.normal?.enabled != null ? !!o.normal.enabled : legacyNormal,
      label: trim(o.normal?.label),
      type: offerType(o.normal?.type),
      percent: clampPct(
        o.normal?.percent ?? (legacyNormal ? ((price - (offerPrice as number)) / price) * 100 : 0)
      ),
      amount: clampMoney(o.normal?.amount),
    },
    online: {
      enabled: !!o.online?.enabled,
      label: trim(o.online?.label),
      type: offerType(o.online?.type),
      percent: clampPct(o.online?.percent ?? 0),
      amount: clampMoney(o.online?.amount),
    },
  };
};

export type HeadlineMode = "preorder" | "normal" | "none";

export interface BookPrice {
  /** Catalogue unit price — the struck-through "before". */
  list: number;
  offers: ResolvedOffers;
  // `kind` says whether to show the badge as "N% off" or "৳N off"; `percent` is the
  // effective rate (works for both) and `amount` the per-copy taka off (for fixed).
  headline: { mode: HeadlineMode; label: string; kind: "percent" | "fixed" | "none"; percent: number; amount: number };
  isPreOrder: boolean;
  quantity: number;
  // Per-order, rounded once (never per line):
  subtotal: number; // list × qty
  headlinePayable: number; // after the headline discount
  payable: number; // after headline + online (when applicable)
  saved: number; // subtotal − payable
  headlineSaved: number; // subtotal − headlinePayable
  onlineSaved: number; // headlinePayable − payable
  onlinePercent: number; // online percent in force for this call
  percent: number; // headline percent, for the "% off" badge
}

// Assemble the result from a list unit, a per-order SUBTOTAL, and the two DISCOUNT
// amounts — rounding the discounts (not the payables) exactly as the server rounds
// order.discount once, so the page total can never be a taka off the invoice.
const build = (
  list: number,
  offers: ResolvedOffers,
  headline: BookPrice["headline"],
  isPreOrder: boolean,
  quantity: number,
  subtotal: number,
  headlineSaved: number,
  onlineSaved: number,
  onlinePercent: number
): BookPrice => {
  const saved = headlineSaved + onlineSaved;
  return {
    list,
    offers,
    headline,
    isPreOrder,
    quantity,
    subtotal,
    headlinePayable: subtotal - headlineSaved,
    payable: subtotal - saved,
    saved,
    headlineSaved,
    onlineSaved,
    onlinePercent,
    percent: headline.percent,
  };
};

/**
 * What the buyer pays and saves. `online` says they are paying online (not COD),
 * the only case the online-payment offer applies. `quantity` scales the order.
 */
export const priceBook = (
  book?: OfferBook | null,
  opts: { online?: boolean; quantity?: number } = {}
): BookPrice => {
  const quantity = opts.quantity && opts.quantity > 0 ? Math.floor(opts.quantity) : 1;
  const offers = resolveOffers(book);
  const price = num(book?.price);
  const offerPrice = book?.offerPrice != null ? num(book.offerPrice) : null;

  // Legacy books keep the exact old pricing and have no online offer — mirrors the
  // server branch so the page total and the invoice never disagree. Legacy offers
  // are always percentage-based.
  if (!hasOffers(book)) {
    const base = offerPrice != null && offerPrice > 0 && offerPrice < price ? offerPrice : price;
    if (book?.isPreOrder) {
      const pct = clampPct(book.preOrderDiscountPercent ?? 25);
      const subtotal = Math.round(base * quantity);
      const headlineSaved = Math.round((base * quantity * pct) / 100);
      return build(base, offers, { mode: "preorder", label: offers.preorder.label, kind: "percent", percent: pct, amount: 0 }, true, quantity, subtotal, headlineSaved, 0, 0);
    }
    if (offerPrice != null && offerPrice > 0 && offerPrice < price) {
      const subtotal = Math.round(price * quantity);
      const headlineSaved = Math.round((price - offerPrice) * quantity);
      const pct = Math.round(((price - offerPrice) / price) * 100);
      return build(price, offers, { mode: "normal", label: offers.normal.label, kind: "percent", percent: pct, amount: 0 }, false, quantity, subtotal, headlineSaved, 0, 0);
    }
    const subtotal = Math.round(price * quantity);
    return build(price, offers, { mode: "none", label: "", kind: "none", percent: 0, amount: 0 }, false, quantity, subtotal, 0, 0, 0);
  }

  // New offers engine: a live pre-order is the headline over a normal discount;
  // the online offer stacks on top of whichever headline is in force. Each offer
  // is a percent or a fixed taka amount (offerDiscount handles both). Round each
  // discount once and split — headlineSaved + onlineSaved is what the server takes.
  // The headline is the offer that actually takes money off — not merely the one
  // that is switched on. Mirrors book.pricing.ts on the server exactly; see the
  // long note there. In short: "pre-order" is two facts on one switch (sold
  // before printing, and discounted for pre-ordering), a shop can want the first
  // without the second, and keying on `enabled` alone let a zero-discount
  // pre-order swallow a normal discount running underneath it.
  const preorderOff = offers.preorder.enabled ? offerDiscount(price, offers.preorder) : 0;
  const normalOff = offers.normal.enabled ? offerDiscount(price, offers.normal) : 0;

  const headlineOffer = preorderOff > 0 ? offers.preorder : normalOff > 0 ? offers.normal : null;
  const mode: HeadlineMode = preorderOff > 0 ? "preorder" : normalOff > 0 ? "normal" : "none";

  const headlineOff = headlineOffer ? offerDiscount(price, headlineOffer) : 0;
  const unit = price - headlineOff;
  const onlineOff = opts.online && offers.online.enabled ? offerDiscount(unit, offers.online) : 0;
  const unitOnline = unit - onlineOff;

  const subtotal = Math.round(price * quantity);
  const totalSaved = Math.round((price - unitOnline) * quantity);
  const headlineSaved = Math.round(headlineOff * quantity);
  const onlineSaved = totalSaved - headlineSaved;
  const onlinePercent = unit > 0 ? Math.round((onlineOff / unit) * 100) : 0;

  const headline = {
    mode,
    label: headlineOffer?.label ?? "",
    kind: (headlineOffer ? headlineOffer.type : "none") as "percent" | "fixed" | "none",
    percent: price > 0 ? Math.round((headlineOff / price) * 100) : 0,
    amount: Math.round(headlineOff),
  };
  return build(price, offers, headline, offers.preorder.enabled, quantity, subtotal, headlineSaved, onlineSaved, onlinePercent);
};

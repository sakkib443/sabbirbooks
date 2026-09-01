/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BookCover from "@/components/shared/BookCover";
import {
  LuBookOpen,
  LuBookMarked,
  LuMonitorSmartphone,
  LuChevronRight,
  LuArrowLeft,
  LuShieldCheck,
  LuDownload,
  LuTruck,
  LuCircleCheck,
  LuTriangleAlert,
  LuUser,
  LuTag,
  LuLanguages,
  LuShoppingCart,
  LuCalendarClock,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, Badge, buttonVariants, cn } from "@/components/ui";
import API_BASE_URL from "@/config/api";
import { Book, formatBDT, bookCheckoutHref } from "@/components/books/types";
import { priceBook, type OfferBook } from "@/lib/bookOffers";
import { BookPreview } from "@/components/books/BookPreview";

// The public /api/books payload carries the pre-order fields too. They are
// declared here rather than on the shared Book type because only this page and
// checkout read them, and checkout keeps its own copy.
type BookDetail = Book & {
  isPreOrder?: boolean;
  preOrderDiscountPercent?: number;
  preOrderNote?: string;
  expectedReleaseDate?: string;
};

// A release date in the reader's language. Guarded because a build without full
// ICU throws on an unknown locale, and a date label is not worth a blank page.
const formatReleaseDate = (iso: string | undefined, isBengali: boolean): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(isBengali ? "bn-BD" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

const copy = {
  en: {
    home: "Home",
    booksCrumb: "Books",
    back: "Back to books",
    by: "by",
    printed: "Printed book",
    digital: "Digital book",
    off: "OFF",
    save: "You save",
    inStock: "In stock",
    lowStock: (n: number) => `Only ${n} left in stock`,
    outOfStock: "Out of stock",
    printedNote: "Printed copy — shipped to your address after checkout.",
    instantAccess: "Instant digital access",
    instantNote: "Read online / download immediately after purchase.",
    orderNow: "Order now",
    buyNow: "Buy now",
    unavailable: "Currently unavailable",
    preOrderBadge: (off: string) => `Pre-order · ${off} off`,
    preOrderCta: "Pre-order now",
    preOrderAvailability: "Pre-order open",
    preOrderNoteFallback: "Not printed yet — order now at the pre-order price.",
    preOrderShipOn: (d: string) => `Delivery starts ${d}`,
    onlineExtraNote: (off: string) => `${off} more off when you pay online`,
    aboutHeading: "About this book",
    detailsHeading: "Details",
    category: "Category",
    format: "Format",
    language: "Language",
    availability: "Availability",
    langMap: { bn: "Bangla", en: "English", both: "Bangla & English" } as Record<string, string>,
    trustSecure: "Secure checkout",
    trustDeliver: "Home delivery",
    trustDownload: "Lifetime access",
    previewHeading: "Preview inside",
    previewSubtitle: "Sample pages and material before you buy.",
    samplePages: "Sample page",
    pdfTitle: "Sample PDF",
    pdfDesc: "Open a few sample pages as a PDF.",
    openPdf: "Open sample PDF",
    readALittle: "Read a little",
    close: "Close",
    prev: "Previous",
    next: "Next",
    counter: (c: number, t: number) => `${c} / ${t}`,
    notFoundTitle: "Book not found",
    notFoundText: "The book you're looking for doesn't exist or may have been removed.",
    backToBooks: "Browse all books",
  },
  bn: {
    home: "হোম",
    booksCrumb: "বই",
    back: "সব বইয়ে ফিরে যান",
    by: "লেখক:",
    printed: "প্রিন্টেড বই",
    digital: "ডিজিটাল বই",
    off: "ছাড়",
    save: "আপনি সাশ্রয় করছেন",
    inStock: "স্টকে আছে",
    lowStock: (n: number) => `স্টকে মাত্র ${n} টি বাকি`,
    outOfStock: "স্টকে নেই",
    printedNote: "প্রিন্টেড কপি — চেকআউটের পর আপনার ঠিকানায় পৌঁছে দেওয়া হবে।",
    instantAccess: "তাৎক্ষণিক ডিজিটাল অ্যাক্সেস",
    instantNote: "কেনার সাথে সাথেই অনলাইনে পড়ুন বা ডাউনলোড করুন।",
    orderNow: "অর্ডার করুন",
    buyNow: "কিনুন",
    unavailable: "এই মুহূর্তে অনুপলব্ধ",
    preOrderBadge: (off: string) => `প্রি-অর্ডার · ${off} ছাড়`,
    preOrderCta: "প্রি-অর্ডার করুন",
    preOrderAvailability: "প্রি-অর্ডার চলছে",
    preOrderNoteFallback: "বইটি এখনো ছাপা হয়নি — প্রি-অর্ডার দামে এখনই অর্ডার করুন।",
    preOrderShipOn: (d: string) => `${d} থেকে ডেলিভারি শুরু`,
    onlineExtraNote: (off: string) => `অনলাইনে পেমেন্ট করলে আরও ${off} ছাড়`,
    aboutHeading: "এই বই সম্পর্কে",
    detailsHeading: "বিস্তারিত",
    category: "ক্যাটাগরি",
    format: "ফরম্যাট",
    language: "ভাষা",
    availability: "প্রাপ্যতা",
    langMap: { bn: "বাংলা", en: "ইংরেজি", both: "বাংলা ও ইংরেজি" } as Record<string, string>,
    trustSecure: "নিরাপদ চেকআউট",
    trustDeliver: "হোম ডেলিভারি",
    trustDownload: "আজীবন অ্যাক্সেস",
    previewHeading: "ভেতরে দেখুন",
    previewSubtitle: "কেনার আগে নমুনা পৃষ্ঠা ও উপকরণ দেখে নিন।",
    samplePages: "নমুনা পৃষ্ঠা",
    pdfTitle: "নমুনা পিডিএফ",
    pdfDesc: "কয়েকটি নমুনা পৃষ্ঠা পিডিএফ আকারে দেখুন।",
    openPdf: "নমুনা পিডিএফ খুলুন",
    readALittle: "একটু পড়ে দেখুন",
    close: "বন্ধ করুন",
    prev: "পূর্ববর্তী",
    next: "পরবর্তী",
    counter: (c: number, t: number) => `${c} / ${t}`,
    notFoundTitle: "বই খুঁজে পাওয়া যায়নি",
    notFoundText: "আপনি যে বইটি খুঁজছেন তা নেই বা সরিয়ে ফেলা হয়েছে।",
    backToBooks: "সব বই দেখুন",
  },
};

export default function BookDetailPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const S = isBengali ? copy.bn : copy.en;

  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setMissing(false);
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/books/${slug}`, { cache: "no-store" });
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        const data: BookDetail | null = json?.data ?? (json?.slug ? json : null);
        if (!data) throw new Error("empty");
        if (active) setBook(data);
      } catch {
        if (active) {
          setBook(null);
          setMissing(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <DetailSkeleton bn={bn} />;

  if (missing || !book) {
    return (
      <main>
        <Container>
          <div className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <LuBookOpen className="text-3xl" />
            </span>
            <h1 className={cn("font-heading text-2xl font-bold text-foreground", bn)}>
              {S.notFoundTitle}
            </h1>
            <p className={cn("mt-2 max-w-md text-muted-foreground", bn)}>{S.notFoundText}</p>
            <Link
              href="/books"
              className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6", bn)}
            >
              <LuArrowLeft className="text-sm" />
              {S.backToBooks}
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  const isDigital = book.format === "digital";

  /**
   * One copy, priced the way the server prices it.
   *
   * This page used to read `price` and `offerPrice` directly and then apply
   * `preOrderDiscountPercent` on top. Both are pre-offers-system leftovers, and
   * on this book they were wrong in two directions at once: `offerPrice` still
   * reads 600 so the page said "You save ৳0", while the 25% default in
   * `preOrderDiscountPercent` — a number nobody had set — advertised ৳450 for a
   * book the checkout charges ৳520 for.
   *
   * `headlinePayable`, not `payable`: the online-payment extra is only real once
   * that method is chosen, and is stated separately below.
   */
  const p = priceBook(book as OfferBook, { quantity: 1 });
  const price = formatBDT(p.headlinePayable);
  const original = p.headlineSaved > 0 ? formatBDT(p.list) : null;
  const discount = p.headline.kind === "percent" ? p.percent : 0;
  const savings = p.headlineSaved > 0 ? formatBDT(p.headlineSaved) : null;

  const stock = book.stock ?? 0;
  // A pre-order is sold before the print run exists, so `stock: 0` is its normal
  // state rather than a reason to hide the button — the server takes the order
  // regardless. Reading it as out of stock would leave the feature unreachable
  // from the only page that sells the book.
  const isPreOrder = book.isPreOrder === true;
  const printedOutOfStock = !isDigital && !isPreOrder && stock <= 0;
  const printedLowStock = !isDigital && !isPreOrder && stock > 0 && stock <= 10;

  /**
   * The pre-order badge's number.
   *
   * It used to be `preOrderDiscountPercent ?? 25` — which meant every pre-order
   * book claimed 25% off whether or not anyone had set an offer, because 25 was
   * the default of a field left over from before offers existed. It now says
   * whatever the live pre-order offer actually is, and says nothing when there
   * is none.
   */
  const preOrderOffer = p.offers.preorder;
  const preOrderText =
    isPreOrder && p.headline.mode === "preorder" && p.headlineSaved > 0
      ? preOrderOffer.type === "percent"
        ? `${p.percent}%`
        : (formatBDT(preOrderOffer.amount) ?? "")
      : null;
  // The extra for paying online, stated separately because it depends on how
  // they choose to pay — the big price above is what everyone gets.
  //
  // Read off the offer, NOT off `p.onlineSaved`: this page prices the ordinary
  // (non-online) case, so onlineSaved is zero here by design, and keying the
  // note to it meant the note could never appear at all.
  const onlineOffer = p.offers.online;
  const onlineExtraText = !onlineOffer.enabled
    ? null
    : onlineOffer.type === "percent"
      ? onlineOffer.percent > 0
        ? `${onlineOffer.percent}%`
        : null
      : onlineOffer.amount > 0
        ? (formatBDT(onlineOffer.amount) ?? null)
        : null;
  const releaseDate = formatReleaseDate(book.expectedReleaseDate, isBengali);

  const ctaLabel = printedOutOfStock
    ? S.unavailable
    : isPreOrder
      ? S.preOrderCta
      : isDigital
        ? S.buyNow
        : S.orderNow;

  const details = [
    book.category && { icon: <LuTag />, label: S.category, value: book.category },
    { icon: isDigital ? <LuMonitorSmartphone /> : <LuBookMarked />, label: S.format, value: isDigital ? S.digital : S.printed },
    book.language && { icon: <LuLanguages />, label: S.language, value: S.langMap[book.language] ?? book.language },
    {
      icon: isPreOrder ? <LuCalendarClock /> : isDigital ? <LuCircleCheck /> : printedOutOfStock ? <LuTriangleAlert /> : <LuCircleCheck />,
      label: S.availability,
      value: isPreOrder
        ? S.preOrderAvailability
        : isDigital
          ? S.instantAccess
          : printedOutOfStock
            ? S.outOfStock
            : printedLowStock
              ? S.lowStock(stock)
              : S.inStock,
    },
  ].filter(Boolean) as { icon: ReactNode; label: string; value: string }[];

  const trust = [
    { icon: <LuShieldCheck />, text: S.trustSecure },
    isDigital
      ? { icon: <LuDownload />, text: S.trustDownload }
      : { icon: <LuTruck />, text: S.trustDeliver },
  ];

  return (
    <main>
      {/* Breadcrumb */}
      <div className="border-b border-border bg-surface-soft">
        <Container>
          <nav
            className={cn("flex items-center gap-1.5 py-4 text-sm text-muted-foreground", bn)}
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-primary">
              {S.home}
            </Link>
            <LuChevronRight className="text-xs" />
            <Link href="/books" className="transition-colors hover:text-primary">
              {S.booksCrumb}
            </Link>
            <LuChevronRight className="text-xs" />
            <span className="line-clamp-1 font-medium text-foreground">{book.title}</span>
          </nav>
        </Container>
      </div>

      <Container>
        <div className="py-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
            {/* Cover */}
            <div className="mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none">
              <div className="lg:sticky lg:top-24">
                <div className="relative overflow-hidden rounded-2xl border border-border bg-primary-soft shadow-card">
                  <div className="aspect-[2/3] w-full">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      category={book.category}
                      coverImage={book.coverImage}
                    />
                  </div>
                  <Badge
                    variant={isDigital ? "accent" : "secondary"}
                    className={cn("absolute left-3 top-3 bg-card/90 backdrop-blur", bn)}
                  >
                    {isDigital ? <LuMonitorSmartphone /> : <LuBookMarked />}
                    {isDigital ? S.digital : S.printed}
                  </Badge>
                  {/* The pre-order badge wins the corner over the offer-price
                      one: a book you cannot have yet is the more important fact,
                      and the pre-order discount is the bigger of the two. */}
                  {isPreOrder && preOrderText ? (
                    <Badge variant="coral" className={cn("absolute right-3 top-3 bg-card/90 backdrop-blur", bn)}>
                      <LuCalendarClock /> {S.preOrderBadge(preOrderText)}
                    </Badge>
                  ) : (
                    discount > 0 && (
                      <Badge variant="coral" className="absolute right-3 top-3 bg-card/90 backdrop-blur">
                        -{discount}% {S.off}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              {book.category && (
                <span className={cn("text-sm font-semibold text-primary", bn)}>{book.category}</span>
              )}
              <h1
                className={cn(
                  "mt-1.5 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl",
                  bn
                )}
              >
                {book.title}
              </h1>
              {book.author && (
                <p className={cn("mt-3 inline-flex items-center gap-2 text-muted-foreground", bn)}>
                  <LuUser className="text-primary" />
                  {S.by} <span className="font-medium text-foreground">{book.author}</span>
                </p>
              )}

              {/* Price */}
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <span className="font-heading text-4xl font-bold text-foreground">{price}</span>
                {original && original !== price && (
                  <span className="pb-1 text-lg text-muted-foreground line-through">{original}</span>
                )}
                {savings && (
                  <Badge variant="accent" className={cn("mb-1.5", bn)}>
                    {S.save} {savings}
                  </Badge>
                )}
              </div>
              {/* The offer's own name, when the shop gave it one. Blank is the
                  normal case and shows nothing — the struck-through price above
                  already says a discount is running. */}
              {p.headline.label && (
                <p className={cn("mt-2 text-sm font-semibold text-primary", bn)}>
                  {p.headline.label}
                </p>
              )}
              {/* The extra for paying online. Separate from the price above
                  because it depends on how they choose to pay; the big number is
                  what everyone is charged. */}
              {onlineExtraText && (
                <p className={cn("mt-2 text-sm font-semibold text-coral", bn)}>
                  {S.onlineExtraNote(onlineExtraText)}
                </p>
              )}

              {/* Availability note */}
              <div
                className={cn(
                  "mt-5 flex items-start gap-3 rounded-xl border p-4",
                  printedOutOfStock || isPreOrder
                    ? "border-coral/30 bg-coral/10"
                    : "border-border bg-surface-soft"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isPreOrder
                      ? "bg-coral/15 text-coral"
                      : isDigital
                        ? "bg-accent-soft text-accent"
                        : printedOutOfStock
                          ? "bg-coral/15 text-coral"
                          : "bg-primary-soft text-primary"
                  )}
                >
                  {isPreOrder ? (
                    <LuCalendarClock />
                  ) : isDigital ? (
                    <LuMonitorSmartphone />
                  ) : printedOutOfStock ? (
                    <LuTriangleAlert />
                  ) : (
                    <LuTruck />
                  )}
                </span>
                <div>
                  <p className={cn("text-sm font-semibold text-foreground", bn)}>
                    {isPreOrder
                      ? S.preOrderAvailability
                      : isDigital
                        ? S.instantAccess
                        : printedOutOfStock
                          ? S.outOfStock
                          : printedLowStock
                            ? S.lowStock(stock)
                            : S.inStock}
                  </p>
                  <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>
                    {isPreOrder
                      ? book.preOrderNote?.trim() || S.preOrderNoteFallback
                      : isDigital
                        ? S.instantNote
                        : S.printedNote}
                  </p>
                  {isPreOrder && releaseDate && (
                    <p className={cn("mt-1 text-sm font-semibold text-coral", bn)}>
                      {S.preOrderShipOn(releaseDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {printedOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto", bn)}
                  >
                    <LuShoppingCart className="text-base" />
                    {ctaLabel}
                  </button>
                ) : (
                  <Link
                    href={bookCheckoutHref(book.slug)}
                    className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto", bn)}
                  >
                    <LuShoppingCart className="text-base" />
                    {ctaLabel}
                  </Link>
                )}
                <div className="flex flex-wrap gap-4">
                  {trust.map((tr, i) => (
                    <span
                      key={i}
                      className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", bn)}
                    >
                      <span className="text-primary">{tr.icon}</span>
                      {tr.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Details grid */}
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {details.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-soft"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      {d.icon}
                    </span>
                    <span className="leading-tight">
                      <span className={cn("block text-xs text-muted-foreground", bn)}>{d.label}</span>
                      <span className={cn("block text-sm font-semibold text-foreground", bn)}>
                        {d.value}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Description */}
              {book.description && (
                <div className="mt-8">
                  <h2 className={cn("font-heading text-xl font-bold text-foreground", bn)}>
                    {S.aboutHeading}
                  </h2>
                  {/* whitespace-pre-line so a description written as several
                      paragraphs in the admin form reads as several paragraphs
                      here. Without it every line break collapses and a long
                      description arrives as one unbroken wall of text — which
                      is the whole reason this page felt thin. */}
                  <p
                    className={cn(
                      "mt-3 whitespace-pre-line leading-relaxed text-muted-foreground",
                      bn
                    )}
                  >
                    {book.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <BookPreview
            images={book.previewImages}
            pdfUrl={book.previewPdfUrl}
            title={book.title}
            bn={bn}
            labels={{
              heading: S.previewHeading,
              subtitle: S.previewSubtitle,
              samplePages: S.samplePages,
              pdfTitle: S.pdfTitle,
              pdfDesc: S.pdfDesc,
              openPdf: S.openPdf,
              readALittle: S.readALittle,
              close: S.close,
              prev: S.prev,
              next: S.next,
              counter: S.counter,
            }}
          />
        </div>
      </Container>
    </main>
  );
}

// Layout-matching skeleton shown while the book loads.
function DetailSkeleton({ bn }: { bn: string }) {
  return (
    <main>
      <div className="border-b border-border bg-surface-soft">
        <Container>
          <div className="flex items-center gap-2 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </Container>
      </div>
      <Container>
        <div className="py-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
            <div className="mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none">
              <div className="aspect-[2/3] w-full animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-9 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-10 w-40 animate-pulse rounded bg-muted" />
              <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-12 w-52 animate-pulse rounded-xl bg-muted" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
              </div>
              <div className="h-24 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

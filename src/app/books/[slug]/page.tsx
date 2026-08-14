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
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, Badge, buttonVariants, cn } from "@/components/ui";
import API_BASE_URL from "@/config/api";
import { Book, formatBDT, discountPercent, bookCheckoutHref } from "@/components/books/types";
import { BookPreview } from "@/components/books/BookPreview";

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

  const [book, setBook] = useState<Book | null>(null);
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
        const data: Book | null = json?.data ?? (json?.slug ? json : null);
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
  const price = formatBDT(book.offerPrice) ?? formatBDT(book.price);
  const original = book.offerPrice ? formatBDT(book.price) : null;
  const discount = discountPercent(book.price, book.offerPrice);
  const savings =
    book.offerPrice && book.price ? formatBDT(book.price - book.offerPrice) : null;

  const stock = book.stock ?? 0;
  const printedOutOfStock = !isDigital && stock <= 0;
  const printedLowStock = !isDigital && stock > 0 && stock <= 10;

  const ctaLabel = printedOutOfStock ? S.unavailable : isDigital ? S.buyNow : S.orderNow;

  const details = [
    book.category && { icon: <LuTag />, label: S.category, value: book.category },
    { icon: isDigital ? <LuMonitorSmartphone /> : <LuBookMarked />, label: S.format, value: isDigital ? S.digital : S.printed },
    book.language && { icon: <LuLanguages />, label: S.language, value: S.langMap[book.language] ?? book.language },
    {
      icon: isDigital ? <LuCircleCheck /> : printedOutOfStock ? <LuTriangleAlert /> : <LuCircleCheck />,
      label: S.availability,
      value: isDigital ? S.instantAccess : printedOutOfStock ? S.outOfStock : printedLowStock ? S.lowStock(stock) : S.inStock,
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
                  {discount && (
                    <Badge variant="coral" className="absolute right-3 top-3 bg-card/90 backdrop-blur">
                      -{discount}% {S.off}
                    </Badge>
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

              {/* Availability note */}
              <div
                className={cn(
                  "mt-5 flex items-start gap-3 rounded-xl border p-4",
                  printedOutOfStock
                    ? "border-coral/30 bg-coral/10"
                    : "border-border bg-surface-soft"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isDigital
                      ? "bg-accent-soft text-accent"
                      : printedOutOfStock
                        ? "bg-coral/15 text-coral"
                        : "bg-primary-soft text-primary"
                  )}
                >
                  {isDigital ? <LuMonitorSmartphone /> : printedOutOfStock ? <LuTriangleAlert /> : <LuTruck />}
                </span>
                <div>
                  <p className={cn("text-sm font-semibold text-foreground", bn)}>
                    {isDigital
                      ? S.instantAccess
                      : printedOutOfStock
                        ? S.outOfStock
                        : printedLowStock
                          ? S.lowStock(stock)
                          : S.inStock}
                  </p>
                  <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>
                    {isDigital ? S.instantNote : S.printedNote}
                  </p>
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

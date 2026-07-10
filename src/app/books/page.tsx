"use client";

import { useEffect, useMemo, useState } from "react";
import { LuLibrary, LuBookMarked, LuMonitorSmartphone, LuSearchX } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, Button, cn } from "@/components/ui";
import API_BASE_URL from "@/config/api";
import { Book } from "@/components/books/types";
import { BookCard } from "@/components/books/BookCard";
import { BookFilters, type FormatFilter } from "@/components/books/BookFilters";
import { BooksSkeletonGrid, BooksEmptyState, BOOK_GRID_COLS } from "@/components/books/BooksStates";

const copy = {
  en: {
    eyebrow: "Medical Library",
    title: "Books & Study Resources",
    subtitle:
      "Printed and digital medical books, note banks and MCQ collections — curated for exam success.",
    total: "Books",
    printed: "Printed",
    digital: "Digital",
    searchPlaceholder: "Search by title or author…",
    format: "Format",
    all: "All",
    category: "Category",
    allCategories: "All categories",
    clear: "Clear",
    off: "OFF",
    by: "by",
    view: "View book",
    showing: (n: number, total: number) => `Showing ${n} of ${total} books`,
    loadErrorTitle: "Couldn't load books",
    loadErrorText: "Something went wrong while fetching the library. Please try again.",
    retry: "Try again",
    emptyTitle: "No books available yet",
    emptyText: "New medical titles are on the way. Please check back soon.",
    noResultsTitle: "No matching books",
    noResultsText: "Try a different search term, format or category.",
  },
  bn: {
    eyebrow: "মেডিকেল লাইব্রেরি",
    title: "বই ও স্টাডি রিসোর্স",
    subtitle:
      "প্রিন্টেড ও ডিজিটাল মেডিকেল বই, নোট এবং MCQ সংকলন — পরীক্ষায় সাফল্যের জন্য নির্বাচিত।",
    total: "বই",
    printed: "প্রিন্টেড",
    digital: "ডিজিটাল",
    searchPlaceholder: "নাম বা লেখক দিয়ে খুঁজুন…",
    format: "ফরম্যাট",
    all: "সব",
    category: "ক্যাটাগরি",
    allCategories: "সব ক্যাটাগরি",
    clear: "রিসেট",
    off: "ছাড়",
    by: "লেখক:",
    view: "বই দেখুন",
    showing: (n: number, total: number) => `${total} টির মধ্যে ${n} টি বই দেখানো হচ্ছে`,
    loadErrorTitle: "বই লোড করা যায়নি",
    loadErrorText: "লাইব্রেরি আনতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
    retry: "আবার চেষ্টা করুন",
    emptyTitle: "এখনো কোনো বই নেই",
    emptyText: "নতুন মেডিকেল বই শীঘ্রই আসছে। একটু পরে আবার দেখুন।",
    noResultsTitle: "মিল পাওয়া যায়নি",
    noResultsText: "অন্য কোনো শব্দ, ফরম্যাট বা ক্যাটাগরি দিয়ে চেষ্টা করুন।",
  },
};

export default function BooksPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const S = isBengali ? copy.bn : copy.en;

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/books`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch books");
        const json = await res.json();
        const data: Book[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];
        if (active) setBooks(data);
      } catch {
        if (active) {
          setBooks([]);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const categories = useMemo(
    () =>
      Array.from(new Set(books.map((b) => b.category).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [books]
  );

  const counts = useMemo(
    () => ({
      total: books.length,
      printed: books.filter((b) => b.format === "printed").length,
      digital: books.filter((b) => b.format === "digital").length,
    }),
    [books]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((b) => {
      if (format !== "all" && b.format !== format) return false;
      if (category !== "all" && b.category !== category) return false;
      if (q) {
        const haystack = `${b.title ?? ""} ${b.author ?? ""} ${b.category ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [books, search, format, category]);

  const isFiltered = search.trim() !== "" || format !== "all" || category !== "all";
  const clearFilters = () => {
    setSearch("");
    setFormat("all");
    setCategory("all");
  };

  const stats = [
    { icon: <LuLibrary />, value: counts.total, label: S.total },
    { icon: <LuBookMarked />, value: counts.printed, label: S.printed },
    { icon: <LuMonitorSmartphone />, value: counts.digital, label: S.digital },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-medical-mesh">
        <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />
        <Container className="relative">
          <div className="py-14 sm:py-16">
            <SectionHeading
              align="left"
              bengali={isBengali}
              icon={<LuLibrary />}
              eyebrow={S.eyebrow}
              title={S.title}
              subtitle={S.subtitle}
              className="max-w-3xl"
            />
            {!loading && !error && counts.total > 0 && (
              <div className="mt-7 flex flex-wrap gap-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 shadow-soft"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      {s.icon}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-lg font-bold text-foreground">{s.value}</span>
                      <span className={cn("block text-xs text-muted-foreground", bn)}>{s.label}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Catalog */}
      <section className="py-12 sm:py-14">
        <Container>
          <BookFilters
            search={search}
            onSearch={setSearch}
            format={format}
            onFormat={setFormat}
            category={category}
            categories={categories}
            onCategory={setCategory}
            isFiltered={isFiltered}
            onClear={clearFilters}
            bn={bn}
            labels={{
              searchPlaceholder: S.searchPlaceholder,
              format: S.format,
              all: S.all,
              printed: S.printed,
              digital: S.digital,
              category: S.category,
              allCategories: S.allCategories,
              clear: S.clear,
            }}
          />

          <div className="mt-8">
            {loading ? (
              <BooksSkeletonGrid count={8} />
            ) : error ? (
              <BooksEmptyState
                icon={<LuSearchX className="text-2xl" />}
                title={S.loadErrorTitle}
                text={S.loadErrorText}
                bn={bn}
                action={
                  <Button onClick={() => setReloadKey((k) => k + 1)} className={bn}>
                    {S.retry}
                  </Button>
                }
              />
            ) : books.length === 0 ? (
              <BooksEmptyState title={S.emptyTitle} text={S.emptyText} bn={bn} />
            ) : filtered.length === 0 ? (
              <BooksEmptyState
                icon={<LuSearchX className="text-2xl" />}
                title={S.noResultsTitle}
                text={S.noResultsText}
                bn={bn}
                action={
                  <Button variant="outline" onClick={clearFilters} className={bn}>
                    {S.clear}
                  </Button>
                }
              />
            ) : (
              <>
                <p className={cn("mb-5 text-sm text-muted-foreground", bn)}>
                  {S.showing(filtered.length, counts.total)}
                </p>
                <div className={BOOK_GRID_COLS}>
                  {filtered.map((book) => (
                    <BookCard
                      key={book._id ?? book.slug}
                      book={book}
                      bn={bn}
                      labels={{
                        by: S.by,
                        printed: S.printed,
                        digital: S.digital,
                        view: S.view,
                        off: S.off,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
}

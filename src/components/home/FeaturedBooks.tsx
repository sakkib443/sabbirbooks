"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowRight, LuLibrary } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, buttonVariants, cn } from "@/components/ui";
import { BookCard, type Book } from "./BookCard";
import { EmptyState, SkeletonGrid } from "./CatalogStates";
import API_BASE_URL from "@/config/api";

export default function FeaturedBooks() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
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
        if (active) setBooks([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const items = books.slice(0, 4);

  return (
    <section className="bg-surface-soft py-20">
      <Container>
        <div className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            bengali={isBengali}
            icon={<LuLibrary />}
            eyebrow={t("featuredBooks.eyebrow")}
            title={t("featuredBooks.title")}
            subtitle={t("featuredBooks.subtitle")}
          />
          <Link
            href="/books"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden shrink-0 sm:inline-flex", bn)}
          >
            {t("featuredBooks.viewAll")} <LuArrowRight className="text-sm" />
          </Link>
        </div>

        {loading ? (
          <SkeletonGrid count={4} ratio="cover" />
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {items.map((book) => (
                <BookCard key={book._id ?? book.slug} book={book} t={t} bn={bn} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/books" className={cn(buttonVariants({ variant: "outline", size: "md" }), bn)}>
                {t("featuredBooks.browse")} <LuArrowRight className="text-sm" />
              </Link>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<LuLibrary className="text-2xl" />}
            title={t("featuredBooks.emptyTitle")}
            text={t("featuredBooks.emptyText")}
            bn={bn}
          />
        )}
      </Container>
    </section>
  );
}

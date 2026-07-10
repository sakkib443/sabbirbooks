/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { LuArrowRight, LuMonitorSmartphone, LuBookMarked } from "react-icons/lu";
import { Card, Badge, cn } from "@/components/ui";
import { Book, formatBDT, discountPercent } from "./types";
import BookCover from "@/components/shared/BookCover";

export interface BookCardLabels {
  by: string;
  printed: string;
  digital: string;
  view: string;
  off: string; // suffix for the discount badge, e.g. "OFF" / "ছাড়"
}

// Catalog tile for the Books listing grid. Cover + title + author + price + format badge.
export function BookCard({
  book,
  labels,
  bn = "",
}: {
  book: Book;
  labels: BookCardLabels;
  bn?: string;
}) {
  const href = `/books/${book.slug}`;
  const isDigital = book.format === "digital";
  const price = formatBDT(book.offerPrice) ?? formatBDT(book.price);
  const original = book.offerPrice ? formatBDT(book.price) : null;
  const discount = discountPercent(book.price, book.offerPrice);
  const formatLabel = isDigital ? labels.digital : labels.printed;

  return (
    <Card interactive className="group flex h-full flex-col overflow-hidden p-0">
      <Link
        href={href}
        className="relative block aspect-[2/3] overflow-hidden bg-primary-soft"
      >
        <BookCover
          title={book.title}
          author={book.author}
          category={book.category}
          coverImage={book.coverImage}
          className="transition-transform duration-500 group-hover:scale-105"
        />

        <Badge
          variant={isDigital ? "accent" : "secondary"}
          className={cn("absolute left-2.5 top-2.5 bg-card/90 backdrop-blur", bn)}
        >
          {isDigital ? <LuMonitorSmartphone /> : <LuBookMarked />}
          {formatLabel}
        </Badge>

        {discount && (
          <Badge variant="coral" className="absolute right-2.5 top-2.5 bg-card/90 backdrop-blur">
            -{discount}% {labels.off}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {book.category && (
          <p className={cn("mb-1 line-clamp-1 text-xs font-semibold text-primary", bn)}>
            {book.category}
          </p>
        )}
        <h3
          className={cn(
            "line-clamp-2 font-heading text-[15px] font-semibold leading-snug text-foreground",
            bn
          )}
        >
          <Link href={href} className="transition-colors hover:text-primary">
            {book.title}
          </Link>
        </h3>
        {book.author && (
          <p className={cn("mt-1 line-clamp-1 text-xs text-muted-foreground", bn)}>
            {labels.by} {book.author}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">{price}</span>
            {original && original !== price && (
              <span className="text-xs text-muted-foreground line-through">{original}</span>
            )}
          </div>
          <Link
            href={href}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground",
              bn
            )}
          >
            {labels.view}
            <LuArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default BookCard;

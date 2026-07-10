/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { Card, Badge, cn } from "@/components/ui";
import BookCover from "@/components/shared/BookCover";

// Mirrors the backend IBook public fields — reusable by the Books page agent.
export interface Book {
  _id?: string;
  id?: number;
  title: string;
  slug: string;
  author?: string;
  coverImage?: string;
  price?: number;
  offerPrice?: number;
  category?: string;
  format?: "printed" | "digital" | string;
}

type TFn = (key: string, fallback?: string) => string;

const bdt = (v?: number) => (typeof v === "number" ? "৳" + v.toLocaleString("en-US") : null);

export function BookCard({ book, t, bn = "" }: { book: Book; t: TFn; bn?: string }) {
  const href = `/books/${book.slug}`;
  const price = bdt(book.offerPrice) ?? bdt(book.price);
  const original = book.offerPrice ? bdt(book.price) : null;
  const formatLabel =
    book.format === "digital"
      ? t("featuredBooks.digital")
      : book.format === "printed"
        ? t("featuredBooks.printed")
        : null;

  return (
    <Card interactive className="group flex flex-col overflow-hidden p-0">
      <Link href={href} className="relative block aspect-[2/3] overflow-hidden bg-primary-soft">
        <BookCover
          title={book.title}
          author={book.author}
          category={book.category}
          coverImage={book.coverImage}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        {formatLabel && (
          <Badge
            variant={book.format === "digital" ? "accent" : "secondary"}
            className="absolute left-2.5 top-2.5 bg-card/90 backdrop-blur"
          >
            {formatLabel}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {book.category && (
          <p className={cn("mb-1 text-xs font-semibold text-primary", bn)}>{book.category}</p>
        )}
        <h3 className={cn("line-clamp-2 font-heading text-[15px] font-semibold leading-snug text-foreground", bn)}>
          <Link href={href} className="transition-colors hover:text-primary">
            {book.title}
          </Link>
        </h3>
        {book.author && (
          <p className={cn("mt-1 line-clamp-1 text-xs text-muted-foreground", bn)}>
            {t("featuredBooks.by")} {book.author}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">{price}</span>
            {original && original !== price && (
              <span className="text-xs text-muted-foreground line-through">{original}</span>
            )}
          </div>
          <Link
            href={href}
            aria-label={t("featuredBooks.view")}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <LuArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default BookCard;

"use client";

import type { ReactNode } from "react";
import { LuSearch, LuBookMarked, LuMonitorSmartphone, LuLibrary, LuX } from "react-icons/lu";
import { Input, cn } from "@/components/ui";

export type FormatFilter = "all" | "printed" | "digital";

export interface BookFiltersLabels {
  searchPlaceholder: string;
  format: string;
  all: string;
  printed: string;
  digital: string;
  category: string;
  allCategories: string;
  clear: string;
}

const FORMAT_OPTIONS: { value: FormatFilter; icon: ReactNode }[] = [
  { value: "all", icon: <LuLibrary className="text-sm" /> },
  { value: "printed", icon: <LuBookMarked className="text-sm" /> },
  { value: "digital", icon: <LuMonitorSmartphone className="text-sm" /> },
];

// Controlled filter bar: search box, printed/digital segmented toggle, category select.
export function BookFilters({
  search,
  onSearch,
  format,
  onFormat,
  category,
  categories,
  onCategory,
  labels,
  isFiltered,
  onClear,
  bn = "",
}: {
  search: string;
  onSearch: (v: string) => void;
  format: FormatFilter;
  onFormat: (v: FormatFilter) => void;
  category: string;
  categories: string[];
  onCategory: (v: string) => void;
  labels: BookFiltersLabels;
  isFiltered: boolean;
  onClear: () => void;
  bn?: string;
}) {
  const formatText: Record<FormatFilter, string> = {
    all: labels.all,
    printed: labels.printed,
    digital: labels.digital,
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative w-full lg:max-w-sm">
          <LuSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className={cn("pl-10", bn)}
            aria-label={labels.searchPlaceholder}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Format segmented toggle */}
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-soft p-1"
            role="group"
            aria-label={labels.format}
          >
            {FORMAT_OPTIONS.map((opt) => {
              const active = format === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFormat(opt.value)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-primary",
                    bn
                  )}
                >
                  {opt.icon}
                  {formatText[opt.value]}
                </button>
              );
            })}
          </div>

          {/* Category select */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value)}
              aria-label={labels.category}
              className={cn(
                "h-11 w-full appearance-none rounded-xl border border-input bg-background pl-4 pr-9 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 sm:w-auto",
                bn
              )}
            >
              <option value="all">{labels.allCategories}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onClear}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-coral",
                bn
              )}
            >
              <LuX className="text-sm" />
              {labels.clear}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookFilters;

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LuSearch,
  LuX,
  LuStethoscope,
  LuGraduationCap,
  LuBookOpen,
  LuTriangleAlert,
  LuRotateCw,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, Input, cn } from "@/components/ui";
import API_BASE_URL from "@/config/api";
import { CourseCard } from "./CourseCard";
import {
  type Course,
  type Category,
  type Mentor,
  categoryId,
  categoryName,
} from "./courseTypes";

const ALL = "all";

// ---------------------------------------------------------------------------
// Skeletons (self-contained so this page never depends on other agents' files)
// ---------------------------------------------------------------------------
function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="aspect-video w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function CourseGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <CourseGrid>
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </CourseGrid>
  );
}

// ---------------------------------------------------------------------------
// Suspense fallback — rendered during prerender before useSearchParams resolves.
// Kept free of routing hooks so the shell can be statically prerendered.
// ---------------------------------------------------------------------------
export function CoursesBrowserFallback() {
  return (
    <div className="pb-20">
      <CoursesHero>
        <div className="mx-auto mt-8 h-12 w-full max-w-xl animate-pulse rounded-xl bg-white/40" />
      </CoursesHero>
      <Container className="mt-10">
        <CourseGridSkeleton count={6} />
      </Container>
    </div>
  );
}

// Shared hero band (used by the live browser + the fallback).
function CoursesHero({
  children,
  eyebrow,
  title,
  subtitle,
  bn = "",
}: {
  children?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bn?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-soft/70 via-background to-background">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      <Container className="relative py-14 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2">
            <span className="h-px w-6 bg-primary/50" />
            <span className="text-primary">
              <LuStethoscope />
            </span>
            <span className={cn("text-xs font-bold uppercase tracking-[0.16em] text-primary", bn)}>
              {eyebrow ?? " "}
            </span>
            <span className="h-px w-6 bg-primary/50" />
          </div>
          {title ? (
            <h1
              className={cn(
                "font-heading text-3xl font-bold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl",
                bn
              )}
            >
              {title}
            </h1>
          ) : (
            <div className="mx-auto h-10 w-72 animate-pulse rounded bg-muted" />
          )}
          {subtitle && (
            <p className={cn("mt-4 leading-relaxed text-muted-foreground", bn)}>{subtitle}</p>
          )}
          {children}
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Live browser
// ---------------------------------------------------------------------------
export default function CoursesBrowser() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const S = isBengali
    ? {
        eyebrow: "মেডিকেল কোর্স",
        title: "মেডিকেল কোর্সসমূহ",
        subtitle:
          "অভিজ্ঞ চিকিৎসক ও শিক্ষকদের কাছ থেকে শিখুন — পরীক্ষা-কেন্দ্রিক, দ্বিভাষিক কোর্সে অ্যানাটমি থেকে ফরেনসিক মেডিসিন পর্যন্ত।",
        searchPlaceholder: "কোর্স বা বিষয় খুঁজুন...",
        all: "সব কোর্স",
        results: (n: number) => `${n.toLocaleString("bn-BD")} টি কোর্স`,
        clear: "সার্চ মুছুন",
        emptyTitle: "কোনো কোর্স পাওয়া যায়নি",
        emptyText: "অন্য কোনো ক্যাটাগরি নির্বাচন করুন বা সার্চ পরিবর্তন করুন।",
        reset: "সব কোর্স দেখুন",
        errorTitle: "কোর্স লোড করা যায়নি",
        errorText: "আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
        viewCourse: "কোর্স দেখুন",
        students: "শিক্ষার্থী",
        lessons: "লেকচার",
        months: "মাস",
        free: "ফ্রি",
        by: "মেন্টর",
      }
    : {
        eyebrow: "Medical Courses",
        title: "Explore Medical Courses",
        subtitle:
          "Learn from expert physicians and educators — exam-focused, bilingual courses spanning Anatomy to Forensic Medicine.",
        searchPlaceholder: "Search courses or subjects...",
        all: "All courses",
        results: (n: number) => `${n.toLocaleString()} ${n === 1 ? "course" : "courses"}`,
        clear: "Clear search",
        emptyTitle: "No courses found",
        emptyText: "Try a different category or adjust your search.",
        reset: "View all courses",
        errorTitle: "Couldn't load courses",
        errorText: "Please check your connection and try again.",
        retry: "Retry",
        viewCourse: "View course",
        students: "students",
        lessons: "lessons",
        months: "months",
        free: "Free",
        by: "by",
      };

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mentorLookup, setMentorLookup] = useState<Record<string, Mentor>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters — `activeCat` holds a category _id or ALL; `search` mirrors the box.
  const [activeCat, setActiveCat] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [catResolved, setCatResolved] = useState(false);

  // Seed the search box from the URL once on mount.
  useEffect(() => {
    const s = searchParams.get("search") || searchParams.get("q");
    if (s) setSearch(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch catalog data. Courses are critical; categories + mentors enhance the
  // cards, so a failure in either of those does not blank the page.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    (async () => {
      const [coursesR, catsR, mentorsR] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/courses?limit=1000`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${API_BASE_URL}/categories`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`${API_BASE_URL}/mentors`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (!active) return;

      if (coursesR.status === "fulfilled" && Array.isArray(coursesR.value?.data)) {
        setCourses(coursesR.value.data);
      } else {
        setError(true);
      }
      if (catsR.status === "fulfilled" && Array.isArray(catsR.value?.data)) {
        setCategories(catsR.value.data);
      }
      if (mentorsR.status === "fulfilled" && Array.isArray(mentorsR.value?.data)) {
        const map: Record<string, Mentor> = {};
        (mentorsR.value.data as Mentor[]).forEach((m) => {
          if (m?._id) map[m._id] = m;
        });
        setMentorLookup(map);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const categoryLookup = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => {
      if (c?._id) map[c._id] = c.name;
    });
    return map;
  }, [categories]);

  // Resolve the ?category= param (which may be a name, numeric id, or _id — the
  // home page links by name) to a category _id once categories have loaded.
  useEffect(() => {
    if (catResolved || categories.length === 0) return;
    const param = searchParams.get("category");
    if (param) {
      const match = categories.find(
        (c) =>
          c._id === param ||
          String(c.id) === param ||
          c.name.toLowerCase() === param.toLowerCase()
      );
      if (match) setActiveCat(match._id);
    }
    setCatResolved(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, catResolved]);

  // Keep the URL shareable/back-friendly. Category is written as its name to
  // stay consistent with the home-page category links.
  const syncUrl = (nextCat: string, nextSearch: string) => {
    const params = new URLSearchParams();
    if (nextCat !== ALL) {
      const c = categories.find((x) => x._id === nextCat);
      if (c) params.set("category", c.name);
    }
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const selectCategory = (id: string) => {
    setActiveCat(id);
    syncUrl(id, search);
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    syncUrl(activeCat, value);
  };

  const clearSearch = () => {
    setSearch("");
    syncUrl(activeCat, "");
  };

  const resetAll = () => {
    setActiveCat(ALL);
    setSearch("");
    router.replace(pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (activeCat !== ALL && categoryId(c.category) !== activeCat) return false;
      if (!q) return true;
      const cat = categoryName(c.category, categoryLookup) || "";
      return (
        c.title?.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    });
  }, [courses, activeCat, search, categoryLookup]);

  const cardLabels = {
    viewCourse: S.viewCourse,
    students: S.students,
    lessons: S.lessons,
    months: S.months,
    free: S.free,
    by: S.by,
  };

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-soft"
        : "border-border bg-card text-foreground/75 hover:border-primary/40 hover:text-primary",
      bn
    );

  return (
    <div className="pb-20">
      <CoursesHero
        eyebrow={S.eyebrow}
        title={S.title}
        subtitle={S.subtitle}
        bn={bn}
      >
        {/* Search box */}
        <div className="mx-auto mt-8 max-w-xl">
          <div className="relative">
            <LuSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={S.searchPlaceholder}
              aria-label={S.searchPlaceholder}
              className={cn("pl-11 pr-11 shadow-soft", bn)}
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={S.clear}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LuX />
              </button>
            )}
          </div>
        </div>
      </CoursesHero>

      <Container className="mt-8">
        {/* Category filter chips */}
        {categories.length > 0 && (
          <div className="-mx-4 mb-6 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => selectCategory(ALL)}
              className={chipClass(activeCat === ALL)}
            >
              <LuGraduationCap className="text-base" />
              {S.all}
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => selectCategory(c._id)}
                className={chipClass(activeCat === c._id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        {!loading && !error && (
          <p className={cn("mb-5 text-sm text-muted-foreground", bn)}>{S.results(filtered.length)}</p>
        )}

        {/* States */}
        {loading ? (
          <CourseGridSkeleton count={6} />
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/12 text-coral">
              <LuTriangleAlert className="text-2xl" />
            </div>
            <h3 className={cn("font-heading text-lg font-semibold text-foreground", bn)}>
              {S.errorTitle}
            </h3>
            <p className={cn("mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground", bn)}>
              {S.errorText}
            </p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className={cn(
                "mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-primary-hover",
                bn
              )}
            >
              <LuRotateCw /> {S.retry}
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <CourseGrid>
            {filtered.map((course) => (
              <CourseCard
                key={course._id ?? course.id}
                course={course}
                categoryLookup={categoryLookup}
                mentorLookup={mentorLookup}
                labels={cardLabels}
                bn={bn}
              />
            ))}
          </CourseGrid>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <LuBookOpen className="text-2xl" />
            </div>
            <h3 className={cn("font-heading text-lg font-semibold text-foreground", bn)}>
              {S.emptyTitle}
            </h3>
            <p className={cn("mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground", bn)}>
              {S.emptyText}
            </p>
            <button
              type="button"
              onClick={resetAll}
              className={cn(
                "mt-5 inline-flex items-center gap-2 rounded-xl border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-soft",
                bn
              )}
            >
              {S.reset}
            </button>
          </div>
        )}
      </Container>
    </div>
  );
}

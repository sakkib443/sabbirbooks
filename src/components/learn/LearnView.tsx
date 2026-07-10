"use client";

// Recorded-course player. Fetches the course + curriculum + access, tracks the
// selected lesson (mirrored to the URL ?lesson= for shareable deep links), and
// renders the video/text player with a lock gate for premium lessons.
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuUserRound,
  LuLockOpen,
  LuLock,
  LuChevronRight,
  LuStethoscope,
  LuDownload,
  LuLoaderCircle,
  LuTriangleAlert,
  LuLayers,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Badge, buttonVariants, cn } from "@/components/ui";
import {
  fetchLearnData,
  flattenLessons,
  isLessonPlayable,
  type CurriculumModule,
  type LearnCourse,
  type LearnLesson,
  type LearnMentor,
} from "./types";
import VideoPlayer from "./VideoPlayer";
import LessonSidebar from "./LessonSidebar";

type Status = "loading" | "ready" | "error";

export default function LearnView() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId;
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [status, setStatus] = useState<Status>("loading");
  const [course, setCourse] = useState<LearnCourse | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumModule[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const S = isBengali
    ? {
        back: "ড্যাশবোর্ডে ফিরুন",
        mentor: "মেন্টর",
        enrolled: "আপনি এনরোলড",
        previewMode: "প্রিভিউ মোড",
        notEnrolledTitle: "আপনি এখনো এনরোল করেননি",
        notEnrolledText: "ফ্রি লেসনগুলো এখনই দেখুন। সম্পূর্ণ কোর্স আনলক করতে এনরোল করুন।",
        enroll: "এখনই এনরোল করুন",
        curriculum: "কোর্স কারিকুলাম",
        materials: "রিসোর্স ও উপকরণ",
        free: "ফ্রি প্রিভিউ",
        emptyTitle: "কোনো লেসন পাওয়া যায়নি",
        emptyText: "এই কোর্সে এখনো কোনো কনটেন্ট যোগ করা হয়নি।",
        errTitle: "কোর্সটি লোড করা যায়নি",
        errText: "কোর্সটি নেই বা লোড করা যায়নি। আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
        browse: "সব কোর্স দেখুন",
        loading: "কোর্স লোড হচ্ছে...",
      }
    : {
        back: "Back to dashboard",
        mentor: "Mentor",
        enrolled: "You're enrolled",
        previewMode: "Preview mode",
        notEnrolledTitle: "You're not enrolled yet",
        notEnrolledText: "Watch the free preview lessons now. Enroll to unlock the whole course.",
        enroll: "Enroll now",
        curriculum: "Course curriculum",
        materials: "Resources & materials",
        free: "Free preview",
        emptyTitle: "No lessons found",
        emptyText: "No content has been added to this course yet.",
        errTitle: "Couldn't load the course",
        errText: "The course doesn't exist or failed to load. Please try again.",
        retry: "Try again",
        browse: "Browse all courses",
        loading: "Loading course...",
      };

  const load = useCallback(async () => {
    if (!courseId) return;
    setStatus("loading");
    const data = await fetchLearnData(courseId);
    if (!data.course) {
      setStatus("error");
      return;
    }
    setCourse(data.course);
    setCurriculum(data.curriculum);
    setHasAccess(data.hasAccess);

    // Pick the initial lesson: URL ?lesson= → first playable → first overall.
    const all = flattenLessons(data.curriculum);
    let initial: LearnLesson | undefined;
    if (typeof window !== "undefined") {
      const wanted = new URLSearchParams(window.location.search).get("lesson");
      if (wanted) initial = all.find((l) => l._id === wanted);
    }
    if (!initial) initial = all.find((l) => isLessonPlayable(l, data.hasAccess));
    if (!initial) initial = all[0];
    setSelectedId(initial?._id ?? null);
    setStatus("ready");
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const select = useCallback((lesson: LearnLesson) => {
    setSelectedId(lesson._id);
    // Mirror to the URL without a full navigation (keeps deep links shareable).
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("lesson", lesson._id);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const allLessons = useMemo(() => flattenLessons(curriculum), [curriculum]);
  const selected = useMemo(
    () => allLessons.find((l) => l._id === selectedId) ?? null,
    [allLessons, selectedId]
  );

  const mentor = (course && typeof course.mentor === "object" ? course.mentor : undefined) as
    | LearnMentor
    | undefined;

  const enrollHref = course
    ? course.id
      ? `/checkout?type=course&id=${course.id}`
      : `/courses/${course._id}`
    : "/courses";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <LuLoaderCircle className="animate-spin text-3xl text-primary" />
        <p className={cn("text-sm", bn)}>{S.loading}</p>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/12 text-coral">
          <LuTriangleAlert className="text-3xl" />
        </div>
        <h1 className={cn("font-heading text-2xl font-bold text-foreground", bn)}>{S.errTitle}</h1>
        <p className={cn("mx-auto mt-2 max-w-sm text-sm text-muted-foreground", bn)}>{S.errText}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={load} className={cn(buttonVariants({ variant: "primary" }), bn)}>
            {S.retry}
          </button>
          <Link href="/courses" className={cn(buttonVariants({ variant: "outline" }), bn)}>
            {S.browse}
          </Link>
        </div>
      </div>
    );
  }

  const isEmpty = allLessons.length === 0;
  const selectedPlayable = selected ? isLessonPlayable(selected, hasAccess) : false;

  return (
    <div className="min-h-screen bg-surface-soft/40 pb-16">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6">
          <Link
            href="/dashboard/my-courses"
            className={cn("mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary", bn)}
          >
            <LuArrowLeft /> {S.back}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className={cn("font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl", bn)}>
                {course?.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {mentor?.name && (
                  <span className={cn("inline-flex items-center gap-1.5", bn)}>
                    <LuUserRound className="text-primary" /> {mentor.name}
                  </span>
                )}
                {course?.type && (
                  <span className={cn("inline-flex items-center gap-1.5", bn)}>
                    <LuStethoscope className="text-primary" /> {course.type}
                  </span>
                )}
              </div>
            </div>
            <Badge variant={hasAccess ? "accent" : "muted"} className={bn}>
              {hasAccess ? <LuLockOpen className="text-sm" /> : <LuLock className="text-sm" />}
              {hasAccess ? S.enrolled : S.previewMode}
            </Badge>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        {/* Not-enrolled banner (preview mode) */}
        {!hasAccess && (
          <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary-soft/60 px-5 py-4", bn)}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <LuLock className="text-lg" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-foreground">{S.notEnrolledTitle}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{S.notEnrolledText}</p>
              </div>
            </div>
            <Link href={enrollHref} className={cn(buttonVariants({ variant: "primary", size: "md" }), bn)}>
              {S.enroll} <LuChevronRight />
            </Link>
          </div>
        )}

        {isEmpty ? (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-soft">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <LuLayers className="text-3xl" />
            </div>
            <h2 className={cn("font-heading text-xl font-bold text-foreground", bn)}>{S.emptyTitle}</h2>
            <p className={cn("mx-auto mt-2 max-w-sm text-sm text-muted-foreground", bn)}>{S.emptyText}</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main: player + lesson meta */}
            <div className="space-y-5 lg:col-span-2">
              <VideoPlayer
                lesson={selected}
                course={course}
                hasAccess={hasAccess}
                enrollHref={enrollHref}
                isBengali={isBengali}
              />

              {selected && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>
                      {isBengali && selected.titleBn ? selected.titleBn : selected.title}
                    </h2>
                    {selected.isFree && !hasAccess && (
                      <Badge variant="accent" className={bn}>
                        {S.free}
                      </Badge>
                    )}
                  </div>
                  {selected.description && selected.type !== "text" && (
                    <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", bn)}>
                      {selected.description}
                    </p>
                  )}

                  {/* Materials (only when the lesson is playable) */}
                  {selectedPlayable &&
                    selected.materials &&
                    selected.materials.length > 0 && (
                      <div className="mt-5 border-t border-border pt-5">
                        <p className={cn("mb-3 text-sm font-semibold text-foreground", bn)}>
                          {S.materials}
                        </p>
                        <ul className="space-y-2">
                          {selected.materials.map((m, i) => (
                            <li key={m._id ?? i}>
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border border-border bg-surface-soft/50 px-4 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary-soft/40",
                                  bn
                                )}
                              >
                                <LuDownload className="shrink-0 text-primary" />
                                <span className="min-w-0 flex-1 truncate text-foreground">{m.title}</span>
                                {m.fileType && (
                                  <span className="shrink-0 text-xs uppercase text-muted-foreground">
                                    {m.fileType.split("/").pop()}
                                  </span>
                                )}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Sidebar: curriculum */}
            <aside className="lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <h2 className={cn("mb-3 inline-flex items-center gap-2 font-heading text-base font-bold text-foreground", bn)}>
                  <LuLayers className="text-primary" /> {S.curriculum}
                </h2>
                <LessonSidebar
                  curriculum={curriculum}
                  selectedId={selectedId}
                  hasAccess={hasAccess}
                  onSelect={select}
                  isBengali={isBengali}
                />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

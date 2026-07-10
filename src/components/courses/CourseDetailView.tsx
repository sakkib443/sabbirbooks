"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuChevronRight,
  LuStar,
  LuUsers,
  LuClock,
  LuCalendar,
  LuLayers,
  LuGraduationCap,
  LuStethoscope,
  LuBriefcase,
  LuMonitor,
  LuShieldCheck,
  LuBookOpen,
  LuUserRound,
  LuVideo,
  LuFileText,
  LuClipboardCheck,
  LuMessageCircle,
  LuCheck,
  LuSparkles,
  LuBadgeCheck,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { useLanguage } from "@/context/LanguageContext";
import { Container, Badge, buttonVariants, cn } from "@/components/ui";
import API_BASE_URL from "@/config/api";
import {
  type Course,
  type Mentor,
  formatBDT,
  isFree,
  savingBDT,
} from "./courseTypes";

// Map the backend courseIncludes[].icon keys to medical-friendly icons.
const INCLUDE_ICON: Record<string, IconType> = {
  video: LuVideo,
  file: LuFileText,
  quiz: LuClipboardCheck,
  support: LuMessageCircle,
};

export default function CourseDetailView() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [course, setCourse] = useState<Course | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading");

  const S = isBengali
    ? {
        home: "হোম",
        courses: "কোর্সসমূহ",
        back: "সব কোর্স",
        overview: "কোর্স পরিচিতি",
        about: "কোর্স সম্পর্কে",
        curriculum: "কারিকুলাম",
        modules: "মডিউল",
        included: "যা যা থাকছে",
        learn: "যা যা শিখবেন",
        career: "ক্যারিয়ার সুযোগ",
        mentor: "আপনার মেন্টর",
        enroll: "এখনই এনরোল করুন",
        free: "ফ্রি",
        save: (v: string) => `${v} সাশ্রয়`,
        seatNote: (v: string) => `মাত্র ${v} দিয়ে আসন নিশ্চিত করুন, বাকিটা কিস্তিতে।`,
        secure: "নিরাপদ এনরোলমেন্ট",
        format: "ধরন",
        duration: "সময়কাল",
        durationVal: (m: number) => `${m} মাস`,
        lectures: "লেকচার",
        exams: "পরীক্ষা",
        starts: "শুরু",
        students: "শিক্ষার্থী",
        rating: "রেটিং",
        specializes: "বিশেষায়িত ক্ষেত্র",
        experience: "অভিজ্ঞতা",
        years: "বছর",
        notFoundTitle: "কোর্সটি পাওয়া যায়নি",
        notFoundText: "আপনি যে কোর্সটি খুঁজছেন সেটি নেই বা সরিয়ে ফেলা হয়েছে।",
        browseAll: "সব কোর্স দেখুন",
      }
    : {
        home: "Home",
        courses: "Courses",
        back: "All courses",
        overview: "Course overview",
        about: "About this course",
        curriculum: "Curriculum",
        modules: "modules",
        included: "What's included",
        learn: "What you'll learn",
        career: "Career opportunities",
        mentor: "Your mentor",
        enroll: "Enroll now",
        free: "Free",
        save: (v: string) => `Save ${v}`,
        seatNote: (v: string) => `Reserve your seat with ${v}, pay the rest in installments.`,
        secure: "Secure enrollment",
        format: "Format",
        duration: "Duration",
        durationVal: (m: number) => `${m} ${m === 1 ? "month" : "months"}`,
        lectures: "Lectures",
        exams: "Exams",
        starts: "Starts",
        students: "students",
        rating: "rating",
        specializes: "Specialized areas",
        experience: "Experience",
        years: "years",
        notFoundTitle: "Course not found",
        notFoundText: "The course you're looking for doesn't exist or was removed.",
        browseAll: "Browse all courses",
      };

  useEffect(() => {
    if (!id) return;
    let active = true;
    setStatus("loading");

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/courses/${id}`, { cache: "no-store" });
        if (!res.ok) {
          if (active) setStatus("notfound");
          return;
        }
        const json = await res.json();
        if (!active) return;
        if (json?.success && json?.data) {
          setCourse(json.data as Course);
          setStatus("ready");
        } else {
          setStatus("notfound");
        }
      } catch {
        if (active) setStatus("notfound");
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const fmtDate = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(isBengali ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ---- Loading ----
  if (status === "loading") {
    return (
      <div className="pb-20">
        <div className="h-64 w-full animate-pulse bg-muted sm:h-80" />
        <Container className="mt-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
            </div>
            <div className="h-72 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
        </Container>
      </div>
    );
  }

  // ---- Not found ----
  if (status === "notfound" || !course) {
    return (
      <Container className="py-24">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-soft">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <LuStethoscope className="text-3xl" />
          </div>
          <h1 className={cn("font-heading text-2xl font-bold text-foreground", bn)}>
            {S.notFoundTitle}
          </h1>
          <p className={cn("mx-auto mt-2 max-w-sm text-sm text-muted-foreground", bn)}>
            {S.notFoundText}
          </p>
          <Link
            href="/courses"
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-6", bn)}
          >
            <LuArrowLeft /> {S.browseAll}
          </Link>
        </div>
      </Container>
    );
  }

  // ---- Ready ----
  const categoryName =
    typeof course.category === "object" ? course.category?.name : undefined;
  const mentor = (typeof course.mentor === "object" ? course.mentor : undefined) as
    | Mentor
    | undefined;

  const free = isFree(course.fee);
  const price = formatBDT(course.offerPrice) ?? formatBDT(course.fee);
  const original = course.offerPrice ? formatBDT(course.fee) : null;
  const saving = savingBDT(course.fee, course.offerPrice);
  const admission = course.admissionFee && course.admissionFee > 0 ? course.admissionFee : 0;
  const startDate = fmtDate(course.courseStart);

  const enrollHref = `/checkout?type=course&id=${course.id}`;

  const metaRows: { icon: IconType; label: string; value: string }[] = [];
  if (course.type) metaRows.push({ icon: LuMonitor, label: S.format, value: course.type });
  if (course.durationMonth)
    metaRows.push({ icon: LuClock, label: S.duration, value: S.durationVal(course.durationMonth) });
  if (course.lectures)
    metaRows.push({ icon: LuVideo, label: S.lectures, value: String(course.lectures) });
  if (course.totalExam)
    metaRows.push({ icon: LuClipboardCheck, label: S.exams, value: String(course.totalExam) });
  if (startDate) metaRows.push({ icon: LuCalendar, label: S.starts, value: startDate });

  return (
    <div className="pb-20">
      {/* ---- Banner ---- */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          {course.image ? (
            <img src={course.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/25 to-accent/25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/35" />
        </div>

        <Container className="relative py-12 sm:py-16">
          {/* Breadcrumb */}
          <nav className={cn("mb-5 flex flex-wrap items-center gap-1.5 text-xs text-white/70", bn)}>
            <Link href="/" className="transition-colors hover:text-white">
              {S.home}
            </Link>
            <LuChevronRight className="text-white/40" />
            <Link href="/courses" className="transition-colors hover:text-white">
              {S.courses}
            </Link>
            <LuChevronRight className="text-white/40" />
            <span className="line-clamp-1 max-w-[60vw] text-white">{course.title}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {course.type && (
                <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur", bn)}>
                  <LuMonitor className="text-sm" /> {course.type}
                </span>
              )}
              {categoryName && (
                <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-white", bn)}>
                  <LuStethoscope className="text-sm" /> {categoryName}
                </span>
              )}
            </div>

            <h1
              className={cn(
                "font-heading text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl md:text-5xl",
                bn
              )}
            >
              {course.title}
            </h1>

            {course.details && (
              <p className={cn("mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base", bn)}>
                {course.details}
              </p>
            )}

            <div className={cn("mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85", bn)}>
              {course.rating ? (
                <span className="inline-flex items-center gap-1.5">
                  <LuStar className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-white">{course.rating.toFixed(1)}</span>
                  {course.totalRating ? (
                    <span className="text-white/60">({course.totalRating})</span>
                  ) : null}
                </span>
              ) : null}
              {course.totalStudentsEnroll ? (
                <span className="inline-flex items-center gap-1.5">
                  <LuUsers /> {course.totalStudentsEnroll.toLocaleString()} {S.students}
                </span>
              ) : null}
              {mentor?.name && (
                <span className="inline-flex items-center gap-1.5">
                  <LuUserRound /> {mentor.name}
                </span>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Container className="mt-8 lg:mt-10">
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {/* ---- Main content ---- */}
          <div className="space-y-10 lg:col-span-2">
            {/* Overview */}
            {course.courseOverview && (
              <section>
                <SectionTitle icon={LuBookOpen} title={S.overview} bn={bn} />
                <p className={cn("mt-4 leading-relaxed text-muted-foreground", bn)}>
                  {course.courseOverview}
                </p>
              </section>
            )}

            {/* What's included */}
            {course.courseIncludes && course.courseIncludes.length > 0 && (
              <section>
                <SectionTitle icon={LuBadgeCheck} title={S.included} bn={bn} />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {course.courseIncludes.map((inc, i) => {
                    const Icon = (inc.icon && INCLUDE_ICON[inc.icon]) || LuCheck;
                    return (
                      <div
                        key={inc._id ?? i}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-soft"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                          <Icon className="text-lg" />
                        </span>
                        <span className={cn("text-sm text-foreground", bn)}>{inc.text}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Curriculum */}
            {course.curriculum && course.curriculum.length > 0 && (
              <section>
                <SectionTitle
                  icon={LuLayers}
                  title={S.curriculum}
                  meta={`${course.curriculum.length} ${S.modules}`}
                  bn={bn}
                />
                <ol className="mt-4 space-y-3">
                  {course.curriculum.map((mod, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/30"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className={cn("pt-1 text-sm font-medium text-foreground", bn)}>{mod}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* What you'll learn (tools / resources) */}
            {course.softwareYoullLearn && course.softwareYoullLearn.length > 0 && (
              <section>
                <SectionTitle icon={LuSparkles} title={S.learn} bn={bn} />
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {course.softwareYoullLearn.map((item, i) => (
                    <span
                      key={i}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-soft px-3.5 py-1.5 text-sm text-foreground/80",
                        bn
                      )}
                    >
                      <LuCheck className="text-primary" /> {item}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Career opportunities */}
            {course.jobPositions && course.jobPositions.length > 0 && (
              <section>
                <SectionTitle icon={LuBriefcase} title={S.career} bn={bn} />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {course.jobPositions.map((job, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-soft"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <LuBriefcase className="text-lg" />
                      </span>
                      <span className={cn("text-sm font-medium text-foreground", bn)}>{job}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Mentor */}
            {mentor && (
              <section>
                <SectionTitle icon={LuGraduationCap} title={S.mentor} bn={bn} />
                <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="shrink-0">
                      {mentor.image ? (
                        <img
                          src={mentor.image}
                          alt={mentor.name}
                          className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary-soft"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                          <LuUserRound className="text-3xl" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn("font-heading text-lg font-semibold text-foreground", bn)}>
                        {mentor.name}
                      </h3>
                      {mentor.designation && (
                        <p className={cn("text-sm font-medium text-primary", bn)}>{mentor.designation}</p>
                      )}
                      {mentor.subject && (
                        <p className={cn("mt-0.5 text-xs text-muted-foreground", bn)}>{mentor.subject}</p>
                      )}
                      {mentor.details && (
                        <p className={cn("mt-3 text-sm leading-relaxed text-muted-foreground", bn)}>
                          {mentor.details}
                        </p>
                      )}

                      {mentor.specialized_area && mentor.specialized_area.length > 0 && (
                        <div className="mt-4">
                          <p className={cn("mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground", bn)}>
                            {S.specializes}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {mentor.specialized_area.map((area, i) => (
                              <Badge key={i} variant="primary" className={bn}>
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {mentor.training_experience?.years && (
                        <p className={cn("mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground", bn)}>
                          <LuBadgeCheck className="text-accent" />
                          {S.experience}: {mentor.training_experience.years} {S.years}
                          {mentor.training_experience.students
                            ? ` · ${mentor.training_experience.students}+ ${S.students}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ---- Sidebar price card ---- */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                {/* thumbnail */}
                <div className="relative aspect-video bg-primary-soft">
                  {course.image ? (
                    <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <LuStethoscope className="text-4xl text-primary/60" />
                    </div>
                  )}
                </div>

                <div className="p-5 sm:p-6">
                  {/* price */}
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    {free ? (
                      <span className={cn("text-3xl font-bold text-accent", bn)}>{S.free}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">{price}</span>
                        {original && original !== price && (
                          <span className="text-base text-muted-foreground line-through">{original}</span>
                        )}
                      </>
                    )}
                  </div>
                  {saving && (
                    <span className={cn("mt-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent", bn)}>
                      <LuBadgeCheck className="text-sm" /> {S.save(saving)}
                    </span>
                  )}

                  {/* enroll */}
                  <Link
                    href={enrollHref}
                    className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-5 w-full", bn)}
                  >
                    {S.enroll} <LuChevronRight />
                  </Link>

                  {admission > 0 && (
                    <p className={cn("mt-3 text-center text-xs leading-relaxed text-muted-foreground", bn)}>
                      {S.seatNote(formatBDT(admission) as string)}
                    </p>
                  )}

                  <p className={cn("mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground", bn)}>
                    <LuShieldCheck className="text-accent" /> {S.secure}
                  </p>

                  {/* meta */}
                  {metaRows.length > 0 && (
                    <dl className="mt-5 space-y-3 border-t border-border pt-5">
                      {metaRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                          <dt className={cn("inline-flex items-center gap-2 text-muted-foreground", bn)}>
                            <row.icon className="text-primary" /> {row.label}
                          </dt>
                          <dd className={cn("font-medium text-foreground", bn)}>{row.value}</dd>
                        </div>
                      ))}
                      {course.totalStudentsEnroll ? (
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <dt className={cn("inline-flex items-center gap-2 text-muted-foreground", bn)}>
                            <LuUsers className="text-primary" /> {S.students}
                          </dt>
                          <dd className="font-medium text-foreground">
                            {course.totalStudentsEnroll.toLocaleString()}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  )}
                </div>
              </div>

              <Link
                href="/courses"
                className={cn(
                  "mt-4 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary",
                  bn
                )}
              >
                <LuArrowLeft /> {S.back}
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  meta,
  bn = "",
}: {
  icon: IconType;
  title: string;
  meta?: string;
  bn?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={cn("inline-flex items-center gap-2.5 font-heading text-xl font-bold text-foreground", bn)}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="text-lg" />
        </span>
        {title}
      </h2>
      {meta && <span className={cn("text-sm text-muted-foreground", bn)}>{meta}</span>}
    </div>
  );
}

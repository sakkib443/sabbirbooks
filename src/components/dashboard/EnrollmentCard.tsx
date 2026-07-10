"use client";

/* eslint-disable @next/next/no-img-element */
// A single enrolled-course card. Used on the Overview ("continue learning")
// and My Courses pages. Links to the recorded-course player at /learn/[courseId]
// (courseId = the course Mongo _id). Falls back gracefully when the populated
// course was deleted (courseId === null).
import Link from "next/link";
import {
  LuStethoscope,
  LuPlay,
  LuUserRound,
  LuMonitor,
  LuClock,
  LuVideo,
} from "react-icons/lu";
import { Badge, buttonVariants, cn } from "@/components/ui";
import type { DashEnrollment, DashMentor } from "./dashboardApi";

type StatusTone = "primary" | "accent" | "coral" | "muted";

function statusMeta(status: string, isBengali: boolean): { label: string; tone: StatusTone } {
  switch (status) {
    case "active":
      return { label: isBengali ? "সক্রিয়" : "Active", tone: "accent" };
    case "pending":
      return { label: isBengali ? "অনুমোদনের অপেক্ষায়" : "Pending approval", tone: "coral" };
    case "completed":
      return { label: isBengali ? "সম্পন্ন" : "Completed", tone: "primary" };
    case "cancelled":
      return { label: isBengali ? "বাতিল" : "Cancelled", tone: "muted" };
    case "expired":
      return { label: isBengali ? "মেয়াদ শেষ" : "Expired", tone: "muted" };
    default:
      return { label: status, tone: "muted" };
  }
}

export default function EnrollmentCard({
  enrollment,
  isBengali,
}: {
  enrollment: DashEnrollment;
  isBengali: boolean;
}) {
  const bn = isBengali ? "hind-siliguri" : "";
  const course = enrollment.courseId;

  const S = isBengali
    ? {
        unavailable: "কোর্সটি আর নেই",
        unavailableText: "এই কোর্সটি সরিয়ে ফেলা হয়েছে।",
        continue: "শেখা চালিয়ে যান",
        mentor: "মেন্টর",
        lectures: "লেকচার",
        months: (m: number) => `${m} মাস`,
        progress: "অগ্রগতি",
      }
    : {
        unavailable: "Course unavailable",
        unavailableText: "This course has been removed.",
        continue: "Continue learning",
        mentor: "Mentor",
        lectures: "lectures",
        months: (m: number) => `${m} ${m === 1 ? "month" : "months"}`,
        progress: "Progress",
      };

  // Course was deleted after enrollment — show a muted placeholder.
  if (!course) {
    return (
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card opacity-70 shadow-soft">
        <div className="flex aspect-video items-center justify-center bg-muted">
          <LuStethoscope className="text-4xl text-muted-foreground/50" />
        </div>
        <div className="p-5">
          <h3 className={cn("font-heading text-base font-semibold text-foreground", bn)}>
            {S.unavailable}
          </h3>
          <p className={cn("mt-1 text-sm text-muted-foreground", bn)}>{S.unavailableText}</p>
        </div>
      </div>
    );
  }

  const mentor = (typeof course.mentor === "object" ? course.mentor : undefined) as
    | DashMentor
    | undefined;
  const status = statusMeta(enrollment.status, isBengali);
  const progress = Math.max(0, Math.min(100, enrollment.completionPercent ?? 0));
  const href = `/learn/${course._id}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card">
      {/* Thumbnail */}
      <Link href={href} className="relative block aspect-video overflow-hidden bg-primary-soft">
        {course.image ? (
          <img
            src={course.image}
            alt={course.title || ""}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LuStethoscope className="text-4xl text-primary/60" />
          </div>
        )}
        <span className="absolute right-3 top-3">
          <Badge variant={status.tone} className={bn}>
            {status.label}
          </Badge>
        </span>
        <span className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-glow transition-opacity duration-300 group-hover:opacity-100">
          <LuPlay className="text-lg" />
        </span>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {course.type && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", bn)}>
              <LuMonitor className="text-sm text-primary" /> {course.type}
            </span>
          )}
          {course.durationMonth ? (
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", bn)}>
              <LuClock className="text-sm text-primary" /> {S.months(course.durationMonth)}
            </span>
          ) : null}
          {course.lectures ? (
            <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-muted-foreground", bn)}>
              <LuVideo className="text-sm text-primary" /> {course.lectures} {S.lectures}
            </span>
          ) : null}
        </div>

        <Link href={href}>
          <h3 className={cn("line-clamp-2 font-heading text-base font-bold text-foreground transition-colors group-hover:text-primary", bn)}>
            {course.title}
          </h3>
        </Link>

        {mentor?.name && (
          <p className={cn("mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground", bn)}>
            <LuUserRound className="text-primary" /> {mentor.name}
          </p>
        )}

        {/* Progress */}
        <div className="mt-4">
          <div className={cn("mb-1.5 flex items-center justify-between text-xs text-muted-foreground", bn)}>
            <span>{S.progress}</span>
            <span className="font-semibold text-foreground">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link
          href={href}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-5 w-full", bn)}
        >
          <LuPlay /> {S.continue}
        </Link>
      </div>
    </div>
  );
}

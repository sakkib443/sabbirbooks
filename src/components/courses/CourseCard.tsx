/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  LuStar,
  LuUsers,
  LuClock,
  LuPlay,
  LuArrowRight,
  LuStethoscope,
  LuUserRound,
} from "react-icons/lu";
import { Card, Badge, cn } from "@/components/ui";
import {
  type Course,
  type Mentor,
  categoryName as getCategoryName,
  resolveMentor,
  formatBDT,
  isFree,
} from "./courseTypes";

export interface CourseCardLabels {
  viewCourse: string;
  students: string;
  lessons: string;
  months: string;
  free: string;
  by: string;
}

// Medical-themed catalog card. Links to /courses/[id] using the numeric course
// id (the backend resolver accepts numeric id, slug, or _id).
export function CourseCard({
  course,
  categoryLookup,
  mentorLookup,
  labels,
  bn = "",
}: {
  course: Course;
  categoryLookup?: Record<string, string>;
  mentorLookup?: Record<string, Mentor>;
  labels: CourseCardLabels;
  bn?: string;
}) {
  const href = `/courses/${course.id}`;
  const category = getCategoryName(course.category, categoryLookup);
  const mentor = resolveMentor(course.mentor, mentorLookup);
  const free = isFree(course.fee);
  const price = formatBDT(course.offerPrice) ?? formatBDT(course.fee);
  const original = course.offerPrice ? formatBDT(course.fee) : null;

  return (
    <Card interactive className="group flex flex-col overflow-hidden p-0">
      <Link
        href={href}
        className="relative block aspect-video overflow-hidden bg-primary-soft"
        aria-label={course.title}
      >
        {course.image ? (
          <img
            src={course.image}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
            <LuStethoscope className="text-4xl text-primary/60" />
          </div>
        )}

        {/* subtle gradient so the type badge stays legible on any thumbnail */}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {course.type && (
          <Badge
            variant="primary"
            className="absolute left-3 top-3 bg-card/90 shadow-soft backdrop-blur"
          >
            {course.type}
          </Badge>
        )}
        {category && (
          <span
            className={cn(
              "absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur",
              bn
            )}
          >
            {category}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
          {course.rating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <LuStar className="fill-amber-400 text-amber-400" /> {course.rating.toFixed(1)}
            </span>
          ) : null}
          {course.totalStudentsEnroll ? (
            <span className={cn("inline-flex items-center gap-1", bn)}>
              <LuUsers /> {course.totalStudentsEnroll.toLocaleString()} {labels.students}
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "mb-2 line-clamp-2 font-heading text-lg font-semibold leading-snug text-foreground",
            bn
          )}
        >
          <Link href={href} className="transition-colors hover:text-primary">
            {course.title}
          </Link>
        </h3>

        {mentor?.name && (
          <p className={cn("mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground", bn)}>
            <LuUserRound className="text-primary" />
            <span className="font-medium text-foreground/80">{mentor.name}</span>
            {mentor.designation ? (
              <span className="hidden text-muted-foreground sm:inline">· {mentor.designation}</span>
            ) : null}
          </p>
        )}

        <div
          className={cn(
            "mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
            bn
          )}
        >
          {course.lectures ? (
            <span className="inline-flex items-center gap-1">
              <LuPlay /> {course.lectures} {labels.lessons}
            </span>
          ) : null}
          {course.durationMonth ? (
            <span className="inline-flex items-center gap-1">
              <LuClock /> {course.durationMonth} {labels.months}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-baseline gap-2">
            {free ? (
              <span className={cn("text-lg font-bold text-accent", bn)}>{labels.free}</span>
            ) : (
              <>
                <span className="text-lg font-bold text-foreground">{price}</span>
                {original && original !== price && (
                  <span className="text-sm text-muted-foreground line-through">{original}</span>
                )}
              </>
            )}
          </div>
          <Link
            href={href}
            className={cn(
              "inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover",
              bn
            )}
          >
            {labels.viewCourse} <LuArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default CourseCard;

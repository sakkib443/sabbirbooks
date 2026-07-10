/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { LuStar, LuUsers, LuPlay, LuClock, LuArrowRight } from "react-icons/lu";
import { Card, Badge, cn } from "@/components/ui";

// Shape reused by the Courses page agent — mirrors the backend ICourse fields
// that the public catalog returns.
export interface Course {
  _id?: string;
  id?: number;
  title: string;
  slug: string;
  image?: string;
  type?: string;
  fee?: string;
  offerPrice?: string;
  rating?: number;
  totalStudentsEnroll?: number;
  lectures?: number;
  durationMonth?: number;
}

type TFn = (key: string, fallback?: string) => string;

const bdt = (v?: string | number) => {
  const n = Number(v);
  if (v === undefined || v === null || v === "" || Number.isNaN(n)) return null;
  return "৳" + n.toLocaleString("en-US");
};

export function CourseCard({ course, t, bn = "" }: { course: Course; t: TFn; bn?: string }) {
  const href = `/courses/${course.slug}`;
  const free = !course.fee || Number(course.fee) === 0;
  const price = bdt(course.offerPrice) ?? bdt(course.fee);
  const original = course.offerPrice ? bdt(course.fee) : null;

  return (
    <Card interactive className="group flex flex-col overflow-hidden p-0">
      <Link href={href} className="relative block aspect-video overflow-hidden bg-primary-soft">
        {course.image ? (
          <img
            src={course.image}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
            <LuPlay className="text-4xl text-primary/60" />
          </div>
        )}
        {course.type && (
          <Badge variant="primary" className="absolute left-3 top-3 bg-card/90 backdrop-blur">
            {course.type}
          </Badge>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-glow">
            <LuPlay className="text-lg" />
          </span>
        </span>
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
              <LuUsers /> {course.totalStudentsEnroll.toLocaleString()} {t("featuredCourses.students")}
            </span>
          ) : null}
        </div>

        <h3 className={cn("mb-3 line-clamp-2 font-heading text-lg font-semibold leading-snug text-foreground", bn)}>
          <Link href={href} className="transition-colors hover:text-primary">
            {course.title}
          </Link>
        </h3>

        <div className={cn("mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", bn)}>
          {course.lectures ? (
            <span className="inline-flex items-center gap-1">
              <LuPlay /> {course.lectures} {t("featuredCourses.lessons")}
            </span>
          ) : null}
          {course.durationMonth ? (
            <span className="inline-flex items-center gap-1">
              <LuClock /> {course.durationMonth} {t("featuredCourses.months")}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-baseline gap-2">
            {free ? (
              <span className={cn("text-lg font-bold text-accent", bn)}>{t("featuredCourses.free")}</span>
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
            {t("featuredCourses.enroll")} <LuArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default CourseCard;

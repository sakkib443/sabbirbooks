"use client";

/**
 * /courses (25 Oct 2026) — the shop's recorded courses as cards. Kept simple on
 * purpose: picture, name, how many classes, price, one button. The old
 * catalogue browser (filters, categories, mentors) is still in
 * components/courses for the day the wider site comes back.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuPlay, LuVideo, LuClock, LuArrowRight } from "react-icons/lu";
import { Container, cn } from "@/components/ui";
import { coursePrice, courseListPrice, listRecordedCourses, taka, type RecordedCourse } from "./recordedApi";

export default function RecordedCourseList() {
  const [courses, setCourses] = useState<RecordedCourse[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listRecordedCourses()
      .then(setCourses)
      .catch((e) => {
        setError(e.message);
        setCourses([]);
      });
  }, []);

  return (
    <main className="hind-siliguri min-h-[70vh] bg-surface-soft py-10 sm:py-14">
      <Container>
        <header className="mb-8 max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
            <LuVideo /> রেকর্ডেড কোর্স
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">কোর্সসমূহ</h1>
          <p className="mt-2 text-muted-foreground">
            একবার কিনলেই যেকোনো সময়, যতবার খুশি দেখুন — মোবাইল বা কম্পিউটারে।
          </p>
        </header>

        {courses === null ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            {error || "এখনো কোনো কোর্স আসেনি। শীঘ্রই আসছে!"}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}

function CourseCard({ course }: { course: RecordedCourse }) {
  const href = `/courses/${course.slug || course._id}`;
  const price = coursePrice(course);
  const list = courseListPrice(course);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow">
      <Link href={href} className="relative block aspect-video overflow-hidden bg-primary-soft">
        {course.image ? (
          <img src={course.image} alt={course.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-strong text-primary-foreground">
            <LuPlay className="h-14 w-14 opacity-90" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          রেকর্ডেড
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold leading-snug text-foreground">
          <Link href={href} className="hover:text-primary">{course.title}</Link>
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {!!course.lectures && (
            <span className="inline-flex items-center gap-1.5"><LuVideo /> {course.lectures}টি ক্লাস</span>
          )}
          <span className="inline-flex items-center gap-1.5"><LuClock /> যেকোনো সময়</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            {price > 0 ? (
              <>
                <span className="text-2xl font-bold text-primary">{taka(price)}</span>
                {list > 0 && <span className="ml-2 text-sm text-muted-foreground line-through">{taka(list)}</span>}
              </>
            ) : (
              <span className="text-2xl font-bold text-primary">ফ্রি</span>
            )}
          </div>
          <Link
            href={href}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground",
              "transition hover:bg-primary-hover"
            )}
          >
            বিস্তারিত <LuArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}

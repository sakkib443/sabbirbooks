"use client";

/**
 * /courses (25 Oct 2026) — the shop's recorded courses as cards. Kept simple on
 * purpose: picture, name, how many classes, price, one button. The old
 * catalogue browser (filters, categories, mentors) is still in
 * components/courses for the day the wider site comes back.
 *
 * Follows the site's EN/বাং switch: the page's words and the course's own
 * (title / titleBn).
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuPlay, LuVideo, LuClock, LuArrowRight } from "react-icons/lu";
import { Container, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { coursePrice, courseListPrice, listRecordedCourses, taka, titleOf, type RecordedCourse } from "./recordedApi";

const T = {
  bn: {
    badge: "রেকর্ডেড কোর্স",
    heading: "কোর্সসমূহ",
    sub: "একবার কিনলেই যেকোনো সময়, যতবার খুশি দেখুন — মোবাইল বা কম্পিউটারে।",
    empty: "এখনো কোনো কোর্স আসেনি। শীঘ্রই আসছে!",
    failed: "কোর্সগুলো আনা যায়নি, একটু পরে আবার চেষ্টা করুন।",
    recorded: "রেকর্ডেড",
    classes: (n: number) => `${n}টি ক্লাস`,
    anytime: "যেকোনো সময়",
    free: "ফ্রি",
    details: "বিস্তারিত",
  },
  en: {
    badge: "Recorded courses",
    heading: "Courses",
    sub: "Buy once, watch any time, as often as you like — on mobile or computer.",
    empty: "No courses yet. Coming soon!",
    failed: "Could not load the courses. Please try again in a moment.",
    recorded: "Recorded",
    classes: (n: number) => `${n} ${n === 1 ? "class" : "classes"}`,
    anytime: "Any time",
    free: "Free",
    details: "Details",
  },
};
type Labels = (typeof T)["en"];

export default function RecordedCourseList() {
  const { isBengali } = useLanguage();
  const L = isBengali ? T.bn : T.en;
  const [courses, setCourses] = useState<RecordedCourse[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listRecordedCourses()
      .then(setCourses)
      .catch(() => {
        setFailed(true);
        setCourses([]);
      });
  }, []);

  return (
    <main className={cn("min-h-[70vh] bg-surface-soft py-10 sm:py-14", isBengali && "hind-siliguri")}>
      <Container>
        <header className="mb-8 max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
            <LuVideo /> {L.badge}
          </p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{L.heading}</h1>
          <p className="mt-2 text-muted-foreground">{L.sub}</p>
        </header>

        {courses === null ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            {failed ? L.failed : L.empty}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c._id} course={c} bn={isBengali} L={L} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}

function CourseCard({ course, bn, L }: { course: RecordedCourse; bn: boolean; L: Labels }) {
  const href = `/courses/${course.slug || course._id}`;
  const title = titleOf(bn, course);
  const price = coursePrice(course);
  const list = courseListPrice(course);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow">
      <Link href={href} className="relative block aspect-video overflow-hidden bg-primary-soft">
        {course.image ? (
          <img src={course.image} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-strong text-primary-foreground">
            <LuPlay className="h-14 w-14 opacity-90" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          {L.recorded}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold leading-snug text-foreground">
          <Link href={href} className="hover:text-primary">{title}</Link>
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {!!course.lectures && (
            <span className="inline-flex items-center gap-1.5"><LuVideo /> {L.classes(course.lectures)}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><LuClock /> {L.anytime}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            {price > 0 ? (
              <>
                <span className="text-2xl font-bold text-primary">{taka(price)}</span>
                {list > 0 && <span className="ml-2 text-sm text-muted-foreground line-through">{taka(list)}</span>}
              </>
            ) : (
              <span className="text-2xl font-bold text-primary">{L.free}</span>
            )}
          </div>
          <Link
            href={href}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
          >
            {L.details} <LuArrowRight />
          </Link>
        </div>
      </div>
    </article>
  );
}

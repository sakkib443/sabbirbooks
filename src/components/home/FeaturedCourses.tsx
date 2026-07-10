"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { LuArrowRight, LuGraduationCap } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, buttonVariants, cn } from "@/components/ui";
import { CourseCard, type Course } from "./CourseCard";
import { EmptyState, SkeletonGrid } from "./CatalogStates";

interface CoursesState {
  courses: Course[];
  loading: boolean;
}

export default function FeaturedCourses() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const { courses, loading } = useSelector(
    (state: { courses: CoursesState }) => state.courses
  );
  const items = Array.isArray(courses) ? courses.slice(0, 6) : [];

  return (
    <section className="py-20">
      <Container>
        <div className="mb-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            bengali={isBengali}
            icon={<LuGraduationCap />}
            eyebrow={t("featuredCourses.eyebrow")}
            title={t("featuredCourses.title")}
            subtitle={t("featuredCourses.subtitle")}
          />
          <Link
            href="/courses"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden shrink-0 sm:inline-flex", bn)}
          >
            {t("featuredCourses.viewAll")} <LuArrowRight className="text-sm" />
          </Link>
        </div>

        {loading && items.length === 0 ? (
          <SkeletonGrid count={3} ratio="video" />
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((course) => (
                <CourseCard key={course._id ?? course.slug} course={course} t={t} bn={bn} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link href="/courses" className={cn(buttonVariants({ variant: "outline", size: "md" }), bn)}>
                {t("featuredCourses.browse")} <LuArrowRight className="text-sm" />
              </Link>
            </div>
          </>
        ) : (
          <EmptyState
            icon={<LuGraduationCap className="text-2xl" />}
            title={t("featuredCourses.emptyTitle")}
            text={t("featuredCourses.emptyText")}
            bn={bn}
          />
        )}
      </Container>
    </section>
  );
}

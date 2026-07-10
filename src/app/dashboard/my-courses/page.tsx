"use client";

// My Courses: the student's enrolled courses (GET /api/enrollments/my-enrollments).
// Each card links to the recorded-course player. Empty state → browse /courses.
import { useEffect, useState, useCallback } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import {
  dashRequest,
  type DashEnrollment,
} from "@/components/dashboard/dashboardApi";
import {
  PageHeading,
  Loader,
  ErrorState,
  EmptyState,
} from "@/components/dashboard/primitives";
import EnrollmentCard from "@/components/dashboard/EnrollmentCard";

type Status = "loading" | "ready" | "error";

export default function MyCoursesPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [status, setStatus] = useState<Status>("loading");
  const [enrollments, setEnrollments] = useState<DashEnrollment[]>([]);

  const S = isBengali
    ? {
        title: "আমার কোর্স",
        subtitle: "আপনার ভর্তি হওয়া সব কোর্স এখানে।",
        count: (n: number) => `${n} টি কোর্স`,
        emptyTitle: "এখনো কোনো কোর্স নেই",
        emptyText: "মেডিকেল কোর্স ব্রাউজ করে ভর্তি হন এবং শেখা শুরু করুন।",
        browse: "কোর্স দেখুন",
        errMsg: "কোর্স লোড করা যায়নি। আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
      }
    : {
        title: "My Courses",
        subtitle: "Every course you're enrolled in, in one place.",
        count: (n: number) => `${n} ${n === 1 ? "course" : "courses"}`,
        emptyTitle: "No courses yet",
        emptyText: "Browse the medical courses, enroll, and start learning.",
        browse: "Browse courses",
        errMsg: "Could not load your courses. Please try again.",
        retry: "Try again",
      };

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await dashRequest<DashEnrollment[]>("/enrollments/my-enrollments");
    if (!res.ok && res.status !== 404) {
      setStatus("error");
      return;
    }
    setEnrollments(Array.isArray(res.data) ? res.data : []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <Loader bn={bn} />;
  if (status === "error")
    return <ErrorState message={S.errMsg} onRetry={load} retryLabel={S.retry} bn={bn} />;

  return (
    <div>
      <PageHeading
        icon={LuGraduationCap}
        title={S.title}
        subtitle={enrollments.length > 0 ? S.count(enrollments.length) : S.subtitle}
        bn={bn}
      />

      {enrollments.length === 0 ? (
        <EmptyState
          icon={LuGraduationCap}
          title={S.emptyTitle}
          text={S.emptyText}
          ctaHref="/courses"
          ctaLabel={S.browse}
          bn={bn}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => (
            <EnrollmentCard key={e._id} enrollment={e} isBengali={isBengali} />
          ))}
        </div>
      )}
    </div>
  );
}

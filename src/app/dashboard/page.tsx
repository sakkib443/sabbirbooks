"use client";

// Dashboard Overview: greet the student, show quick stats (enrolled courses,
// active courses, orders) and a "continue learning" shortcut row. Fetches
// enrollments + orders in parallel.
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LuGraduationCap,
  LuBookOpenCheck,
  LuShoppingBag,
  LuArrowRight,
  LuLayoutDashboard,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/components/ui";
import {
  dashRequest,
  getStoredUser,
  dashDisplayName,
  type DashEnrollment,
  type DashOrder,
} from "@/components/dashboard/dashboardApi";
import {
  PageHeading,
  StatCard,
  Loader,
  ErrorState,
  EmptyState,
} from "@/components/dashboard/primitives";
import EnrollmentCard from "@/components/dashboard/EnrollmentCard";

type Status = "loading" | "ready" | "error";

export default function DashboardOverviewPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [status, setStatus] = useState<Status>("loading");
  const [enrollments, setEnrollments] = useState<DashEnrollment[]>([]);
  const [orders, setOrders] = useState<DashOrder[]>([]);
  const [name, setName] = useState("Student");

  const S = isBengali
    ? {
        eyebrow: "সারসংক্ষেপ",
        hi: (n: string) => `স্বাগতম, ${n}`,
        subtitle: "আপনার শেখার অগ্রগতি এক নজরে দেখুন।",
        enrolled: "মোট কোর্স",
        active: "সক্রিয় কোর্স",
        orders: "বইয়ের অর্ডার",
        continue: "শেখা চালিয়ে যান",
        viewAll: "সব কোর্স",
        emptyTitle: "এখনো কোনো কোর্সে ভর্তি হননি",
        emptyText: "মেডিকেল কোর্স ব্রাউজ করে শেখা শুরু করুন।",
        browse: "কোর্স দেখুন",
        errMsg: "তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
      }
    : {
        eyebrow: "Overview",
        hi: (n: string) => `Welcome back, ${n}`,
        subtitle: "A quick look at your learning progress.",
        enrolled: "Total courses",
        active: "Active courses",
        orders: "Book orders",
        continue: "Continue learning",
        viewAll: "All courses",
        emptyTitle: "No courses yet",
        emptyText: "Browse the medical courses and start learning today.",
        browse: "Browse courses",
        errMsg: "Could not load your data. Please try again.",
        retry: "Try again",
      };

  const load = useCallback(async () => {
    setStatus("loading");
    const [enr, ord] = await Promise.all([
      dashRequest<DashEnrollment[]>("/enrollments/my-enrollments"),
      dashRequest<DashOrder[]>("/orders/my"),
    ]);
    // enrollments is the primary signal; orders are best-effort.
    if (!enr.ok && enr.status !== 404) {
      setStatus("error");
      return;
    }
    setEnrollments(Array.isArray(enr.data) ? enr.data : []);
    setOrders(Array.isArray(ord.data) ? ord.data : []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    setName(dashDisplayName(getStoredUser()));
    load();
  }, [load]);

  if (status === "loading") return <Loader bn={bn} />;
  if (status === "error")
    return <ErrorState message={S.errMsg} onRetry={load} retryLabel={S.retry} bn={bn} />;

  const activeCount = enrollments.filter((e) => e.status === "active").length;
  // Show up to 3 shortcuts, active enrollments first.
  const shortcuts = [...enrollments]
    .sort((a, b) => (a.status === "active" ? -1 : 0) - (b.status === "active" ? -1 : 0))
    .slice(0, 3);

  return (
    <div>
      <PageHeading
        icon={LuLayoutDashboard}
        title={S.hi(name)}
        subtitle={S.subtitle}
        bn={bn}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={LuGraduationCap} label={S.enrolled} value={enrollments.length} tone="primary" bn={bn} />
        <StatCard icon={LuBookOpenCheck} label={S.active} value={activeCount} tone="accent" bn={bn} />
        <StatCard icon={LuShoppingBag} label={S.orders} value={orders.length} tone="coral" bn={bn} />
      </div>

      {/* Continue learning */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.continue}</h2>
          {enrollments.length > 0 && (
            <Link
              href="/dashboard/my-courses"
              className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline", bn)}
            >
              {S.viewAll} <LuArrowRight className="text-sm" />
            </Link>
          )}
        </div>

        {shortcuts.length === 0 ? (
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
            {shortcuts.map((e) => (
              <EnrollmentCard key={e._id} enrollment={e} isBengali={isBengali} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

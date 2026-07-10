"use client";

// Overview dashboard — headline metrics + recent activity.
// Metrics come from /analytics/dashboard and /analytics/revenue-summary, with
// books/orders totals read from their list `meta.total`. Every call degrades
// gracefully so one failing endpoint never blanks the page.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import Link from "next/link";
import {
  LuGraduationCap,
  LuBookOpen,
  LuShoppingCart,
  LuWallet,
  LuUsers,
  LuUserCheck,
  LuClipboardList,
  LuMail,
  LuArrowRight,
  LuTrendingUp,
} from "react-icons/lu";
import { Card, CardBody, Badge } from "@/components/ui";
import { PageHeader } from "@/components/admin/primitives";
import { StatCard } from "@/components/admin/StatCard";
import { adminRequest } from "@/components/admin/adminApi";
import { formatBDT, formatNumber, formatDateTime } from "@/components/admin/helpers";
import type { ContactMessage } from "@/components/admin/types";

interface DashboardStats {
  totalStudents?: number;
  totalCourses?: number;
  totalMentors?: number;
  totalEnrollments?: number;
  activeEnrollments?: number;
  pendingPayments?: number;
}

interface RevenueSummary {
  totalRevenue?: number;
  thisMonthRevenue?: number;
  totalTransactions?: number;
}

interface PopularCourse {
  courseId: string;
  title: string;
  image?: string;
  enrollments: number;
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({});
  const [revenue, setRevenue] = useState<RevenueSummary>({});
  const [booksTotal, setBooksTotal] = useState<number | null>(null);
  const [ordersTotal, setOrdersTotal] = useState<number | null>(null);
  const [popular, setPopular] = useState<PopularCourse[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [dash, rev, books, orders, pop, contacts] = await Promise.all([
      adminRequest<DashboardStats>("/analytics/dashboard"),
      adminRequest<RevenueSummary>("/analytics/revenue-summary"),
      adminRequest("/books?status=all&limit=1"),
      adminRequest("/orders?limit=1"),
      adminRequest<PopularCourse[]>("/analytics/popular-courses"),
      adminRequest<ContactMessage[]>("/contacts"),
    ]);
    if (dash.data) setStats(dash.data);
    if (rev.data) setRevenue(rev.data);
    setBooksTotal(books.meta?.total ?? (Array.isArray(books.data) ? books.data.length : null));
    setOrdersTotal(orders.ok ? orders.meta?.total ?? 0 : null);
    if (Array.isArray(pop.data)) setPopular(pop.data.slice(0, 5));
    if (Array.isArray(contacts.data)) setMessages(contacts.data.slice(0, 5));
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Key metrics across courses, books, orders and students."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Courses"
          value={formatNumber(stats.totalCourses)}
          icon={<LuGraduationCap />}
          loading={loading}
          tone="primary"
        />
        <StatCard
          label="Books"
          value={booksTotal == null ? "—" : formatNumber(booksTotal)}
          icon={<LuBookOpen />}
          loading={loading}
          tone="secondary"
        />
        <StatCard
          label="Orders"
          value={ordersTotal == null ? "—" : formatNumber(ordersTotal)}
          hint={ordersTotal == null ? "module loading" : undefined}
          icon={<LuShoppingCart />}
          loading={loading}
          tone="accent"
        />
        <StatCard
          label="Revenue"
          value={formatBDT(revenue.totalRevenue)}
          hint={revenue.thisMonthRevenue != null ? `${formatBDT(revenue.thisMonthRevenue)} this month` : undefined}
          icon={<LuWallet />}
          loading={loading}
          tone="accent"
        />
        <StatCard
          label="Students"
          value={formatNumber(stats.totalStudents)}
          icon={<LuUsers />}
          loading={loading}
          tone="primary"
        />
        <StatCard
          label="Enrollments"
          value={formatNumber(stats.totalEnrollments)}
          hint={stats.activeEnrollments != null ? `${formatNumber(stats.activeEnrollments)} active` : undefined}
          icon={<LuUserCheck />}
          loading={loading}
          tone="secondary"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Popular courses */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <LuTrendingUp className="text-primary" /> Popular courses
            </h2>
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Manage <LuArrowRight />
            </Link>
          </div>
          <CardBody className="p-0">
            {popular.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "No enrollment data yet."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {popular.map((c, i) => (
                  <li key={c.courseId} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {c.title}
                    </span>
                    <Badge variant="muted">{formatNumber(c.enrollments)} enrolled</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Recent messages */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <LuMail className="text-primary" /> Recent messages
            </h2>
            <Link
              href="/admin/contact"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <LuArrowRight />
            </Link>
          </div>
          <CardBody className="p-0">
            {messages.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "No messages yet."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {messages.map((m) => (
                  <li key={m._id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                      {m.status === "unread" && <Badge variant="coral">New</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{m.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/80">{formatDateTime(m.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat label="Mentors" value={formatNumber(stats.totalMentors)} icon={<LuUsers />} />
        <MiniStat label="Active enrollments" value={formatNumber(stats.activeEnrollments)} icon={<LuUserCheck />} />
        <MiniStat label="Pending payments" value={formatNumber(stats.pendingPayments)} icon={<LuClipboardList />} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-lg text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
}

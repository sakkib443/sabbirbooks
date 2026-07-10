import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Dashboard — Sabbir Book",
  description: "Your courses, orders and profile on Sabbir Book.",
};

// Server layout that mounts the client dashboard shell (auth guard + sidebar +
// topbar). All /dashboard pages render inside DashboardShell.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

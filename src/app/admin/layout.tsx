import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin — Sabbir Book",
  description: "Sabbir Book admin dashboard.",
};

// Server layout that mounts the client admin shell (auth guard + sidebar +
// topbar). All /admin pages render inside AdminShell.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}

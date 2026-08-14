'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Student accounts carry names, emails, phone numbers → `users.read`,
// matching GET /api/user on the server.
export default function StudentsLayout({ children }) {
  return <AdminRoleGate require={['users.read']}>{children}</AdminRoleGate>;
}

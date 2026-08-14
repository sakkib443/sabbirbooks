'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Who enrolled on which course and what they paid → `training.manage`,
// matching the /api/enrollments admin routes.
export default function EnrollmentsLayout({ children }) {
  return <AdminRoleGate require={['training.manage']}>{children}</AdminRoleGate>;
}

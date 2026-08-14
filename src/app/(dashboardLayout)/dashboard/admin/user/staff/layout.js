'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Team/Staff lists admin and manager accounts → `staff.manage`, which is not a
// grantable capability, so it is Admin / Super Admin only by construction.
export default function StaffLayout({ children }) {
  return <AdminRoleGate require={['staff.manage']}>{children}</AdminRoleGate>;
}

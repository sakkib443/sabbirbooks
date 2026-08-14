'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// The permission editor itself is behind `staff.manage`, which is not grantable —
// so a manager can never open it and can never raise their own permissions.
export default function PermissionsLayout({ children }) {
  return <AdminRoleGate require={['staff.manage']}>{children}</AdminRoleGate>;
}

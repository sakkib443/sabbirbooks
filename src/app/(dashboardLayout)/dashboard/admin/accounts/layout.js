'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// The shop's whole income and expense — the Super Admin's alone (the API:
// authorize('superAdmin')).
export default function AccountsLayout({ children }) {
  return <AdminRoleGate allow={['superAdmin']}>{children}</AdminRoleGate>;
}

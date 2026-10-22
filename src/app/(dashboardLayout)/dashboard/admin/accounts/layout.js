'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// The Super Admin: the shop's whole income and expense and their own book.
// An admin: only what they wrote themselves (23 Oct 2026; ledger.service).
export default function AccountsLayout({ children }) {
  return <AdminRoleGate allow={['admin', 'superAdmin']}>{children}</AdminRoleGate>;
}

'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Manager, admin and Super Admin (22 Oct 2026) — the API: authorize('admin',
// 'manager') + orders.read. A manager still only gets their own days.
export default function IncompleteOrdersLayout({ children }) {
  return <AdminRoleGate allow={['manager', 'admin', 'superAdmin']} require={['orders.read']}>{children}</AdminRoleGate>;
}

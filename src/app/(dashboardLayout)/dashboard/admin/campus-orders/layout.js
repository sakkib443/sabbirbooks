'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Campus deals carry prices and discounts: the admin's and the Super Admin's
// (the API: authorize('admin') + orders.read).
export default function CampusOrdersLayout({ children }) {
  return <AdminRoleGate allow={['admin', 'superAdmin']} require={['orders.read']}>{children}</AdminRoleGate>;
}

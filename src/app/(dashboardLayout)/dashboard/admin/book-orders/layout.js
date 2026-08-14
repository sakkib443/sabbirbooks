'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// "Who is buying / how many sold" → `orders.read`, matching GET /api/orders.
export default function BookOrdersLayout({ children }) {
  return <AdminRoleGate require={['orders.read']}>{children}</AdminRoleGate>;
}

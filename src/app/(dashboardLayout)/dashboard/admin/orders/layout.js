'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Course orders — same personal/business data as book orders → `orders.read`.
export default function OrdersLayout({ children }) {
  return <AdminRoleGate require={['orders.read']}>{children}</AdminRoleGate>;
}

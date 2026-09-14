'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// A delivery rate is a price, so this screen sits behind `settings.write` — the
// same capability the API enforces on PATCH /api/settings and on
// PATCH /api/medical-colleges/:id/delivery.
export default function DeliveryChargesLayout({ children }) {
  return <AdminRoleGate require={['settings.write']}>{children}</AdminRoleGate>;
}

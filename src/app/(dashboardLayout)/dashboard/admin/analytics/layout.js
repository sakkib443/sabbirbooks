'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Analytics holds sales counts and income reports → `analytics.read`.
// The server gates every /api/analytics route on the same capability, so a
// manager who types the URL gets an empty page and a row of 403s, not data.
export default function AnalyticsLayout({ children }) {
  return <AdminRoleGate require={['analytics.read']}>{children}</AdminRoleGate>;
}

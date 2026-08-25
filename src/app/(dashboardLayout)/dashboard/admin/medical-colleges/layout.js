'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// The college directory is reference data about people's institutions, so it
// sits behind `users.write` — the same capability the admin routes on
// /api/medical-colleges enforce.
export default function MedicalCollegesLayout({ children }) {
  return <AdminRoleGate require={['users.write']}>{children}</AdminRoleGate>;
}

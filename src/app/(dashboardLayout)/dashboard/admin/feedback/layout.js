'use client';
import AdminRoleGate from '@/components/admin/AdminRoleGate';

// Contact-form submissions are names, emails and phone numbers → `users.read`.
export default function FeedbackLayout({ children }) {
  return <AdminRoleGate require={['users.read']}>{children}</AdminRoleGate>;
}

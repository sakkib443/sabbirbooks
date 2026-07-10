'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The Users menu is split into Team/Staff and Students.
// Admin/superAdmin default to Staff; a Manager can't see Staff → send them to Students.
export default function UsersIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    let role = 'admin';
    try { role = JSON.parse(localStorage.getItem('user') || '{}').role || 'admin'; } catch { }
    router.replace(role === 'trainingManager' ? '/dashboard/admin/user/students' : '/dashboard/admin/user/staff');
  }, [router]);
  return null;
}

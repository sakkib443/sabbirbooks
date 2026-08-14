'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { currentCan } from '@/lib/permissions';

// The Users menu is split into Team/Staff and Students.
// Land on the first one this account can actually open, rather than guessing
// from the role — a content-only manager can open neither and goes home.
export default function UsersIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (currentCan('staff.manage')) router.replace('/dashboard/admin/user/staff');
    else if (currentCan('users.read')) router.replace('/dashboard/admin/user/students');
    else router.replace('/dashboard/admin');
  }, [router]);
  return null;
}

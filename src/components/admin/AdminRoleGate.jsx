'use client';

// Guards an admin sub-page against roles that shouldn't see it.
// The admin dashboard layout already lets superAdmin/admin/trainingManager in;
// this narrows specific pages (e.g. Analytics, Team/Staff) to a subset and
// bounces anyone else back to the admin home (NOT their own dashboard).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLoader } from 'react-icons/fi';

export default function AdminRoleGate({ allow = ['superAdmin', 'admin'], children }) {
  const router = useRouter();
  const [ok, setOk] = useState(null); // null = checking

  useEffect(() => {
    let role = 'student';
    try { role = JSON.parse(localStorage.getItem('user') || '{}').role || 'student'; } catch { }
    if (allow.includes(role)) setOk(true);
    else { setOk(false); router.replace('/dashboard/admin'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ok === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <FiLoader className="text-3xl text-[#F3A522] animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Checking access…</p>
      </div>
    );
  }
  if (!ok) return null;
  return children;
}

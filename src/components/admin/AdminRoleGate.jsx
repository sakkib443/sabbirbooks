'use client';

// Guards an admin sub-page against accounts that shouldn't see it.
// The admin dashboard layout lets superAdmin/admin/trainingManager/contentManager
// in; this narrows specific pages (Analytics, Team/Staff, Settings…) and bounces
// anyone else back to the admin home (NOT their own dashboard).
//
// Prefer `require={['analytics.read']}` over `allow={[...roles]}`: capabilities
// are the same vocabulary the server enforces, so the page and the API it calls
// can never disagree. `allow` is kept for callers that really do mean a role.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLoader } from 'react-icons/fi';
import { can, getStoredUser } from '@/lib/permissions';

export default function AdminRoleGate({ allow = null, require: required = [], children }) {
  const router = useRouter();
  const [ok, setOk] = useState(null); // null = checking

  useEffect(() => {
    const user = getStoredUser();
    const role = user?.role || 'student';
    const roleOk = !allow || allow.includes(role);
    if (roleOk && can(user, ...required)) setOk(true);
    else { setOk(false); router.replace('/dashboard/admin'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ok === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dash-soft gap-3">
        <FiLoader className="text-3xl text-brand animate-spin" />
        <p className="text-dash-mute2 text-sm font-medium">Checking access…</p>
      </div>
    );
  }
  if (!ok) return null;
  return children;
}

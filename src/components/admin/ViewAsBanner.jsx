'use client';

/**
 * Shown across the admin panel while the Super Admin is viewing it as an
 * Admin or a Manager, with the way back. Nobody else ever sees it.
 */

import { useEffect, useState } from 'react';
import { FiEye } from 'react-icons/fi';
import { getViewAs, setViewAs, VIEW_AS_LABEL } from '@/lib/viewAs';

export default function ViewAsBanner() {
  const [viewAs, setView] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setView(getViewAs()), 0);
    return () => clearTimeout(t);
  }, []);

  if (!viewAs) return null;

  const go = (panel) => {
    setViewAs(panel);
    window.location.assign('/dashboard/admin');
  };
  const other = viewAs === 'admin' ? 'manager' : 'admin';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-800">
      <FiEye className="shrink-0" />
      <span className="flex-1">
        আপনি এখন <b>{VIEW_AS_LABEL[viewAs]}</b> হিসেবে প্যানেল দেখছেন — {VIEW_AS_LABEL[viewAs]} যা দেখে, ঠিক তাই।
      </span>
      <button
        type="button"
        onClick={() => go(other)}
        className="rounded-lg border border-violet-300 px-3 py-1 text-xs font-semibold hover:bg-violet-100"
      >
        {VIEW_AS_LABEL[other]} হিসেবে দেখুন
      </button>
      <button
        type="button"
        onClick={() => go('superAdmin')}
        className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700"
      >
        Super Admin-এ ফিরুন
      </button>
    </div>
  );
}

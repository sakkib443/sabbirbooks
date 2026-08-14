'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import NotificationBell from '@/components/shared/NotificationBell';
import DashboardShell from '../_components/DashboardShell';
import { ADMIN_SHELL_ROLES, ROLE_LABELS } from '@/lib/permissions';
import { FiUser, FiSettings, FiBell } from 'react-icons/fi';

const MENU_ITEMS = [
  { icon: FiUser, label: 'My Profile', href: '/dashboard/admin/settings' },
  { icon: FiSettings, label: 'Settings', href: '/dashboard/admin/settings' },
  { icon: FiBell, label: 'Notifications', href: '/dashboard/admin/notifications' },
];

const AdminLayout = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { }
    }
  }, []);

  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = ROLE_LABELS[user?.role] || 'Admin';

  const avatar = (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-brand/25">
      {userInitial}
    </div>
  );

  return (
    // Both manager kinds live in this shell; what they can actually reach inside
    // it is decided per-page and per-request by their capabilities.
    <DashboardShell
      allowedRoles={ADMIN_SHELL_ROLES}
      sidebar={<AdminSidebar />}
      rootSegment="admin"
      subtitle={`${userRole} Dashboard`}
      userName={userName}
      userEmail={user?.email || ''}
      roleBadge={userRole}
      roleBadgeClassName="text-brand-ink"
      avatar={avatar}
      menuItems={MENU_ITEMS}
      menuHoverClassName="hover:bg-brand-soft/60 hover:text-brand-ink"
      notificationSlot={<NotificationBell />}
      // The sidebar's mobile toggle floats over the top-left corner.
      headerPaddingClassName="pl-16 pr-4 lg:px-7"
    >
      {children}
    </DashboardShell>
  );
};

export default AdminLayout;

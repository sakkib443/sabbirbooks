'use client';

import React, { useState, useEffect } from 'react';
import UserSidebar from '@/components/user/UserSidebar';
import NotificationBell from '@/components/shared/NotificationBell';
import DashboardShell from '../_components/DashboardShell';
import { FiUser, FiCreditCard, FiHelpCircle, FiBell } from 'react-icons/fi';

const MENU_ITEMS = [
    { icon: FiUser, label: 'My Profile', href: '/dashboard/user/profile' },
    { icon: FiCreditCard, label: 'Payments', href: '/dashboard/user/payments' },
    { icon: FiBell, label: 'Notifications', href: '/dashboard/user/notifications' },
    { icon: FiHelpCircle, label: 'Help & Support', href: '/dashboard/user/support' },
];

const UserLayout = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch (e) { }
        }
    }, []);

    const userName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.name || 'Student';
    const userInitial = userName.charAt(0).toUpperCase();

    const avatar = (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-brand/20">
            {userInitial}
        </div>
    );

    return (
        <DashboardShell
            allowedRoles={["user", "student", "admin", "superAdmin"]}
            sidebar={<UserSidebar />}
            rootSegment="user"
            subtitle="Student Dashboard"
            userName={userName}
            userEmail={user?.email || ''}
            roleBadge="Student"
            avatar={avatar}
            menuItems={MENU_ITEMS}
            menuHoverClassName="hover:bg-dash-soft hover:text-brand-ink"
            notificationSlot={<NotificationBell />}
        >
            {children}
        </DashboardShell>
    );
};

export default UserLayout;

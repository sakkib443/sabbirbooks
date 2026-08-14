'use client';

import React, { useState, useEffect } from 'react';
import MentorSidebar from '@/components/mentor/MentorSidebar';
import DashboardShell from '../_components/DashboardShell';
import { FiUser, FiHelpCircle, FiBell } from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const MENU_ITEMS = [
  { icon: FiUser, label: 'My Profile', href: '/dashboard/mentor/profile' },
  { icon: FiHelpCircle, label: 'Help Center', href: '/dashboard/mentor/messages' },
];

const MentorLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [mentor, setMentor] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) {}
    }
    // Fetch real mentor data
    const fetchMentor = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API}/mentors/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && data.data) setMentor(data.data);
      } catch (e) {}
    };
    fetchMentor();
  }, []);

  const userName = mentor?.name || user?.firstName
    ? (mentor?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim())
    : 'Mentor';
  const userInitial = userName.charAt(0).toUpperCase();
  const mentorImage = mentor?.image || '';
  const mentorEmail = mentor?.email || user?.email || '';

  const avatarInner = (size) => (
    mentorImage
      ? <img src={mentorImage} alt={userName} className="w-full h-full object-cover" />
      : (
        <div className={`w-full h-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white ${size} font-bold`}>
          {userInitial}
        </div>
      )
  );

  return (
    <DashboardShell
      allowedRoles={["mentor", "admin", "superAdmin"]}
      sidebar={<MentorSidebar />}
      rootSegment="mentor"
      titleOverrides={{ 'my-batches': 'My Batches' }}
      subtitle="Mentor Dashboard"
      userName={userName}
      userEmail={mentorEmail}
      roleBadge="Mentor"
      roleBadgeClassName="text-teal-600"
      avatar={
        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shadow-teal-500/20">
          {avatarInner('text-xs')}
        </div>
      }
      avatarLarge={
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
          {avatarInner('text-sm')}
        </div>
      }
      menuItems={MENU_ITEMS}
      menuHoverClassName="hover:bg-dash-soft hover:text-teal-600"
      // The mentor panel has no notification feed yet — the bell is a
      // placeholder, so it stays a plain button rather than <NotificationBell/>.
      notificationSlot={
        <button
          type="button"
          aria-label="Notifications"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-dash-ink4 hover:bg-dash-soft2 transition-all relative"
        >
          <FiBell size={17} />
        </button>
      }
    >
      {children}
    </DashboardShell>
  );
};

export default MentorLayout;

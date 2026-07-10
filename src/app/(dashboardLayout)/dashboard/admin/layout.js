'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import ProtectedRoute from '@/app/providers/protectedRoutes';
import NotificationBell from '@/components/shared/NotificationBell';
import {
  FiUser, FiSettings, FiLogOut, FiChevronDown,
  FiSearch, FiBell, FiCreditCard,
} from 'react-icons/fi';

const AdminLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setDropdownOpen(false); }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last === 'admin') return 'Dashboard';
    return last?.charAt(0).toUpperCase() + last?.slice(1).replace(/-/g, ' ') || 'Dashboard';
  };

  const userName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = user?.role === 'superAdmin' ? 'Super Admin' : user?.role === 'trainingManager' ? 'Training Manager' : 'Admin';

  return (
    <ProtectedRoute allowedRoles={["superAdmin", "admin", "trainingManager"]}>
      <div className="min-h-screen bg-[#f8fafb] poppins">
        <AdminSidebar />

        {/* Main Content */}
        <main className="min-h-screen transition-all duration-300 lg:ml-[260px]">
          {/* ═══════ Top Header Bar ═══════ */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60">
            <div className="flex items-center justify-between h-[64px] pl-16 pr-4 lg:px-7">
              {/* Left Side — Page Title */}
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight outfit-semibold">
                    {getPageTitle()}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
                    {userRole} Dashboard
                  </p>
                </div>
              </div>

              {/* Right Side — Search, Notification, Profile */}
              <div className="flex items-center gap-2">
                {/* Search Button */}
                <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <FiSearch size={17} />
                </button>

                {/* Notification Bell */}
                <div className="relative">
                  <NotificationBell />
                </div>

                {/* Divider */}
                <div className="w-px h-7 bg-slate-200 mx-1 hidden sm:block" />

                {/* Profile Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-[#F3A522]/25">
                      {userInitial}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-slate-700 leading-tight max-w-[120px] truncate">
                        {userName}
                      </p>
                      <p className="text-[10px] text-[#c9871a] font-medium leading-tight">
                        {userRole}
                      </p>
                    </div>
                    <FiChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 py-1.5">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
                      </div>

                      <div className="py-1">
                        {[
                          { icon: FiUser, label: 'My Profile', href: '/dashboard/admin/settings' },
                          { icon: FiSettings, label: 'Settings', href: '/dashboard/admin/settings' },
                          { icon: FiBell, label: 'Notifications', href: '/dashboard/admin/notifications' },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-[#FEF6E7]/60 hover:text-[#c9871a] transition-colors"
                            >
                              <Icon size={15} className="text-slate-400" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 w-full transition-colors"
                        >
                          <FiLogOut size={15} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-6 xl:p-7">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;

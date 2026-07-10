'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MentorSidebar from '@/components/mentor/MentorSidebar';
import ProtectedRoute from '@/app/providers/protectedRoutes';
import {
  FiUser, FiLogOut, FiChevronDown,
  FiSearch, FiBell, FiHelpCircle,
} from 'react-icons/fi';

const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const MentorLayout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();

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
    if (last === 'mentor') return 'Dashboard';
    if (last === 'my-batches') return 'My Batches';
    return last?.charAt(0).toUpperCase() + last?.slice(1).replace(/-/g, ' ') || 'Dashboard';
  };

  const userName = mentor?.name || user?.firstName
    ? (mentor?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim())
    : 'Mentor';
  const userInitial = userName.charAt(0).toUpperCase();
  const mentorImage = mentor?.image || '';
  const mentorEmail = mentor?.email || user?.email || '';

  return (
    <ProtectedRoute allowedRoles={["mentor", "admin", "superAdmin"]}>
      <div className="min-h-screen bg-[#f8fafb] poppins">
        <MentorSidebar />

        {/* Main Content */}
        <main className="min-h-screen transition-all duration-300 lg:ml-[260px]">
          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60">
            <div className="flex items-center justify-between h-[64px] px-5 lg:px-7">
              {/* Left Side — Page Title */}
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight outfit-semibold">
                    {getPageTitle()}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
                    Mentor Dashboard
                  </p>
                </div>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <FiSearch size={17} />
                </button>
                <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all relative">
                  <FiBell size={17} />
                </button>

                <div className="w-px h-7 bg-slate-200 mx-1 hidden sm:block" />

                {/* Profile Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shadow-teal-500/20">
                      {mentorImage ? (
                        <img src={mentorImage} alt={userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                          {userInitial}
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-slate-700 leading-tight max-w-[120px] truncate">
                        {userName}
                      </p>
                      <p className="text-[10px] text-teal-600 font-medium leading-tight">
                        Mentor
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
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          {mentorImage ? (
                            <img src={mentorImage} alt={userName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
                              {userInitial}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                          <p className="text-xs text-slate-400 truncate">{mentorEmail}</p>
                        </div>
                      </div>

                      <div className="py-1">
                        {[
                          { icon: FiUser, label: 'My Profile', href: '/dashboard/mentor/profile' },
                          { icon: FiHelpCircle, label: 'Help Center', href: '/dashboard/mentor/messages' },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors"
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

export default MentorLayout;

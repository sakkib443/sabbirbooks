'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome, FiBook, FiUsers, FiCalendar, FiUser,
  FiMenu, FiX, FiLogOut, FiChevronDown, FiArrowLeft,
  FiMessageSquare, FiTrendingUp, FiChevronLeft,
  FiClipboard, FiFileText, FiAward, FiBell, FiClock,
} from 'react-icons/fi';

const MentorSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [userName, setUserName] = useState('Mentor');
  const [userEmail, setUserEmail] = useState('');
  const [userImage, setUserImage] = useState('');
  const [designation, setDesignation] = useState('Mentor');
  const pathname = usePathname();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const u = JSON.parse(user);
        setUserName(u.firstName || u.name || 'Mentor');
        setUserEmail(u.email || '');
      } catch (e) { }
    }
    // Fetch mentor profile for image & name
    const fetchMentor = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const API = ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';
        const res = await fetch(`${API}/mentors/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (data.success && data.data) {
          setUserName(data.data.name || 'Mentor');
          setUserImage(data.data.image || '');
          setDesignation(data.data.designation || 'Mentor');
          setUserEmail(data.data.email || data.data.userId?.email || '');
        }
      } catch (e) { }
    };
    fetchMentor();
  }, []);

  const isActive = (href) =>
    pathname === href || (href !== '/dashboard/mentor' && pathname.startsWith(href + '/'));
  const isExactActive = (href) => pathname === href;

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const menuGroups = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', href: '/dashboard/mentor', icon: FiHome, exact: true },
        { title: 'My Batches', href: '/dashboard/mentor/my-batches', icon: FiCalendar },
        { title: 'Batch Materials', href: '/dashboard/mentor/batch-materials', icon: FiFileText },
        { title: 'My Students', href: '/dashboard/mentor/students', icon: FiUsers },
      ],
    },
    {
      label: 'Teaching',
      items: [
        { title: 'Courses', href: '/dashboard/mentor/course', icon: FiBook },
        { title: 'Attendance', href: '/dashboard/mentor/attendance', icon: FiUsers },
        { title: 'Grading', href: '/dashboard/mentor/grading', icon: FiClipboard },
        { title: 'Student Progress', href: '/dashboard/mentor/student-progress', icon: FiTrendingUp },
        { title: 'Schedule', href: '/dashboard/mentor/schedule', icon: FiClock },
      ],
    },
    {
      label: 'Account',
      items: [
        { title: 'Profile', href: '/dashboard/mentor/profile', icon: FiUser },
      ],
    },
  ];

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={18} /> : <FiMenu size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out z-[50]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarWidth} bg-white border-r border-slate-200/80`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 h-16 border-b border-slate-100`}>
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0d9488] to-[#14b8a6] flex items-center justify-center shadow-md shadow-teal-500/20">
                  <span className="text-white font-black text-xs">AL</span>
                </div>
                <div className="leading-tight">
                  <p className="text-base font-bold text-slate-800">Aptech Learning</p>
                  <p className="text-[10px] text-teal-600 font-semibold -mt-0.5">Mentor Panel</p>
                </div>
              </Link>
            )}
            {collapsed && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0d9488] to-[#14b8a6] flex items-center justify-center shadow-md shadow-teal-500/20">
                <span className="text-white font-black text-xs">AL</span>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex w-6 h-6 rounded-md border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <FiChevronLeft size={12} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Mentor Profile Card */}
          {!collapsed && (
            <Link href="/dashboard/mentor/profile" className="mx-3 mt-3 flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-teal-50 border border-slate-100 hover:border-teal-200 transition-all group">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                {userImage ? (
                  <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-teal-700 transition">{userName}</p>
                <p className="text-[10px] text-teal-600 font-medium truncate">{designation}</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard/mentor/profile" className="mx-auto mt-3 block" title={userName}>
              <div className="w-10 h-10 rounded-xl overflow-hidden mx-auto shadow-sm">
                {userImage ? (
                  <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 sidebar-scroll">
            {menuGroups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
                    {group.label}
                  </p>
                )}
                {collapsed && <div className="mb-2 border-t border-slate-100" />}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    /* SUBMENU */
                    if (item.submenu) {
                      const activeSub = item.submenu.some(s => isActive(s.href));
                      const isMenuOpen = openMenu === item.title;

                      if (collapsed) {
                        return (
                          <div key={item.title} className="relative group/sub">
                            <div
                              className={`flex justify-center px-0 py-2.5 mx-1 rounded-lg transition-all cursor-pointer ${activeSub ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                              title={item.title}
                            >
                              <Icon size={18} className={activeSub ? 'text-teal-600' : 'text-slate-400'} />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={item.title}>
                          <button
                            onClick={() => toggleMenu(item.title)}
                            className={`group w-full flex items-center justify-between px-3 py-[9px] rounded-lg transition-all
                              ${activeSub ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                          >
                            <span className="flex items-center gap-3">
                              <Icon size={16} className={activeSub ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'} strokeWidth={activeSub ? 2.5 : 2} />
                              <span className={`text-[14px] ${activeSub ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
                            </span>
                            <FiChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <div className={`overflow-hidden transition-all duration-200 ${isMenuOpen ? 'max-h-40' : 'max-h-0'}`}>
                            <div className="ml-7 mt-1 pl-3 border-l-2 border-slate-100 space-y-0.5">
                              {item.submenu.map((sub) => (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={() => setIsOpen(false)}
                                  className={`flex items-center px-3 py-[7px] rounded-lg text-[13px] transition-all
                                    ${isActive(sub.href) ? 'bg-teal-500 text-white font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                                >
                                  {sub.title}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    /* NORMAL MENU */
                    const active = item.exact ? isExactActive(item.href) : isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        title={collapsed ? item.title : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg transition-all duration-200
                          ${collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-[9px]'}
                          ${active ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-teal-500 rounded-r-full" />
                        )}
                        <Icon
                          size={collapsed ? 18 : 16}
                          className={`flex-shrink-0 transition-colors ${active ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                          strokeWidth={active ? 2.5 : 2}
                        />
                        {!collapsed && (
                          <span className={`text-[14px] ${active ? 'font-semibold' : 'font-medium'}`}>
                            {item.title}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="border-t border-slate-100 p-3">
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}
              title="Back to Website"
            >
              <FiArrowLeft size={15} />
              {!collapsed && <span className="text-[14px] font-medium">Back to Website</span>}
            </Link>

            {!collapsed && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 mt-1">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
                  {userImage ? (
                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 truncate">{userName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                  title="Logout"
                >
                  <FiLogOut size={14} />
                </button>
              </div>
            )}
            {collapsed && (
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-2.5 text-slate-400 hover:text-rose-500 transition-all"
                title="Logout"
              >
                <FiLogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm lg:hidden z-[45]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <style jsx global>{`
        .sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </>
  );
};

export default MentorSidebar;

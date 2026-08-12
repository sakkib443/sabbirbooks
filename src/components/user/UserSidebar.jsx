'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBrand } from '@/components/shared/Brand';
import {
    FiHome, FiBook, FiAward, FiUser, FiMenu, FiX, FiLogOut,
    FiArrowLeft, FiHelpCircle, FiCalendar, FiCreditCard,
    FiFileText, FiClipboard, FiBarChart2, FiBell,
    FiCheckSquare, FiChevronLeft, FiFolder, FiTrendingUp, FiHeadphones,
} from 'react-icons/fi';

const UserSidebar = () => {
  // Site name comes from admin settings, not a hardcoded string.
  const { name: brandName, initials: brandInitials } = useBrand();
    const [isOpen, setIsOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [userName, setUserName] = useState('Student');
    const [userEmail, setUserEmail] = useState('');
    const [userAvatar, setUserAvatar] = useState('');
    const pathname = usePathname();

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const u = JSON.parse(user);
                setUserName(u.firstName || u.name || 'Student');
                setUserEmail(u.email || '');
                setUserAvatar(u.profileImage || u.avatar || '');
            } catch (e) { }
        }
    }, []);

    const isActive = (href) =>
        pathname === href || (href !== '/dashboard/user' && pathname.startsWith(href + '/'));
    const isExactActive = (href) => pathname === href;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const menuGroups = [
        {
            label: 'Main',
            items: [
                { title: 'Overview', href: '/dashboard/user', icon: FiHome, exact: true },
                { title: 'My Courses', href: '/dashboard/user/courses', icon: FiBook },
                { title: 'My Book', href: '/dashboard/user/my-book', icon: FiFileText },
                { title: 'My Progress', href: '/dashboard/user/my-progress', icon: FiTrendingUp },
                { title: 'Course Materials', href: '/dashboard/user/materials', icon: FiFolder },
                { title: 'Schedule', href: '/dashboard/user/schedule', icon: FiCalendar },
                { title: 'Attendance', href: '/dashboard/user/attendance', icon: FiCheckSquare },
                { title: 'Notice Board', href: '/dashboard/user/notice-board', icon: FiClipboard },
            ],
        },
        {
            label: 'Account',
            items: [
                { title: 'Certificates', href: '/dashboard/user/certificates', icon: FiAward },
                { title: 'Payments', href: '/dashboard/user/payments', icon: FiCreditCard },
                { title: 'Notifications', href: '/dashboard/user/notifications', icon: FiBell },
                { title: 'Profile', href: '/dashboard/user/profile', icon: FiUser },
                { title: 'Support', href: '/dashboard/user/support', icon: FiHelpCircle },
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
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center shadow-md shadow-[#F3A522]/20">
                                    <span className="text-white font-black text-xs">{brandInitials}</span>
                                </div>
                                <div className="leading-tight">
                                    <p className="text-base font-bold text-slate-800">{brandName}</p>
                                    <p className="text-[11px] text-slate-400 -mt-0.5">Academy</p>
                                </div>
                            </Link>
                        )}
                        {collapsed && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center shadow-md shadow-[#F3A522]/20">
                                <span className="text-white font-black text-xs">{brandInitials}</span>
                            </div>
                        )}
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="hidden lg:flex w-6 h-6 rounded-md border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                        >
                            <FiChevronLeft size={12} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 sidebar-scroll">
                        {menuGroups.map((group) => (
                            <div key={group.label}>
                                {!collapsed && (
                                    <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em]">
                                        {group.label}
                                    </p>
                                )}
                                {collapsed && <div className="mb-2 border-t border-slate-100" />}
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const active = item.exact
                                            ? isExactActive(item.href)
                                            : isActive(item.href);

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsOpen(false)}
                                                title={collapsed ? item.title : undefined}
                                                className={`group relative flex items-center gap-3 rounded-lg transition-all duration-200
                                                    ${collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-[9px]'}
                                                    ${active
                                                        ? 'bg-[#FEF6E7] text-[#a5680f]'
                                                        : 'text-slate-500 hover:text-[#c9871a] hover:bg-[#FEF6E7]/60'
                                                    }`}
                                            >
                                                {active && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#F3A522] rounded-r-full" />
                                                )}
                                                <Icon
                                                    size={collapsed ? 18 : 16}
                                                    className={`flex-shrink-0 transition-colors ${active ? 'text-[#c9871a]' : 'text-slate-400 group-hover:text-slate-600'}`}
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
                        {/* Back to site */}
                        <Link
                            href="/"
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-[#c9871a] hover:bg-[#FEF6E7] transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}
                            title="Back to Website"
                        >
                            <FiArrowLeft size={15} />
                            {!collapsed && <span className="text-[14px] font-medium">Back to Website</span>}
                        </Link>

                        {/* User info */}
                        {!collapsed && (
                            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 mt-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                    {userName.charAt(0).toUpperCase()}
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

export default UserSidebar;

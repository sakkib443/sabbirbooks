'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome, FiUsers, FiAward, FiMessageSquare,
  FiMenu, FiX, FiLogOut, FiChevronDown, FiArrowLeft,
  FiSettings, FiLayers, FiShoppingCart, FiDollarSign, FiPlus,
  FiBarChart2, FiBell, FiChevronLeft, FiHeadphones, FiTag, FiGlobe, FiClipboard, FiLink,
  FiBook, FiShoppingBag,
} from 'react-icons/fi';

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState(() => new Set(['Create New']));
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('admin');
  const pathname = usePathname();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const u = JSON.parse(user);
        setUserName(u.firstName || u.name || 'Admin');
        setUserEmail(u.email || '');
        if (u.role) setRole(u.role);
      } catch (e) { }
    }
  }, []);

  // Hide items a role isn't allowed to see; drop submenu parents left empty.
  const filterByRole = (items, r) => items
    .filter(it => !(it.deny && it.deny.includes(r)))
    .map(it => it.submenu ? { ...it, submenu: filterByRole(it.submenu, r) } : it)
    .filter(it => !it.submenu || it.submenu.length > 0);

  const isActive = (href) =>
    pathname === href || (href !== '/dashboard/admin' && pathname.startsWith(href + '/'));
  const isExactActive = (href) => pathname === href;

  // Does this item (or any nested child) point at the current route?
  const hasActiveChild = (item) => {
    if (item.href) return item.exact ? isExactActive(item.href) : isActive(item.href);
    if (item.submenu) return item.submenu.some(hasActiveChild);
    return false;
  };

  const toggleMenu = (key) => setOpenMenus(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const menuGroups = [
    {
      label: 'Overview',
      items: [
        { title: 'Dashboard', href: '/dashboard/admin', icon: FiHome, exact: true },
        { title: 'Analytics', href: '/dashboard/admin/analytics', icon: FiBarChart2, deny: ['trainingManager'] },
      ],
    },
    {
      label: 'Course Management',
      items: [
        {
          title: 'Management', icon: FiLayers,
          submenu: [
            { title: 'Batch Analytics', href: '/dashboard/admin/batch-analytics' },
            { title: 'Student Progress', href: '/dashboard/admin/student-progress' },
            { title: 'Payment Progress', href: '/dashboard/admin/payment-progress' },
            { title: 'Reports', href: '/dashboard/admin/reports' },
          ],
        },
        { title: 'Orders', href: '/dashboard/admin/orders', icon: FiShoppingCart },
        { title: 'Enrollments', href: '/dashboard/admin/enrollments', icon: FiDollarSign },
        { title: 'Coupons', href: '/dashboard/admin/coupons', icon: FiTag },
        {
          title: 'Create New', icon: FiPlus,
          submenu: [
            {
              title: 'Course',
              submenu: [
                { title: 'All Course', href: '/dashboard/admin/course' },
                { title: 'Create Course', href: '/dashboard/admin/course/create' },
              ],
            },
            {
              title: 'Category',
              submenu: [
                { title: 'All Category', href: '/dashboard/admin/category' },
                { title: 'Create Category', href: '/dashboard/admin/category/create' },
              ],
            },
            {
              title: 'Batch',
              submenu: [
                { title: 'All Batch', href: '/dashboard/admin/batch' },
                { title: 'Create Batch', href: '/dashboard/admin/batch/create' },
              ],
            },
            {
              title: 'Mentor',
              submenu: [
                { title: 'All Mentor', href: '/dashboard/admin/mentor' },
                { title: 'Create Mentor', href: '/dashboard/admin/mentor/create' },
              ],
            },
            {
              title: 'Blog',
              submenu: [
                { title: 'All Blog', href: '/dashboard/admin/blog' },
                { title: 'Create Blog', href: '/dashboard/admin/blog/create' },
              ],
            },
          ],
        },
        { title: 'Certifications', href: '/dashboard/admin/certification', icon: FiAward },
      ],
    },
    {
      label: 'Book Store',
      items: [
        { title: 'All Books', href: '/dashboard/admin/books', icon: FiBook, exact: true },
        { title: 'Add Book', href: '/dashboard/admin/books/create', icon: FiPlus },
        { title: 'Book Orders', href: '/dashboard/admin/book-orders', icon: FiShoppingBag },
      ],
    },
    {
      label: 'Communication',
      items: [
        { title: 'Notice Board', href: '/dashboard/admin/notice-board', icon: FiClipboard },
        { title: 'Notifications', href: '/dashboard/admin/notifications', icon: FiBell },
        { title: 'Feedback', href: '/dashboard/admin/feedback', icon: FiMessageSquare },
        { title: 'Reviews', href: '/dashboard/admin/reviews', icon: FiAward },
      ],
    },
    {
      label: 'Others',
      items: [
        {
          title: 'Site Content', icon: FiGlobe,
          submenu: [
            { title: 'Contact Page', href: '/dashboard/admin/site-content/contact' },
          ],
        },
        { title: 'Partners', href: '/dashboard/admin/partners', icon: FiLink },
        {
          title: 'Users', icon: FiUsers,
          submenu: [
            { title: 'Team / Staff', href: '/dashboard/admin/user/staff', deny: ['trainingManager'] },
            { title: 'Students', href: '/dashboard/admin/user/students' },
          ],
        },
        { title: 'Settings', href: '/dashboard/admin/settings', icon: FiSettings },
      ],
    },
  ];

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  // Role-aware menu: drop denied items + any group left empty.
  const visibleGroups = menuGroups
    .map(g => ({ ...g, items: filterByRole(g.items, role) }))
    .filter(g => g.items.length > 0);

  // ─── Recursive item renderer (supports nested submenus) ─────
  const renderItem = (item, level = 0) => {
    const Icon = item.icon;
    const pad = level === 0 ? 'px-3 py-[9px]' : 'px-3 py-[7px]';
    const textSize = level === 0 ? 'text-[14px]' : 'text-[13px]';

    if (item.submenu) {
      const active = hasActiveChild(item);
      const expanded = openMenus.has(item.title) || active;
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleMenu(item.title)}
            className={`group w-full flex items-center justify-between rounded-lg transition-all ${pad}
              ${active ? 'bg-[#FEF6E7] text-[#a5680f]' : 'text-gray-500 hover:text-[#c9871a] hover:bg-[#FEF6E7]/60'}`}
          >
            <span className="flex items-center gap-3">
              {Icon && <Icon size={level === 0 ? 16 : 14} className={active ? 'text-[#c9871a]' : 'text-gray-400 group-hover:text-[#c9871a]'} strokeWidth={active ? 2.5 : 2} />}
              <span className={`${textSize} ${active ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
            </span>
            <FiChevronDown size={13} className={`transition-transform duration-200 ${active ? 'text-[#c9871a]' : 'text-gray-400'} ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[700px]' : 'max-h-0'}`}>
            <div className="ml-[26px] mt-1 pl-3 border-l-2 border-[#F0DFB4]/60 space-y-0.5">
              {item.submenu.map(sub => renderItem(sub, level + 1))}
            </div>
          </div>
        </div>
      );
    }

    // Leaf link
    const active = item.exact ? isExactActive(item.href) : isActive(item.href);
    const leafActiveClass = level === 0
      ? 'bg-[#FEF6E7] text-[#a5680f]'
      : 'bg-gradient-to-r from-[#F3A522] to-[#d88f13] text-white font-semibold shadow-sm shadow-[#F3A522]/25';
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={`group relative flex items-center gap-3 rounded-lg transition-all ${pad}
          ${active ? leafActiveClass : 'text-gray-500 hover:text-[#c9871a] hover:bg-[#FEF6E7]/60'}`}
      >
        {active && level === 0 && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[#F3A522] rounded-r-full" />
        )}
        {Icon && <Icon size={16} className={`flex-shrink-0 ${active ? 'text-[#c9871a]' : 'text-gray-400 group-hover:text-[#c9871a]'}`} strokeWidth={active ? 2.5 : 2} />}
        <span className={`${textSize} ${active ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
      </Link>
    );
  };

  // Collapsed: only top-level icons (no expansion)
  const renderCollapsedItem = (item) => {
    const Icon = item.icon;
    const active = hasActiveChild(item);
    const cls = `flex justify-center py-2.5 mx-1 rounded-lg transition-all ${active ? 'bg-[#FEF6E7] text-[#c9871a]' : 'text-gray-400 hover:text-[#c9871a] hover:bg-[#FEF6E7]/60'}`;
    if (item.submenu) {
      return <div key={item.title} title={item.title} className={cls}>{Icon && <Icon size={18} />}</div>;
    }
    return (
      <Link key={item.href} href={item.href} title={item.title} onClick={() => setIsOpen(false)} className={cls}>
        {Icon && <Icon size={18} />}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-white shadow-lg border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-[#FEF6E7] active:scale-95 transition-all"
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={18} /> : <FiMenu size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out z-[50]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarWidth} bg-white border-r border-gray-100`}
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-[#F3A522] via-[#e2941c] to-[#9AA0A8]"></div>

        <div className="flex flex-col h-[calc(100%-3px)]">
          {/* Header */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 h-16 border-b border-gray-100`}>
            {!collapsed ? (
              <Link href="/dashboard/admin" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center shadow-md shadow-[#F3A522]/25">
                  <span className="text-white font-black text-xs">SB</span>
                </div>
                <div className="leading-tight">
                  <p className="text-base font-bold text-slate-800">Sabbir Book</p>
                  <p className="text-[10px] text-[#c9871a] font-semibold -mt-0.5">Admin Panel</p>
                </div>
              </Link>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center shadow-md shadow-[#F3A522]/25">
                <span className="text-white font-black text-xs">SB</span>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex w-6 h-6 rounded-md border border-gray-200 items-center justify-center text-gray-400 hover:text-[#c9871a] hover:bg-[#FEF6E7] hover:border-[#F0DFB4] transition-all"
            >
              <FiChevronLeft size={12} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 sidebar-scroll">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                {!collapsed ? (
                  <p className="px-3 mb-2 text-[10px] font-bold text-gray-300 uppercase tracking-[0.14em]">
                    {group.label}
                  </p>
                ) : (
                  <div className="mb-2 border-t border-gray-100" />
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => collapsed ? renderCollapsedItem(item) : renderItem(item, 0))}
                </div>
              </div>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="border-t border-gray-100 p-3">
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-400 hover:text-[#c9871a] hover:bg-[#FEF6E7] transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}
              title="Back to Website"
            >
              <FiArrowLeft size={15} />
              {!collapsed && <span className="text-[14px] font-medium">Back to Website</span>}
            </Link>

            {!collapsed ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#FEF6E7]/60 border border-[#F0DFB4]/60 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F3A522] to-[#d88f13] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-[#F3A522]/25">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-700 truncate">{userName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                  title="Logout"
                >
                  <FiLogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-2.5 text-gray-400 hover:text-rose-500 transition-all"
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
        .sidebar-scroll::-webkit-scrollbar-thumb { background: #F0DFB4; border-radius: 10px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #F3A522; }
      `}</style>
    </>
  );
};

export default AdminSidebar;

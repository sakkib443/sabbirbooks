'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBrand } from '@/components/shared/Brand';
import { canAny, getStoredUser, resolveCapabilities, ROLE_LABELS } from '@/lib/permissions';
import {
  FiHome, FiUsers, FiAward, FiMessageSquare,
  FiMenu, FiX, FiLogOut, FiChevronDown, FiArrowLeft,
  FiSettings, FiLayers, FiShoppingCart, FiDollarSign, FiPlus,
  FiBarChart2, FiBell, FiChevronLeft, FiTag, FiGlobe, FiClipboard, FiLink,
  FiBook, FiShoppingBag, FiGrid, FiEye, FiShield, FiKey, FiUnlock,
} from 'react-icons/fi';

const AdminSidebar = () => {
  // Site name comes from admin settings, not a hardcoded string.
  const { name: brandName, initials: brandInitials } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState(() => new Set(['Create New']));
  const [userName, setUserName] = useState('Admin');
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('admin');
  // Capabilities the SERVER resolved for this account — ProtectedRoute refreshes
  // them from /api/auth/me before this sidebar ever renders. The menu is built
  // from the same list the API routes enforce, so an item is only ever hidden
  // when the corresponding request would 403 anyway.
  const [caps, setCaps] = useState([]);
  const pathname = usePathname();

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setUserName(u.firstName || u.name || 'Admin');
      setUserEmail(u.email || '');
      if (u.role) setRole(u.role);
      setCaps(resolveCapabilities(u));
    }
  }, [pathname]);

  // Hide what this account cannot do; drop submenu parents left empty.
  // `need: [...]` shows the item when the user holds ANY of those capabilities.
  const filterByCaps = (items) => items
    .filter(it => !it.need || canAny({ capabilities: caps }, ...it.need))
    .map(it => it.submenu ? { ...it, submenu: filterByCaps(it.submenu) } : it)
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
        { title: 'Analytics', href: '/dashboard/admin/analytics', icon: FiBarChart2, need: ['analytics.read'] },
      ],
    },
    {
      label: 'Book Store',
      items: [
        { title: 'All Books', href: '/dashboard/admin/books', icon: FiBook, exact: true, need: ['content.write'] },
        { title: 'Add Book', href: '/dashboard/admin/books/create', icon: FiPlus, need: ['content.write'] },
        { title: 'Book Content (QR)', href: '/dashboard/admin/book-content', icon: FiGrid, need: ['content.write'] },
        { title: 'Book Preview', href: '/dashboard/admin/book-preview', icon: FiEye, need: ['content.write'] },
        // One code per printed copy — a list of unredeemed ones IS the codes,
        // so reading it is the same gate as minting them.
        { title: 'Book Codes', href: '/dashboard/admin/book-codes', icon: FiKey, need: ['content.write'] },
        // The other half of the codes: who ended up able to read the book.
        // orders.read, not content — it is the fulfilment question, 'did what
        // we sold reach who we sold it to'.
        { title: 'Book Access', href: '/dashboard/admin/book-access', icon: FiUnlock, need: ['orders.read'] },
        // Book Orders is the "who is buying" screen — orders.read, not content.
        {
          title: 'Book Orders', icon: FiShoppingBag, need: ['orders.read'],
          submenu: [
            { title: 'All Orders', href: '/dashboard/admin/book-orders', exact: true, need: ['orders.read'] },
            // Deliberately its own screen, and deliberately named for what it
            // does. Deleting used to be a button on the orders list; it now
            // takes a decision to get here. See book-orders/delete.
            { title: 'Delete an Order', href: '/dashboard/admin/book-orders/delete', need: ['records.delete'] },
          ],
        },
        // Two menus, because there are two different things.
        //
        // A coupon is a discount with a code on it — a launch offer, a
        // giveaway, a fair. Nobody is paid for it, so nothing about a person
        // appears on that screen.
        //
        // An affiliate is a person who sells, and their coupon is only the
        // instrument. Everything about them — who they are, what they sold,
        // what the shop owes them — belongs on their own screen, next door.
        {
          title: 'Coupons', icon: FiTag, need: ['orders.read'],
          submenu: [
            { title: 'All Coupons', href: '/dashboard/admin/book-coupons', exact: true, need: ['orders.read'] },
            { title: 'Add Coupon', href: '/dashboard/admin/book-coupons/create', need: ['orders.write'] },
          ],
        },
        // An affiliate record is a record about a person — their college, their
        // phone, a photo of their ID — so it sits with users.read, the same
        // capability the student directory uses, rather than with orders.
        {
          title: 'Affiliates', icon: FiAward, need: ['users.read'],
          submenu: [
            { title: 'All Affiliates', href: '/dashboard/admin/affiliates', exact: true, need: ['users.read'] },
            { title: 'Applications', href: '/dashboard/admin/affiliates/applications', need: ['users.read'] },
            { title: 'Payouts', href: '/dashboard/admin/book-coupons/payouts', need: ['orders.read'] },
          ],
        },
      ],
    },
    {
      label: 'Course Management',
      items: [
        {
          title: 'Management', icon: FiLayers,
          submenu: [
            { title: 'Batch Analytics', href: '/dashboard/admin/batch-analytics', need: ['analytics.read'] },
            { title: 'Student Progress', href: '/dashboard/admin/student-progress', need: ['training.manage'] },
            { title: 'Payment Progress', href: '/dashboard/admin/payment-progress', need: ['training.manage'] },
            { title: 'Reports', href: '/dashboard/admin/reports', need: ['analytics.read'] },
          ],
        },
        { title: 'Orders', href: '/dashboard/admin/orders', icon: FiShoppingCart, need: ['orders.read'] },
        { title: 'Enrollments', href: '/dashboard/admin/enrollments', icon: FiDollarSign, need: ['training.manage'] },
        { title: 'Course Coupons', href: '/dashboard/admin/coupons', icon: FiTag, need: ['training.manage'] },
        {
          title: 'Create New', icon: FiPlus,
          submenu: [
            {
              title: 'Course', need: ['content.write'],
              submenu: [
                { title: 'All Course', href: '/dashboard/admin/course' },
                { title: 'Create Course', href: '/dashboard/admin/course/create' },
              ],
            },
            {
              title: 'Category', need: ['content.write'],
              submenu: [
                { title: 'All Category', href: '/dashboard/admin/category' },
                { title: 'Create Category', href: '/dashboard/admin/category/create' },
              ],
            },
            {
              title: 'Batch', need: ['training.manage'],
              submenu: [
                { title: 'All Batch', href: '/dashboard/admin/batch' },
                { title: 'Create Batch', href: '/dashboard/admin/batch/create' },
              ],
            },
            {
              title: 'Mentor', need: ['content.write'],
              submenu: [
                { title: 'All Mentor', href: '/dashboard/admin/mentor' },
                { title: 'Create Mentor', href: '/dashboard/admin/mentor/create' },
              ],
            },
            {
              title: 'Blog', need: ['content.write'],
              submenu: [
                { title: 'All Blog', href: '/dashboard/admin/blog' },
                { title: 'Create Blog', href: '/dashboard/admin/blog/create' },
              ],
            },
          ],
        },
        { title: 'Certifications', href: '/dashboard/admin/certification', icon: FiAward, need: ['training.manage'] },
      ],
    },
    {
      label: 'Communication',
      items: [
        { title: 'Notice Board', href: '/dashboard/admin/notice-board', icon: FiClipboard, need: ['content.write'] },
        { title: 'Notifications', href: '/dashboard/admin/notifications', icon: FiBell },
        // Feedback = contact-form submissions, i.e. names, emails and phone numbers.
        { title: 'Feedback', href: '/dashboard/admin/feedback', icon: FiMessageSquare, need: ['users.read'] },
        { title: 'Reviews', href: '/dashboard/admin/reviews', icon: FiAward, need: ['content.write'] },
      ],
    },
    {
      label: 'Others',
      items: [
        {
          title: 'Site Content', icon: FiGlobe, need: ['content.write'],
          submenu: [
            { title: 'Contact Page', href: '/dashboard/admin/site-content/contact' },
          ],
        },
        { title: 'Partners', href: '/dashboard/admin/partners', icon: FiLink, need: ['content.write'] },
        {
          title: 'Users', icon: FiUsers, need: ['users.read', 'staff.manage'],
          submenu: [
            { title: 'Team / Staff', href: '/dashboard/admin/user/staff', need: ['staff.manage'] },
            { title: 'Permissions', href: '/dashboard/admin/user/permissions', need: ['staff.manage'] },
            { title: 'Students', href: '/dashboard/admin/user/students', need: ['users.read'] },
            // Directory behind the signup form's college dropdown — reference
            // data about students' institutions, so it rides with users.write.
            { title: 'Medical Colleges', href: '/dashboard/admin/medical-colleges', need: ['users.write'] },
          ],
        },
        // No `need`: this page also hosts My Profile and Password, which every
        // staff account must be able to reach. The Site Settings TAB inside it
        // is what carries the settings.write gate.
        { title: 'Settings', href: '/dashboard/admin/settings', icon: FiSettings },
        // Reads deployment configuration and can spend a message, so it is
        // owner territory — same gate as the staff screens.
        { title: 'SMS', href: '/dashboard/admin/sms', icon: FiMessageSquare, need: ['staff.manage'] },
      ],
    },
  ];

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]';

  // Capability-aware menu: drop what this account cannot do + any empty group.
  const visibleGroups = menuGroups
    .map(g => ({ ...g, items: filterByCaps(g.items) }))
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
              ${active ? 'bg-brand-soft text-brand-deep' : 'text-dash-mute hover:text-brand-ink hover:bg-brand-soft/60'}`}
          >
            <span className="flex items-center gap-3">
              {Icon && <Icon size={level === 0 ? 16 : 14} className={active ? 'text-brand-ink' : 'text-dash-mute2 group-hover:text-brand-ink'} strokeWidth={active ? 2.5 : 2} />}
              <span className={`${textSize} ${active ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
            </span>
            <FiChevronDown size={13} className={`transition-transform duration-200 ${active ? 'text-brand-ink' : 'text-dash-mute2'} ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-[700px]' : 'max-h-0'}`}>
            <div className="ml-[26px] mt-1 pl-3 border-l-2 border-brand-line/60 space-y-0.5">
              {item.submenu.map(sub => renderItem(sub, level + 1))}
            </div>
          </div>
        </div>
      );
    }

    // Leaf link
    const active = item.exact ? isExactActive(item.href) : isActive(item.href);
    const leafActiveClass = level === 0
      ? 'bg-brand-soft text-brand-deep'
      : 'bg-gradient-to-r from-brand to-brand-hover text-white font-semibold shadow-sm shadow-brand/25';
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setIsOpen(false)}
        className={`group relative flex items-center gap-3 rounded-lg transition-all ${pad}
          ${active ? leafActiveClass : 'text-dash-mute hover:text-brand-ink hover:bg-brand-soft/60'}`}
      >
        {active && level === 0 && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-brand rounded-r-full" />
        )}
        {Icon && <Icon size={16} className={`flex-shrink-0 ${active ? 'text-brand-ink' : 'text-dash-mute2 group-hover:text-brand-ink'}`} strokeWidth={active ? 2.5 : 2} />}
        <span className={`${textSize} ${active ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
      </Link>
    );
  };

  // Collapsed: only top-level icons (no expansion)
  const renderCollapsedItem = (item) => {
    const Icon = item.icon;
    const active = hasActiveChild(item);
    const cls = `flex justify-center py-2.5 mx-1 rounded-lg transition-all ${active ? 'bg-brand-soft text-brand-ink' : 'text-dash-mute2 hover:text-brand-ink hover:bg-brand-soft/60'}`;
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
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-dash-card shadow-lg border border-dash-line-soft flex items-center justify-center text-dash-ink3 hover:bg-brand-soft active:scale-95 transition-all"
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={18} /> : <FiMenu size={18} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out z-[50]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarWidth} bg-dash-card border-r border-dash-line-soft`}
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-brand via-brand-strong to-dash-steel"></div>

        <div className="flex flex-col h-[calc(100%-3px)]">
          {/* Header */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 h-16 border-b border-dash-line-soft`}>
            {!collapsed ? (
              <Link href="/dashboard/admin" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-md shadow-brand/25">
                  <span className="text-white font-black text-xs">{brandInitials}</span>
                </div>
                <div className="leading-tight">
                  <p className="text-base font-bold text-dash-ink2">{brandName}</p>
                  {/* Name the actual role — a Content Manager sees a much smaller
                      menu and should know why. */}
                  <p className="text-[10px] text-brand-ink font-semibold -mt-0.5 flex items-center gap-1">
                    <FiShield size={9} />{ROLE_LABELS[role] || 'Admin'} Panel
                  </p>
                </div>
              </Link>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-md shadow-brand/25">
                <span className="text-white font-black text-xs">{brandInitials}</span>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex w-6 h-6 rounded-md border border-dash-line items-center justify-center text-dash-mute2 hover:text-brand-ink hover:bg-brand-soft hover:border-brand-line transition-all"
            >
              <FiChevronLeft size={12} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 sidebar-scroll">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                {!collapsed ? (
                  <p className="px-3 mb-2 text-[10px] font-bold text-dash-faint uppercase tracking-[0.14em]">
                    {group.label}
                  </p>
                ) : (
                  <div className="mb-2 border-t border-dash-line-soft" />
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => collapsed ? renderCollapsedItem(item) : renderItem(item, 0))}
                </div>
              </div>
            ))}
          </nav>

          {/* User + Logout */}
          <div className="border-t border-dash-line-soft p-3">
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-dash-mute2 hover:text-brand-ink hover:bg-brand-soft transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}
              title="Back to Website"
            >
              <FiArrowLeft size={15} />
              {!collapsed && <span className="text-[14px] font-medium">Back to Website</span>}
            </Link>

            {!collapsed ? (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-brand-soft/60 border border-brand-line/60 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-brand/25">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-dash-ink3 truncate">{userName}</p>
                  <p className="text-[11px] text-dash-mute2 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-dash-mute2 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                  title="Logout"
                >
                  <FiLogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex justify-center py-2.5 text-dash-mute2 hover:text-rose-500 transition-all"
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

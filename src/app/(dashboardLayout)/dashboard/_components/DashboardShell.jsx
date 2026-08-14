'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/app/providers/protectedRoutes';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { FiChevronDown, FiLogOut, FiSearch } from 'react-icons/fi';

/**
 * The dashboard chrome — sidebar slot, sticky topbar, profile dropdown, page
 * padding — shared by the admin, mentor and student panels.
 *
 * It used to be copy-pasted into all three role layouts, which is why the
 * theme toggle lives here: one mount, three roles. Anything genuinely
 * role-specific (which sidebar, which menu entries, what the avatar looks
 * like) comes in as a prop; the role layout still owns its own data loading,
 * because only the mentor layout needs a second request to build its identity.
 */
export default function DashboardShell({
  allowedRoles,
  sidebar,
  /** Last path segment that means "you are on the role's home page". */
  rootSegment,
  /** { 'my-batches': 'My Batches' } — pretty names for segments that need one. */
  titleOverrides = {},
  /** Small line under the page title, e.g. "Admin Dashboard". */
  subtitle,
  userName,
  userEmail,
  /** Short role word shown under the user name in the topbar. */
  roleBadge,
  /** Tailwind classes for that role word — each panel tints it differently. */
  roleBadgeClassName = 'text-dash-mute2',
  /** Avatar node for the topbar button (32px) and, optionally, a larger one. */
  avatar,
  avatarLarge,
  /** [{ icon, label, href }] */
  menuItems = [],
  /** Role accent applied to menu rows on hover. */
  menuHoverClassName = 'hover:bg-dash-soft hover:text-brand-ink',
  /** <NotificationBell /> for admin/student; a plain button for mentor. */
  notificationSlot = null,
  /** Admin's sidebar toggle overlaps the top-left, so it needs extra padding. */
  headerPaddingClassName = 'px-5 lg:px-7',
  children,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();

  // Navigating away closes the profile menu. Adjusted during render rather than
  // in an effect: an effect would paint the menu once over the new page first,
  // and React's own guidance is to derive this kind of reset from the prop it
  // depends on. https://react.dev/learn/you-might-not-need-an-effect
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDropdownOpen(false);
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getPageTitle = () => {
    const segments = (pathname || '').split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last || last === rootSegment) return 'Dashboard';
    if (titleOverrides[last]) return titleOverrides[last];
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  };

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {/* `dash-scope` is load-bearing, not decorative: globals.css bends the
          Tailwind status-hue ramp (emerald/rose/amber/…) inside this subtree
          when the theme is dark, so every status chip in every panel flips
          without being rewritten. Removing it makes ~2,100 chips glow white
          in dark mode. */}
      <div className="dash-scope min-h-screen bg-dash-bg poppins">
        {sidebar}

        {/* Main Content */}
        <main className="min-h-screen transition-all duration-300 lg:ml-[260px]">
          {/* ═══════ Top Header Bar ═══════ */}
          <header className="sticky top-0 z-30 bg-dash-card/90 backdrop-blur-xl border-b border-dash-line/60">
            <div className={`flex items-center justify-between h-[64px] ${headerPaddingClassName}`}>
              {/* Left Side — Page Title */}
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-dash-ink2 leading-tight outfit-semibold">
                    {getPageTitle()}
                  </h2>
                  <p className="text-[11px] text-dash-mute2 font-medium -mt-0.5">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Right Side — Search, Theme, Notification, Profile */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Search"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-dash-mute2 hover:text-dash-ink4 hover:bg-dash-soft2 transition-all"
                >
                  <FiSearch size={17} />
                </button>

                <ThemeToggle className="hidden sm:inline-flex" />

                {notificationSlot ? <div className="relative">{notificationSlot}</div> : null}

                {/* Divider */}
                <div className="w-px h-7 bg-dash-soft3 mx-1 hidden sm:block" />

                {/* Profile Dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-dash-soft transition-all group"
                  >
                    {avatar}
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-dash-ink3 leading-tight max-w-[120px] truncate">
                        {userName}
                      </p>
                      <p className={`text-[10px] font-medium leading-tight ${roleBadgeClassName}`}>
                        {roleBadge}
                      </p>
                    </div>
                    <FiChevronDown
                      size={14}
                      className={`text-dash-mute2 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-dash-card rounded-xl border border-dash-line shadow-xl shadow-dash-line/50 py-1.5">
                      <div className="px-4 py-3 border-b border-dash-line-soft flex items-center gap-3">
                        {avatarLarge}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dash-ink2 truncate">{userName}</p>
                          <p className="text-xs text-dash-mute2 truncate">{userEmail || ''}</p>
                        </div>
                      </div>

                      {/* The toggle is hidden in the topbar on phones, so it
                          reappears here — otherwise small screens lose it. */}
                      <div className="px-4 py-2.5 border-b border-dash-line-soft flex items-center justify-between sm:hidden">
                        <span className="text-sm text-dash-ink4">Theme</span>
                        <ThemeToggle />
                      </div>

                      <div className="py-1">
                        {menuItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.label}
                              href={item.href}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm text-dash-ink4 transition-colors ${menuHoverClassName}`}
                            >
                              <Icon size={15} className="text-dash-mute2" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>

                      <div className="border-t border-dash-line-soft pt-1">
                        <button
                          type="button"
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
}

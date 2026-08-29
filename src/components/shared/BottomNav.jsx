'use client';

/**
 * The phone's bottom tab bar — the thing that makes the site feel like an app.
 *
 * Most of this shop's visitors are medical students on a phone, and a site they
 * scroll to the top of to change screens reads as a website. A fixed row of
 * thumb-reachable tabs reads as an app, so every surface (storefront, student
 * dashboard, admin panel) gets one, with its own items.
 *
 * Notes that are load-bearing rather than decorative:
 *   • `lg:hidden` — desktop keeps its sidebar/навbar; this is phones and tablets.
 *   • env(safe-area-inset-bottom) — without it the bar sits under the iPhone
 *     home indicator and the last tab cannot be tapped.
 *   • Pages must reserve the bar's height at the bottom or it covers their last
 *     control; `BottomNavSpacer` below is that reservation.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * @param {{
 *   items?: Array<{ key?: string, href?: string, label: string, icon: any,
 *                   exact?: boolean, badge?: number, onClick?: () => void,
 *                   match?: (path: string) => boolean }>,
 *   tone?: 'light' | 'dash',
 * }} props
 */
export default function BottomNav({ items = [], tone = 'light' }) {
  const pathname = usePathname() || '/';

  const isActive = (it) => {
    if (it.match) return it.match(pathname);
    if (!it.href) return false;
    if (it.exact) return pathname === it.href;
    return pathname === it.href || pathname.startsWith(it.href + '/');
  };

  const shell =
    tone === 'dash'
      ? 'border-dash-line-soft bg-dash-card/95'
      : 'border-border bg-background/95';
  const activeCls = tone === 'dash' ? 'text-brand' : 'text-primary';
  const idleCls = tone === 'dash' ? 'text-dash-mute2' : 'text-muted-foreground';

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-50 border-t ${shell} backdrop-blur-md lg:hidden`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(it);
          const inner = (
            <span className="relative flex flex-col items-center gap-0.5 py-2">
              {/* The active pill sits behind the icon rather than under the
                  label: it survives long Bengali words without shifting. */}
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? (tone === 'dash' ? 'bg-brand-soft' : 'bg-primary-soft') : ''
                }`}
              >
                <Icon size={19} className={active ? activeCls : idleCls} />
                {it.badge > 0 && (
                  <span className="absolute right-2.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
                    {it.badge > 9 ? '9+' : it.badge}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] font-semibold leading-none ${active ? activeCls : idleCls}`}
              >
                {it.label}
              </span>
            </span>
          );

          return (
            <li key={it.key || it.href || it.label} className="flex-1">
              {it.onClick ? (
                <button onClick={it.onClick} className="w-full" aria-current={active ? 'page' : undefined}>
                  {inner}
                </button>
              ) : (
                <Link href={it.href} className="block" aria-current={active ? 'page' : undefined}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Reserves the bar's height so a page's last row is not sitting underneath it.
 * Rendered as a sibling of the content, not inside the bar.
 */
export function BottomNavSpacer() {
  return <div className="h-16 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-hidden />;
}

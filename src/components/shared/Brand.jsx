'use client';

/**
 * The site's name and logo, everywhere they appear.
 *
 * These used to be typed into each file — "Sabbir Book" hard-coded in the navbar,
 * the footer, the admin sidebar, the login screen and the page title — so
 * renaming the site meant a code change and a redeploy. They now come from site
 * settings, which the admin edits in Settings → Brand.
 *
 * A logo image is used when one has been uploaded; otherwise a wordmark is
 * rendered from the name, with the last word in the accent colour.
 */

import Link from 'next/link';
import { LuStethoscope } from 'react-icons/lu';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

const FALLBACK_NAME = 'Magic Viva';

/** Resolve the brand name for the active language. */
export function useBrand() {
  const { settings } = useSettings();
  // Both providers wrap the whole app from the root layout, so these are always
  // available — including inside the admin dashboards.
  const { language } = useLanguage();

  const name =
    (language === 'bn' ? settings?.brandNameBn : settings?.brandName) ||
    settings?.brandName ||
    FALLBACK_NAME;

  const tagline =
    (language === 'bn' ? settings?.brandTaglineBn : settings?.brandTagline) ||
    settings?.brandTagline ||
    '';

  // First letter of each of the first two words, for the square tile in the
  // dashboard sidebars — "Magic Viva" → "MV".
  const initials =
    String(settings?.brandName || FALLBACK_NAME)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'MV';

  return { name, tagline, initials, logo: settings?.logo || '', language };
}

/** Square mark: the uploaded logo, or a stethoscope tile as the fallback. */
export function BrandMark({ className = 'h-10 w-10', iconClass = 'text-[22px]' }) {
  const { logo, name } = useBrand();

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={name}
        className={`${className} rounded-xl object-contain bg-white/5`}
      />
    );
  }

  return (
    <span
      className={`relative flex ${className} items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-strong shadow-glow`}
    >
      <LuStethoscope className={`${iconClass} text-white`} />
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
    </span>
  );
}

/**
 * The name as text. Split on the last space so "Magic Viva" renders with "Viva"
 * in the accent colour — a one-word name simply renders solid.
 */
export function Wordmark({ className = 'text-xl' }) {
  const { name } = useBrand();
  const parts = String(name).trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : null;
  const first = parts.join(' ');

  return (
    <span className={`${className} font-bold tracking-tight text-foreground`}>
      {first}
      {last && <span className="text-gradient-medical"> {last}</span>}
    </span>
  );
}

/** Mark + wordmark, linked home. The usual header/footer combination. */
export default function Brand({ href = '/', className = '', markClass, wordClass, onClick }) {
  const content = (
    <>
      <BrandMark className={markClass || 'h-10 w-10'} />
      <Wordmark className={wordClass || 'text-xl'} />
    </>
  );

  if (!href) {
    return <span className={`flex items-center gap-2.5 ${className}`}>{content}</span>;
  }

  return (
    <Link href={href} onClick={onClick} className={`flex items-center gap-2.5 ${className}`}>
      {content}
    </Link>
  );
}

import { THEME_INIT_SCRIPT } from "./theme-core";

/**
 * Renders the pre-hydration theme resolver into <head>.
 *
 * This is a plain Server Component on purpose: `next/script` schedules work
 * around hydration, which is far too late — the whole point is to stamp
 * `data-theme` onto <html> while the parser is still walking the document, so
 * the very first paint is already the right colour. A raw inline <script> is
 * the only thing that runs that early.
 *
 * `<html>` in app/layout.tsx carries `suppressHydrationWarning` because this
 * script mutates an attribute React also renders.
 */
export default function ThemeScript() {
  return (
    <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
  );
}

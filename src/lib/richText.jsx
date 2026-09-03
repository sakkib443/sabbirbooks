/**
 * A very small markup, so the shop can colour part of a line without being
 * handed an HTML editor.
 *
 * THE SHAPE
 *
 *   plain text [[green b|মাত্র 267 পেজে]] more plain text
 *
 * `[[styles|text]]`, where styles are space-separated names from the allowlist
 * below. Nesting is not supported and does not need to be — the whole job is
 * "make these three words green and bold".
 *
 * WHY NOT HTML
 *
 * The obvious answer is a rich-text editor storing HTML, rendered with
 * dangerouslySetInnerHTML. That is an XSS hole with a friendly toolbar on top:
 * anyone who can edit a book — a manager, or anyone who ever gets hold of a
 * manager's session — could put a script tag on the shop's front page, and it
 * would run for every visitor. Sanitising HTML properly is a library and a
 * standing obligation to keep it updated.
 *
 * This instead parses to REACT ELEMENTS. A `<script>` typed into the admin box
 * arrives here as the literal characters "<script>", is put in a text node, and
 * shows up on the page as the words a confused admin typed. There is no code
 * path from the database to executable markup, which is a much shorter thing to
 * keep true than a sanitiser's allowlist.
 *
 * WHY NOT MARKDOWN
 *
 * Markdown has no colour, which is the actual request. And `**text**` in a
 * field that has always been plain would silently reinterpret every existing
 * line that happens to contain asterisks. `[[…]]` appears in no book blurb ever
 * written, so old text renders exactly as it always did.
 */

import React from 'react';

/**
 * What a style name may do.
 *
 * Tailwind classes rather than raw colours so the marks follow the site's
 * palette and stay legible in dark mode — an admin choosing "green" is asking
 * for the site's green, not for #00FF00.
 */
export const RICH_STYLES = {
  b: { label: 'বোল্ড', className: 'font-bold' },
  big: { label: 'বড়', className: 'text-[1.15em]' },
  green: { label: 'সবুজ', className: 'text-emerald-600 dark:text-emerald-400' },
  red: { label: 'লাল', className: 'text-rose-600 dark:text-rose-400' },
  blue: { label: 'নীল', className: 'text-sky-600 dark:text-sky-400' },
  amber: { label: 'কমলা', className: 'text-amber-600 dark:text-amber-400' },
  brand: { label: 'ব্র্যান্ড', className: 'text-primary' },
};

const STYLE_NAMES = Object.keys(RICH_STYLES);

/**
 * The marks in one string.
 *
 * Non-greedy up to the first `]]`, so two marks on one line do not swallow the
 * text between them. `[^\]]` on the style list keeps a stray `]` from making
 * the parser walk past the end of the mark it is reading.
 */
const MARK = /\[\[([a-z ]+)\|([^\]]*)\]\]/gi;

/** Style names → the one className to apply. Unknown names are simply ignored. */
const classesFor = (raw) =>
  String(raw || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((s) => STYLE_NAMES.includes(s))
    .map((s) => RICH_STYLES[s].className)
    .join(' ');

/**
 * Render marked-up text as React nodes.
 *
 * Returns an array of strings and <span>s — safe to drop straight into JSX. A
 * line with no marks comes back as a single string, which is exactly what the
 * page rendered before this existed.
 */
export function renderRich(text) {
  const src = String(text ?? '');
  if (!src.includes('[[')) return src;

  const out = [];
  let last = 0;
  let m;
  MARK.lastIndex = 0;

  while ((m = MARK.exec(src)) !== null) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const cls = classesFor(m[1]);
    // A mark whose styles are all unknown still shows its text — losing the
    // words because a style name was mistyped would be worse than losing the
    // colour.
    out.push(
      cls ? (
        <span key={`${m.index}-${m[2]}`} className={cls}>
          {m[2]}
        </span>
      ) : (
        m[2]
      )
    );
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}

/** The same text with every mark stripped — for `title`, alt text and search. */
export function stripRich(text) {
  return String(text ?? '').replace(MARK, '$2');
}

/** True when a string carries at least one mark this module understands. */
export function hasRich(text) {
  MARK.lastIndex = 0;
  return MARK.test(String(text ?? ''));
}

/**
 * Wrap a selection in a mark — what the toolbar buttons call.
 *
 * Toggling off is deliberate: clicking "green" on text that is already green
 * removes the mark rather than nesting a second one, which is what every editor
 * anyone has used does.
 *
 * Returns the new string and where the selection should sit afterwards, so the
 * caller can restore it — a toolbar that drops the cursor to the end after
 * every click is unusable for marking up a sentence.
 */
export function applyMark(text, start, end, style) {
  const src = String(text ?? '');
  const selected = src.slice(start, end);
  if (!selected) return { text: src, start, end };

  /**
   * The selection is already one whole mark: merge into it rather than wrap it.
   *
   * Marking a run green and then bolding it is the ordinary way somebody uses
   * this — the shop's own example is "[[green b|মাত্র 267 পেজে]]". Wrapping
   * would produce `[[b|[[green|…]]]]`, and the parser reads one level only, so
   * the reader would see the literal characters "[[green|" on the page. There
   * is no need to nest: a mark holds a LIST of styles, so the second press
   * belongs in that list.
   *
   * The same branch toggles a style off, which is what every editor does when
   * you press an active button again.
   */
  const whole = /^\[\[([a-z ]+)\|([^\]]*)\]\]$/i.exec(selected);
  if (whole) {
    const current = whole[1].toLowerCase().split(/\s+/).filter(Boolean);
    const next = current.includes(style)
      ? current.filter((s) => s !== style)   // pressed again → off
      : [...current, style];                 // a second style → both
    const replacement = next.length ? `[[${next.join(' ')}|${whole[2]}]]` : whole[2];
    return {
      text: src.slice(0, start) + replacement + src.slice(end),
      start,
      end: start + replacement.length,
    };
  }

  const replacement = `[[${style}|${selected}]]`;
  return {
    text: src.slice(0, start) + replacement + src.slice(end),
    start,
    end: start + replacement.length,
  };
}

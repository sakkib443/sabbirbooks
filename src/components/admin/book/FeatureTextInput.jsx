'use client';

/**
 * One feature line, with the toolbar that colours part of it.
 *
 * The shop asked to make "মাত্র 267 পেজে" green and "Board-2 তে 100 Cards" red
 * — a run of words inside a line, not the whole line. So: select the words,
 * press a colour.
 *
 * WHY A TEXTAREA AND NOT A CONTENTEDITABLE
 *
 * A contenteditable would look more like Word, and would be the wrong tool. It
 * produces HTML, which means either rendering HTML from the database on the
 * public page — an XSS hole any admin session could be used to open — or
 * sanitising it, which is a dependency and a standing obligation. It also
 * fights the IME that a Bengali keyboard uses, drops formatting unpredictably
 * on paste, and behaves differently in every browser.
 *
 * A textarea holds plain text. The toolbar wraps the selection in a marker the
 * renderer understands, the preview underneath shows exactly what the page will
 * show, and nothing that arrives here can become executable markup. The cost is
 * that the raw text has `[[green|…]]` visible in it — which the preview makes a
 * non-issue, and which is honest about what is stored.
 *
 * The selection is put back after a toolbar click, because a toolbar that
 * dumps the cursor at the end after every press cannot be used to mark up a
 * sentence.
 */

import { useRef } from 'react';
import { renderRich, applyMark, RICH_STYLES } from '@/lib/richText';

/** The order they appear on the toolbar — the two the shop asked for first. */
const BUTTONS = ['green', 'red', 'b', 'big', 'blue', 'amber', 'brand'];

/** A dot of the colour the button applies, so the toolbar is readable at a glance. */
const SWATCH = {
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  blue: 'bg-sky-500',
  amber: 'bg-amber-500',
  brand: 'bg-brand',
};

export default function FeatureTextInput({ value, onChange, placeholder, className = '' }) {
  const ref = useRef(null);

  const mark = (style) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    if (start === end) {
      // Nothing selected — say so rather than silently doing nothing, which
      // reads as a broken button.
      el.focus();
      return;
    }
    const next = applyMark(value || '', start, end, style);
    onChange(next.text);
    // After React has written the new value, put the selection back around the
    // same words so a second style can be applied without re-selecting.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  const hasSelection = () => {
    const el = ref.current;
    return el ? el.selectionStart !== el.selectionEnd : false;
  };

  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        {BUTTONS.map((s) => (
          <button
            key={s}
            type="button"
            onMouseDown={(e) => e.preventDefault()} /* keep the selection */
            onClick={() => mark(s)}
            title={`নির্বাচিত অংশ ${RICH_STYLES[s].label} করুন`}
            className="inline-flex items-center gap-1 rounded-md border border-dash-line px-2 py-1 text-[11px] font-medium text-dash-ink3 transition-colors hover:bg-dash-soft"
          >
            {SWATCH[s] && <span className={`h-2.5 w-2.5 rounded-full ${SWATCH[s]}`} />}
            <span className={s === 'b' ? 'font-bold' : s === 'big' ? 'text-[13px]' : ''}>
              {RICH_STYLES[s].label}
            </span>
          </button>
        ))}
        <span className="ml-1 text-[10px] text-dash-mute2">
          লেখা সিলেক্ট করে বাটনে চাপুন
        </span>
      </div>

      <textarea
        ref={ref}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-dash-line px-4 py-2.5 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/25"
      />

      {/* What the visitor will actually see. Shown only once there is something
          to preview, so an empty row is not two empty boxes. */}
      {String(value || '').trim() !== '' && (
        <div className="mt-1.5 rounded-lg border border-dashed border-dash-line bg-dash-soft/40 px-3 py-2">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-dash-mute2">
            যেমন দেখাবে
          </span>
          <span className="text-sm text-dash-ink2 hind-siliguri">{renderRich(value)}</span>
        </div>
      )}
    </div>
  );
}

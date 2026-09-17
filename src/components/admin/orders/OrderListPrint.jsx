'use client';

/**
 * The Book Orders list as a printed page — saved as a PDF from the print dialog.
 *
 * Why the print dialog and not a PDF library: names, addresses and districts
 * here are Bengali, and the JavaScript PDF writers do not shape Bengali — the
 * conjuncts and vowel signs come out broken. The browser's own print engine
 * sets Bengali exactly as the screen does and keeps the text selectable, and
 * "Save as PDF" is one choice in the desktop and Android print dialogs.
 *
 * Rendered into <body> through a portal and never shown on screen. While it is
 * mounted, printing the page prints only this list (PRINT_CSS). For the print,
 * the tab title becomes the job's file name, which Chrome and Edge offer as the
 * PDF's name.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PAYMENT_LABEL } from '@/lib/orderList';

const PRINT_CSS = `
@media screen {
  .mv-print-root { display: none !important; }
}
@media print {
  @page { margin: 12mm 10mm; }
  html:has(.mv-print-root), body:has(> .mv-print-root) { background: #fff !important; }
  body:has(> .mv-print-root) > :not(.mv-print-root) { display: none !important; }
  .mv-print-root { display: block; color: #111; background: #fff; font-size: 10pt; line-height: 1.35; }
  .mvp-title { margin: 0; font-size: 15pt; font-weight: 700; }
  .mvp-meta { margin: 2pt 0 0; font-size: 9pt; color: #444; }
  .mvp-table { width: 100%; margin-top: 8pt; border-collapse: collapse; table-layout: fixed; }
  .mvp-table thead { display: table-header-group; }
  .mvp-table tr { break-inside: avoid; }
  .mvp-table th, .mvp-table td {
    border: 0.6pt solid #9a9a9a; padding: 4pt 5pt; text-align: left; vertical-align: top;
    overflow-wrap: anywhere;
  }
  .mvp-table th {
    background: #ececec; font-size: 9pt; font-weight: 700;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .mvp-table tbody tr:nth-child(even) td {
    background: #f6f6f6; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .mvp-n { width: 5%; } .mvp-name { width: 17%; } .mvp-phone { width: 14%; }
  .mvp-college { width: 19%; } .mvp-address { width: 31%; } .mvp-pay { width: 14%; }
  td.mvp-n { color: #555; text-align: right; }
  td.mvp-phone { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .mvp-sub { display: block; color: #555; font-size: 9pt; }
  td.mvp-pay { font-weight: 600; }
}
`;

const HEADINGS = [
  ['mvp-n', '#'],
  ['mvp-name', 'নাম'],
  ['mvp-phone', 'মোবাইল নম্বর'],
  ['mvp-college', 'মেডিকেল কলেজ'],
  ['mvp-address', 'ঠিকানা'],
  ['mvp-pay', 'পেমেন্ট'],
];

/**
 * @param job  { title, fileName, filters: string[], summary, rows } — a new
 *   object for every export, which is what opens the print dialog again.
 */
export default function OrderListPrint({ job }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!job) return undefined;
    let stopped = false;
    const pageTitle = document.title;
    const restoreTitle = () => {
      document.title = pageTitle;
    };

    (async () => {
      // The list is hidden on screen, so its Bengali font may never have been
      // fetched. Printing before it loads would set the list in a fallback face.
      const family = rootRef.current ? getComputedStyle(rootRef.current).fontFamily : '';
      if (family && document.fonts?.load) {
        await Promise.all(
          ['400', '700'].map((weight) => document.fonts.load(`${weight} 12px ${family}`, 'নাম ঠিকানা Name 0123'))
        ).catch(() => {});
      }
      if (stopped) return;
      document.title = job.fileName;
      window.addEventListener('afterprint', restoreTitle, { once: true });
      window.print();
    })();

    return () => {
      stopped = true;
      window.removeEventListener('afterprint', restoreTitle);
      restoreTitle();
    };
  }, [job]);

  if (!job) return null;

  return createPortal(
    <div ref={rootRef} className="mv-print-root hind-siliguri">
      <style>{PRINT_CSS}</style>
      <h1 className="mvp-title">{job.title}</h1>
      {job.filters.length > 0 && <p className="mvp-meta">{job.filters.join('   ·   ')}</p>}
      <p className="mvp-meta">{job.summary}</p>

      <table className="mvp-table">
        <thead>
          <tr>
            {HEADINGS.map(([cls, label]) => (
              <th key={cls} className={cls}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {job.rows.map((row, i) => (
            <tr key={row.id || i}>
              <td className="mvp-n">{i + 1}</td>
              <td className="mvp-name">{row.name}</td>
              <td className="mvp-phone">
                {row.phone || '—'}
                {row.altPhone && <span className="mvp-sub">{row.altPhone}</span>}
              </td>
              <td className="mvp-college">{row.college || '—'}</td>
              <td className="mvp-address">{row.address || (row.digital ? 'ডিজিটাল বই — পাঠানোর কিছু নেই' : '—')}</td>
              <td className="mvp-pay">{PAYMENT_LABEL[row.payment]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body
  );
}

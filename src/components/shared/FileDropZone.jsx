'use client';

/**
 * "Drop the file anywhere on this page" — the WhatsApp/Messenger gesture.
 *
 * The upload boxes already accepted a drop, but only inside their own small
 * bordered rectangle. That is the wrong target for the way this is actually
 * used: the desktop on one half of the screen, the editor on the other, and a
 * handful of scans dragged across. Aiming at a 200px box on every one of them
 * is the whole friction. So the listeners live on the window, the whole page
 * lights up the moment a file crosses it, and dropping anywhere works.
 *
 * Two details make it behave rather than merely work:
 *
 *  - A drop that an inner zone already handled is skipped here. Inner handlers
 *    (the answer editor, which drops images *into the text*) run first and call
 *    preventDefault; by the time the event bubbles to the window we can see
 *    `defaultPrevented` and stay out of the way. Without that, one drop on the
 *    editor would upload the image twice.
 *
 *  - The listeners stay attached even when `disabled`. A browser's default for
 *    an unhandled file drop is to NAVIGATE to that file — an admin who misses
 *    the target mid-answer would lose the unsaved draft to a stray PDF. So we
 *    always swallow the drop, and just explain why nothing happened.
 */

import { useEffect, useRef, useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';

/** A drag carrying files, as opposed to selected text or a link. */
const carriesFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files');

export default function FileDropZone({
  onFiles,
  disabled = false,
  disabledMessage = 'এখন ফাইল নেওয়া যাচ্ছে না',
  title = 'ফাইলগুলো এখানে ছেড়ে দিন',
  hint = 'ছবি, ভিডিও বা ডকুমেন্ট — একসাথে কয়েকটাও দেওয়া যাবে',
}) {
  const [over, setOver] = useState(false);

  // dragenter/dragleave fire for every child element the cursor crosses, so a
  // boolean flickers the overlay off mid-drag. Counting enters against leaves
  // is the standard fix.
  const depth = useRef(0);
  // Kept in a ref so a new inline callback on every parent render does not
  // detach and reattach the window listeners mid-drag. Synced from an effect
  // rather than during render — a ref written mid-render is a React no-no, and
  // drag events only ever fire well after the commit anyway.
  const cb = useRef({ onFiles, disabled });
  useEffect(() => {
    cb.current = { onFiles, disabled };
  });

  useEffect(() => {
    const reset = () => {
      depth.current = 0;
      setOver(false);
    };

    const handleEnter = e => {
      if (!carriesFiles(e)) return;
      depth.current += 1;
      setOver(true);
    };

    const handleOver = e => {
      if (!carriesFiles(e)) return;
      // Without this the drop event never fires at all.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = cb.current.disabled ? 'none' : 'copy';
    };

    const handleLeave = e => {
      if (!carriesFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    };

    const handleDrop = e => {
      if (!carriesFiles(e)) return;
      // An inner zone (the answer editor) already took it.
      if (e.defaultPrevented) {
        reset();
        return;
      }
      e.preventDefault();
      reset();
      if (cb.current.disabled) return;
      const files = e.dataTransfer?.files;
      if (files?.length) cb.current.onFiles(files);
    };

    window.addEventListener('dragenter', handleEnter);
    window.addEventListener('dragover', handleOver);
    window.addEventListener('dragleave', handleLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragend', reset);
    return () => {
      window.removeEventListener('dragenter', handleEnter);
      window.removeEventListener('dragover', handleOver);
      window.removeEventListener('dragleave', handleLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragend', reset);
    };
  }, []);

  if (!over) return null;

  return (
    // pointer-events-none so the overlay never becomes the drop target itself —
    // the drop lands on whatever is underneath and bubbles up to our listener,
    // which is what lets the answer editor keep its own inline-image drop.
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px]">
      <div
        className={`w-full max-w-md rounded-2xl border-2 border-dashed px-8 py-10 text-center shadow-2xl ${
          disabled ? 'border-slate-300 bg-white' : 'border-blue-400 bg-white'
        }`}
      >
        <FiUploadCloud
          className={`mx-auto mb-3 ${disabled ? 'text-slate-300' : 'text-blue-500'}`}
          size={44}
        />
        {disabled ? (
          <p className="text-sm font-semibold text-slate-500">{disabledMessage}</p>
        ) : (
          <>
            <p className="text-base font-bold text-slate-800">{title}</p>
            <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}

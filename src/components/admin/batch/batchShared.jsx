'use client';

import React from 'react';
import { FiClock } from 'react-icons/fi';

// Branches the academy runs (matches the public "Our Branches" section)
export const BRANCHES = ['Bhairab', 'Narsingdi', 'Brahmanbaria'];

export const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ── Time format helpers (store as "hh:mm AM - hh:mm PM") ──────
// "09:00 PM" -> "21:00" (for <input type=time>)
const to24 = (t12 = '') => {
  const m = t12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

// "21:00" -> "09:00 PM"
const to12 = (t24 = '') => {
  const m = t24.match(/^(\d{2}):(\d{2})$/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m[2]} ${ap}`;
};

/**
 * TimeRangePicker — "কয়টা থেকে কয়টা" selector.
 * Controlled: value is a string like "09:00 PM - 11:00 PM"; onChange gets the same.
 */
export const TimeRangePicker = ({ value = '', onChange }) => {
  const [startStr = '', endStr = ''] = (value || '').split(' - ');
  const start24 = to24(startStr);
  const end24 = to24(endStr);

  const emit = (s24, e24) => {
    const s = s24 ? to12(s24) : '';
    const e = e24 ? to12(e24) : '';
    // Only join with " - " when BOTH ends are set — avoids a dangling
    // "09:00 PM - " (or " - 11:00 PM") when only one time is chosen.
    onChange([s, e].filter(Boolean).join(' - '));
  };

  const box =
    'flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 ' +
    'focus:outline-none focus:border-[#F3A522] focus:ring-2 focus:ring-[#F3A522]/15 transition-all';

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase w-10 shrink-0">From</span>
        <input type="time" value={start24} onChange={(e) => emit(e.target.value, end24)} className={box} />
      </div>
      <FiClock className="text-[#c9871a] shrink-0" size={15} />
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase w-6 shrink-0">To</span>
        <input type="time" value={end24} onChange={(e) => emit(start24, e.target.value)} className={box} />
      </div>
    </div>
  );
};

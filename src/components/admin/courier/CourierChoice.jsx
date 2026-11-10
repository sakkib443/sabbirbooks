'use client';

/**
 * Which courier a batch goes to (1 Nov 2026): Steadfast or Pathao.
 *
 * Only couriers set up on the server are offered (GET /courier/status). With
 * one, nothing changes on screen; with both, the send confirmation shows a
 * choice, and the last one picked is remembered on this browser.
 */
import { useEffect, useState } from 'react';
import { courierStatus } from './courierApi';

export const COURIER_NAMES = { steadfast: 'Steadfast', pathao: 'Pathao' };
const LAST_KEY = 'mv-courier';

// One status call per page load, shared by every part of the page that asks.
let statusOnce = null;
export const loadStatus = () => {
  if (!statusOnce) statusOnce = courierStatus().catch((e) => { statusOnce = null; throw e; });
  return statusOnce;
};

/** The couriers set up on the server, Steadfast first. */
export function useCouriers() {
  const [list, setList] = useState(['steadfast']);
  useEffect(() => {
    let alive = true;
    loadStatus()
      .then((st) => {
        const l = [];
        if (st?.configured) l.push('steadfast');
        if (st?.pathao?.configured) l.push('pathao');
        if (alive && l.length) setList(l);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

function Picker({ options, initial, onPick }) {
  const [value, setValue] = useState(initial);
  return (
    <span className="mt-4 flex justify-center gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => {
            setValue(o);
            onPick(o);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-bold ring-1 transition ${
            value === o ? 'bg-[#41bfb8] text-white ring-[#41bfb8]' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          {COURIER_NAMES[o]}
        </button>
      ))}
    </span>
  );
}

/**
 * Ask to send, and to which courier. Resolves to 'steadfast' | 'pathao', or
 * null when cancelled. `confirm` is useConfirm()'s.
 */
export async function confirmCourier(confirm, couriers, { title, message, confirmText = 'কুরিয়ারে পাঠান' }) {
  let last = null;
  try {
    last = localStorage.getItem(LAST_KEY);
  } catch {
    /* private mode */
  }
  const pick = { current: couriers.includes(last) ? last : couriers[0] };
  const ok = await confirm({
    title,
    message:
      couriers.length > 1 ? (
        <>
          {message}
          <span className="mt-3 block font-semibold text-slate-700">কোন কুরিয়ারে?</span>
          <Picker options={couriers} initial={pick.current} onPick={(v) => (pick.current = v)} />
        </>
      ) : (
        <>
          {message} <b>({COURIER_NAMES[pick.current]})</b>
        </>
      ),
    confirmText,
    danger: false,
  });
  if (!ok) return null;
  try {
    localStorage.setItem(LAST_KEY, pick.current);
  } catch {
    /* private mode */
  }
  return pick.current;
}

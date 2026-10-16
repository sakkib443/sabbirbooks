'use client';

/**
 * What every courier page shares: the title, the three tabs, whether the
 * courier is connected (and its live balance), and the filter bar.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiAlertTriangle, FiCheckCircle, FiSearch, FiTruck, FiX } from 'react-icons/fi';
import { courierFilters, courierStatus, customWindow, DATE_PRESETS, presetWindow, tk } from './courierApi';

const TABS = [
  { href: '/dashboard/admin/courier/send', label: 'Send to courier' },
  { href: '/dashboard/admin/courier', label: 'Parcels', exact: true },
  // Super Admin only — the courier's money, all time (the API refuses an Admin too).
  { href: '/dashboard/admin/courier/payouts', label: 'Payouts & accounts', superOnly: true },
];

const isSuperAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').role === 'superAdmin';
  } catch {
    return false;
  }
};

export function CourierHeader({ subtitle }) {
  const path = usePathname();
  const [st, setSt] = useState(null);
  // Read once: the admin pages render only in the browser, after sign-in.
  const [tabs] = useState(() => (isSuperAdmin() ? TABS : TABS.filter((t) => !t.superOnly)));
  useEffect(() => {
    courierStatus().then(setSt).catch((e) => setSt({ configured: false, error: e.message }));
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-hover text-white shadow-md shadow-brand/20">
            <FiTruck size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-dash-ink outfit">Courier · Steadfast</h1>
            <p className="text-xs text-dash-mute2">{subtitle}</p>
          </div>
        </div>
        <div className="text-xs">
          {!st ? (
            <span className="text-dash-mute2">Checking connection…</span>
          ) : !st.configured ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
              <FiAlertTriangle /> Not connected — add the API keys on the server
            </span>
          ) : st.error ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-600" title={st.error}>
              <FiAlertTriangle /> Connected, but Steadfast is not answering
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
              <FiCheckCircle /> Connected · Steadfast balance {tk(st.balance)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const on = t.exact ? path === t.href : path?.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                on ? 'bg-brand text-white shadow-sm' : 'border border-dash-line bg-dash-card text-dash-ink3 hover:border-brand/40 hover:text-brand'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Date shortcuts + custom range + college + district + search, and whatever
 * page-specific selects are passed in `extra`.
 */
export function CourierFilters({ value, onChange, dateLabel = 'Date', extra = null }) {
  const [choices, setChoices] = useState({ colleges: [], districts: [] });
  const [text, setText] = useState(value.q || '');
  useEffect(() => {
    courierFilters().then(setChoices).catch(() => {});
  }, []);
  // Search fires after typing stops, not on every key.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((value.q || '') !== text) onChange({ ...value, q: text });
    }, 400);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => onChange({ ...value, ...patch });
  const sel = 'rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 outline-none focus:border-brand';
  const active = value.preset !== 'all' || value.college || value.district || value.q || Object.values(value.extra || {}).some(Boolean);

  return (
    <div className="space-y-3 rounded-xl border border-dash-line/60 bg-dash-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold text-dash-mute">{dateLabel}:</span>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => set({ preset: p.key, fromDay: '', toDay: '' })}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              value.preset === p.key ? 'bg-brand text-white' : 'text-dash-mute hover:bg-dash-soft hover:text-dash-ink3'
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="ml-1 flex items-center gap-1">
          <input type="date" value={value.fromDay || ''} onChange={(e) => set({ preset: 'custom', fromDay: e.target.value })} className={`${sel} py-1.5 text-xs`} />
          <span className="text-dash-mute2">–</span>
          <input type="date" value={value.toDay || ''} onChange={(e) => set({ preset: 'custom', toDay: e.target.value })} className={`${sel} py-1.5 text-xs`} />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search order #, name, phone, consignment or tracking code…"
            className={`${sel} w-full pl-9`}
          />
        </div>
        <select value={value.college || ''} onChange={(e) => set({ college: e.target.value })} className={sel}>
          <option value="">All medical colleges</option>
          {choices.colleges.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={value.district || ''} onChange={(e) => set({ district: e.target.value })} className={sel}>
          <option value="">All districts</option>
          {choices.districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {(extra || active) && (
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {active && (
            <button
              type="button"
              onClick={() => {
                setText('');
                onChange({ preset: 'all', fromDay: '', toDay: '', college: '', district: '', q: '', extra: {} });
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-dash-mute hover:bg-dash-soft"
            >
              <FiX /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const EMPTY_FILTERS = { preset: 'all', fromDay: '', toDay: '', college: '', district: '', q: '', extra: {} };

/** The filters as the API's query string values. */
export function filterQuery(f) {
  const win = f.preset === 'custom' ? customWindow(f.fromDay, f.toDay) : presetWindow(f.preset);
  return { ...win, college: f.college, district: f.district, q: f.q, ...(f.extra || {}) };
}

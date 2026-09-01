'use client';

/**
 * Every way of narrowing the affiliate list.
 *
 * Two rows, because two different jobs. The top row is what gets touched daily
 * — status, a name to search for, and how to sort — and stays visible. The rest
 * fold away behind a button, since a screen that opens with fourteen dropdowns
 * is worse at the daily job even though it can answer more questions.
 *
 * Nothing hides while it is doing something: whatever is set shows as a chip on
 * the top row whether the panel is open or shut, and each chip clears itself.
 * A filter you cannot see is a filter you will blame the data for.
 *
 * The dropdown options are the values the roster actually contains, sent by the
 * server. Offering "Barishal" when nobody from Barishal has signed up teaches
 * the shop to distrust the filters.
 */

import { useMemo, useState } from 'react';
import {
  FiSearch, FiSliders, FiX, FiChevronDown, FiChevronUp, FiCalendar, FiRotateCcw,
} from 'react-icons/fi';
import { STATUS_LABEL } from './ambassadorApi';

const TABS = ['all', 'pending', 'approved', 'rejected', 'suspended'];

const SORTS = [
  { id: 'recent', label: 'নতুন আগে' },
  { id: 'oldest', label: 'পুরোনো আগে' },
  { id: 'name', label: 'নাম (ক-ঔ)' },
  { id: 'college', label: 'কলেজ' },
  { id: 'commission', label: 'কমিশন বেশি' },
  { id: 'sales', label: 'বিক্রি বেশি' },
  { id: 'orders', label: 'অর্ডার বেশি' },
];

const SOURCES = [
  { id: '', label: 'সব' },
  { id: 'application', label: 'নিজে আবেদন করেছে' },
  { id: 'manual', label: 'অ্যাডমিন যোগ করেছে' },
];

const COUPON_STATES = [
  { id: '', label: 'সব' },
  { id: 'active', label: 'কোড চালু' },
  { id: 'inactive', label: 'কোড বন্ধ' },
];

const PERFORMANCE = [
  { id: '', label: 'সব' },
  { id: 'selling', label: 'বিক্রি করেছে' },
  { id: 'idle', label: 'এখনো কিছু বিক্রি হয়নি' },
];

/** What each filter is called when it shows up as a chip. */
const CHIP_LABEL = {
  q: 'খোঁজ',
  from: 'আয় শুরু',
  to: 'আয় শেষ',
  joinedFrom: 'যোগ দিয়েছে (থেকে)',
  joinedTo: 'যোগ দিয়েছে (পর্যন্ত)',
  college: 'কলেজ',
  division: 'বিভাগ',
  district: 'জেলা',
  academicYear: 'বর্ষ',
  batch: 'ব্যাচ',
  city: 'শহর',
  reach: 'রিচ',
  source: 'উৎস',
  coupon: 'কুপন',
  performance: 'পারফরম্যান্স',
};

/** Filters that live in the fold-away panel — status and sort are not chips. */
const CHIP_KEYS = Object.keys(CHIP_LABEL);

const field =
  'w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink2 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export default function AffiliateFilters({ value, counts, facets, onChange, onApply }) {
  const [open, setOpen] = useState(false);
  const set = (k, v) => onChange({ ...value, [k]: v });

  const active = useMemo(
    () => CHIP_KEYS.filter((k) => value[k] && String(value[k]).trim()),
    [value]
  );

  const clearAll = () => {
    const cleared = { status: value.status, sort: value.sort };
    CHIP_KEYS.forEach((k) => { cleared[k] = ''; });
    onChange(cleared);
    onApply(cleared);
  };

  const clearOne = (k) => {
    const next = { ...value, [k]: '' };
    onChange(next);
    onApply(next);
  };

  const label = (k) => {
    if (k === 'source') return SOURCES.find((s) => s.id === value[k])?.label || value[k];
    if (k === 'coupon') return COUPON_STATES.find((s) => s.id === value[k])?.label || value[k];
    if (k === 'performance') return PERFORMANCE.find((s) => s.id === value[k])?.label || value[k];
    return value[k];
  };

  return (
    <div className="space-y-3">
      {/* ── The row that stays ── */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { const next = { ...value, status: t }; onChange(next); onApply(next); }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              value.status === t
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
            }`}
          >
            {STATUS_LABEL[t]}
            {counts?.[t] ? <span className="ml-1.5 text-xs opacity-70">{counts[t]}</span> : null}
          </button>
        ))}

        <form
          onSubmit={(e) => { e.preventDefault(); onApply(value); }}
          className="ml-auto flex flex-wrap items-center gap-2"
        >
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
            <input
              value={value.q || ''}
              onChange={(e) => set('q', e.target.value)}
              placeholder="নাম, কোড, ফোন, আইডি, কলেজ…"
              className="w-60 rounded-lg border border-dash-line bg-dash-card py-2 pl-9 pr-3 text-sm text-dash-ink2 outline-none focus:border-brand"
            />
          </div>

          <select
            value={value.sort || 'recent'}
            onChange={(e) => { const next = { ...value, sort: e.target.value }; onChange(next); onApply(next); }}
            className="rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-sm text-dash-ink3 outline-none focus:border-brand"
            title="সাজানোর ক্রম"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              active.length
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
            }`}
          >
            <FiSliders /> ফিল্টার
            {active.length ? (
              <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
                {active.length}
              </span>
            ) : null}
            {open ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          <button
            type="submit"
            className="rounded-lg border border-dash-line px-3 py-2 text-sm font-medium text-dash-ink3 hover:bg-dash-soft"
          >
            খুঁজুন
          </button>
        </form>
      </div>

      {/* ── What is currently narrowing the list ── */}
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {active.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand"
            >
              <span className="opacity-70">{CHIP_LABEL[k]}:</span>
              <strong className="font-semibold">{label(k)}</strong>
              <button onClick={() => clearOne(k)} className="hover:text-rose-600" title="সরান">
                <FiX size={12} />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-dash-mute2 hover:text-rose-600"
          >
            <FiRotateCcw size={11} /> সব সরান
          </button>
        </div>
      )}

      {/* ── The rest ── */}
      {open && (
        <div className="rounded-2xl border border-dash-line bg-dash-card p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* The two date ranges answer different questions, so they are
                labelled by the question rather than by the field. */}
            <Field
              label="আয়ের সময়সীমা"
              help="এই সময়ের অর্ডার ধরে বিক্রি ও কমিশন হিসাব হবে। টাকা দেওয়ার সময় এটাই লাগে।"
              wide
            >
              <div className="flex items-center gap-2">
                <FiCalendar className="shrink-0 text-dash-mute2" />
                <input type="date" value={value.from || ''} onChange={(e) => set('from', e.target.value)} className={field} />
                <span className="text-dash-mute2">—</span>
                <input type="date" value={value.to || ''} onChange={(e) => set('to', e.target.value)} className={field} />
              </div>
            </Field>

            <Field label="কবে যোগ দিয়েছে" help="নতুন কারা এসেছে সেটা দেখার জন্য।" wide>
              <div className="flex items-center gap-2">
                <FiCalendar className="shrink-0 text-dash-mute2" />
                <input type="date" value={value.joinedFrom || ''} onChange={(e) => set('joinedFrom', e.target.value)} className={field} />
                <span className="text-dash-mute2">—</span>
                <input type="date" value={value.joinedTo || ''} onChange={(e) => set('joinedTo', e.target.value)} className={field} />
              </div>
            </Field>

            <Pick label="মেডিকেল কলেজ" value={value.college} onChange={(v) => set('college', v)} options={facets?.colleges} />
            <Pick label="বিভাগ" value={value.division} onChange={(v) => set('division', v)} options={facets?.divisions} />
            <Pick label="জেলা" value={value.district} onChange={(v) => set('district', v)} options={facets?.districts} />
            <Pick label="বর্ষ" value={value.academicYear} onChange={(v) => set('academicYear', v)} options={facets?.academicYears} />
            <Pick label="ব্যাচ" value={value.batch} onChange={(v) => set('batch', v)} options={facets?.batches} />
            <Pick label="শহর" value={value.city} onChange={(v) => set('city', v)} options={facets?.cities} />
            <Pick label="কতজনের কাছে পৌঁছায়" value={value.reach} onChange={(v) => set('reach', v)} options={facets?.reaches} />

            <Field label="কীভাবে এসেছে">
              <select value={value.source || ''} onChange={(e) => set('source', e.target.value)} className={field}>
                {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>

            <Field label="কুপনের অবস্থা" help="কারও স্ট্যাটাস ঠিক থাকলেও কুপন আলাদা করে বন্ধ থাকতে পারে।">
              <select value={value.coupon || ''} onChange={(e) => set('coupon', e.target.value)} className={field}>
                {COUPON_STATES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>

            <Field label="পারফরম্যান্স" help="উপরের আয়ের সময়সীমা অনুযায়ী।">
              <select value={value.performance || ''} onChange={(e) => set('performance', e.target.value)} className={field}>
                {PERFORMANCE.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dash-line pt-4">
            <button
              onClick={() => { onApply(value); setOpen(false); }}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              ফিল্টার প্রয়োগ করুন
            </button>
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-4 py-2.5 text-sm font-medium text-dash-mute hover:text-dash-ink3"
            >
              <FiRotateCcw /> সব রিসেট
            </button>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto rounded-lg px-3 py-2.5 text-sm text-dash-mute2 hover:text-dash-ink3"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const Field = ({ label, help, wide, children }) => (
  <label className={`block ${wide ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
    <span className="mb-1 block text-xs font-semibold text-dash-ink3">{label}</span>
    {help && <span className="mb-1.5 block text-[11px] text-dash-mute2">{help}</span>}
    {children}
  </label>
);

/**
 * A dropdown that disappears when there is nothing to choose from.
 *
 * A "City" filter on a roster where nobody filled in a city is a control that
 * can only ever return zero rows — better absent than misleading.
 */
const Pick = ({ label, value, onChange, options }) => {
  if (!options?.length) return null;
  return (
    <Field label={label}>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={field}>
        <option value="">সব ({options.length})</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
};

'use client';

/**
 * Pick a medical college by typing.
 *
 * A plain <select> was the obvious choice and the wrong one: there are 112
 * institutions, and finding "Shaheed Suhrawardy" in a native dropdown on a
 * phone means scrolling past a hundred names. Typing three letters is faster
 * than any list.
 *
 * The whole directory is fetched once and filtered in the browser — 112 rows is
 * a few kilobytes, and a request per keystroke on a Bangladeshi mobile
 * connection would feel far worse than one slightly larger response.
 *
 * A student whose college is genuinely missing can type a free-text name. That
 * is deliberate: refusing signup because our list is behind is a worse failure
 * than an admin tidying one row later.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuChevronDown, LuGraduationCap, LuLoaderCircle, LuSearch, LuX } from 'react-icons/lu';
import API_BASE_URL from '@/config/api';

const TYPE_LABEL = {
  government: { en: 'Government', bn: 'সরকারি' },
  private: { en: 'Private', bn: 'বেসরকারি' },
  army: { en: 'Military', bn: 'সামরিক' },
};

const TYPE_ORDER = ['government', 'army', 'private'];

export default function CollegePicker({
  value, // { _id, name } | null
  customName, // free text when the college is not listed
  onChange, // (college | null, customName) => void
  bengali = false,
  error,
  label,
  placeholder,
}) {
  const [colleges, setColleges] = useState(null); // null = still loading
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const bn = bengali ? 'hind-siliguri' : '';
  const t = (en, bnText) => (bengali ? bnText : en);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/medical-colleges`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (alive) setColleges(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        // The directory being unreachable must not block signup — fall back to
        // the free-text box rather than showing an empty, broken dropdown.
        if (alive) {
          setColleges([]);
          setCustom(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const groups = useMemo(() => {
    if (!colleges) return [];
    const q = query.trim().toLowerCase();
    const hits = q
      ? colleges.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.district || '').includes(query.trim()) ||
            (c.division || '').includes(query.trim())
        )
      : colleges;

    return TYPE_ORDER.map((type) => ({
      type,
      items: hits.filter((c) => c.type === type),
    })).filter((g) => g.items.length);
  }, [colleges, query]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const pick = (college) => {
    onChange(college, '');
    setOpen(false);
    setQuery('');
  };

  const inputCls =
    'w-full rounded-xl border bg-background px-4 py-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10';

  // ── Free-text mode ────────────────────────────────────────────────────────
  if (custom) {
    return (
      <label className="block">
        <span className={`mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground ${bn}`}>
          <span className="text-primary"><LuGraduationCap /></span>
          {label}
        </span>
        <input
          type="text"
          value={customName || ''}
          onChange={(e) => onChange(null, e.target.value)}
          placeholder={t('Type your college name', 'আপনার কলেজের নাম লিখুন')}
          className={`${inputCls} ${error ? 'border-coral' : 'border-border'} ${bn}`}
        />
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            onChange(null, '');
          }}
          className={`mt-1.5 text-xs text-primary hover:underline ${bn}`}
        >
          {t('Choose from the list instead', 'তালিকা থেকে বেছে নিই')}
        </button>
        {error && <span className={`mt-1 block text-xs text-coral ${bn}`}>{error}</span>}
      </label>
    );
  }

  // ── Picker ────────────────────────────────────────────────────────────────
  return (
    <div ref={boxRef} className="relative block">
      <span className={`mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground ${bn}`}>
        <span className="text-primary"><LuGraduationCap /></span>
        {label}
      </span>

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ${
          error ? 'border-coral' : 'border-border'
        } bg-background`}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? 'text-foreground' : 'text-muted-foreground'} ${bn}`}>
          {value ? value.name : placeholder}
        </span>
        {colleges === null ? (
          <LuLoaderCircle className="shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <LuChevronDown className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border p-2">
            <div className="relative">
              <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Type a name or district…', 'নাম বা জেলা লিখুন…')}
                className={`w-full rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm text-foreground outline-none focus:border-primary ${bn}`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={t('Clear', 'মুছুন')}
                >
                  <LuX className="text-sm" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {colleges === null && (
              <p className={`px-4 py-6 text-center text-sm text-muted-foreground ${bn}`}>
                {t('Loading…', 'লোড হচ্ছে…')}
              </p>
            )}

            {colleges !== null && total === 0 && (
              <p className={`px-4 py-6 text-center text-sm text-muted-foreground ${bn}`}>
                {t('No college matched', 'কোনো কলেজ মেলেনি')}
              </p>
            )}

            {groups.map((g) => (
              <div key={g.type}>
                <p className={`sticky top-0 bg-surface-soft px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${bn}`}>
                  {bengali ? TYPE_LABEL[g.type].bn : TYPE_LABEL[g.type].en} · {g.items.length}
                </p>
                {g.items.map((c) => {
                  const active = value?._id === c._id;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => pick(c)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary-soft/50 ${
                        active ? 'bg-primary-soft/60' : ''
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                        <span className={`block truncate text-xs text-muted-foreground ${bn}`}>
                          {[c.district, c.area].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      {active && <LuCheck className="shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setOpen(false);
              onChange(null, query.trim());
            }}
            className={`w-full border-t border-border px-4 py-2.5 text-left text-sm text-primary hover:bg-primary-soft/40 ${bn}`}
          >
            {t('My college is not listed', 'আমার কলেজ তালিকায় নেই')}
          </button>
        </div>
      )}

      {error && <span className={`mt-1 block text-xs text-coral ${bn}`}>{error}</span>}
    </div>
  );
}

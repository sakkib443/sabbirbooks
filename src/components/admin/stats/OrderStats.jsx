'use client';

/**
 * Shared pieces for the two screens that report book-order money: the admin
 * dashboard and the analytics page.
 *
 * The three numbers, and the rule the server enforces behind them:
 *   VALUE     every live order's total — what has been sold
 *   EARNED    money in hand — the parcel was delivered, or paid online up front
 *   UPCOMING  sold but not yet collected (value − earned)
 *
 * Kept in one file so both screens describe the money identically; a dashboard
 * and a report that disagree about "revenue" is worse than having only one.
 *
 * Every figure can be read two ways. An order's total is its books plus the
 * delivery charge, and the delivery charge is the courier's money passing
 * through — so the admin chooses whether revenue includes it (DeliveryToggle),
 * and the charge and the number of books sold are shown on their own as well.
 */

import React, { useCallback, useMemo, useSyncExternalStore } from 'react';
import { FiBook, FiCalendar, FiTruck } from 'react-icons/fi';

export const tk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

// ── With or without the delivery charge ────────────────────────────────────
// One choice for every money screen, remembered in this browser, so the
// dashboard and the analytics page never show the same period two ways.
// Without delivery by default: the shop reads revenue as what its books sold for.
const MODE_KEY = 'mv_revenue_delivery';
const modeListeners = new Set();
let memoryMode = null; // for a browser that refuses localStorage

const readMode = () => {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'with' || stored === 'without') return stored;
  } catch {
    // Blocked storage: fall through to this visit's choice.
  }
  return memoryMode || 'without';
};

const subscribeMode = (onChange) => {
  modeListeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    modeListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
};

/** ['without' | 'with', setMode] */
export function useDeliveryMode() {
  const mode = useSyncExternalStore(subscribeMode, readMode, () => 'without');
  const setMode = useCallback((next) => {
    memoryMode = next;
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // Kept in memory for this visit instead.
    }
    modeListeners.forEach((listener) => listener());
  }, []);
  return [mode, setMode];
}

/**
 * value / earned / upcoming of a stats bucket, in the chosen mode. A server
 * that predates the split has no `books` part; its totals are used as they are.
 */
export const moneyIn = (bucket, mode) => {
  const source = mode === 'without' && bucket?.books ? bucket.books : bucket;
  return { value: source?.value ?? 0, earned: source?.earned ?? 0, upcoming: source?.upcoming ?? 0 };
};

/** A breakdown row ({ value, delivery }) in the chosen mode. */
export const rowValue = (row, mode) =>
  mode === 'without' ? (row?.value ?? 0) - (row?.delivery ?? 0) : row?.value ?? 0;

export const modeNote = (mode) => (mode === 'without' ? 'without delivery charge' : 'with delivery charge');

export const booksLabel = (n) => `${(n ?? 0).toLocaleString('en-US')} ${n === 1 ? 'book' : 'books'}`;

export function DeliveryToggle({ mode, onChange }) {
  const options = [
    { key: 'without', label: 'Without delivery' },
    { key: 'with', label: 'With delivery' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Revenue and the delivery charge"
      className="inline-flex items-center rounded-lg border border-dash-line bg-dash-soft p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={mode === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            mode === o.key ? 'bg-dash-card text-brand shadow-sm' : 'text-dash-mute hover:text-dash-ink3'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The two figures the totals hide: how many books were sold and what they
 * sold for, and the delivery charge on its own — whichever mode is chosen.
 */
export function BooksAndDelivery({ bucket, loading, scope }) {
  const books = bucket?.books;
  const delivery = bucket?.delivery;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <MoneyCard
        icon={FiBook} tone="indigo" loading={loading}
        label={`Books sold · ${scope}`}
        value={booksLabel(bucket?.copies)}
        note={`in ${(bucket?.orders ?? 0).toLocaleString('en-US')} orders`}
        foot={
          <MiniFigures
            loading={loading}
            items={[
              { label: 'Book sales', value: tk(books?.value) },
              { label: 'Earned', value: tk(books?.earned), tone: 'text-emerald-600' },
              { label: 'Upcoming', value: tk(books?.upcoming) },
            ]}
          />
        }
      />
      <MoneyCard
        icon={FiTruck} tone="sky" loading={loading}
        label={`Delivery charges · ${scope}`}
        value={tk(delivery?.value)}
        note="Charged to buyers, kept apart from book sales"
        foot={
          <MiniFigures
            loading={loading}
            items={[
              { label: 'Collected', value: tk(delivery?.earned), tone: 'text-emerald-600' },
              { label: 'To collect', value: tk(delivery?.upcoming) },
            ]}
          />
        }
      />
    </div>
  );
}

function MiniFigures({ items, loading }) {
  return (
    <dl
      className="mt-3 grid gap-2 border-t border-dash-line-soft pt-2.5"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="truncate text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">{it.label}</dt>
          <dd className={`mt-0.5 truncate text-sm font-bold tabular-nums ${it.tone || 'text-dash-ink2'}`}>
            {loading ? '—' : it.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Compact money for a chart axis: 12500 → ৳12.5k */
export const tkShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return '৳' + (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return '৳' + Math.round(v);
};

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The presets the date bar offers, each resolved to a concrete {from,to}. */
export const RANGE_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 days', days: 6 },
  { key: '30d', label: '30 days', days: 29 },
  { key: 'month', label: 'This month', month: true },
  { key: '90d', label: '90 days', days: 89 },
  { key: 'year', label: 'This year', year: true },
];

export const resolvePreset = (key) => {
  const now = new Date();
  const p = RANGE_PRESETS.find((x) => x.key === key) || RANGE_PRESETS[2];
  if (p.month) return { from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDay(now) };
  if (p.year) return { from: isoDay(new Date(now.getFullYear(), 0, 1)), to: isoDay(now) };
  const start = new Date(now);
  start.setDate(start.getDate() - (p.days || 0));
  return { from: isoDay(start), to: isoDay(now) };
};

// ── Date range bar ─────────────────────────────────────────────────────────
export function RangeBar({ preset, onPreset, from, to, onFrom, onTo, onApply, right }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPreset(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              preset === p.key
                ? 'bg-brand text-white shadow-sm shadow-brand/25'
                : 'text-dash-mute hover:bg-dash-soft hover:text-dash-ink3'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-dash-mute2">
          <FiCalendar size={13} /> Custom
        </span>
        <input
          type="date" value={from} onChange={(e) => onFrom(e.target.value)}
          className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
        />
        <span className="text-dash-mute2">–</span>
        <input
          type="date" value={to} onChange={(e) => onTo(e.target.value)}
          className="rounded-lg border border-dash-line bg-dash-card px-2.5 py-1.5 text-xs text-dash-ink3 outline-none focus:border-brand"
        />
        <button
          onClick={onApply}
          className="rounded-lg bg-dash-soft2 px-3 py-1.5 text-xs font-semibold text-dash-ink4 transition-colors hover:bg-dash-soft3"
        >
          Apply
        </button>
        {right}
      </div>
    </div>
  );
}

// ── Money cards ────────────────────────────────────────────────────────────
const TONES = {
  brand: 'from-brand to-brand-hover',
  emerald: 'from-emerald-500 to-teal-500',
  amber: 'from-amber-500 to-orange-500',
  indigo: 'from-indigo-500 to-violet-500',
  sky: 'from-sky-500 to-cyan-500',
};

/**
 * One figure on a card.
 *
 * On a phone the cards sit two to a row, about 140px each, and a figure like
 * ৳1,58,400 is wider than the room left beside the icon — it ran over the icon
 * and out of the card. So below sm the figure takes a full line under the
 * label and icon; from sm up the icon sits beside all three lines, as it always
 * has. One grid, placed differently per breakpoint, rather than two copies.
 */
export function MoneyCard({ icon: Icon, label, value, note, tone = 'brand', loading, href, foot }) {
  const body = (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
        <p className="col-start-1 row-start-1 text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">{label}</p>
        <span className={`col-start-2 row-start-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br sm:row-span-3 sm:h-9 sm:w-9 ${TONES[tone]} text-white shadow-md`}>
          <Icon size={16} />
        </span>
        <p className="col-span-2 row-start-2 mt-1 whitespace-nowrap text-lg font-bold leading-none text-dash-ink outfit tabular-nums sm:col-span-1 sm:text-xl">
          {loading ? <span className="inline-block h-6 w-20 animate-pulse rounded-md bg-dash-soft2" /> : value}
        </p>
        {note && <p className="col-span-2 row-start-3 mt-1 truncate text-[11px] text-dash-mute2 sm:col-span-1">{note}</p>}
      </div>
      {foot}
    </>
  );
  const cls =
    'rounded-xl border border-dash-line/60 bg-dash-card px-4 py-3 shadow-sm transition-all hover:shadow-md';
  return href ? (
    <a href={href} className={`${cls} block hover:border-brand/40`}>{body}</a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// ── Revenue chart ──────────────────────────────────────────────────────────
/**
 * The day-by-day chart, in one of two readings:
 *
 *   metric 'orders'   how many orders came in each day — one line.
 *   metric 'revenue'  two stacked areas: what was SOLD (value) and what was
 *                     actually EARNED, so the gap between the lines is the money
 *                     still out with couriers — the one thing a single-line
 *                     revenue chart cannot show.
 *
 * Plain SVG on purpose: no chart library in this project, and the shapes here
 * are simple enough that adding one would cost more than it saves.
 *
 * `mode` 'without' draws the money with each day's delivery charge taken out.
 * `height` is the drawing's height in viewBox units; the width is always 760,
 * so a smaller height is a flatter, shorter chart wherever it is placed.
 */

/**
 * A smooth line that never overshoots.
 *
 * The old curve was Catmull-Rom, which bulges past its points: a quiet day
 * between two busy ones dipped BELOW the zero line and a busy day's peak read
 * higher than it was. Monotone cubic (Fritsch–Carlson) is as smooth to the eye
 * but only ever rises where the data rises, so zero stays on the axis and a
 * peak is exactly as tall as the day.
 */
const monotonePath = (pts) => {
  const n = pts.length;
  if (n < 2) return '';
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1;
    slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i], b = m[i + 1] / slope[i], h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], t = dx[i] / 3;
    d += ` C ${x0 + t},${y0 + m[i] * t} ${x1 - t},${y1 - m[i + 1] * t} ${x1},${y1}`;
  }
  return d;
};

/** "12" for a count axis; money keeps its short ৳ form. */
const countShort = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

export function RevenueChart({ daily, loading, mode = 'with', metric = 'revenue', height = 260 }) {
  const W = 760, H = height, PL = 48, PR = 14, PT = 14, PB = 30;
  const iw = W - PL - PR, ih = H - PT - PB;
  const orders = metric === 'orders';
  // Unique per chart, so two charts on one page never share a gradient.
  const gid = React.useId().split(':').join('');

  const { mainPath, mainArea, earnedPath, earnedArea, grid, ticks, points } = useMemo(() => {
    const rows = (daily || []).map((d) =>
      mode === 'without'
        ? { ...d, value: (d.value || 0) - (d.delivery || 0), earned: (d.earned || 0) - (d.earnedDelivery || 0) }
        : d
    );
    const main = (d) => (orders ? d.orders || 0 : d.value || 0);
    // A count axis tops out on a round number with a little headroom, so a
    // 3-order peak is not drawn touching the ceiling.
    const peak = Math.max(...rows.map(main), 0);
    const max = orders ? Math.max(4, Math.ceil((peak * 1.15) / 4) * 4) : Math.max(peak, 1);
    const x = (i) => PL + (rows.length <= 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
    const y = (v) => PT + ih - (v / max) * ih;

    const close = (path, pts) =>
      pts.length < 2 ? '' : `${path} L ${pts[pts.length - 1][0]},${PT + ih} L ${pts[0][0]},${PT + ih} Z`;

    const mp = rows.map((d, i) => [x(i), y(main(d))]);
    const ep = orders ? [] : rows.map((d, i) => [x(i), y(d.earned || 0)]);
    const mPath = monotonePath(mp), ePath = orders ? '' : monotonePath(ep);

    const grid = Array.from({ length: 5 }, (_, i) => ({
      y: PT + (i / 4) * ih,
      label: orders ? countShort((max * (4 - i)) / 4) : tkShort((max * (4 - i)) / 4),
    }));

    // At most ~8 date labels, whatever the range length, so they never collide.
    const step = Math.max(1, Math.ceil(rows.length / 8));
    const ticks = rows
      .map((d, i) => ({ i, d }))
      .filter(({ i }) => i % step === 0 || i === rows.length - 1)
      .map(({ i, d }) => ({ x: x(i), label: d.date?.slice(5).replace('-', '/') || d.day }));

    return {
      mainPath: mPath, mainArea: close(mPath, mp),
      earnedPath: ePath, earnedArea: ePath ? close(ePath, ep) : '',
      grid, ticks,
      points: rows.map((d, i) => ({ x: x(i), ym: y(main(d)), ye: y(d.earned || 0), d })),
    };
  }, [daily, mode, orders, iw, ih]);

  if (loading) {
    return <div className="mx-3 my-2 animate-pulse rounded-lg bg-dash-soft" style={{ height: Math.round(height * 0.85) }} />;
  }

  const tipW = orders ? 108 : 128;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`${gid}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${gid}e`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {grid.map((g, i) => (
        <g key={i}>
          <line x1={PL} y1={g.y} x2={PL + iw} y2={g.y} stroke="var(--dash-line-soft)" strokeWidth="1" strokeDasharray={i === 4 ? undefined : '3 4'} />
          <text x={PL - 8} y={g.y + 3.5} fontSize="9" fill="var(--dash-mute2)" textAnchor="end" fontFamily="Inter, sans-serif">
            {g.label}
          </text>
        </g>
      ))}

      {mainArea && <path d={mainArea} fill={`url(#${gid}m)`} />}
      {earnedArea && <path d={earnedArea} fill={`url(#${gid}e)`} />}
      {mainPath && <path d={mainPath} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {earnedPath && <path d={earnedPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}

      {ticks.map((t, i) => (
        <text key={i} x={t.x} y={H - 9} fontSize="9" fill="var(--dash-mute2)" textAnchor="middle" fontFamily="Inter, sans-serif">
          {t.label}
        </text>
      ))}

      {points.map((p, i) => {
        const tx = Math.min(Math.max(p.x - tipW / 2, 2), W - tipW - 2);
        const ty = Math.max(p.ym - 46, 2);
        return (
          <g key={i} className="group/dot">
            <rect x={p.x - 8} y={PT} width="16" height={ih} fill="transparent" className="cursor-pointer" />
            <line x1={p.x} y1={PT} x2={p.x} y2={PT + ih} stroke="var(--dash-line)" strokeWidth="1" className="opacity-0 transition-opacity group-hover/dot:opacity-100" />
            <circle cx={p.x} cy={p.ym} r="3.5" fill="var(--brand)" stroke="white" strokeWidth="2" className="opacity-0 transition-opacity group-hover/dot:opacity-100" />
            {!orders && (
              <circle cx={p.x} cy={p.ye} r="3.5" fill="#10b981" stroke="white" strokeWidth="2" className="opacity-0 transition-opacity group-hover/dot:opacity-100" />
            )}
            <g className="pointer-events-none opacity-0 transition-opacity group-hover/dot:opacity-100">
              <rect x={tx} y={ty} width={tipW} height="38" rx="7" fill="#0f172a" />
              <text x={tx + 9} y={ty + 15} fontSize="9" fill="#cbd5e1">{p.d.date}</text>
              <text x={tx + 9} y={ty + 29} fontSize="10" fill="#fff" fontWeight="700">
                {orders
                  ? `${p.d.orders || 0} orders · ${p.d.copies || 0} books`
                  : `${tk(p.d.value)} · earned ${tk(p.d.earned)}`}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-dash-mute">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Sold (value)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Earned
      </span>
    </div>
  );
}

/**
 * Orders first, then revenue — the order the shop reads the day in: how many
 * came in, and then what they were worth. Styled as the delivery switch beside
 * it, so the two controls read as one family.
 */
export function MetricToggle({ metric, onChange }) {
  const options = [
    { key: 'orders', label: 'Orders' },
    { key: 'revenue', label: 'Revenue' },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="What the chart shows"
      className="inline-flex items-center rounded-lg border border-dash-line bg-dash-soft p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={metric === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            metric === o.key ? 'bg-brand text-white shadow-sm' : 'text-dash-mute hover:text-dash-ink3'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The period at a glance, beside the chart.
 *
 * These five figures used to sit in a row across the top of the chart card,
 * crowding its title and making the card as tall as the page was wide. Here
 * they are one column, read top to bottom — how many, how much, how much of it
 * is in hand — with the two things the row never said: the average order, and
 * the day the shop sold most.
 */
export function RangeSummary({ range, mode, loading }) {
  const m = moneyIn(range, mode);
  const orders = range?.orders ?? 0;
  const copies = range?.copies ?? 0;
  const inHand = m.value > 0 ? Math.min(100, Math.round((m.earned / m.value) * 100)) : 0;
  const best = (range?.daily || []).reduce(
    (b, d) => ((d.orders || 0) > (b?.orders || 0) ? d : b),
    null
  );
  const bestValue = best ? (mode === 'without' ? (best.value || 0) - (best.delivery || 0) : best.value || 0) : 0;
  const fmtDay = (iso) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const Row = ({ label, value, tone = 'text-dash-ink', sub }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-dash-mute">{label}</span>
      <span className="text-right">
        <span className={`text-sm font-bold tabular-nums outfit ${tone}`}>{value}</span>
        {sub && <span className="block text-[10px] text-dash-mute2">{sub}</span>}
      </span>
    </div>
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-dash-line/60 bg-dash-card px-5 py-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">This period</p>

      {loading ? (
        <div className="mt-3 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded-md bg-dash-soft2" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-bold leading-none text-dash-ink outfit tabular-nums">
              {orders.toLocaleString('en-US')}
            </span>
            <span className="pb-0.5 text-xs text-dash-mute">orders · {booksLabel(copies)}</span>
          </div>

          <div className="mt-2 divide-y divide-dash-line-soft">
            <Row label="Sold" value={tk(m.value)} />
            <Row label="Earned" value={tk(m.earned)} tone="text-emerald-600" />
            <Row label="Still to collect" value={tk(Math.max(0, m.value - m.earned))} tone="text-amber-600" />
            <Row label="Delivery charge" value={tk(range?.delivery?.value)} />
            <Row label="Average order" value={orders ? tk(m.value / orders) : '—'} />
          </div>

          {/* How much of what was sold is actually in hand. */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-dash-mute">
              <span>Collected</span>
              <span className="font-semibold tabular-nums text-dash-ink3">{inHand}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dash-soft2">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${inHand}%` }} />
            </div>
          </div>

          <div className="mt-auto" />
          {best && best.orders > 0 && (
            <div className="mt-2.5 rounded-lg bg-dash-soft px-3 py-1.5 text-xs">
              <span className="text-dash-mute">Best day · </span>
              <span className="font-semibold text-dash-ink3">{fmtDay(best.date)}</span>
              <span className="text-dash-mute"> — {best.orders} orders, {tk(bestValue)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

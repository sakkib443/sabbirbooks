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
 */

import React, { useMemo } from 'react';
import { FiCalendar } from 'react-icons/fi';

export const tk = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-US');

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

export function MoneyCard({ icon: Icon, label, value, note, tone = 'brand', loading, href, foot }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-dash-mute2">{label}</p>
          <p className="mt-1 text-xl font-bold leading-none text-dash-ink outfit tabular-nums">
            {loading ? <span className="inline-block h-6 w-20 animate-pulse rounded-md bg-dash-soft2" /> : value}
          </p>
          {note && <p className="mt-1 truncate text-[11px] text-dash-mute2">{note}</p>}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${TONES[tone]} text-white shadow-md`}>
          <Icon size={17} />
        </span>
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
 * Two stacked areas: what was SOLD (value) and what was actually EARNED, so the
 * gap between the lines is the money still out with couriers — the one thing a
 * single-line revenue chart cannot show.
 *
 * Plain SVG on purpose: no chart library in this project, and the shapes here
 * are simple enough that adding one would cost more than it saves.
 */
export function RevenueChart({ daily, loading }) {
  const W = 760, H = 260, PL = 52, PR = 16, PT = 16, PB = 34;
  const iw = W - PL - PR, ih = H - PT - PB;

  const { valuePath, valueArea, earnedPath, earnedArea, grid, ticks, max, points } = useMemo(() => {
    const rows = daily || [];
    const max = Math.max(...rows.map((d) => d.value), 1);
    const x = (i) => PL + (rows.length <= 1 ? iw / 2 : (i / (rows.length - 1)) * iw);
    const y = (v) => PT + ih - (v / max) * ih;

    const smooth = (pts) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
        d += ` C ${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
      }
      return d;
    };
    const close = (path, pts) =>
      pts.length < 2 ? '' : `${path} L ${pts[pts.length - 1][0]},${PT + ih} L ${pts[0][0]},${PT + ih} Z`;

    const vp = rows.map((d, i) => [x(i), y(d.value)]);
    const ep = rows.map((d, i) => [x(i), y(d.earned)]);
    const vPath = smooth(vp), ePath = smooth(ep);

    const grid = Array.from({ length: 5 }, (_, i) => ({
      y: PT + (i / 4) * ih,
      label: tkShort((max * (4 - i)) / 4),
    }));

    // At most ~8 date labels, whatever the range length, so they never collide.
    const step = Math.max(1, Math.ceil(rows.length / 8));
    const ticks = rows
      .map((d, i) => ({ i, d }))
      .filter(({ i }) => i % step === 0 || i === rows.length - 1)
      .map(({ i, d }) => ({ x: x(i), label: d.date?.slice(5).replace('-', '/') || d.day }));

    return {
      valuePath: vPath, valueArea: close(vPath, vp),
      earnedPath: ePath, earnedArea: close(ePath, ep),
      grid, ticks, max,
      points: rows.map((d, i) => ({ x: x(i), yv: y(d.value), ye: y(d.earned), d })),
    };
  }, [daily, iw, ih]);

  if (loading) return <div className="mx-3 my-2 h-[250px] animate-pulse rounded-lg bg-dash-soft" />;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gValue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="gEarned" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {grid.map((g, i) => (
        <g key={i}>
          <line x1={PL} y1={g.y} x2={PL + iw} y2={g.y} stroke="var(--dash-line-soft)" strokeWidth="1" />
          <text x={PL - 8} y={g.y + 3.5} fontSize="9" fill="var(--dash-mute2)" textAnchor="end" fontFamily="Inter, sans-serif">
            {g.label}
          </text>
        </g>
      ))}
      <line x1={PL} y1={PT + ih} x2={PL + iw} y2={PT + ih} stroke="var(--dash-line)" strokeWidth="1" />

      {valueArea && <path d={valueArea} fill="url(#gValue)" />}
      {earnedArea && <path d={earnedArea} fill="url(#gEarned)" />}
      {valuePath && <path d={valuePath} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {earnedPath && <path d={earnedPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {ticks.map((t, i) => (
        <text key={i} x={t.x} y={H - 10} fontSize="9" fill="var(--dash-mute2)" textAnchor="middle" fontFamily="Inter, sans-serif">
          {t.label}
        </text>
      ))}

      {points.map((p, i) => (
        <g key={i} className="group/dot">
          <rect x={p.x - 8} y={PT} width="16" height={ih} fill="transparent" className="cursor-pointer" />
          <circle cx={p.x} cy={p.yv} r="3.5" fill="var(--brand)" stroke="white" strokeWidth="2" className="opacity-0 transition-opacity group-hover/dot:opacity-100" />
          <circle cx={p.x} cy={p.ye} r="3.5" fill="#10b981" stroke="white" strokeWidth="2" className="opacity-0 transition-opacity group-hover/dot:opacity-100" />
          <g className="pointer-events-none opacity-0 transition-opacity group-hover/dot:opacity-100">
            <rect x={Math.min(Math.max(p.x - 58, 2), W - 118)} y={Math.max(p.yv - 44, 2)} width="116" height="38" rx="6" fill="#0f172a" />
            <text x={Math.min(Math.max(p.x - 58, 2), W - 118) + 8} y={Math.max(p.yv - 44, 2) + 15} fontSize="9" fill="#cbd5e1">{p.d.date}</text>
            <text x={Math.min(Math.max(p.x - 58, 2), W - 118) + 8} y={Math.max(p.yv - 44, 2) + 29} fontSize="10" fill="#fff" fontWeight="700">
              {tk(p.d.value)} · earned {tk(p.d.earned)}
            </text>
          </g>
        </g>
      ))}
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

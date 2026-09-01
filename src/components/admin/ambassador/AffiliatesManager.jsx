'use client';

/**
 * Affiliates — everyone who sells for the shop under their own code.
 *
 * The list, the filters, and the actions that run the programme: add somebody,
 * edit anything about them, remove them, or switch their code on and off.
 * Approving mints their coupon and their login; suspending or rejecting takes
 * the coupon offline. All of that happens server-side — this screen only says
 * which.
 *
 * The table is wide, so it scrolls inside its own container on desktop and
 * becomes a stack of cards on a phone. Working through this list on a phone is
 * a real thing here: the shop's admin does it between other work.
 *
 * The filter bar and the detail panel are their own files — both grew past the
 * point where reading this one meant scrolling through them first.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiAward, FiLoader, FiAlertCircle, FiCheckCircle, FiXCircle, FiPauseCircle,
  FiTag, FiShoppingBag, FiDollarSign, FiFileText, FiUserPlus, FiTrash2, FiEdit2,
  FiUsers, FiDownload,
} from 'react-icons/fi';
import {
  listApplications, reviewApplication, deleteAffiliate,
  formatTk, formatDate, STATUS_TONE, STATUS_LABEL,
} from './ambassadorApi';
import AffiliateForm from './AffiliateForm';
import AffiliateFilters from './AffiliateFilters';
import AffiliateDetail from './AffiliateDetail';

/** Everything the filter bar can set, so a reset knows what to clear. */
const BLANK_FILTERS = {
  status: 'approved',
  sort: 'recent',
  q: '',
  from: '', to: '',
  joinedFrom: '', joinedTo: '',
  college: '', division: '', district: '',
  academicYear: '', batch: '', city: '', reach: '',
  source: '', coupon: '', performance: '',
};

export default function AffiliatesManager({ defaultTab = 'approved' }) {
  const [filters, setFilters] = useState({ ...BLANK_FILTERS, status: defaultTab });
  const [state, setState] = useState({
    loading: true, error: '', rows: [], counts: {}, facets: {},
  });
  const [busyId, setBusyId] = useState('');
  const [open, setOpen] = useState(null);   // the affiliate shown in the panel
  const [editing, setEditing] = useState(null); // null = closed, {} = adding

  const load = async (q = filters) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const j = await listApplications(q);
      setState({
        loading: false, error: '',
        rows: j.data || [], counts: j.counts || {}, facets: j.facets || {},
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'লোড করা যায়নি', rows: [] }));
    }
  };

  useEffect(() => { load({ ...BLANK_FILTERS, status: defaultTab }); /* eslint-disable-next-line */ }, [defaultTab]);

  const remove = async (row) => {
    if (
      !confirm(
        `${row.fullName} (${row.applicationId}) মুছে ফেলবেন?\n\n` +
          `তার কুপন ${row.couponCode || ''} মুছবে না — বন্ধ হয়ে যাবে, কারণ পুরোনো অর্ডারগুলো ওই কোডে বাঁধা আর কমিশনের হিসাব ওখান থেকেই আসে। তার লগইনও ব্লক হবে।`
      )
    ) return;

    setBusyId(row._id);
    try {
      const res = await deleteAffiliate(row._id);
      alert(res.message || 'মুছে ফেলা হয়েছে');
      if (open?._id === row._id) setOpen(null);
      load();
    } catch (e) {
      alert(e.message || 'মুছে ফেলা যায়নি');
    } finally {
      setBusyId('');
    }
  };

  const review = async (row, status) => {
    const verb = { approved: 'চালু', rejected: 'বাতিল', suspended: 'স্থগিত' }[status];
    const extra =
      status === 'approved'
        ? '\n\nএতে তার কুপন কোড আর লগইন তৈরি হবে, কোডটা কাজ করা শুরু করবে।'
        : '\n\nতার কুপন আর কাজ করবে না। আগে যে বিক্রি হয়েছে সেটার হিসাব থাকবে।';
    if (!confirm(`${row.fullName} (${row.applicationId}) — ${verb} করবেন?${extra}`)) return;

    setBusyId(row._id);
    try {
      const updated = await reviewApplication(row._id, status);
      setState((s) => ({
        ...s,
        rows: s.rows.map((r) => (r._id === row._id ? { ...r, ...updated, stats: r.stats } : r)),
      }));
      if (open?._id === row._id) setOpen((o) => ({ ...o, ...updated }));
      // The counts moved, and under a status filter this row may no longer
      // belong in the list at all.
      if (filters.status !== 'all') load();
    } catch (e) {
      alert(e.message || 'বদলানো যায়নি');
    } finally {
      setBusyId('');
    }
  };

  const totals = useMemo(() => {
    const rows = state.rows;
    return {
      people: rows.length,
      orders: rows.reduce((n, r) => n + (r.stats?.orders || 0), 0),
      sales: rows.reduce((n, r) => n + (r.stats?.sales || 0), 0),
      commission: rows.reduce((n, r) => n + (r.stats?.commission || 0), 0),
    };
  }, [state.rows]);

  /**
   * The list as it stands, as a spreadsheet.
   *
   * Built in the browser from rows already loaded, so it exports exactly what
   * the filters are showing — the point is to hand somebody "this month's
   * commissions" without asking them to trust a second query.
   */
  const exportCsv = () => {
    const head = [
      'Application ID', 'Name', 'Phone', 'WhatsApp', 'Email', 'College', 'Batch',
      'Year', 'City', 'Coupon', 'Coupon active', 'Status', 'Source', 'Joined',
      'Orders', 'Sales', 'Commission',
    ];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = state.rows.map((r) => [
      r.applicationId, r.fullName, r.phone, r.whatsapp, r.email, r.medicalCollegeName,
      r.batch, r.academicYear, r.city, r.couponCode, r.coupon?.isActive ? 'yes' : 'no',
      r.status, r.source === 'manual' ? 'added by admin' : 'applied',
      formatDate(r.createdAt), r.stats?.orders || 0, r.stats?.sales || 0,
      r.stats?.commission || 0,
    ].map(cell).join(','));

    // The BOM is what makes Excel read Bengali names correctly.
    const blob = new Blob(['﻿' + [head.map(cell).join(','), ...body].join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `affiliates-${filters.status}${filters.from ? `-${filters.from}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const windowed = filters.from || filters.to;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
            <FiAward className="text-brand" /> অ্যাফিলিয়েট
          </h1>
          <p className="text-sm text-dash-mute">
            যারা নিজের কোডে বই বিক্রি করে। প্রত্যেকের কোড, বিক্রি আর প্রাপ্য কমিশন এখানে।
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Kpi icon={FiUsers} label="জন" value={totals.people} />
          <Kpi icon={FiShoppingBag} label="অর্ডার" value={totals.orders} />
          <Kpi icon={FiDollarSign} label="বিক্রি" value={formatTk(totals.sales)} />
          <Kpi icon={FiTag} label="কমিশন" value={formatTk(totals.commission)} />
          <button
            onClick={exportCsv}
            disabled={!state.rows.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2.5 text-sm font-medium text-dash-ink3 transition-colors hover:bg-dash-soft disabled:opacity-40"
            title="এখন যা দেখছেন সেটাই এক্সেল ফাইলে"
          >
            <FiDownload /> এক্সপোর্ট
          </button>
          <button
            onClick={() => setEditing({})}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <FiUserPlus /> নতুন অ্যাফিলিয়েট
          </button>
        </div>
      </header>

      <AffiliateFilters
        value={filters}
        counts={state.counts}
        facets={state.facets}
        onChange={setFilters}
        onApply={load}
      />

      {windowed && (
        <p className="text-xs text-dash-mute2">
          উপরের ও টেবিলের বিক্রি-কমিশন শুধু{' '}
          <strong className="text-dash-ink3">
            {filters.from || 'শুরু'} — {filters.to || 'আজ'}
          </strong>{' '}
          সময়ের অর্ডারের। কে কোন অবস্থায় আছে সেটা এই সীমার বাইরেও একই।
        </p>
      )}

      {state.error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <FiAlertCircle /> {state.error}
        </div>
      )}

      {state.loading ? (
        <div className="flex h-[40vh] items-center justify-center text-dash-mute2">
          <FiLoader className="mr-2 animate-spin" /> লোড হচ্ছে…
        </div>
      ) : state.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dash-line p-12 text-center">
          <FiAward className="mx-auto mb-3 text-3xl text-dash-mute2" />
          <p className="font-medium text-dash-ink3">এখানে কেউ নেই</p>
          <p className="mt-1 text-sm text-dash-mute2">
            {filters.status === 'pending'
              ? 'রিভিউয়ের অপেক্ষায় কোনো আবেদন নেই।'
              : 'ফিল্টার বদলে দেখুন, অথবা নিজেই একজন যোগ করুন।'}
          </p>
          <button
            onClick={() => setEditing({})}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <FiUserPlus /> নতুন অ্যাফিলিয়েট
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table — wide, so it scrolls in its own box. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-dash-line bg-dash-card lg:block">
            <table className="w-full min-w-[1320px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-dash-mute2">
                  <Th>আইডি</Th>
                  <Th>নাম</Th>
                  <Th>কলেজ / ব্যাচ</Th>
                  <Th>যোগাযোগ</Th>
                  <Th>যোগ দিয়েছে</Th>
                  <Th>অবস্থা</Th>
                  <Th>কুপন</Th>
                  <Th className="text-right">অর্ডার</Th>
                  <Th className="text-right">বিক্রি</Th>
                  <Th className="text-right">কমিশন</Th>
                  <Th className="text-right">কাজ</Th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r._id} className="border-b border-dash-line-soft last:border-0 hover:bg-dash-soft/40">
                    <Td>
                      <button
                        onClick={() => setOpen(r)}
                        className="font-mono text-xs font-bold text-brand hover:underline"
                      >
                        {r.applicationId}
                      </button>
                      <SourceTag source={r.source} />
                    </Td>
                    <Td>
                      <span className="font-medium text-dash-ink2">{r.fullName}</span>
                      <span className="block text-[11px] text-dash-mute2">{r.email}</span>
                    </Td>
                    <Td>
                      <span className="text-dash-ink3">{r.medicalCollegeName || '—'}</span>
                      <span className="block text-[11px] text-dash-mute2">
                        {[r.batch, r.academicYear].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="text-dash-ink3">{r.phone}</span>
                      {r.city && <span className="block text-[11px] text-dash-mute2">{r.city}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-dash-mute2">{formatDate(r.createdAt)}</Td>
                    <Td><StatusPill status={r.status} /></Td>
                    <Td><CouponCell row={r} /></Td>
                    <Td className="text-right tabular-nums text-dash-ink3">{r.stats?.orders || 0}</Td>
                    <Td className="text-right tabular-nums text-dash-ink3">{formatTk(r.stats?.sales)}</Td>
                    <Td className="text-right tabular-nums font-semibold text-dash-ink2">
                      {formatTk(r.stats?.commission)}
                    </Td>
                    <Td className="text-right">
                      <Actions
                        row={r}
                        busy={busyId === r._id}
                        onReview={review}
                        onOpen={() => setOpen(r)}
                        onEdit={setEditing}
                        onDelete={remove}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone — one card each. */}
          <div className="space-y-3 lg:hidden">
            {state.rows.map((r) => (
              <div key={r._id} className="rounded-2xl border border-dash-line bg-dash-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      onClick={() => setOpen(r)}
                      className="font-mono text-[11px] font-bold text-brand hover:underline"
                    >
                      {r.applicationId}
                    </button>
                    <p className="truncate font-semibold text-dash-ink2">{r.fullName}</p>
                    <p className="truncate text-xs text-dash-mute2">
                      {[r.medicalCollegeName, r.batch].filter(Boolean).join(' · ') || r.phone}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-dash-soft/60 p-3 text-center">
                  <Mini label="অর্ডার" value={r.stats?.orders || 0} />
                  <Mini label="বিক্রি" value={formatTk(r.stats?.sales)} />
                  <Mini label="কমিশন" value={formatTk(r.stats?.commission)} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <CouponCell row={r} />
                  <Actions
                    row={r}
                    busy={busyId === r._id}
                    onReview={review}
                    onOpen={() => setOpen(r)}
                    onEdit={setEditing}
                    onDelete={remove}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {open && (
        <AffiliateDetail
          id={open._id}
          onClose={() => setOpen(null)}
          onReview={(status) => review(open, status)}
          onEdit={() => { setEditing(open); setOpen(null); }}
          onDelete={remove}
          busy={busyId === open._id}
        />
      )}

      {editing && (
        <AffiliateForm
          affiliate={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            // Reload rather than splice the row in: a new affiliate may not
            // belong under the current filter, and the counts moved either way.
            load();
            if (!editing._id && saved?.couponCode) {
              alert(
                `${saved.fullName} যুক্ত হয়েছে।\n\n` +
                  `কুপন কোড: ${saved.couponCode}\n` +
                  `লগইন: ${saved.email}\n` +
                  `পাসওয়ার্ড: যা দিয়েছেন — না দিলে তার ফোন নম্বর (${saved.phone})`
              );
            }
          }}
        />
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────

const Th = ({ children, className = '' }) => (
  <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${className}`}>{children}</th>
);
const Td = ({ children, className = '' }) => <td className={`px-4 py-3 ${className}`}>{children}</td>;

const Kpi = ({ icon: Icon, label, value }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-dash-line bg-dash-card px-3 py-2">
    <Icon className="text-brand" />
    <span className="text-dash-mute2">{label}</span>
    <strong className="tabular-nums text-dash-ink2">{value}</strong>
  </span>
);

const Mini = ({ label, value }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-dash-mute2">{label}</p>
    <p className="text-sm font-semibold tabular-nums text-dash-ink2">{value}</p>
  </div>
);

const StatusPill = ({ status }) => (
  <span
    className={`inline-block shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      STATUS_TONE[status] || STATUS_TONE.pending
    }`}
  >
    {STATUS_LABEL[status] || status}
  </span>
);

/** Applied, or typed in by an admin. Explains why some rows have empty fields. */
const SourceTag = ({ source }) =>
  source === 'manual' ? (
    <span className="mt-0.5 block text-[10px] text-dash-mute2">অ্যাডমিন যোগ করেছে</span>
  ) : null;

/**
 * The code, its terms, and whether it is live.
 *
 * "Live" is the coupon's own isActive, not the affiliate's status — they are
 * normally the same, but an admin can switch a coupon off from the coupon
 * screen, and showing the person's status here would quietly lie.
 */
function CouponCell({ row }) {
  if (!row.couponCode) return <span className="text-xs text-dash-mute2">—</span>;
  const live = row.coupon?.isActive;
  return (
    <div className="leading-tight">
      <span className="font-mono text-xs font-bold text-dash-ink2">{row.couponCode}</span>
      <span className="block text-[11px] text-dash-mute2">
        {formatTk(row.coupon?.discountValue)} off · {formatTk(row.coupon?.payoutPerSale)}/sale{' '}
        <span className={live ? 'text-emerald-600' : 'text-rose-600'}>
          · {live ? 'চালু' : 'বন্ধ'}
        </span>
      </span>
    </div>
  );
}

/**
 * What an admin can do to one affiliate, from the row.
 *
 * The status buttons come first because they are what the queue is for, then
 * the everyday ones. Reject only shows for someone who applied — rejecting a
 * person you typed in yourself is not a thing, you would delete them.
 */
function Actions({ row, busy, onReview, onOpen, onEdit, onDelete }) {
  const btn =
    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50';
  const applied = row.source !== 'manual';
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {row.status !== 'approved' && (
        <button
          disabled={busy}
          onClick={() => onReview(row, 'approved')}
          className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        >
          <FiCheckCircle /> চালু
        </button>
      )}
      {row.status === 'approved' && (
        <button
          disabled={busy}
          onClick={() => onReview(row, 'suspended')}
          className={`${btn} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
        >
          <FiPauseCircle /> স্থগিত
        </button>
      )}
      {applied && row.status !== 'rejected' && row.status !== 'approved' && (
        <button
          disabled={busy}
          onClick={() => onReview(row, 'rejected')}
          className={`${btn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
        >
          <FiXCircle /> বাতিল
        </button>
      )}
      <button
        onClick={() => onEdit(row)}
        className={`${btn} border-dash-line text-dash-ink3 hover:bg-dash-soft`}
        title="তথ্য সম্পাদনা"
      >
        <FiEdit2 /> এডিট
      </button>
      <button onClick={onOpen} className={`${btn} border-dash-line text-dash-ink3 hover:bg-dash-soft`}>
        <FiFileText /> বিস্তারিত
      </button>
      <button
        disabled={busy}
        onClick={() => onDelete(row)}
        className={`${btn} border-dash-line text-rose-600 hover:border-rose-200 hover:bg-rose-50`}
        title="মুছে ফেলুন"
      >
        {busy ? <FiLoader className="animate-spin" /> : <FiTrash2 />}
      </button>
    </div>
  );
}

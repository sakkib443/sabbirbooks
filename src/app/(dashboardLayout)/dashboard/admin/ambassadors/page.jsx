'use client';

/**
 * The Campus Ambassador queue.
 *
 * Everything the shop asked to see about an applicant, and the one button that
 * matters: Approve mints their coupon and their login, Reject or Suspend takes
 * the coupon offline. Both happen server-side — this screen only says which.
 *
 * The table is wide (fourteen columns), so it scrolls inside its own container
 * on desktop and becomes a stack of cards on a phone. Reviewing applications on
 * a phone is a real thing here: the shop's admin does it between other work.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FiAward, FiLoader, FiAlertCircle, FiSearch, FiCheckCircle, FiXCircle,
  FiPauseCircle, FiExternalLink, FiUser, FiPhone, FiMail, FiMapPin,
  FiTag, FiShoppingBag, FiDollarSign, FiEdit3, FiX, FiFileText,
} from 'react-icons/fi';
import {
  listApplications, reviewApplication, saveNote, getApplication,
  formatTk, formatDate, STATUS_TONE, STATUS_LABEL,
} from '@/components/admin/ambassador/ambassadorApi';

const TABS = ['all', 'pending', 'approved', 'rejected', 'suspended'];

export default function AmbassadorsPage() {
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: true, error: '', rows: [], counts: {} });
  const [busyId, setBusyId] = useState('');
  const [open, setOpen] = useState(null); // the application shown in the panel

  const load = async (opts = {}) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const j = await listApplications({ status: opts.status ?? tab, q: opts.q ?? q });
      setState({ loading: false, error: '', rows: j.data || [], counts: j.counts || {} });
    } catch (e) {
      setState({ loading: false, error: e.message || 'Failed to load', rows: [], counts: {} });
    }
  };

  useEffect(() => { load({ status: tab }); /* eslint-disable-next-line */ }, [tab]);

  const review = async (row, status) => {
    const verb = { approved: 'Approve', rejected: 'Reject', suspended: 'Suspend' }[status];
    const extra =
      status === 'approved'
        ? '\n\nThis creates their coupon code and their login, and makes the code live.'
        : '\n\nTheir coupon stops working. Sales already made under it are kept.';
    if (!confirm(`${verb} ${row.fullName} (${row.applicationId})?${extra}`)) return;

    setBusyId(row._id);
    try {
      const updated = await reviewApplication(row._id, status);
      setState((s) => ({
        ...s,
        rows: s.rows.map((r) => (r._id === row._id ? { ...r, ...updated, stats: r.stats } : r)),
      }));
      if (open?._id === row._id) setOpen((o) => ({ ...o, ...updated }));
      // The counts moved, and if a status filter is on, this row may no longer
      // belong in the list at all.
      if (tab !== 'all') load({ status: tab });
    } catch (e) {
      alert(e.message || 'Could not update');
    } finally {
      setBusyId('');
    }
  };

  const totals = useMemo(() => {
    const rows = state.rows;
    return {
      orders: rows.reduce((n, r) => n + (r.stats?.orders || 0), 0),
      sales: rows.reduce((n, r) => n + (r.stats?.sales || 0), 0),
      commission: rows.reduce((n, r) => n + (r.stats?.commission || 0), 0),
    };
  }, [state.rows]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
            <FiAward className="text-brand" /> Campus Ambassadors
          </h1>
          <p className="text-sm text-dash-mute">
            Applications from medical students. Approving one creates their coupon code and login.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Kpi icon={FiShoppingBag} label="Orders" value={totals.orders} />
          <Kpi icon={FiDollarSign} label="Sales" value={formatTk(totals.sales)} />
          <Kpi icon={FiTag} label="Commission owed" value={formatTk(totals.commission)} />
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-dash-line text-dash-ink3 hover:bg-dash-soft'
            }`}
          >
            {STATUS_LABEL[t]}
            {state.counts[t] ? (
              <span className="ml-1.5 text-xs opacity-70">{state.counts[t]}</span>
            ) : null}
          </button>
        ))}

        <form
          onSubmit={(e) => { e.preventDefault(); load({}); }}
          className="ml-auto flex items-center gap-2"
        >
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dash-mute2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, code, phone, ID…"
              className="w-56 rounded-lg border border-dash-line bg-dash-card py-2 pl-9 pr-3 text-sm text-dash-ink2 outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-dash-line px-3 py-2 text-sm font-medium text-dash-ink3 hover:bg-dash-soft"
          >
            Search
          </button>
        </form>
      </div>

      {state.error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <FiAlertCircle /> {state.error}
        </div>
      )}

      {state.loading ? (
        <div className="flex h-[40vh] items-center justify-center text-dash-mute2">
          <FiLoader className="mr-2 animate-spin" /> Loading…
        </div>
      ) : state.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dash-line p-12 text-center">
          <FiAward className="mx-auto mb-3 text-3xl text-dash-mute2" />
          <p className="font-medium text-dash-ink3">No applications here</p>
          <p className="mt-1 text-sm text-dash-mute2">
            {tab === 'pending' ? 'Nothing is waiting for review.' : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table — wide, so it scrolls in its own box. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-dash-line bg-dash-card lg:block">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-dash-mute2">
                  <Th>Application</Th>
                  <Th>Name</Th>
                  <Th>College / Batch</Th>
                  <Th>Phone</Th>
                  <Th>Applied</Th>
                  <Th>Status</Th>
                  <Th>Coupon</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Sales</Th>
                  <Th className="text-right">Commission</Th>
                  <Th className="text-right">Actions</Th>
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
                    </Td>
                    <Td>
                      <span className="font-medium text-dash-ink2">{r.fullName}</span>
                      <span className="block text-[11px] text-dash-mute2">{r.email}</span>
                    </Td>
                    <Td>
                      <span className="text-dash-ink3">{r.medicalCollegeName}</span>
                      <span className="block text-[11px] text-dash-mute2">
                        {r.batch} · {r.academicYear}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-dash-ink3">{r.phone}</Td>
                    <Td className="whitespace-nowrap text-dash-mute2">{formatDate(r.createdAt)}</Td>
                    <Td><StatusPill status={r.status} /></Td>
                    <Td><CouponCell row={r} /></Td>
                    <Td className="text-right tabular-nums text-dash-ink3">{r.stats?.orders || 0}</Td>
                    <Td className="text-right tabular-nums text-dash-ink3">{formatTk(r.stats?.sales)}</Td>
                    <Td className="text-right tabular-nums font-semibold text-dash-ink2">
                      {formatTk(r.stats?.commission)}
                    </Td>
                    <Td className="text-right">
                      <Actions row={r} busy={busyId === r._id} onReview={review} onOpen={() => setOpen(r)} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone — one card per application. */}
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
                      {r.medicalCollegeName} · {r.batch}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-dash-soft/60 p-3 text-center">
                  <Mini label="Orders" value={r.stats?.orders || 0} />
                  <Mini label="Sales" value={formatTk(r.stats?.sales)} />
                  <Mini label="Commission" value={formatTk(r.stats?.commission)} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <CouponCell row={r} />
                  <Actions row={r} busy={busyId === r._id} onReview={review} onOpen={() => setOpen(r)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {open && (
        <DetailPanel
          id={open._id}
          onClose={() => setOpen(null)}
          onReview={(status) => review(open, status)}
          busy={busyId === open._id}
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
    className={`inline-block shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${
      STATUS_TONE[status] || STATUS_TONE.pending
    }`}
  >
    {status}
  </span>
);

/**
 * The code, its terms, and whether it is live.
 *
 * "Live" is the coupon's own isActive, not the application's status — they are
 * normally the same, but an admin can switch a coupon off from the coupon
 * screen, and showing the application's status there would quietly lie.
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
          · {live ? 'active' : 'inactive'}
        </span>
      </span>
    </div>
  );
}

function Actions({ row, busy, onReview, onOpen }) {
  const btn =
    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50';
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {row.status !== 'approved' && (
        <button
          disabled={busy}
          onClick={() => onReview(row, 'approved')}
          className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        >
          <FiCheckCircle /> Approve
        </button>
      )}
      {row.status === 'approved' && (
        <button
          disabled={busy}
          onClick={() => onReview(row, 'suspended')}
          className={`${btn} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
        >
          <FiPauseCircle /> Suspend
        </button>
      )}
      {row.status !== 'rejected' && (
        <button
          disabled={busy}
          onClick={() => onReview(row, 'rejected')}
          className={`${btn} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
        >
          <FiXCircle /> Reject
        </button>
      )}
      <button onClick={onOpen} className={`${btn} border-dash-line text-dash-ink3 hover:bg-dash-soft`}>
        <FiFileText /> Details
      </button>
    </div>
  );
}

/**
 * Everything the applicant wrote, plus the reviewer's note.
 *
 * Fetched fresh rather than reusing the row: the list carries what the table
 * needs, and the whole application — their reach, their channels, their
 * suggestions, their ID card — is a lot to ship for every row of a queue that
 * is mostly skimmed.
 */
function DetailPanel({ id, onClose, onReview, busy }) {
  const [app, setApp] = useState(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let alive = true;
    getApplication(id)
      .then((d) => { if (alive) { setApp(d); setNote(d.adminNote || ''); } })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [id]);

  const persistNote = async () => {
    setSavingNote(true);
    try {
      await saveNote(id, note);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-dash-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-dash-line bg-dash-card px-5 py-4">
          <div>
            <p className="font-mono text-xs font-bold text-brand">{app?.applicationId || '…'}</p>
            <h2 className="text-lg font-bold text-dash-ink2">{app?.fullName || 'Loading…'}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-dash-mute2 hover:bg-dash-soft">
            <FiX />
          </button>
        </header>

        {err && <p className="px-5 py-4 text-sm text-rose-600">{err}</p>}
        {!app && !err && (
          <p className="flex items-center gap-2 px-5 py-8 text-dash-mute2">
            <FiLoader className="animate-spin" /> Loading…
          </p>
        )}

        {app && (
          <div className="space-y-5 px-5 py-5">
            <div className="flex items-center gap-2">
              <StatusPill status={app.status} />
              {app.reviewedAt && (
                <span className="text-xs text-dash-mute2">
                  reviewed {formatDate(app.reviewedAt)}
                  {app.reviewedBy ? ` by ${app.reviewedBy.firstName || ''}` : ''}
                </span>
              )}
            </div>

            {app.couponCode && (
              <div className="rounded-xl border border-dash-line bg-dash-soft/60 p-4">
                <p className="font-mono text-lg font-bold tracking-wide text-dash-ink2">
                  {app.couponCode}
                </p>
                <p className="mt-1 text-xs text-dash-mute2">
                  {formatTk(app.coupon?.discountValue)} off the buyer ·{' '}
                  {formatTk(app.coupon?.payoutPerSale)} to them per sale ·{' '}
                  {app.coupon?.isActive ? 'active' : 'inactive'}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Orders" value={app.stats?.orders || 0} />
                  <Mini label="Sales" value={formatTk(app.stats?.sales)} />
                  <Mini label="Commission" value={formatTk(app.stats?.commission)} />
                </div>
              </div>
            )}

            <Group title="Contact">
              <Row icon={FiPhone} label="Phone" value={app.phone} />
              <Row icon={FiPhone} label="WhatsApp" value={app.whatsapp || '—'} />
              <Row icon={FiMail} label="Email" value={app.email} />
              <Row icon={FiExternalLink} label="Facebook" value={app.facebookUrl} link />
              {app.instagramUrl && (
                <Row icon={FiExternalLink} label="Instagram" value={app.instagramUrl} link />
              )}
            </Group>

            <Group title="Academic">
              <Row icon={FiMapPin} label="College" value={app.medicalCollegeName} />
              <Row icon={FiUser} label="Batch" value={`${app.batch} · ${app.academicYear}`} />
              <Row icon={FiMapPin} label="City" value={app.city} />
              {app.idCardUrl && (
                <Row icon={FiFileText} label="ID card" value={app.idCardUrl} link linkText="View" />
              )}
            </Group>

            <Group title="Reach">
              <Row icon={FiUser} label="Can reach" value={`${app.reach} students`} />
              <Row
                icon={FiTag}
                label="Channels"
                value={(app.promoteChannels || []).join(', ').replace(/-/g, ' ') || '—'}
              />
              {app.promoteChannelOther && (
                <Row icon={FiTag} label="Other" value={app.promoteChannelOther} />
              )}
              <Row icon={FiUser} label="Group admin" value={app.isGroupAdmin ? 'Yes' : 'No'} />
            </Group>

            <Group title="Experience & ideas">
              <Row
                icon={FiUser}
                label="Prior experience"
                value={app.hasPriorExperience ? 'Yes' : 'No'}
              />
              {app.experienceNote && <Para text={app.experienceNote} />}
              <Row
                icon={FiUser}
                label="Will share our content"
                value={app.comfortableSharingContent ? 'Yes' : 'No'}
              />
              {app.suggestions && <Para text={app.suggestions} />}
            </Group>

            <Group title="Admin note">
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Only your team sees this."
                className="w-full rounded-xl border border-dash-line bg-dash-card p-3 text-sm text-dash-ink2 outline-none focus:border-brand"
              />
              <button
                onClick={persistNote}
                disabled={savingNote}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2 text-xs font-medium text-dash-ink3 hover:bg-dash-soft disabled:opacity-50"
              >
                <FiEdit3 /> {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </Group>

            <div className="flex flex-wrap gap-2 border-t border-dash-line pt-4">
              {app.status !== 'approved' && (
                <button
                  disabled={busy}
                  onClick={() => onReview('approved')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FiCheckCircle /> Approve — create coupon &amp; login
                </button>
              )}
              {app.status === 'approved' && (
                <button
                  disabled={busy}
                  onClick={() => onReview('suspended')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  <FiPauseCircle /> Suspend
                </button>
              )}
              {app.status !== 'rejected' && (
                <button
                  disabled={busy}
                  onClick={() => onReview('rejected')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <FiXCircle /> Reject
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Group = ({ title, children }) => (
  <section>
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-dash-mute2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

const Row = ({ icon: Icon, label, value, link, linkText }) => (
  <div className="flex items-start gap-2.5 text-sm">
    <Icon className="mt-0.5 shrink-0 text-dash-mute2" />
    <span className="w-32 shrink-0 text-dash-mute2">{label}</span>
    {link ? (
      <a
        href={/^https?:\/\//i.test(value) ? value : `https://${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 break-all text-brand hover:underline"
      >
        {linkText || value}
      </a>
    ) : (
      <span className="min-w-0 break-words text-dash-ink2">{value}</span>
    )}
  </div>
);

const Para = ({ text }) => (
  <p className="whitespace-pre-wrap rounded-xl bg-dash-soft/60 p-3 text-sm leading-relaxed text-dash-ink3">
    {text}
  </p>
);

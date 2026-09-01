'use client';

/**
 * One affiliate, in full.
 *
 * Three tabs rather than one long scroll, because three different questions get
 * asked of this panel and mixing them makes all three slower:
 *
 *   প্রোফাইল — who they are. Everything the application collected, plus what an
 *              admin has since edited, plus their login and their ID card.
 *   বিক্রি   — the orders behind the earnings figure. This is what gets opened
 *              when a number is questioned or a payment is being prepared, so
 *              the orders that were NOT counted are shown too: an unexplained
 *              gap between "12 orders used my code" and "9 orders earned me
 *              money" is the complaint this prevents.
 *   কার্যক্রম — the record's own history: applied, reviewed, by whom, and the
 *              admin note.
 *
 * Fetched fresh rather than reusing the table row — the row carries what the
 * table needs, and the whole profile with its order history is a lot to ship
 * for every row of a list that is mostly skimmed.
 */

import { useEffect, useState } from 'react';
import {
  FiX, FiLoader, FiEdit2, FiEdit3, FiTrash2, FiCheckCircle, FiXCircle, FiPauseCircle,
  FiPhone, FiMail, FiMapPin, FiUser, FiTag, FiExternalLink, FiFileText, FiCopy,
  FiShoppingBag, FiAlertTriangle, FiClock, FiLogIn, FiUsers, FiAward, FiHash,
} from 'react-icons/fi';
import { getApplication, saveNote, formatTk, formatDate, STATUS_TONE, STATUS_LABEL } from './ambassadorApi';

const TABS = [
  { id: 'profile', label: 'প্রোফাইল', icon: FiUser },
  { id: 'sales', label: 'বিক্রি', icon: FiShoppingBag },
  { id: 'activity', label: 'কার্যক্রম', icon: FiClock },
];

const YEAR_BN = {
  '1st Year': '১ম বর্ষ', '2nd Year': '২য় বর্ষ', '3rd Year': '৩য় বর্ষ',
  '4th Year': '৪র্থ বর্ষ', '5th Year': '৫ম বর্ষ', Intern: 'ইন্টার্ন',
};

const CHANNEL_BN = {
  'facebook-profile': 'ফেসবুক প্রোফাইল',
  'facebook-groups': 'ফেসবুক গ্রুপ',
  'batch-groups': 'ব্যাচ গ্রুপ',
  'messenger-groups': 'মেসেঞ্জার গ্রুপ',
  'whatsapp-groups': 'হোয়াটসঅ্যাপ গ্রুপ',
  instagram: 'ইনস্টাগ্রাম',
  classmates: 'সহপাঠী',
  'campus-community': 'ক্যাম্পাস কমিউনিটি',
  other: 'অন্যান্য',
};

const yesNo = (v) => (v ? 'হ্যাঁ' : 'না');

export default function AffiliateDetail({ id, onClose, onReview, onEdit, onDelete, busy }) {
  const [app, setApp] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('profile');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setApp(null);
    setErr('');
    getApplication(id)
      .then((d) => { if (alive) { setApp(d); setNote(d.adminNote || ''); } })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [id]);

  const persistNote = async () => {
    setSavingNote(true);
    try {
      await saveNote(id, note);
      setApp((a) => ({ ...a, adminNote: note }));
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingNote(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(app.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* a browser that refuses the clipboard is not worth an error dialog */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-dash-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <header className="shrink-0 border-b border-dash-line px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-bold text-brand">{app?.applicationId || '…'}</p>
              <h2 className="truncate text-lg font-bold text-dash-ink2">
                {app?.fullName || 'লোড হচ্ছে…'}
              </h2>
              {app && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusPill status={app.status} />
                  <Badge tone="slate" icon={app.source === 'manual' ? FiUsers : FiAward}>
                    {app.source === 'manual' ? 'অ্যাডমিন যোগ করেছে' : 'নিজে আবেদন করেছে'}
                  </Badge>
                  {app.couponCode && (
                    <Badge tone={app.coupon?.isActive ? 'emerald' : 'rose'} icon={FiTag}>
                      কোড {app.coupon?.isActive ? 'চালু' : 'বন্ধ'}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {app && (
                <>
                  <IconBtn onClick={onEdit} title="তথ্য সম্পাদনা"><FiEdit2 /></IconBtn>
                  <IconBtn onClick={() => onDelete(app)} title="মুছে ফেলুন" danger><FiTrash2 /></IconBtn>
                </>
              )}
              <IconBtn onClick={onClose} title="বন্ধ"><FiX /></IconBtn>
            </div>
          </div>

          <nav className="-mb-px mt-4 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-dash-mute hover:text-dash-ink3'
                }`}
              >
                <t.icon size={14} /> {t.label}
                {t.id === 'sales' && app?.stats?.orders ? (
                  <span className="rounded-full bg-dash-soft px-1.5 text-[11px] font-bold text-dash-ink3">
                    {app.stats.orders}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </header>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {err && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <FiAlertTriangle className="mt-0.5 shrink-0" /> {err}
            </p>
          )}
          {!app && !err && (
            <p className="flex items-center gap-2 py-8 text-dash-mute2">
              <FiLoader className="animate-spin" /> লোড হচ্ছে…
            </p>
          )}

          {app && tab === 'profile' && (
            <Profile app={app} copyCode={copyCode} copied={copied} />
          )}
          {app && tab === 'sales' && <Sales app={app} />}
          {app && tab === 'activity' && (
            <Activity
              app={app}
              note={note}
              setNote={setNote}
              onSave={persistNote}
              saving={savingNote}
            />
          )}
        </div>

        {/* ── The status buttons, always reachable ── */}
        {app && (
          <footer className="shrink-0 border-t border-dash-line bg-dash-card px-5 py-3.5">
            <div className="flex flex-wrap gap-2">
              {app.status !== 'approved' && (
                <button
                  disabled={busy}
                  onClick={() => onReview('approved')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FiCheckCircle /> চালু করুন — কোড ও লগইন তৈরি হবে
                </button>
              )}
              {app.status === 'approved' && (
                <button
                  disabled={busy}
                  onClick={() => onReview('suspended')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  <FiPauseCircle /> স্থগিত করুন
                </button>
              )}
              {app.source !== 'manual' && app.status !== 'rejected' && app.status !== 'approved' && (
                <button
                  disabled={busy}
                  onClick={() => onReview('rejected')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <FiXCircle /> বাতিল করুন
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

// ── Profile ─────────────────────────────────────────────────

function Profile({ app, copyCode, copied }) {
  return (
    <div className="space-y-5">
      {app.couponCode && (
        <div className="rounded-2xl border border-dash-line bg-dash-soft/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-xl font-bold tracking-wide text-dash-ink2">
                {app.couponCode}
              </p>
              <p className="mt-0.5 text-xs text-dash-mute2">
                ক্রেতা পায় {formatTk(app.coupon?.discountValue)} ছাড় · সে পায়{' '}
                {formatTk(app.coupon?.payoutPerSale)} প্রতি বিক্রিতে
              </p>
            </div>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-xs font-medium text-dash-ink3 hover:bg-dash-soft"
            >
              <FiCopy size={13} /> {copied ? 'কপি হয়েছে' : 'কোড কপি'}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-dash-card p-3 text-center">
            <Mini label="অর্ডার" value={app.stats?.orders || 0} />
            <Mini label="বিক্রি" value={formatTk(app.stats?.sales)} />
            <Mini label="কমিশন" value={formatTk(app.stats?.commission)} />
          </div>
        </div>
      )}

      <Group title="যোগাযোগ">
        <Row icon={FiPhone} label="ফোন" value={app.phone} copy />
        <Row icon={FiPhone} label="হোয়াটসঅ্যাপ" value={app.whatsapp || '—'} copy={!!app.whatsapp} />
        <Row icon={FiMail} label="ইমেইল" value={app.email} copy />
        {app.facebookUrl && <Row icon={FiExternalLink} label="ফেসবুক" value={app.facebookUrl} link />}
        {app.instagramUrl && <Row icon={FiExternalLink} label="ইনস্টাগ্রাম" value={app.instagramUrl} link />}
      </Group>

      <Group title="কলেজ ও পড়াশোনা">
        <Row icon={FiMapPin} label="কলেজ" value={app.medicalCollegeName || '—'} />
        {app.medicalCollege?.division && (
          <Row
            icon={FiMapPin}
            label="বিভাগ / জেলা"
            value={`${app.medicalCollege.division} · ${app.medicalCollege.district}`}
          />
        )}
        <Row icon={FiHash} label="সংক্ষেপ" value={app.collegeAbbreviation || '—'} />
        <Row icon={FiUser} label="ব্যাচ" value={app.batch || '—'} />
        <Row icon={FiUser} label="বর্ষ" value={YEAR_BN[app.academicYear] || app.academicYear || '—'} />
        <Row icon={FiMapPin} label="শহর" value={app.city || '—'} />
      </Group>

      {app.idCardUrl && (
        <Group title="পরিচয়পত্র">
          {/* Shown, not just linked: verifying a student id means looking at it,
              and a link means leaving the panel and losing your place. */}
          <a href={app.idCardUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={app.idCardUrl}
              alt="ID card"
              className="max-h-72 w-full rounded-xl border border-dash-line object-contain bg-dash-soft/40"
            />
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <FiExternalLink size={12} /> বড় করে দেখুন
            </span>
          </a>
        </Group>
      )}

      <Group title="প্রচার ও রিচ">
        <Row icon={FiUsers} label="পৌঁছাতে পারে" value={app.reach ? `${app.reach} জন` : '—'} />
        <Row
          icon={FiTag}
          label="কোথায় প্রচার করে"
          value={(app.promoteChannels || []).map((c) => CHANNEL_BN[c] || c).join(', ') || '—'}
        />
        {app.promoteChannelOther && <Row icon={FiTag} label="অন্যান্য" value={app.promoteChannelOther} />}
        <Row icon={FiUser} label="গ্রুপ অ্যাডমিন" value={yesNo(app.isGroupAdmin)} />
        <Row icon={FiUser} label="আগের অভিজ্ঞতা" value={yesNo(app.hasPriorExperience)} />
        {app.experienceNote && <Para text={app.experienceNote} />}
        <Row icon={FiUser} label="কন্টেন্ট শেয়ার করতে রাজি" value={yesNo(app.comfortableSharingContent)} />
        {app.suggestions && <Para text={app.suggestions} />}
      </Group>

      <Group title="লগইন">
        {app.user ? (
          <>
            <Row icon={FiLogIn} label="আইডি" value={app.user.email} copy />
            <Row icon={FiUser} label="রোল" value={app.user.role} />
            <Row
              icon={FiCheckCircle}
              label="অবস্থা"
              value={app.user.status === 'active' ? 'সক্রিয়' : app.user.status}
            />
            <p className="text-[11px] text-dash-mute2">
              প্রথম পাসওয়ার্ড তার ফোন নম্বর ({app.phone}) — সে নিজে বদলে নিতে পারে। অ্যাডমিন
              পাসওয়ার্ড দেখতে পায় না, এটাই নিরাপদ।
            </p>
          </>
        ) : (
          <p className="text-sm text-dash-mute2">
            এখনো লগইন তৈরি হয়নি — চালু করলে তৈরি হবে।
          </p>
        )}
      </Group>
    </div>
  );
}

// ── Sales ───────────────────────────────────────────────────

function Sales({ app }) {
  const orders = app.orders || [];
  const skipped = app.notCounted || [];

  if (!app.couponCode) {
    return <Empty icon={FiTag} title="কোড নেই" text="চালু করলে কোড তৈরি হবে, তারপর বিক্রি এখানে আসবে।" />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-dash-line bg-dash-soft/60 p-4 text-center">
        <Mini label="গোনা অর্ডার" value={app.stats?.orders || 0} />
        <Mini label="মোট বিক্রি" value={formatTk(app.stats?.sales)} />
        <Mini label="প্রাপ্য কমিশন" value={formatTk(app.stats?.commission)} />
      </div>

      {orders.length === 0 ? (
        <Empty
          icon={FiShoppingBag}
          title="এখনো কোনো বিক্রি হয়নি"
          text="তার কোডে কেউ অর্ডার করলে এখানে দেখা যাবে।"
        />
      ) : (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-dash-mute2">
            যেসব অর্ডার গোনা হয়েছে ({orders.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-dash-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-dash-line bg-dash-soft/50 text-left text-[11px] uppercase tracking-wide text-dash-mute2">
                  <th className="px-3 py-2 font-semibold">অর্ডার</th>
                  <th className="px-3 py-2 font-semibold">ক্রেতা</th>
                  <th className="px-3 py-2 font-semibold">তারিখ</th>
                  <th className="px-3 py-2 text-right font-semibold">মোট</th>
                  <th className="px-3 py-2 text-right font-semibold">কমিশন</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-dash-line-soft last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs font-semibold text-dash-ink2">
                        {o.orderNumber}
                      </span>
                      <span className="block text-[11px] capitalize text-dash-mute2">{o.status}</span>
                    </td>
                    <td className="px-3 py-2 text-dash-ink3">
                      {o.shippingAddress?.name || '—'}
                      {o.shippingAddress?.phone && (
                        <span className="block font-mono text-[11px] text-dash-mute2">
                          {o.shippingAddress.phone}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-dash-mute2">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-dash-ink3">
                      {formatTk(o.total)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-dash-ink2">
                      {formatTk(o.couponPayout)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-dash-mute2">
            প্রতিটি অর্ডারে কমিশনটা তখনকার হার ধরেই বসানো — পরে হার বদলালেও পুরোনো অর্ডারের হিসাব
            বদলায় না।
          </p>
        </section>
      )}

      {/* The gap between "used my code" and "earned me money", explained rather
          than left for the shop to discover as a discrepancy. */}
      {skipped.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-dash-mute2">
            <FiAlertTriangle className="text-amber-500" /> গোনা হয়নি ({skipped.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-dashed border-dash-line">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {skipped.map((o) => (
                  <tr key={o._id} className="border-b border-dash-line-soft last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-dash-mute">{o.orderNumber}</td>
                    <td className="px-3 py-2 text-dash-mute2">{o.shippingAddress?.name || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-dash-mute2">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-dash-mute2">
                      {formatTk(o.total)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium capitalize text-amber-700">
                        {o.status === 'cancelled' ? 'বাতিল' : 'পেমেন্ট হয়নি'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-dash-mute2">
            বাতিল বা পেমেন্ট না হওয়া অর্ডারে কমিশন হয় না — টাকা আসেনি বলে। পেমেন্ট হলে নিজে থেকেই
            উপরের হিসাবে চলে আসবে।
          </p>
        </section>
      )}
    </div>
  );
}

// ── Activity ────────────────────────────────────────────────

function Activity({ app, note, setNote, onSave, saving }) {
  const events = [
    {
      when: app.createdAt,
      title: app.source === 'manual' ? 'অ্যাডমিন যোগ করেছে' : 'আবেদন জমা দিয়েছে',
      body: app.applicationId,
      icon: app.source === 'manual' ? FiUsers : FiFileText,
    },
    app.agreedAt && {
      when: app.agreedAt,
      title: 'শর্তে সম্মতি দিয়েছে',
      body: 'ছয়টি শর্তেই টিক দেওয়া হয়েছে',
      icon: FiCheckCircle,
    },
    app.reviewedAt && {
      when: app.reviewedAt,
      title: `রিভিউ — ${STATUS_LABEL[app.status] || app.status}`,
      body: app.reviewedBy
        ? `${app.reviewedBy.firstName || ''} ${app.reviewedBy.lastName || ''}`.trim() ||
          app.reviewedBy.email
        : '',
      icon: FiCheckCircle,
    },
    app.couponCode && {
      when: app.reviewedAt || app.updatedAt,
      title: `কুপন তৈরি — ${app.couponCode}`,
      body: `${formatTk(app.coupon?.discountValue)} ছাড় · ${formatTk(app.coupon?.payoutPerSale)} কমিশন`,
      icon: FiTag,
    },
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <Group title="ইতিহাস">
        <ol className="space-y-3">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <e.icon size={13} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-dash-ink2">{e.title}</p>
                {e.body && <p className="text-[11px] text-dash-mute2">{e.body}</p>}
                <p className="text-[11px] text-dash-mute2">{formatDate(e.when)}</p>
              </div>
            </li>
          ))}
        </ol>
      </Group>

      <Group title="অ্যাডমিন নোট">
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="শুধু আপনার টিম দেখবে — সে দেখতে পাবে না।"
          className="w-full rounded-xl border border-dash-line bg-dash-card p-3 text-sm text-dash-ink2 outline-none focus:border-brand"
        />
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-2 text-xs font-medium text-dash-ink3 hover:bg-dash-soft disabled:opacity-50"
        >
          <FiEdit3 /> {saving ? 'সেভ হচ্ছে…' : 'নোট সেভ করুন'}
        </button>
      </Group>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────

const StatusPill = ({ status }) => (
  <span
    className={`inline-block shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      STATUS_TONE[status] || STATUS_TONE.pending
    }`}
  >
    {STATUS_LABEL[status] || status}
  </span>
);

const TONES = {
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
};

const Badge = ({ tone = 'slate', icon: Icon, children }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${TONES[tone]}`}>
    {Icon && <Icon size={11} />} {children}
  </span>
);

const IconBtn = ({ onClick, title, danger, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`rounded-lg p-2 transition-colors ${
      danger ? 'text-rose-500 hover:bg-rose-50' : 'text-dash-mute2 hover:bg-dash-soft'
    }`}
  >
    {children}
  </button>
);

const Group = ({ title, children }) => (
  <section>
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-dash-mute2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

const Mini = ({ label, value }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-dash-mute2">{label}</p>
    <p className="text-sm font-semibold tabular-nums text-dash-ink2">{value}</p>
  </div>
);

const Row = ({ icon: Icon, label, value, link, copy }) => (
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
        {value}
      </a>
    ) : (
      <span className="min-w-0 break-words text-dash-ink2">{value}</span>
    )}
    {copy && (
      <button
        onClick={() => navigator.clipboard?.writeText(value)}
        className="ml-auto shrink-0 text-dash-mute2 hover:text-brand"
        title="কপি"
      >
        <FiCopy size={12} />
      </button>
    )}
  </div>
);

const Para = ({ text }) => (
  <p className="whitespace-pre-wrap rounded-xl bg-dash-soft/60 p-3 text-sm leading-relaxed text-dash-ink3">
    {text}
  </p>
);

const Empty = ({ icon: Icon, title, text }) => (
  <div className="rounded-2xl border border-dashed border-dash-line p-10 text-center">
    <Icon className="mx-auto mb-3 text-3xl text-dash-mute2" />
    <p className="font-medium text-dash-ink3">{title}</p>
    <p className="mt-1 text-sm text-dash-mute2">{text}</p>
  </div>
);

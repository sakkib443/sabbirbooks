'use client';

/**
 * Courses → Course Orders (25 Oct 2026). Every course bought on the course
 * checkout lands here. A Send Money order waits as "অপেক্ষমাণ": match the
 * TrxID and the number against the shop's wallet, then Approve — the course
 * opens for the student at once. Online (gateway) payments approve themselves;
 * free courses too. No totals here: money sums are the Super Admin's
 * (see roles-and-permissions).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheck, FiX, FiLoader, FiRefreshCw, FiSearch, FiCopy } from 'react-icons/fi';
import { useToast } from '@/components/shared/Toast';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { Badge, ORDER_STATUS, PAY_METHOD, btnGhost, call, input, taka } from '@/components/admin/courses/courseAdmin';

const TABS = [
  { key: 'pending', label: 'অপেক্ষমাণ' },
  { key: 'active', label: 'অনুমোদিত' },
  { key: 'cancelled', label: 'বাতিল' },
  { key: '', label: 'সব' },
];

const when = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
const nameOf = (s) => (s ? `${s.firstName || s.name || ''} ${s.lastName || ''}`.trim() || s.email : 'মুছে ফেলা অ্যাকাউন্ট');

export default function CourseOrdersPage() {
  const { showToast, toastNode } = useToast();
  const { confirm, confirmNode } = useConfirm();
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    try {
      const [list, ...totals] = await Promise.all([
        call(`/enrollments/all?limit=200${tab ? `&status=${tab}` : ''}`),
        ...TABS.map((t) => call(`/enrollments/all?limit=1${t.key ? `&status=${t.key}` : ''}`).catch(() => null)),
      ]);
      setRows(list.data || []);
      setCounts(Object.fromEntries(TABS.map((t, i) => [t.key, totals[i]?.meta?.total ?? 0])));
    } catch (e) {
      showToast('error', e.message);
      setRows([]);
    }
  }, [tab, showToast]);

  useEffect(() => {
    setTimeout(load, 0);
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!rows || !s) return rows;
    return rows.filter((r) =>
      [nameOf(r.studentId), r.studentId?.email, r.studentId?.phoneNumber, r.courseId?.title, r.payment?.transactionId, r.payment?.gatewayData?.senderNumber]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, q]);

  const approve = async (r) => {
    setBusy(r._id);
    try {
      await call(`/enrollments/approve/${r._id}`, 'PATCH');
      showToast('success', 'অনুমোদন হয়েছে — কোর্সটা ছাত্রের জন্য খুলে গেছে');
      await load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusy('');
    }
  };

  const reject = async (r) => {
    const ok = await confirm({
      title: 'অর্ডারটা বাতিল করবেন?',
      message: `${nameOf(r.studentId)} — ${r.courseId?.title || ''}. বাতিল করলে কোর্সটা খুলবে না।`,
      confirmText: 'বাতিল করুন',
      cancelText: 'না',
    });
    if (!ok) return;
    setBusy(r._id);
    try {
      await call(`/enrollments/cancel/${r._id}`, 'PATCH');
      showToast('success', 'বাতিল হয়েছে');
      await load();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setBusy('');
    }
  };

  const copy = (t) => navigator.clipboard?.writeText(t).then(() => showToast('success', 'কপি হয়েছে')).catch(() => {});

  return (
    <div className="space-y-5">
      {toastNode}
      {confirmNode}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dash-ink2">Course Orders</h1>
          <p className="text-sm text-dash-mute2">Send Money-র অর্ডার TrxID মিলিয়ে Approve করুন — সাথে সাথে কোর্স খুলে যাবে।</p>
        </div>
        <button type="button" onClick={load} className={btnGhost}><FiRefreshCw /> রিফ্রেশ</button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-dash-soft p-1">
          {TABS.map((t) => (
            <button
              key={t.key || 'all'}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${tab === t.key ? 'bg-dash-card text-brand shadow-sm' : 'text-dash-mute2 hover:text-dash-ink3'}`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-1.5 text-xs ${t.key === 'pending' && counts.pending ? 'bg-amber-500 text-white' : 'bg-dash-line text-dash-mute'}`}>{counts[t.key] ?? '…'}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dash-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম, ফোন, TrxID…" className={`${input} pl-9`} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-dash-line bg-dash-card">
        {shown === null ? (
          <div className="flex items-center justify-center gap-2 p-10 text-dash-mute2"><FiLoader className="animate-spin" /> লোড হচ্ছে…</div>
        ) : shown.length === 0 ? (
          <div className="p-10 text-center text-dash-mute2">{tab === 'pending' ? 'অনুমোদনের অপেক্ষায় কোনো অর্ডার নেই 🎉' : 'কিছু নেই'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-dash-soft text-left text-xs uppercase tracking-wide text-dash-mute2">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">ছাত্র</th>
                  <th className="px-4 py-3">কোর্স</th>
                  <th className="px-4 py-3">পেমেন্ট</th>
                  <th className="px-4 py-3">অবস্থা</th>
                  <th className="px-4 py-3 text-right">কাজ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dash-line">
                {shown.map((r, i) => {
                  const p = r.payment || {};
                  const g = p.gatewayData || {};
                  const s = r.studentId;
                  return (
                    <tr key={r._id} className="align-top hover:bg-dash-soft/50">
                      <td className="px-4 py-3 text-dash-faint">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-dash-ink2">{nameOf(s)}</p>
                        {s?.phoneNumber && <p className="font-mono text-[15px] text-dash-ink3">{s.phoneNumber}</p>}
                        {s?.email && <p className="text-xs text-dash-mute2">{s.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-dash-ink3">{r.courseId?.title || '—'}</p>
                        <p className="text-xs text-dash-mute2">{when(r.createdAt || r.enrolledAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-dash-ink2">{p.method === 'free' ? 'ফ্রি' : taka(p.amount)}</p>
                        <p className="text-xs text-dash-mute2">{PAY_METHOD[p.method] || p.method}{g.paymentType ? ` · ${g.paymentType}` : ''}</p>
                        {g.senderNumber && <p className="text-xs text-dash-mute">থেকে: <span className="font-mono">{g.senderNumber}</span></p>}
                        {p.transactionId && p.method === 'manual' && (
                          <button type="button" onClick={() => copy(p.transactionId)} className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-semibold text-brand">
                            {p.transactionId} <FiCopy size={11} />
                          </button>
                        )}
                        {r.couponCode && <p className="text-xs text-dash-mute2">কুপন: {r.couponCode}</p>}
                      </td>
                      <td className="px-4 py-3"><Badge map={ORDER_STATUS} value={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {r.status === 'pending' && (
                            <button type="button" disabled={busy === r._id} onClick={() => approve(r)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                              {busy === r._id ? <FiLoader className="animate-spin" /> : <FiCheck />} Approve
                            </button>
                          )}
                          {(r.status === 'pending' || r.status === 'active') && (
                            <button type="button" disabled={busy === r._id} onClick={() => reject(r)} className={btnGhost} title="বাতিল">
                              <FiX /> {r.status === 'pending' ? 'Reject' : 'বাতিল'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

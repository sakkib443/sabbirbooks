'use client';

/**
 * Pathao payouts, by hand (11 Nov 2026) — on the Payouts page.
 *
 * Steadfast's payouts are copied from its API. Pathao has no payouts API: its
 * webhook says "paid" per parcel when it is set up, and otherwise the shop
 * ticks the parcels a Pathao payment covered (Pathao panel → Payments) and
 * marks them here. Delivered (or partly delivered) Pathao parcels not marked
 * paid yet are listed; marking moves their money from "owes you" to "paid".
 * Super Admin only (the API refuses anyone else).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiLoader } from 'react-icons/fi';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { listConsignments, markPathaoPaid, spacedPhone, tk } from './courierApi';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' }) : '');
const net = (r) => (Number(r.courier?.collectedAmount) || 0) - (Number(r.courier?.deliveryCharge) || 0);

export default function PathaoPayouts({ onMarked }) {
  const { confirm, confirmNode } = useConfirm();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const q = { provider: 'pathao', settled: 'no', limit: 500 };
      const [a, b] = await Promise.all([listConsignments({ ...q, group: 'delivered' }), listConsignments({ ...q, group: 'partial' })]);
      setRows([...(a?.rows || []), ...(b?.rows || [])].sort((x, y) => new Date(x.courier?.sentAt) - new Date(y.courier?.sentAt)));
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const picked = useMemo(() => (rows || []).filter((r) => selected.has(r._id)), [rows, selected]);
  const pickedNet = picked.reduce((a, r) => a + net(r), 0);
  const allOn = rows?.length > 0 && rows.every((r) => selected.has(r._id));
  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const mark = async () => {
    if (!picked.length) return;
    const ok = await confirm({
      title: `${picked.length}টি পার্সেলের টাকা Pathao দিয়েছে?`,
      message: `মোট ${tk(pickedNet)} (Pathao-র চার্জ বাদে) "পেয়েছি" হিসেবে চিহ্নিত হবে।${reference ? ` রেফারেন্স: ${reference}` : ''}`,
      confirmText: 'হ্যাঁ, পেয়েছি',
      danger: false,
    });
    if (!ok) return;
    setBusy(true);
    setNote('');
    try {
      const r = await markPathaoPaid(picked.map((p) => p._id), reference.trim());
      setNote(`${r.marked}টি পার্সেল "পেয়েছি" হলো${r.skipped ? `, ${r.skipped}টি আগেই চিহ্নিত/বাদ` : ''}।`);
      setReference('');
      await load();
      onMarked?.();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="pathao-payouts" className="scroll-mt-24 rounded-2xl border border-dash-line/60 bg-dash-card shadow-sm">
      {confirmNode}
      <div className="border-b border-dash-line px-5 py-4">
        <h2 className="text-base font-bold text-dash-ink2 outfit">Pathao payouts</h2>
        <p className="mt-1 text-xs leading-relaxed text-dash-mute2">
          Pathao টাকা পাঠালে (Pathao প্যানেল → Payments-এ যে পার্সেলগুলোর টাকা দিয়েছে) সেগুলো নিচে টিক দিয়ে &ldquo;পেয়েছি&rdquo; চাপুন।
          Pathao-তে webhook বসানো থাকলে এটা নিজে নিজেই হয়।
        </p>
      </div>

      {error ? (
        <p className="p-5 text-sm text-red-600">{error}</p>
      ) : rows === null ? (
        <div className="flex justify-center p-8"><FiLoader className="animate-spin text-brand" size={20} /></div>
      ) : rows.length === 0 ? (
        <p className="flex items-center justify-center gap-2 p-8 text-sm text-dash-mute">
          <FiCheckCircle className="text-emerald-500" /> Pathao-র কাছে কোনো টাকা বাকি নেই।
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-dash-line px-5 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-dash-ink3">
              <input type="checkbox" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map((r) => r._id)))} className="h-4 w-4 rounded" />
              {selected.size ? `${selected.size}টি · ${tk(pickedNet)}` : `সব (${rows.length})`}
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Pathao-র payment/invoice নম্বর (ঐচ্ছিক)"
              className="ml-auto w-full rounded-lg border border-dash-line bg-dash-card px-3 py-2 text-xs text-dash-ink3 sm:w-64"
            />
            <button
              onClick={mark}
              disabled={!selected.size || busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
            >
              {busy ? <FiLoader className="animate-spin" /> : <FiCheckCircle />} পেয়েছি
            </button>
          </div>
          {note && <p className="px-5 pt-3 text-xs font-semibold text-emerald-700">{note}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-dash-line text-left text-[11px] uppercase tracking-wide text-dash-mute2">
                  <th className="w-10 px-5 py-2" />
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2 text-right">Collected</th>
                  <th className="px-2 py-2 text-right">Pathao fee</th>
                  <th className="px-2 py-2 text-right">You get</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} onClick={() => toggle(r._id)} className={`cursor-pointer border-b border-dash-line/60 ${selected.has(r._id) ? 'bg-emerald-50/60' : 'hover:bg-dash-soft/50'}`}>
                    <td className="px-5 py-2.5"><input type="checkbox" readOnly checked={selected.has(r._id)} className="h-4 w-4 rounded" /></td>
                    <td className="px-2 py-2.5">
                      <div className="font-mono text-xs font-semibold text-dash-ink2">#{r.orderSeq ?? '—'} · {r.courier?.consignmentId}</div>
                      <div className="text-[11px] text-dash-mute2">Sent {fmt(r.courier?.sentAt)}{r.courierGroup === 'partial' ? ' · partly delivered' : ''}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="text-dash-ink2">{r.shippingAddress?.name}</div>
                      <div className="font-mono text-xs text-dash-mute2">{spacedPhone(r.shippingAddress?.phone)}</div>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{tk(r.courier?.collectedAmount)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-dash-mute">{r.courier?.deliveryCharge == null ? '—' : tk(r.courier.deliveryCharge)}</td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-emerald-700">{tk(net(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

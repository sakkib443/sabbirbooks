'use client';

/**
 * Which item type Pathao parcels are sent as (15 Nov 2026) — on the Payouts page.
 *
 * Pathao bills by it. Pathao told the shop that "Parcel" charges ৳120 and that
 * books have their own, lower rate — but its public docs list only
 * 1 = Document and 2 = Parcel, so the book's number is not known here. This
 * asks Pathao's own price list what one book (0.5 kg) would cost under each
 * number, to Dhaka and to Khulna, and the Super Admin picks the one Pathao
 * names as the book rate. Asking books nothing; the choice is checked with
 * Pathao before it is saved, and applies to every Pathao parcel sent after it.
 */
import { useState } from 'react';
import { FiCheckCircle, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { useConfirm } from '@/components/shared/ConfirmModal';
import { pathaoItemTypes, setPathaoItemType, tk } from './courierApi';

const nameOf = (r) => r.name || `Type ${r.itemType}`;

export default function PathaoItemType() {
  const { confirm, confirmNode } = useConfirm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const check = async () => {
    setLoading(true);
    setError('');
    setNote('');
    try {
      setData(await pathaoItemTypes());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const choose = async (r) => {
    const ok = await confirm({
      title: `এখন থেকে Pathao-তে "${nameOf(r)}" (item type ${r.itemType}) হিসেবে পাঠাবেন?`,
      message: `Pathao-র হিসাবে এক বইয়ের চার্জ — ঢাকা ${tk(r.dhaka.price)}, খুলনা ${tk(r.khulna.price)}। এর পরে পাঠানো সব Pathao পার্সেলে এটা যাবে; আগে পাঠানোগুলো বদলাবে না।`,
      confirmText: 'হ্যাঁ, এটাই',
      danger: false,
    });
    if (!ok) return;
    setSaving(r.itemType);
    setError('');
    try {
      const saved = await setPathaoItemType(r.itemType);
      setData((d) => (d ? { ...d, current: saved.current } : d));
      setNote(`সেভ হয়েছে — এখন থেকে Pathao পার্সেল যাবে item type ${saved.current} হিসেবে।`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const cell = (p) =>
    p?.ok ? (
      <span className="font-semibold tabular-nums text-dash-ink2">{tk(p.price)}</span>
    ) : (
      <span className="text-xs text-dash-mute2" title={p?.error || ''}>নেয় না</span>
    );

  return (
    <section id="pathao-item-type" className="scroll-mt-24 rounded-2xl border border-dash-line/60 bg-dash-card shadow-sm">
      {confirmNode}
      <div className="flex flex-col gap-3 border-b border-dash-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-dash-ink2 outfit">Pathao item type</h2>
          <p className="mt-1 text-xs leading-relaxed text-dash-mute2">
            Pathao ডেলিভারি চার্জ নেয় item type দেখে — &ldquo;Parcel&rdquo; হলে বেশি, বইয়ের রেট কম।
            নিচের বোতাম চাপলে Pathao নিজে বলে দেবে কোন টাইপে এক বইয়ের (০.৫ কেজি) চার্জ কত। Pathao যেটাকে বই বলে, সেটা বেছে নিন।
            {data ? (
              <> এখন পাঠানো হচ্ছে: <b className="text-dash-ink2">item type {data.current}</b>.</>
            ) : null}
          </p>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover disabled:opacity-50"
        >
          {loading ? <FiLoader className="animate-spin" /> : <FiRefreshCw />} Pathao-র দাম দেখুন
        </button>
      </div>

      {error && <p className="px-5 pt-3 text-xs font-semibold text-red-600">{error}</p>}
      {note && <p className="px-5 pt-3 text-xs font-semibold text-emerald-700">{note}</p>}

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-dash-line text-left text-[11px] uppercase tracking-wide text-dash-mute2">
                <th className="px-5 py-2">Item type</th>
                <th className="px-2 py-2 text-right">ঢাকা</th>
                <th className="px-2 py-2 text-right">খুলনা</th>
                <th className="px-5 py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const usable = r.dhaka?.ok && r.khulna?.ok;
                const current = r.itemType === data.current;
                return (
                  <tr key={r.itemType} className={`border-b border-dash-line/60 ${current ? 'bg-emerald-50/60' : ''} ${usable ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-2.5">
                      <span className="font-mono text-xs font-semibold text-dash-ink2">{r.itemType}</span>{' '}
                      <span className="text-dash-ink3">{nameOf(r)}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right">{cell(r.dhaka)}</td>
                    <td className="px-2 py-2.5 text-right">{cell(r.khulna)}</td>
                    <td className="px-5 py-2.5 text-right">
                      {current ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <FiCheckCircle /> এখন এটা
                        </span>
                      ) : usable ? (
                        <button
                          onClick={() => choose(r)}
                          disabled={saving !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dash-line px-3 py-1.5 text-xs font-semibold text-dash-ink3 hover:border-brand/40 hover:text-brand disabled:opacity-40"
                        >
                          {saving === r.itemType && <FiLoader className="animate-spin" />} এটা বেছে নিন
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-5 py-3 text-[11px] leading-relaxed text-dash-mute2">
            &ldquo;নেয় না&rdquo; = Pathao এই নম্বরটা চেনে না। দামগুলো Pathao-র নিজের price list থেকে, কোনো পার্সেল বুক হয়নি।
          </p>
        </div>
      )}
    </section>
  );
}

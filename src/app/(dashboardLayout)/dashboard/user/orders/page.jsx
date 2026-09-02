'use client';

/**
 * "আমার অর্ডার" — every order this buyer has placed.
 *
 * The checkout success screen sends people here with ?ref=<orderNumber>, because
 * the COD result only carries the human order number, not the Mongo id the
 * tracking route needs. The matching card is highlighted so a buyer who has just
 * ordered lands on their own order rather than a list they have to search.
 */

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FiLoader, FiShoppingBag, FiChevronRight, FiAlertCircle,
  FiRefreshCw, FiCheckCircle, FiBookOpen,
} from 'react-icons/fi';

import {
  API, authHeaders, fmtDate, formatTk, statusMeta, itemCover, deliveryTypeLabel,
} from './orderUi';

export default function UserOrdersPage() {
  return (
    <Suspense fallback={<CenterSpinner />}>
      <OrdersList />
    </Suspense>
  );
}

function CenterSpinner() {
  return (
    <div className="flex justify-center py-20">
      <FiLoader className="animate-spin text-brand" size={28} />
    </div>
  );
}

function OrdersList() {
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get('ref') || '';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Bumped by the retry button; the fetch effect keys off it. Nothing here sets
  // state synchronously inside the effect body — every write is behind an await.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/orders/my`, { headers: authHeaders(), cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || !body.success) throw new Error(body.message || 'অর্ডার লোড করা যায়নি');
        setOrders(Array.isArray(body.data) ? body.data : []);
        setError('');
      } catch (err) {
        if (alive) setError(err.message || 'অর্ডার লোড করা যায়নি');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  const retry = () => {
    setLoading(true);
    setError('');
    setAttempt((n) => n + 1);
  };

  return (
    <div className="space-y-6 poppins">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center text-white shadow-md shadow-brand/20 shrink-0">
          <FiShoppingBag size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-dash-ink outfit">আমার অর্ডার</h1>
          <p className="text-sm text-dash-mute">আপনার সব বইয়ের অর্ডার ও ডেলিভারির অবস্থা</p>
        </div>
      </div>

      {/* Just came from checkout */}
      {justPlaced && !loading && !error && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <FiCheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
          <p className="text-sm text-emerald-800 leading-relaxed">
            আপনার অর্ডার{' '}
            <span className="font-mono font-semibold break-all">{justPlaced}</span>{' '}
            জমা হয়েছে। নিচে অর্ডারটিতে ট্যাপ করে ডেলিভারির অগ্রগতি দেখুন।
          </p>
        </div>
      )}

      {loading ? (
        <CenterSpinner />
      ) : error ? (
        <div className="bg-dash-card rounded-2xl border border-rose-200 p-8 text-center">
          <FiAlertCircle className="mx-auto text-rose-400 mb-3" size={28} />
          <p className="text-sm font-semibold text-dash-ink3">{error}</p>
          <button
            onClick={retry}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-colors"
          >
            <FiRefreshCw size={13} /> আবার চেষ্টা করুন
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-dash-card rounded-2xl border border-dashed border-dash-line p-10 sm:p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-soft flex items-center justify-center mx-auto mb-4">
            <FiShoppingBag className="text-brand" size={26} />
          </div>
          <h3 className="text-base font-bold text-dash-ink3">এখনো কোনো অর্ডার করেননি</h3>
          <p className="text-sm text-dash-mute2 mt-1 max-w-sm mx-auto leading-relaxed">
            বই অর্ডার করলে সেটি এখানে দেখা যাবে এবং ডেলিভারি কোন ধাপে আছে তা ট্র্যাক করতে পারবেন।
          </p>
          <Link
            href="/books"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors"
          >
            <FiBookOpen size={15} /> বই দেখুন
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} highlight={o.orderNumber === justPlaced} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, highlight }) {
  const st = statusMeta(order.status);
  const StatusIcon = st.icon;
  const items = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce((n, it) => n + (Number(it.quantity) || 0), 0);

  return (
    <Link
      href={`/dashboard/user/orders/${order._id}`}
      className={`block bg-dash-card rounded-2xl border shadow-sm hover:shadow-md transition-all ${
        highlight ? 'border-brand ring-2 ring-brand/25' : 'border-dash-line hover:border-dash-line-strong'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Order number + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* The order number, and only that. The shop's running count
                (#1, #2, …) is on the admin screens where it is useful for
                bookkeeping — a buyer seeing "#7" learns how few orders the shop
                has taken, which is nobody's business but the shop's. */}
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-mono font-semibold text-dash-ink2 break-all">
                {order.orderNumber}
              </p>
            </div>
            <p className="text-[11px] text-dash-mute2 mt-0.5">
              {fmtDate(order.createdAt)} · {deliveryTypeLabel(order.deliveryType)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold shrink-0 ${st.cls}`}
          >
            <StatusIcon size={11} /> {st.label}
          </span>
        </div>

        {/* Items */}
        <div className="mt-4 space-y-2.5">
          {items.slice(0, 3).map((it, i) => {
            const cover = itemCover(it);
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-12 rounded-md bg-dash-soft2 border border-dash-line overflow-hidden shrink-0 flex items-center justify-center">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <FiBookOpen className="text-dash-faint" size={15} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-dash-ink3 truncate">{it.title}</p>
                  <p className="text-[11px] text-dash-mute2">
                    {it.format === 'digital' ? 'ডিজিটাল' : 'ছাপা'} · {it.quantity} কপি ·{' '}
                    {formatTk(it.price)}
                  </p>
                </div>
              </div>
            );
          })}
          {items.length > 3 && (
            <p className="text-[11px] text-dash-mute2 pl-12">
              + আরও {items.length - 3} টি বই
            </p>
          )}
        </div>

        {/* Total + CTA */}
        <div className="mt-4 pt-3 border-t border-dash-line-soft flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-dash-mute2 font-medium">মোট</p>
            <p className="text-base font-bold text-dash-ink">{formatTk(order.total)}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-ink">
            {totalQty > 0 && <span className="text-dash-mute2 font-medium">{totalQty} কপি</span>}
            <span className="ml-2">ট্র্যাক করুন</span>
            <FiChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

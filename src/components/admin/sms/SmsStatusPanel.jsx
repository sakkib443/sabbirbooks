'use client';

/**
 * "Why is no SMS arriving?" — the screen that answers it.
 *
 * There is an endpoint that knows, and a script that knows, and neither was any
 * use: the endpoint needs an Authorization header so it cannot be opened in a
 * browser tab, and the script needs a terminal on the production box. The
 * person asking the question is the shop owner.
 *
 * Three things break SMS on the gateway's side and they are indistinguishable
 * from inside the app — the key was never activated in the panel, the server's
 * IP is not whitelisted, or the sender name does not match one registered to
 * the account. All three look like "nothing happens". So this shows what the
 * server actually read from its environment, and sends one real message on
 * request, repeating the gateway's own words back with the action they imply.
 *
 * The API key is never shown. Only whether one is set, how long it is, and
 * whether it has stray whitespace — enough to catch the two mistakes that
 * actually happen when pasting into a deployment panel, without putting the
 * secret on a screen somebody is about to screenshot for support.
 */

import { useEffect, useState } from 'react';
import {
  FiMessageSquare, FiCheckCircle, FiXCircle, FiAlertTriangle, FiLoader,
  FiSend, FiRefreshCw, FiEye,
} from 'react-icons/fi';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

const token = () =>
  typeof window !== 'undefined'
    ? localStorage.getItem('token') || localStorage.getItem('sb_token') || ''
    : '';

const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

export default function SmsStatusPanel() {
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, p] = await Promise.all([
        fetch(`${API}/notifications/sms-status`, { headers: headers(), cache: 'no-store' }).then((r) => r.json()),
        fetch(`${API}/notifications/sms-preview`, { headers: headers(), cache: 'no-store' }).then((r) => r.json()),
      ]);
      if (!s.success) throw new Error(s.message || 'Could not read the SMS status');
      setStatus(s.data);
      if (p.success) setPreview(p.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/notifications/sms-test`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ phone }),
      });
      setResult(await r.json());
    } catch (e) {
      setResult({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-dash-mute2">
        <FiLoader className="mr-2 animate-spin" /> লোড হচ্ছে…
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-dash-ink2">
          <FiMessageSquare className="text-brand" /> SMS পরীক্ষা
        </h1>
        <p className="text-sm text-dash-mute">
          সার্ভার আসলে কোন কোন মান পড়েছে, আর গেটওয়ে কী বলছে — দুটোই এখানে।
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <FiAlertTriangle /> {error}
        </div>
      )}

      {status && (
        <>
          <div
            className={`rounded-2xl border p-4 ${
              status.demoMode
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <p className="flex items-center gap-2 font-semibold">
              {status.demoMode ? (
                <>
                  <FiAlertTriangle className="text-amber-600" />
                  <span className="text-amber-800">ডেমো মোড — কোনো SMS যাচ্ছে না</span>
                </>
              ) : (
                <>
                  <FiCheckCircle className="text-emerald-600" />
                  <span className="text-emerald-800">চালু আছে — আসল SMS যাবে</span>
                </>
              )}
            </p>
            {status.demoMode && (
              <p className="mt-1 text-xs text-amber-700">
                SMS_USERNAME অথবা SMS_API_KEY বসানো নেই। Coolify-তে বসিয়ে রিডিপ্লয় দিন।
              </p>
            )}
          </div>

          <section className="rounded-2xl border border-dash-line bg-dash-card p-5">
            <h2 className="mb-3 text-sm font-bold text-dash-ink2">সার্ভার যা পড়েছে</h2>
            <dl className="space-y-2 text-sm">
              <Row label="SMS_USERNAME" ok={Boolean(status.config.username)}>
                {status.config.username || '(ফাঁকা)'}
              </Row>
              <Row label="SMS_API_KEY" ok={status.config.apiKey.set}>
                {status.config.apiKey.set
                  ? `${status.config.apiKey.starts}…${status.config.apiKey.ends} (${status.config.apiKey.length} অক্ষর)`
                  : '(ফাঁকা)'}
                {status.config.apiKey.hasWhitespace && (
                  <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
                    ভেতরে স্পেস আছে — এটাই সমস্যা
                  </span>
                )}
              </Row>
              <Row label="SMS_SENDER_ID" ok={Boolean(status.config.senderId)}>
                {status.config.senderId || '(ফাঁকা — গেটওয়ে মেসেজ ফিরিয়ে দেবে)'}
              </Row>
              <Row label="SMS_TRANSACTION_TYPE" ok>{status.config.transactionType}</Row>
              <Row label="SHOP_NAME" ok={status.config.shopName !== 'Sabbir Books'}>
                {status.config.shopName}
                {status.config.shopName === 'Sabbir Books' && (
                  <span className="ml-2 text-[11px] text-amber-700">
                    — প্রতিটা SMS-এর প্রথম লাইনে এটাই যাবে
                  </span>
                )}
              </Row>
              <Row label="SMS_ENDPOINT" ok>
                <span className="font-mono text-[11px]">{status.config.endpoint}</span>
              </Row>
            </dl>
          </section>

          <section className="rounded-2xl border border-dash-line bg-dash-card p-5">
            <h2 className="mb-1 text-sm font-bold text-dash-ink2">একটা আসল টেস্ট পাঠান</h2>
            <p className="mb-3 text-xs text-dash-mute2">
              একটা মেসেজ যাবে (১টা SMS খরচ হবে)। গেটওয়ে যা বলবে হুবহু নিচে দেখাবে।
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                inputMode="numeric"
                className="flex-1 rounded-lg border border-dash-line bg-dash-card px-4 py-2.5 font-mono text-sm text-dash-ink2 outline-none focus:border-brand"
              />
              <button
                onClick={sendTest}
                disabled={testing || !phone.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {testing ? <FiLoader className="animate-spin" /> : <FiSend />} পাঠান
              </button>
            </div>

            {result && (
              <div
                className={`mt-3 rounded-xl border p-4 ${
                  result.success ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                }`}
              >
                <p className="flex items-center gap-2 font-semibold">
                  {result.success ? (
                    <><FiCheckCircle className="text-emerald-600" /><span className="text-emerald-800">পাঠানো হয়েছে</span></>
                  ) : (
                    <><FiXCircle className="text-rose-600" /><span className="text-rose-800">যায়নি</span></>
                  )}
                </p>
                <p className="mt-1.5 text-sm text-dash-ink3">
                  <b>গেটওয়ে বলছে:</b> {result.data?.gatewaySaid || result.message}
                </p>
                {result.data?.whatToDo && (
                  <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-dash-ink3">
                    <b>যা করতে হবে:</b> {result.data.whatToDo}
                  </p>
                )}
                {result.data?.trxnId && (
                  <p className="mt-1.5 font-mono text-[11px] text-dash-mute2">
                    trxnId: {result.data.trxnId}
                  </p>
                )}
              </div>
            )}
          </section>

          {preview && (
            <section className="rounded-2xl border border-dash-line bg-dash-card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-dash-ink2">
                <FiEye /> পাঁচটা মেসেজ কেমন যাবে
              </h2>
              <p className="mb-3 text-xs text-dash-mute2">
                কিছু পাঠানো হবে না — শুধু দেখাচ্ছে। ১৬০ অক্ষরের বেশি হলে দুইটা SMS কাটবে।
              </p>
              <div className="space-y-2.5">
                {Object.entries(preview).map(([key, v]) => (
                  <div key={key} className="rounded-xl bg-dash-soft/60 p-3">
                    <p className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-dash-mute2">
                      <span>{LABEL[key] || key}</span>
                      <span className={v.messages > 1 ? 'text-rose-600' : 'text-emerald-600'}>
                        {v.characters} অক্ষর · {v.messages} SMS
                      </span>
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-dash-ink2">{v.text}</pre>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-dash-line bg-dash-card p-5">
            <h2 className="mb-3 text-sm font-bold text-dash-ink2">সাম্প্রতিক চেষ্টা</h2>
            {status.recentOrders?.length ? (
              <ul className="space-y-1.5 text-sm">
                {status.recentOrders.map((o) => (
                  <li key={o.orderNumber} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-dash-ink3">{o.orderNumber}</span>
                    <span className="text-dash-mute2">{o.payment?.method}</span>
                    {(o.smsSent || []).map((s) => (
                      <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {s}
                      </span>
                    ))}
                    {!(o.smsSent || []).length && (
                      <span className="text-[11px] text-dash-mute2">কিছু পাঠানো হয়নি</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-dash-mute2">এখনো কোনো অর্ডারে SMS চেষ্টা করা হয়নি।</p>
            )}
          </section>

          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-dash-line px-4 py-2.5 text-sm font-medium text-dash-ink3 hover:bg-dash-soft"
          >
            <FiRefreshCw /> আবার দেখুন
          </button>
        </>
      )}
    </div>
  );
}

const LABEL = {
  orderPlaced: '১. অর্ডার হয়েছে (COD)',
  paymentReceived: '২. পেমেন্ট পাওয়া গেছে (অনলাইন)',
  orderConfirmed: '৩. অর্ডার কনফার্ম (COD)',
  orderDelivered: '৪. ডেলিভারি হয়েছে',
  affiliateApproved: '৫. অ্যাফিলিয়েট চালু হয়েছে',
};

const Row = ({ label, ok, children }) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-dash-line-soft pb-2 last:border-0">
    {ok ? (
      <FiCheckCircle className="shrink-0 text-emerald-600" size={14} />
    ) : (
      <FiXCircle className="shrink-0 text-rose-600" size={14} />
    )}
    <dt className="w-52 shrink-0 font-mono text-xs text-dash-mute2">{label}</dt>
    <dd className="min-w-0 flex-1 break-all text-dash-ink2">{children}</dd>
  </div>
);

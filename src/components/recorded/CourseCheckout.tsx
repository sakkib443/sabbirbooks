"use client";

/**
 * /courses/<id>/checkout (25 Oct 2026) — buying a recorded course, separate
 * from the book's checkout (no address, no delivery, no cash on delivery).
 *
 *   • free course   → one button, the course opens at once;
 *   • online        → the payment gateway (SSLCommerz: card, bKash, Nagad…),
 *                     the course opens when the gateway confirms;
 *   • Send Money    → the buyer sends to the shop's number and gives the TrxID;
 *                     the order waits on Courses → Course Orders until an admin
 *                     approves it.
 * Signing in is required: the course belongs to an account.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LuLock, LuCircleCheck, LuHourglass, LuCopy, LuCheck, LuCreditCard, LuSmartphone, LuArrowLeft, LuPlay } from "react-icons/lu";
import { Container, cn } from "@/components/ui";
import { STORAGE_KEYS } from "@/components/auth/authClient";
import {
  checkAccess, coursePrice, courseListPrice, enrollFree, gatewayReady, getCourse, isLoggedIn, learnHref,
  startGateway, submitSendMoney, taka, walletNumbers,
  type CourseAccess, type RecordedCourse,
} from "./recordedApi";

type Wallet = Awaited<ReturnType<typeof walletNumbers>>[number];
type Done = null | "active" | "pending";

const storedRole = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "{}")?.role || "";
  } catch {
    return "";
  }
};

export default function CourseCheckout() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<RecordedCourse | null>(null);
  const [access, setAccess] = useState<CourseAccess>({ hasAccess: false });
  const [online, setOnline] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState("");
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  const [mode, setMode] = useState<"online" | "manual">("online");
  const [channel, setChannel] = useState<Wallet["id"]>("bkash");
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done>(null);
  const [payAgain, setPayAgain] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getCourse(id);
        const [acc, gw, ws] = await Promise.all([checkAccess(c._id), gatewayReady(), walletNumbers()]);
        if (!alive) return;
        setCourse(c);
        setAccess(acc);
        setOnline(gw);
        setWallets(ws);
        setMode(gw ? "online" : "manual");
        if (ws[0]) setChannel(ws[0].id);
        setLoggedIn(isLoggedIn());
        setRole(storedRole());
        setState("ok");
      } catch {
        if (alive) setState("missing");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (state === "loading") {
    return <Container className="py-14"><div className="mx-auto h-96 max-w-xl animate-pulse rounded-2xl bg-muted" /></Container>;
  }
  if (state === "missing" || !course) {
    return (
      <Container className="hind-siliguri py-20 text-center">
        <p className="text-lg text-muted-foreground">কোর্সটি পাওয়া যায়নি।</p>
        <Link href="/courses" className="mt-4 inline-block font-semibold text-primary">← সব কোর্স</Link>
      </Container>
    );
  }

  const price = coursePrice(course);
  const list = courseListPrice(course);
  const back = `/courses/${course.slug || course._id}`;
  const here = `${back}/checkout`;
  const wallet = wallets.find((w) => w.id === channel) || wallets[0];
  const isStudent = !role || role === "student" || role === "user";

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "কিছু একটা ভুল হয়েছে");
    } finally {
      setBusy(false);
    }
  };

  const freeEnroll = () => run(async () => {
    await enrollFree(course._id);
    setDone("active");
  });
  const payOnline = () => run(async () => {
    window.location.href = await startGateway(course);
  });
  const sendMoney = () => run(async () => {
    if (!/^01\d{9}$/.test(sender.replace(/\D/g, "").replace(/^88/, ""))) throw new Error("যে নম্বর থেকে টাকা পাঠিয়েছেন সেটা ঠিকভাবে লিখুন (01…)");
    if (trx.trim().length < 6) throw new Error("ট্রানজ্যাকশন আইডি (TrxID) লিখুন");
    await submitSendMoney(course._id, { channel: wallet?.id || channel, senderNumber: sender.trim(), transactionId: trx.trim() });
    setDone("pending");
  });
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* nothing to do */
    }
  };

  let body: React.ReactNode;
  if (done === "active" || access.hasAccess) {
    body = (
      <Result icon={<LuCircleCheck />} tone="ok" title={done ? "কোর্সটা আপনার হয়ে গেছে!" : "কোর্সটা আপনার কেনা আছে"}>
        <Link href={learnHref(course._id)} className={btn}><LuPlay /> এখনই দেখা শুরু করুন</Link>
      </Result>
    );
  } else if (done === "pending" || (access.pending && !payAgain)) {
    body = (
      <Result icon={<LuHourglass />} tone="wait" title={done ? "অর্ডার জমা হয়েছে" : "আপনার অর্ডার যাচাই হচ্ছে"}>
        <p className="text-muted-foreground">পেমেন্ট মিলিয়ে অ্যাডমিন অনুমোদন দিলেই কোর্সটা খুলে যাবে — সাধারণত কয়েক ঘণ্টার মধ্যে।</p>
        <Link href="/dashboard/user/courses" className={cn(btn, "mt-4")}>আমার কোর্স</Link>
        {!done && (
          <button type="button" onClick={() => setPayAgain(true)} className="mt-3 text-sm text-muted-foreground underline">
            ভুল TrxID দিয়েছিলেন? আবার জমা দিন
          </button>
        )}
      </Result>
    );
  } else if (!loggedIn) {
    body = (
      <Result icon={<LuLock />} tone="wait" title="কিনতে আগে লগইন করুন">
        <p className="text-muted-foreground">কোর্সটা আপনার অ্যাকাউন্টে যোগ হবে, যেকোনো ডিভাইস থেকে লগইন করে দেখতে পারবেন।</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href={`/login?redirect=${encodeURIComponent(here)}`} className={btn}>লগইন</Link>
          <Link href={`/register?redirect=${encodeURIComponent(here)}`} className={cn(btn, "bg-card text-primary ring-1 ring-primary hover:bg-primary-soft")}>নতুন অ্যাকাউন্ট</Link>
        </div>
      </Result>
    );
  } else if (!isStudent) {
    body = (
      <Result icon={<LuLock />} tone="wait" title="স্টাফ অ্যাকাউন্ট দিয়ে কেনা যায় না">
        <p className="text-muted-foreground">অ্যাডমিন প্যানেলের কোর্স → Course View থেকে কোর্সটা পুরোটা দেখতে পারবেন।</p>
      </Result>
    );
  } else if (price <= 0) {
    body = (
      <>
        <p className="text-muted-foreground">এই কোর্সটা ফ্রি — এক ক্লিকে শুরু করুন।</p>
        <button type="button" disabled={busy} onClick={freeEnroll} className={cn(btn, "mt-5")}>
          {busy ? "একটু অপেক্ষা…" : "ফ্রি তে শুরু করুন"}
        </button>
      </>
    );
  } else if (!online && wallets.length === 0) {
    body = <p className="rounded-xl bg-accent-soft p-4 text-sm">এই মুহূর্তে পেমেন্ট নেওয়া যাচ্ছে না। একটু পরে চেষ্টা করুন বা আমাদের সাথে যোগাযোগ করুন।</p>;
  } else {
    body = (
      <>
        <h2 className="mb-3 font-semibold text-foreground">পেমেন্ট</h2>
        {online && wallets.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <Tab on={mode === "online"} onClick={() => setMode("online")}><LuCreditCard /> অনলাইনে পেমেন্ট</Tab>
            <Tab on={mode === "manual"} onClick={() => setMode("manual")}><LuSmartphone /> Send Money</Tab>
          </div>
        )}

        {mode === "online" && online ? (
          <>
            <p className="text-sm text-muted-foreground">বিকাশ, নগদ, রকেট বা কার্ড দিয়ে নিরাপদে পেমেন্ট করুন। পেমেন্ট হলেই কোর্সটা সাথে সাথে খুলে যাবে।</p>
            <button type="button" disabled={busy} onClick={payOnline} className={cn(btn, "mt-5")}>
              {busy ? "পেমেন্ট পেজ খুলছে…" : `${taka(price)} পেমেন্ট করুন`}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            {wallets.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setChannel(w.id)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition",
                      w.id === wallet?.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border"
                    )}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}
            {wallet && (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary-soft/50 p-4 text-sm">
                <p>
                  নিচের {wallet.label} নম্বরে <b className="text-foreground">{taka(price)}</b> <b>Send Money</b> করুন:
                </p>
                <button type="button" onClick={() => copy(wallet.number)} className="mt-2 inline-flex items-center gap-2 font-mono text-xl font-bold tracking-wide text-primary">
                  {wallet.number} {copied ? <LuCheck className="h-4 w-4" /> : <LuCopy className="h-4 w-4" />}
                </button>
              </div>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">যে নম্বর থেকে পাঠিয়েছেন</span>
              <input value={sender} onChange={(e) => setSender(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" className={input} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground">ট্রানজ্যাকশন আইডি (TrxID)</span>
              <input value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} placeholder="যেমন 9BX4K2L7QM" className={cn(input, "font-mono")} />
            </label>
            <button type="button" disabled={busy} onClick={sendMoney} className={btn}>
              {busy ? "জমা হচ্ছে…" : "অর্ডার জমা দিন"}
            </button>
            <p className="text-xs text-muted-foreground">অ্যাডমিন পেমেন্ট মিলিয়ে অনুমোদন দিলে কোর্সটা খুলে যাবে।</p>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="hind-siliguri min-h-[70vh] bg-surface-soft py-8 sm:py-12">
      <Container className="max-w-xl">
        <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <LuArrowLeft /> কোর্সে ফিরে যান
        </Link>
        <h1 className="mb-5 text-2xl font-bold text-foreground">কোর্স চেকআউট</h1>

        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
            {course.image ? <img src={course.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-primary"><LuPlay /></div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug text-foreground">{course.title}</p>
            <p className="text-xs text-muted-foreground">রেকর্ডেড কোর্স · আজীবন অ্যাক্সেস</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{price > 0 ? taka(price) : "ফ্রি"}</p>
            {list > 0 && <p className="text-xs text-muted-foreground line-through">{taka(list)}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          {body}
          {error && <p className="mt-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
        </div>
      </Container>
    </main>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition",
        on ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Result({ icon, tone, title, children }: { icon: React.ReactNode; tone: "ok" | "wait"; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className={cn("mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl", tone === "ok" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent")}>
        {icon}
      </div>
      <h2 className="mb-2 text-lg font-bold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

const btn =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-soft transition hover:bg-primary-hover disabled:opacity-60";
const input =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

"use client";

/**
 * Buying a course without logging in first (11 Nov 2026). The buyer gives
 * their name, phone, email, where they live and their medical college — and
 * a password, because the course belongs to an account they will log in to
 * later to watch it. The account is made here (the ordinary sign-up), they
 * are signed in, and the checkout carries on to payment. The order is a
 * course order (Courses → Course Orders), never a book order.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { LuLoader, LuUserPlus } from "react-icons/lu";
import { cn } from "@/components/ui";
import { apiLogin, apiRegister, persistSession } from "@/components/auth/authClient";
import { fetchColleges } from "@/components/checkout/checkoutApi";
import type { CollegeOption } from "@/components/checkout/types";

const T = {
  bn: {
    title: "আপনার তথ্য দিন",
    sub: "লগইন লাগবে না — এই তথ্য দিয়ে আপনার অ্যাকাউন্ট খুলে যাবে, পরে এই ইমেইল/ফোন আর পাসওয়ার্ড দিয়ে লগইন করে কোর্স দেখবেন।",
    name: "পুরো নাম", phone: "মোবাইল নম্বর (WhatsApp)", email: "ইমেইল", location: "লোকেশন (জেলা / এলাকা)",
    college: "মেডিকেল কলেজ", pickCollege: "কলেজ বাছাই করুন", other: "অন্য কলেজ (লিখে দিন)", otherName: "কলেজের নাম",
    password: "পাসওয়ার্ড বানান", passwordHint: "কমপক্ষে ৪ অক্ষর — পরে লগইনে লাগবে",
    next: "পরের ধাপ: পেমেন্ট", have: "আগে থেকে অ্যাকাউন্ট আছে?", login: "লগইন করুন",
    errName: "নাম লিখুন", errPhone: "ঠিক মোবাইল নম্বর দিন (01…)", errEmail: "ঠিক ইমেইল দিন", errLocation: "লোকেশন লিখুন",
    errCollege: "মেডিকেল কলেজ বাছাই করুন", errPassword: "পাসওয়ার্ড কমপক্ষে ৪ অক্ষর",
    exists: "এই ইমেইল বা ফোনে আগেই অ্যাকাউন্ট আছে — নিচে “লগইন করুন” চাপুন।",
    generic: "অ্যাকাউন্ট খোলা যায়নি, আবার চেষ্টা করুন",
  },
  en: {
    title: "Your details",
    sub: "No login needed — these open your account; later you log in with this email/phone and password to watch.",
    name: "Full name", phone: "Mobile number (WhatsApp)", email: "Email", location: "Location (district / area)",
    college: "Medical college", pickCollege: "Choose your college", other: "Other college (type it)", otherName: "College name",
    password: "Choose a password", passwordHint: "At least 4 characters — you will log in with it",
    next: "Next: payment", have: "Already have an account?", login: "Log in",
    errName: "Enter your name", errPhone: "Enter a valid mobile number (01…)", errEmail: "Enter a valid email", errLocation: "Enter your location",
    errCollege: "Choose your medical college", errPassword: "Password needs at least 4 characters",
    exists: "An account already uses this email or phone — press “Log in” below.",
    generic: "Could not open the account. Please try again.",
  },
};

const OTHER = "__other__";
const bdMobile = (s: string) => {
  let d = s.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  return /^01[3-9]\d{8}$/.test(d) ? d : "";
};

export default function GuestBuyerForm({ bn, loginHref, onDone }: { bn: boolean; loginHref: string; onDone: () => void }) {
  const L = bn ? T.bn : T.en;
  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [f, setF] = useState({ name: "", phone: "", email: "", location: "", college: "", collegeName: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchColleges().then(setColleges).catch(() => {});
  }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setF((x) => {
      const next = { ...x, [k]: v };
      // A picked college fills the location when it is still empty.
      if (k === "college" && v !== OTHER && !x.location) {
        const c = colleges.find((c) => c._id === v);
        if (c?.district) next.location = [c.upazila, c.district].filter(Boolean).join(", ");
      }
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = bdMobile(f.phone);
    const college = colleges.find((c) => c._id === f.college);
    const problem =
      !f.name.trim() ? L.errName
      : !phone ? L.errPhone
      : !/^\S+@\S+\.\S+$/.test(f.email.trim()) ? L.errEmail
      : !f.location.trim() ? L.errLocation
      : !college && !(f.college === OTHER && f.collegeName.trim()) ? L.errCollege
      : f.password.length < 4 ? L.errPassword
      : "";
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const [first, ...rest] = f.name.trim().split(/\s+/);
      const reg = await apiRegister({
        firstName: first,
        lastName: rest.join(" ") || "-",
        email: f.email.trim().toLowerCase(),
        phoneNumber: phone,
        whatsappNumber: phone,
        medicalCollege: college?._id,
        medicalCollegeName: college?.name || f.collegeName.trim(),
        location: f.location.trim(),
        password: f.password,
      });
      if (!reg.ok || !reg.success) {
        throw new Error(/exist|already|duplicate|registered/i.test(reg.message || "") ? L.exists : reg.message || L.generic);
      }
      const login = await apiLogin({ identifier: f.email.trim().toLowerCase(), password: f.password, mode: "email" });
      if (!login.ok || !login.success || !login.data) throw new Error(login.message || L.generic);
      persistSession(login.data);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : L.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h2 className="flex items-center gap-2 font-bold text-foreground"><LuUserPlus className="text-primary" /> {L.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{L.sub}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={L.name}><input value={f.name} onChange={set("name")} autoComplete="name" className={input} /></Field>
        <Field label={L.phone}><input value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className={input} /></Field>
        <Field label={L.email}><input value={f.email} onChange={set("email")} type="email" autoComplete="email" className={input} /></Field>
        <Field label={L.college}>
          <select value={f.college} onChange={set("college")} className={input}>
            <option value="">{L.pickCollege}</option>
            {colleges.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            <option value={OTHER}>{L.other}</option>
          </select>
        </Field>
        {f.college === OTHER && (
          <Field label={L.otherName}><input value={f.collegeName} onChange={set("collegeName")} className={input} /></Field>
        )}
        <Field label={L.location}><input value={f.location} onChange={set("location")} className={input} /></Field>
        <Field label={L.password} hint={L.passwordHint}>
          <input value={f.password} onChange={set("password")} type="password" autoComplete="new-password" className={input} />
        </Field>
      </div>
      {error && <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-soft transition hover:bg-primary-hover disabled:opacity-60">
        {busy && <LuLoader className="animate-spin" />} {L.next}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {L.have}{" "}
        <Link href={loginHref} className="font-semibold text-primary hover:underline">{L.login}</Link>
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const input = cn(
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
);

"use client";

/**
 * The page a reset email's link opens: choose a new password.
 *
 * The link carries the address and a single-use token; the token is the proof
 * that whoever is here could read that inbox. Nothing is checked on arrival —
 * the server checks the token when the new password is submitted, which is the
 * only moment it matters, and one check means one place for it to be right.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuKeyRound, LuTriangleAlert, LuLoaderCircle, LuCircleCheck, LuLogIn } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Button, cn } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { apiResetPassword } from "@/components/auth/authClient";

function ResetPasswordInner() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const params = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState("");

  const S = isBengali
    ? {
        eyebrow: "পাসওয়ার্ড রিসেট",
        title: "নতুন পাসওয়ার্ড দিন",
        subtitle: (e: string) => `${e} অ্যাকাউন্টের জন্য`,
        pw: "নতুন পাসওয়ার্ড",
        pwPh: "কমপক্ষে ৬ অক্ষর",
        confirm: "আবার লিখুন",
        confirmPh: "একই পাসওয়ার্ড",
        showPw: "দেখান",
        hidePw: "লুকান",
        submit: "পাসওয়ার্ড সেট করুন",
        submitting: "সেট হচ্ছে…",
        errShort: "পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের হতে হবে",
        errMatch: "দুইটা পাসওয়ার্ড মিলছে না",
        network: "সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।",
        badLink: "এই লিংকটি অসম্পূর্ণ। ইমেইলের বাটনটি আবার চাপুন, অথবা নতুন লিংক চেয়ে নিন।",
        newLink: "নতুন রিসেট লিংক চান",
        doneTitle: "পাসওয়ার্ড বদলানো হয়েছে",
        doneBody: "নতুন পাসওয়ার্ড দিয়ে লগইন করুন। নিরাপত্তার জন্য আপনার অ্যাকাউন্ট সব ডিভাইস থেকে লগআউট করা হয়েছে।",
        login: "লগইন করুন",
      }
    : {
        eyebrow: "Password reset",
        title: "Choose a new password",
        subtitle: (e: string) => `For ${e}`,
        pw: "New password",
        pwPh: "At least 6 characters",
        confirm: "Type it again",
        confirmPh: "The same password",
        showPw: "Show",
        hidePw: "Hide",
        submit: "Set password",
        submitting: "Setting…",
        errShort: "Password must be 6–64 characters",
        errMatch: "The two passwords do not match",
        network: "Could not reach the server. Check your connection.",
        badLink: "This link is incomplete. Press the button in the email again, or ask for a new link.",
        newLink: "Ask for a new reset link",
        doneTitle: "Password changed",
        doneBody: "Log in with your new password. For your security, you have been signed out on every device.",
        login: "Log in",
      };

  const schema = z
    .object({
      password: z.string().min(6, S.errShort).max(64, S.errShort),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, { message: S.errMatch, path: ["confirm"] });
  type Form = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: "onSubmit" });

  const onSubmit = async (v: Form) => {
    setApiError("");
    try {
      const r = await apiResetPassword({ email, token, newPassword: v.password });
      if (!r.ok || !r.success) {
        setApiError(r.message || S.network);
        return;
      }
      setDone(true);
    } catch {
      setApiError(S.network);
    }
  };

  const newLinkLink = (
    <Link href="/forgot-password" className={cn("font-semibold text-primary hover:underline", bn)}>
      {S.newLink}
    </Link>
  );

  if (done) {
    return (
      <AuthShell bengali={isBengali} icon={<LuCircleCheck className="text-2xl" />} eyebrow={S.eyebrow} title={S.doneTitle}>
        <div className={cn("space-y-5", bn)}>
          <p className="text-sm leading-relaxed text-muted-foreground">{S.doneBody}</p>
          <Link href="/login" className="block">
            <Button size="lg" className={cn("w-full", bn)}>
              <LuLogIn className="text-lg" /> {S.login}
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!email || !token) {
    return (
      <AuthShell bengali={isBengali} icon={<LuTriangleAlert className="text-2xl" />} eyebrow={S.eyebrow} title={S.title} footer={newLinkLink}>
        <p className={cn("text-sm leading-relaxed text-muted-foreground", bn)}>{S.badLink}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      bengali={isBengali}
      icon={<LuKeyRound className="text-2xl" />}
      eyebrow={S.eyebrow}
      title={S.title}
      subtitle={S.subtitle(email)}
      footer={newLinkLink}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* The account's address, for the browser's password manager to file the new password under. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <PasswordInput
          id="password"
          bengali={isBengali}
          label={S.pw}
          placeholder={S.pwPh}
          autoComplete="new-password"
          showToggleLabel={{ show: S.showPw, hide: S.hidePw }}
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordInput
          id="confirm"
          bengali={isBengali}
          label={S.confirm}
          placeholder={S.confirmPh}
          autoComplete="new-password"
          showToggleLabel={{ show: S.showPw, hide: S.hidePw }}
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        {apiError && (
          <div
            role="alert"
            className={cn("flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral", bn)}
          >
            <LuTriangleAlert className="mt-0.5 shrink-0 text-base" />
            <span>{apiError}</span>
          </div>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className={cn("w-full", bn)}>
          {isSubmitting ? (
            <>
              <LuLoaderCircle className="animate-spin text-lg" /> {S.submitting}
            </>
          ) : (
            <>
              <LuKeyRound className="text-lg" /> {S.submit}
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

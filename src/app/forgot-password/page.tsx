"use client";

/**
 * "পাসওয়ার্ড ভুলে গেছেন?" — ask for a reset link by email.
 *
 * The answer is the same whether or not the address has an account (the
 * server is careful about that, and so is this page): it never says "no such
 * account", because that would turn this form into a way of finding out who
 * the shop's customers are. It just says where to look.
 */

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuMail, LuKeyRound, LuTriangleAlert, LuLoaderCircle, LuMailCheck, LuArrowLeft } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Button, cn } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { apiForgotPassword } from "@/components/auth/authClient";

export default function ForgotPasswordPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const [sentTo, setSentTo] = useState("");
  const [apiError, setApiError] = useState("");

  const S = isBengali
    ? {
        eyebrow: "পাসওয়ার্ড রিসেট",
        title: "পাসওয়ার্ড ভুলে গেছেন?",
        subtitle: "অ্যাকাউন্টের ইমেইল দিন — সেখানে নতুন পাসওয়ার্ড সেট করার একটি লিংক পাঠাব।",
        emailLabel: "ইমেইল",
        emailPh: "you@example.com",
        submit: "রিসেট লিংক পাঠান",
        submitting: "পাঠানো হচ্ছে…",
        errEmail: "সঠিক ইমেইল ঠিকানা দিন",
        network: "সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।",
        sentTitle: "ইমেইল দেখুন",
        sentBody: (e: string) =>
          `${e} ঠিকানায় কোনো অ্যাকাউন্ট থাকলে সেখানে একটি রিসেট লিংক পাঠানো হয়েছে। লিংকটি ৩০ মিনিট কাজ করবে।`,
        spam: "কয়েক মিনিটেও না এলে Spam/Promotions ফোল্ডারটাও দেখুন।",
        noEmail: "অ্যাকাউন্টে ইমেইল না থাকলে বা ইমেইলে ঢুকতে না পারলে আমাদের সাথে যোগাযোগ করুন — অ্যাডমিন পাসওয়ার্ড বদলে দিতে পারবেন।",
        again: "অন্য ইমেইল দিয়ে চেষ্টা করুন",
        back: "লগইনে ফিরে যান",
      }
    : {
        eyebrow: "Password reset",
        title: "Forgot your password?",
        subtitle: "Enter your account's email and we'll send a link to set a new password.",
        emailLabel: "Email",
        emailPh: "you@example.com",
        submit: "Send reset link",
        submitting: "Sending…",
        errEmail: "Enter a valid email address",
        network: "Could not reach the server. Check your connection.",
        sentTitle: "Check your email",
        sentBody: (e: string) =>
          `If an account uses ${e}, a reset link is on its way. The link works for 30 minutes.`,
        spam: "Nothing after a few minutes? Check Spam or Promotions too.",
        noEmail: "No email on your account, or can't get into it? Contact us — an admin can reset your password.",
        again: "Try another email",
        back: "Back to login",
      };

  const schema = z.object({ email: z.email(S.errEmail) });
  type Form = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), mode: "onSubmit" });

  const onSubmit = async (v: Form) => {
    setApiError("");
    try {
      const r = await apiForgotPassword(v.email.trim());
      if (!r.ok) {
        setApiError(r.message || S.network);
        return;
      }
      setSentTo(v.email.trim());
    } catch {
      setApiError(S.network);
    }
  };

  const backLink = (
    <Link href="/login" className={cn("inline-flex items-center gap-1.5 font-semibold text-primary hover:underline", bn)}>
      <LuArrowLeft /> {S.back}
    </Link>
  );

  if (sentTo) {
    return (
      <AuthShell
        bengali={isBengali}
        icon={<LuMailCheck className="text-2xl" />}
        eyebrow={S.eyebrow}
        title={S.sentTitle}
        footer={backLink}
      >
        <div className={cn("space-y-4 text-sm leading-relaxed text-muted-foreground", bn)}>
          <p className="text-foreground">{S.sentBody(sentTo)}</p>
          <p>{S.spam}</p>
          <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs">{S.noEmail}</p>
          <button
            type="button"
            onClick={() => {
              setSentTo("");
              reset({ email: "" });
            }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {S.again}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      bengali={isBengali}
      icon={<LuKeyRound className="text-2xl" />}
      eyebrow={S.eyebrow}
      title={S.title}
      subtitle={S.subtitle}
      footer={backLink}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          id="email"
          bengali={isBengali}
          label={S.emailLabel}
          icon={<LuMail className="text-base" />}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={S.emailPh}
          error={errors.email?.message}
          {...register("email")}
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
              <LuMail className="text-lg" /> {S.submit}
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

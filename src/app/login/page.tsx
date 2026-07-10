"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LuMail,
  LuPhone,
  LuLogIn,
  LuShieldCheck,
  LuTriangleAlert,
  LuLoaderCircle,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Button, cn } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { apiLogin, persistSession } from "@/components/auth/authClient";

type Mode = "email" | "phone";

export default function LoginPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("email");
  const [apiError, setApiError] = useState("");
  const [forgotNote, setForgotNote] = useState(false);

  const S = isBengali
    ? {
        eyebrow: "নিরাপদ প্রবেশ",
        title: "আবার স্বাগতম",
        subtitle: "আপনার কোর্স, বই এবং QR রিসোর্স দেখতে লগইন করুন।",
        email: "ইমেইল",
        phone: "ফোন নম্বর",
        emailLabel: "ইমেইল ঠিকানা",
        phoneLabel: "ফোন নম্বর",
        emailPh: "you@example.com",
        phonePh: "01XXXXXXXXX",
        password: "পাসওয়ার্ড",
        passwordPh: "আপনার পাসওয়ার্ড",
        showPw: "পাসওয়ার্ড দেখান",
        hidePw: "পাসওয়ার্ড লুকান",
        forgot: "পাসওয়ার্ড ভুলে গেছেন?",
        forgotNote: "পাসওয়ার্ড রিসেট শীঘ্রই আসছে — সহায়তার জন্য যোগাযোগ করুন।",
        submit: "লগইন করুন",
        submitting: "লগইন হচ্ছে...",
        noAccount: "অ্যাকাউন্ট নেই?",
        register: "রেজিস্টার করুন",
        deviceNote: "নিরাপত্তার জন্য প্রতিটি অ্যাকাউন্ট সর্বোচ্চ ২টি ডিভাইসে ব্যবহার করা যায়।",
        errIdentifier: "ইমেইল বা ফোন নম্বর দিন",
        errEmail: "সঠিক ইমেইল দিন",
        errPassword: "পাসওয়ার্ড দিন",
        generic: "লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
        network: "সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করুন।",
      }
    : {
        eyebrow: "Secure sign in",
        title: "Welcome back",
        subtitle: "Log in to access your courses, books and QR resources.",
        email: "Email",
        phone: "Phone",
        emailLabel: "Email address",
        phoneLabel: "Phone number",
        emailPh: "you@example.com",
        phonePh: "01XXXXXXXXX",
        password: "Password",
        passwordPh: "Your password",
        showPw: "Show password",
        hidePw: "Hide password",
        forgot: "Forgot password?",
        forgotNote: "Password reset is coming soon — please contact support for help.",
        submit: "Log in",
        submitting: "Logging in...",
        noAccount: "Don't have an account?",
        register: "Create one",
        deviceNote: "For your security, each account can be used on up to 2 devices.",
        errIdentifier: "Enter your email or phone number",
        errEmail: "Enter a valid email address",
        errPassword: "Enter your password",
        generic: "Login failed. Please try again.",
        network: "Could not reach the server. Check your connection.",
      };

  // Validate the identifier based on the active mode; password just required.
  const schema = z.object({
    identifier:
      mode === "email"
        ? z.email(S.errEmail)
        : z.string().min(6, S.errIdentifier),
    password: z.string().min(1, S.errPassword),
  });
  type LoginForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setApiError("");
    reset({ identifier: "", password: "" });
  };

  const onSubmit = async (values: LoginForm) => {
    setApiError("");
    try {
      const result = await apiLogin({
        identifier: values.identifier.trim(),
        password: values.password,
        mode,
      });
      if (result.ok && result.success && result.data) {
        persistSession(result.data);
        router.push("/");
        router.refresh();
        return;
      }
      setApiError(result.message || S.generic);
    } catch {
      setApiError(S.network);
    }
  };

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
      active
        ? "bg-card text-primary shadow-soft"
        : "text-muted-foreground hover:text-foreground",
      bn
    );

  return (
    <AuthShell
      bengali={isBengali}
      icon={<LuLogIn className="text-2xl" />}
      eyebrow={S.eyebrow}
      title={S.title}
      subtitle={S.subtitle}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email / Phone toggle */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
          <button type="button" onClick={() => switchMode("email")} className={tabClass(mode === "email")}>
            <LuMail className="text-base" /> {S.email}
          </button>
          <button type="button" onClick={() => switchMode("phone")} className={tabClass(mode === "phone")}>
            <LuPhone className="text-base" /> {S.phone}
          </button>
        </div>

        {/* Identifier */}
        <FormField
          id="identifier"
          bengali={isBengali}
          label={mode === "email" ? S.emailLabel : S.phoneLabel}
          icon={mode === "email" ? <LuMail className="text-base" /> : <LuPhone className="text-base" />}
          type={mode === "email" ? "email" : "tel"}
          inputMode={mode === "email" ? "email" : "tel"}
          autoComplete={mode === "email" ? "email" : "tel"}
          placeholder={mode === "email" ? S.emailPh : S.phonePh}
          error={errors.identifier?.message}
          {...register("identifier")}
        />

        {/* Password */}
        <div>
          <PasswordInput
            id="password"
            bengali={isBengali}
            label={S.password}
            placeholder={S.passwordPh}
            autoComplete="current-password"
            showToggleLabel={{ show: S.showPw, hide: S.hidePw }}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setForgotNote((v) => !v)}
              className={cn("text-xs font-medium text-primary hover:underline", bn)}
            >
              {S.forgot}
            </button>
          </div>
          {forgotNote && (
            <p className={cn("mt-1 text-right text-xs text-muted-foreground", bn)}>{S.forgotNote}</p>
          )}
        </div>

        {/* API error */}
        {apiError && (
          <div
            role="alert"
            className={cn(
              "flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral",
              bn
            )}
          >
            <LuTriangleAlert className="mt-0.5 shrink-0 text-base" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Submit */}
        <Button type="submit" size="lg" disabled={isSubmitting} className={cn("w-full", bn)}>
          {isSubmitting ? (
            <>
              <LuLoaderCircle className="animate-spin text-lg" /> {S.submitting}
            </>
          ) : (
            <>
              <LuLogIn className="text-lg" /> {S.submit}
            </>
          )}
        </Button>

        {/* 2-device limit note */}
        <div className={cn("flex items-start gap-2 rounded-xl bg-primary-soft/60 px-4 py-3 text-xs text-primary", bn)}>
          <LuShieldCheck className="mt-0.5 shrink-0 text-sm" />
          <span>{S.deviceNote}</span>
        </div>
      </form>

      <p className={cn("mt-6 text-center text-sm text-muted-foreground", bn)}>
        {S.noAccount}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {S.register}
        </Link>
      </p>
    </AuthShell>
  );
}

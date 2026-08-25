"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LuUser,
  LuMail,
  LuPhone,
  LuUserPlus,
  LuShieldCheck,
  LuTriangleAlert,
  LuLoaderCircle,
  LuCircleCheck,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Button, cn } from "@/components/ui";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { PasswordInput } from "@/components/auth/PasswordInput";
import CollegePicker from "@/components/auth/CollegePicker";
import {
  apiRegister,
  apiLogin,
  persistSession,
  type LoginData,
} from "@/components/auth/authClient";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { homeRouteFor } from "@/lib/permissions";

export default function RegisterPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const router = useRouter();

  const [apiError, setApiError] = useState("");
  const [phase, setPhase] = useState<"idle" | "creating" | "signing-in">("idle");

  const S = isBengali
    ? {
        eyebrow: "নতুন অ্যাকাউন্ট",
        title: "অ্যাকাউন্ট তৈরি করুন",
        subtitle: "সাব্বির বুক-এ যোগ দিন — কোর্স, বই ও QR রিসোর্স এক জায়গায়।",
        firstName: "নামের প্রথম অংশ",
        lastName: "নামের শেষ অংশ",
        firstNamePh: "সাব্বির",
        lastNamePh: "আহমেদ",
        email: "ইমেইল ঠিকানা",
        emailPh: "you@example.com",
        phone: "ফোন নম্বর",
        phoneOptional: "(ঐচ্ছিক)",
        phonePh: "01XXXXXXXXX",
        whatsapp: "WhatsApp নম্বর",
        whatsappPh: "01XXXXXXXXX — অর্ডারের খবর এখানেই যাবে",
        college: "মেডিকেল কলেজ",
        collegePh: "কলেজ বেছে নিন",
        password: "পাসওয়ার্ড",
        passwordPh: "৪–২০ অক্ষর",
        confirm: "পাসওয়ার্ড নিশ্চিত করুন",
        confirmPh: "পাসওয়ার্ড আবার লিখুন",
        showPw: "পাসওয়ার্ড দেখান",
        hidePw: "পাসওয়ার্ড লুকান",
        submit: "রেজিস্টার করুন",
        creating: "অ্যাকাউন্ট তৈরি হচ্ছে...",
        or: "অথবা",
        signingIn: "সাইন ইন করা হচ্ছে...",
        haveAccount: "ইতিমধ্যে অ্যাকাউন্ট আছে?",
        login: "লগইন করুন",
        deviceNote: "নিরাপত্তার জন্য প্রতিটি অ্যাকাউন্ট সর্বোচ্চ ২টি ডিভাইসে ব্যবহার করা যায়।",
        errFirst: "নামের প্রথম অংশ দিন",
        errWhatsapp: "সঠিক WhatsApp নম্বর দিন, যেমন 01712345678",
        errCollege: "আপনার মেডিকেল কলেজ বেছে নিন",
        errLast: "নামের শেষ অংশ দিন",
        errEmail: "সঠিক ইমেইল দিন",
        errPwMin: "পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে",
        errPwMax: "পাসওয়ার্ড ২০ অক্ষরের বেশি নয়",
        errConfirm: "পাসওয়ার্ড নিশ্চিত করুন",
        errMatch: "পাসওয়ার্ড মিলছে না",
        generic: "রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
        network: "সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করুন।",
        signedInFail: "অ্যাকাউন্ট তৈরি হয়েছে। এখন লগইন করুন।",
      }
    : {
        eyebrow: "New account",
        title: "Create your account",
        subtitle: "Join Magic Viva — courses, books and QR resources in one place.",
        firstName: "First name",
        lastName: "Last name",
        firstNamePh: "Sabbir",
        lastNamePh: "Ahmed",
        email: "Email address",
        emailPh: "you@example.com",
        phone: "Phone number",
        phoneOptional: "(optional)",
        phonePh: "01XXXXXXXXX",
        whatsapp: "WhatsApp number",
        whatsappPh: "01XXXXXXXXX — order updates go here",
        college: "Medical college",
        collegePh: "Choose your college",
        password: "Password",
        passwordPh: "4–20 characters",
        confirm: "Confirm password",
        confirmPh: "Re-enter your password",
        showPw: "Show password",
        hidePw: "Hide password",
        submit: "Create account",
        creating: "Creating account...",
        or: "or",
        signingIn: "Signing you in...",
        haveAccount: "Already have an account?",
        login: "Log in",
        deviceNote: "For your security, each account can be used on up to 2 devices.",
        errFirst: "Enter your first name",
        errWhatsapp: "Enter a valid WhatsApp number, e.g. 01712345678",
        errCollege: "Choose your medical college",
        errLast: "Enter your last name",
        errEmail: "Enter a valid email address",
        errPwMin: "Password must be at least 4 characters",
        errPwMax: "Password must be at most 20 characters",
        errConfirm: "Please confirm your password",
        errMatch: "Passwords do not match",
        generic: "Registration failed. Please try again.",
        network: "Could not reach the server. Check your connection.",
        signedInFail: "Account created. Please log in.",
      };

  const schema = z
    .object({
      firstName: z.string().trim().min(1, S.errFirst),
      lastName: z.string().trim().min(1, S.errLast),
      email: z.email(S.errEmail),
      phoneNumber: z.string().trim().optional(),
      // Required, and matched against the same rule the server enforces so a
      // typo is caught before the round-trip. Accepts an optional +88/88.
      whatsappNumber: z
        .string()
        .trim()
        .regex(/^(?:\+?88)?01[3-9]\d{8}$/, S.errWhatsapp),
      password: z.string().min(4, S.errPwMin).max(20, S.errPwMax),
      confirmPassword: z.string().min(1, S.errConfirm),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: S.errMatch,
      path: ["confirmPassword"],
    });
  type RegisterForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
  });

  // College selection is a custom control, not a registered input.
  const [college, setCollege] = useState<{ _id: string; name: string } | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [collegeError, setCollegeError] = useState("");

  const onSubmit = async (values: RegisterForm) => {
    setApiError("");

    // The college lives outside react-hook-form (it is a custom picker), so its
    // one rule is checked here: pick from the list, or type a name.
    if (!college && !collegeName.trim()) {
      setCollegeError(S.errCollege);
      return;
    }
    setCollegeError("");

    setPhase("creating");
    try {
      const reg = await apiRegister({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phoneNumber: values.phoneNumber?.trim() || undefined,
        whatsappNumber: values.whatsappNumber.trim(),
        medicalCollege: college?._id,
        medicalCollegeName: college?.name || collegeName.trim(),
        password: values.password,
      });

      if (!reg.ok || !reg.success) {
        setApiError(reg.message || S.generic);
        setPhase("idle");
        return;
      }

      // Registration succeeded → auto-login to obtain tokens + device session.
      setPhase("signing-in");
      const login = await apiLogin({
        identifier: values.email.trim(),
        password: values.password,
        mode: "email",
      });

      if (login.ok && login.success && login.data) {
        persistSession(login.data);
        router.push("/");
        router.refresh();
        return;
      }

      // Account exists but auto-login failed — send them to the login page.
      router.push("/login?registered=1");
    } catch {
      setApiError(S.network);
      setPhase("idle");
    }
  };

  // Google sign-in is one step, not two: there is no separate "register" — the
  // server creates the account on first sight of a verified Google identity and
  // signs it in. So this lands wherever the account's role belongs, using the
  // same table the login page and the route guard read. An existing staff
  // member who presses it on THIS page still gets their own dashboard rather
  // than the "/" a fresh signup gets.
  const goAfterGoogle = (data: LoginData) => {
    const role = (data.user as { role?: string } | undefined)?.role;
    router.push(homeRouteFor(role));
    router.refresh();
  };

  const busy = isSubmitting || phase !== "idle";

  return (
    <AuthShell
      bengali={isBengali}
      icon={<LuUserPlus className="text-2xl" />}
      eyebrow={S.eyebrow}
      title={S.title}
      subtitle={S.subtitle}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="firstName"
            bengali={isBengali}
            label={S.firstName}
            icon={<LuUser className="text-base" />}
            placeholder={S.firstNamePh}
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <FormField
            id="lastName"
            bengali={isBengali}
            label={S.lastName}
            icon={<LuUser className="text-base" />}
            placeholder={S.lastNamePh}
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
        </div>

        <FormField
          id="email"
          bengali={isBengali}
          label={S.email}
          icon={<LuMail className="text-base" />}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={S.emailPh}
          error={errors.email?.message}
          {...register("email")}
        />

        <FormField
          id="phoneNumber"
          bengali={isBengali}
          label={`${S.phone} ${S.phoneOptional}`}
          icon={<LuPhone className="text-base" />}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={S.phonePh}
          error={errors.phoneNumber?.message}
          {...register("phoneNumber")}
        />

        {/* Required: this is how the shop actually reaches its customers about
            an order, so it is asked for at signup rather than chased later. */}
        <FormField
          id="whatsappNumber"
          bengali={isBengali}
          label={S.whatsapp}
          icon={<LuPhone className="text-base" />}
          type="tel"
          inputMode="tel"
          placeholder={S.whatsappPh}
          error={errors.whatsappNumber?.message}
          {...register("whatsappNumber")}
        />

        <CollegePicker
          bengali={isBengali}
          label={S.college}
          placeholder={S.collegePh}
          value={college}
          customName={collegeName}
          onChange={(picked: { _id: string; name: string } | null, typed: string) => {
            setCollege(picked);
            setCollegeName(typed);
            setCollegeError("");
          }}
          error={collegeError}
        />

        <PasswordInput
          id="password"
          bengali={isBengali}
          label={S.password}
          placeholder={S.passwordPh}
          autoComplete="new-password"
          maxLength={20}
          showToggleLabel={{ show: S.showPw, hide: S.hidePw }}
          error={errors.password?.message}
          {...register("password")}
        />

        <PasswordInput
          id="confirmPassword"
          bengali={isBengali}
          label={S.confirm}
          placeholder={S.confirmPh}
          autoComplete="new-password"
          maxLength={20}
          showToggleLabel={{ show: S.showPw, hide: S.hidePw }}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

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
        <Button type="submit" size="lg" disabled={busy} className={cn("w-full", bn)}>
          {phase === "creating" ? (
            <>
              <LuLoaderCircle className="animate-spin text-lg" /> {S.creating}
            </>
          ) : phase === "signing-in" ? (
            <>
              <LuCircleCheck className="text-lg" /> {S.signingIn}
            </>
          ) : (
            <>
              <LuUserPlus className="text-lg" /> {S.submit}
            </>
          )}
        </Button>

        {/* 2-device limit note */}
        <div className={cn("flex items-start gap-2 rounded-xl bg-primary-soft/60 px-4 py-3 text-xs text-primary", bn)}>
          <LuShieldCheck className="mt-0.5 shrink-0 text-sm" />
          <span>{S.deviceNote}</span>
        </div>
      </form>

      {/* Sign up with Google — same component as /login, only the wording on
          Google's own button differs. Renders nothing without
          NEXT_PUBLIC_GOOGLE_CLIENT_ID. Outside the <form> so it cannot be
          triggered by the form's Enter key. */}
      <div className="mt-6">
        <GoogleSignInButton
          bengali={isBengali}
          intent="signup"
          dividerLabel={S.or}
          onSuccess={goAfterGoogle}
          onError={setApiError}
        />
      </div>

      <p className={cn("mt-6 text-center text-sm text-muted-foreground", bn)}>
        {S.haveAccount}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {S.login}
        </Link>
      </p>
    </AuthShell>
  );
}

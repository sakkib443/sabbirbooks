"use client";

// Change-password form (POST /api/auth/change-password { currentPassword,
// newPassword }). Uses react-hook-form + zod; reuses the auth PasswordInput.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuKeyRound, LuLoaderCircle, LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import { Button, cn } from "@/components/ui";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { dashRequest } from "./dashboardApi";

export default function ChangePasswordForm({ isBengali }: { isBengali: boolean }) {
  const bn = isBengali ? "hind-siliguri" : "";
  const [apiError, setApiError] = useState("");
  const [done, setDone] = useState(false);

  const S = isBengali
    ? {
        title: "পাসওয়ার্ড পরিবর্তন",
        subtitle: "নিরাপত্তার জন্য নিয়মিত পাসওয়ার্ড পরিবর্তন করুন।",
        current: "বর্তমান পাসওয়ার্ড",
        currentPh: "আপনার বর্তমান পাসওয়ার্ড",
        next: "নতুন পাসওয়ার্ড",
        nextPh: "নতুন পাসওয়ার্ড",
        confirm: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
        confirmPh: "আবার লিখুন",
        show: "পাসওয়ার্ড দেখান",
        hide: "পাসওয়ার্ড লুকান",
        submit: "পাসওয়ার্ড আপডেট করুন",
        submitting: "আপডেট হচ্ছে...",
        successMsg: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।",
        errCurrent: "বর্তমান পাসওয়ার্ড দিন",
        errNextMin: "কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন",
        errNextMax: "সর্বোচ্চ ২০ অক্ষর",
        errConfirm: "পাসওয়ার্ড মিলছে না",
        generic: "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।",
        network: "সার্ভারে সংযোগ করা যায়নি।",
      }
    : {
        title: "Change password",
        subtitle: "Keep your account secure by updating your password regularly.",
        current: "Current password",
        currentPh: "Your current password",
        next: "New password",
        nextPh: "New password",
        confirm: "Confirm new password",
        confirmPh: "Re-enter new password",
        show: "Show password",
        hide: "Hide password",
        submit: "Update password",
        submitting: "Updating...",
        successMsg: "Your password has been changed successfully.",
        errCurrent: "Enter your current password",
        errNextMin: "Use at least 4 characters",
        errNextMax: "Use at most 20 characters",
        errConfirm: "Passwords do not match",
        generic: "Could not change your password.",
        network: "Could not reach the server.",
      };

  const schema = z
    .object({
      currentPassword: z.string().min(1, S.errCurrent),
      newPassword: z.string().min(4, S.errNextMin).max(20, S.errNextMax),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      path: ["confirmPassword"],
      message: S.errConfirm,
    });
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onSubmit" });

  const onSubmit = async (values: FormValues) => {
    setApiError("");
    setDone(false);
    const res = await dashRequest("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    });
    if (res.message === "__NETWORK__") {
      setApiError(S.network);
      return;
    }
    if (res.ok && res.success) {
      setDone(true);
      reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      return;
    }
    setApiError(res.message || S.generic);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LuKeyRound className="text-xl" />
        </span>
        <div>
          <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.title}</h2>
          <p className={cn("mt-0.5 text-sm text-muted-foreground", bn)}>{S.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PasswordInput
          id="currentPassword"
          bengali={isBengali}
          label={S.current}
          placeholder={S.currentPh}
          autoComplete="current-password"
          showToggleLabel={{ show: S.show, hide: S.hide }}
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            id="newPassword"
            bengali={isBengali}
            label={S.next}
            placeholder={S.nextPh}
            autoComplete="new-password"
            showToggleLabel={{ show: S.show, hide: S.hide }}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <PasswordInput
            id="confirmPassword"
            bengali={isBengali}
            label={S.confirm}
            placeholder={S.confirmPh}
            autoComplete="new-password"
            showToggleLabel={{ show: S.show, hide: S.hide }}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

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

        {done && (
          <div
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent",
              bn
            )}
          >
            <LuCircleCheck className="mt-0.5 shrink-0 text-base" />
            <span>{S.successMsg}</span>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className={cn("w-full sm:w-auto", bn)}>
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
    </div>
  );
}

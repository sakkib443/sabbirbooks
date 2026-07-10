"use client";

// Profile: identity card (GET /api/auth/me, falling back to the stored user),
// change-password form, and the active-devices panel (showcasing the 2-device
// limit).
import { useEffect, useState } from "react";
import { LuUserRound, LuMail, LuShieldCheck } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/components/ui";
import {
  dashRequest,
  getStoredUser,
  dashDisplayName,
  type DashProfile,
} from "@/components/dashboard/dashboardApi";
import { PageHeading } from "@/components/dashboard/primitives";
import ChangePasswordForm from "@/components/dashboard/ChangePasswordForm";
import DevicesPanel from "@/components/dashboard/DevicesPanel";

export default function ProfilePage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [profile, setProfile] = useState<DashProfile | null>(null);

  const S = isBengali
    ? {
        title: "প্রোফাইল",
        subtitle: "আপনার অ্যাকাউন্ট ও নিরাপত্তা সেটিংস।",
        role: "ভূমিকা",
        email: "ইমেইল",
        student: "শিক্ষার্থী",
      }
    : {
        title: "Profile",
        subtitle: "Your account and security settings.",
        role: "Role",
        email: "Email",
        student: "Student",
      };

  useEffect(() => {
    // Seed from localStorage instantly, then refresh from /auth/me.
    const stored = getStoredUser();
    if (stored) {
      setProfile({
        _id: String(stored._id || ""),
        email: stored.email,
        role: stored.role,
        firstName: stored.firstName,
        lastName: stored.lastName,
        name: stored.name,
      });
    }
    (async () => {
      const res = await dashRequest<DashProfile>("/auth/me");
      if (res.ok && res.data) setProfile(res.data);
    })();
  }, []);

  const name = dashDisplayName(profile);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div>
      <PageHeading icon={LuUserRound} title={S.title} subtitle={S.subtitle} bn={bn} />

      <div className="space-y-6">
        {/* Identity card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground">
            {initial}
          </span>
          <div className="min-w-0 text-center sm:text-left">
            <h2 className={cn("font-heading text-xl font-bold text-foreground", bn)}>{name}</h2>
            <div className="mt-2 flex flex-col items-center gap-1.5 sm:flex-row sm:flex-wrap sm:gap-4">
              {profile?.email && (
                <span className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", bn)}>
                  <LuMail className="text-primary" /> {profile.email}
                </span>
              )}
              <span className={cn("inline-flex items-center gap-1.5 text-sm capitalize text-muted-foreground", bn)}>
                <LuShieldCheck className="text-primary" /> {S.role}: {profile?.role || S.student}
              </span>
            </div>
          </div>
        </div>

        {/* Change password */}
        <ChangePasswordForm isBengali={isBengali} />

        {/* Active devices */}
        <DevicesPanel isBengali={isBengali} />
      </div>
    </div>
  );
}

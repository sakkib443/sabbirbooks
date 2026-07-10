"use client";

import Link from "next/link";
import {
  LuArrowRight,
  LuBookOpen,
  LuCheck,
  LuPlay,
  LuStethoscope,
  LuHeartPulse,
  LuPill,
  LuLanguages,
  LuClipboardCheck,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, buttonVariants, cn } from "@/components/ui";

type TFn = (key: string, fallback?: string) => string;

function HeroVisual({ t, bn }: { t: TFn; bn: string }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* soft glow */}
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-primary/25 via-transparent to-accent/25 blur-2xl" />

      {/* floating subject pills */}
      <div className="absolute -left-4 top-10 z-20 hidden animate-float-soft sm:block">
        <span className={cn("flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-card", bn)}>
          <LuHeartPulse className="text-base text-primary" /> {t("medicalCategories.items.physiology")}
        </span>
      </div>
      <div className="absolute -right-3 bottom-24 z-20 hidden animate-float-soft delay-300 sm:block">
        <span className={cn("flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-card", bn)}>
          <LuPill className="text-base text-accent" /> {t("medicalCategories.items.pharmacology")}
        </span>
      </div>

      {/* main preview card */}
      <div className="relative rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <LuStethoscope className="text-xl" />
            </span>
            <div>
              <p className={cn("text-sm font-semibold text-foreground", bn)}>{t("hero.previewSubject")}</p>
              <p className={cn("text-xs text-muted-foreground", bn)}>{t("hero.previewModule")}</p>
            </div>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-coral/12 px-2.5 py-1 text-[11px] font-bold text-coral", bn)}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral" /> {t("hero.live")}
          </span>
        </div>

        {/* ECG monitor */}
        <div className="relative mt-4 h-28 overflow-hidden rounded-2xl bg-[#08222a] p-3">
          <div className="absolute inset-0 bg-medical-dots opacity-25" />
          <svg viewBox="0 0 300 80" className="relative h-full w-full" fill="none" preserveAspectRatio="none" aria-hidden>
            <polyline
              className="animate-ecg"
              points="0,40 44,40 58,40 66,14 74,66 84,40 128,40 140,40 148,20 156,60 164,40 210,40 224,40 232,10 240,68 248,40 300,40"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute bottom-2 right-3 font-heading text-lg font-bold text-white">
            72 <span className="text-xs font-medium text-white/60">BPM</span>
          </span>
        </div>

        {/* progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className={cn("font-medium text-foreground", bn)}>{t("hero.previewLesson")}</span>
            <span className="font-semibold text-primary">40%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-primary to-accent" />
          </div>
        </div>

        {/* footer chips */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <span className={cn("inline-flex items-center gap-1.5 rounded-xl bg-surface-soft px-3 py-2 text-xs font-medium text-foreground", bn)}>
            <LuClipboardCheck className="text-primary" /> {t("hero.examReady")}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-xl bg-surface-soft px-3 py-2 text-xs font-medium text-foreground", bn)}>
            <LuLanguages className="text-accent" /> {t("hero.bilingual")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const stats = [
    { value: "40+", label: t("hero.statCourses") },
    { value: "12K+", label: t("hero.statStudents") },
    { value: "120+", label: t("hero.statBooks") },
  ];

  return (
    <section className="relative overflow-hidden bg-medical-mesh">
      <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />
      <Container className="relative">
        <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          {/* Left — copy */}
          <div className="animate-fade-up">
            <span className={cn("inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary", bn)}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {t("hero.badge")}
            </span>

            <h1 className={cn("mt-5 font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl", bn)}>
              {t("hero.headingLine1")} <span className="text-gradient-medical">{t("hero.headingAccent")}</span>
            </h1>

            <p className={cn("mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg", bn)}>
              {t("hero.subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses" className={cn(buttonVariants({ variant: "primary", size: "lg" }), bn)}>
                <LuStethoscope className="text-lg" /> {t("hero.ctaCourses")}
                <LuArrowRight className="text-sm" />
              </Link>
              <Link href="/books" className={cn(buttonVariants({ variant: "outline", size: "lg" }), bn)}>
                <LuBookOpen className="text-lg" /> {t("hero.ctaBooks")}
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {[t("hero.examReady"), t("hero.bilingual")].map((x) => (
                <span key={x} className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground", bn)}>
                  <LuCheck className="text-accent" /> {x}
                </span>
              ))}
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-border pt-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl font-bold text-foreground sm:text-3xl">{s.value}</p>
                  <p className={cn("mt-0.5 text-xs text-muted-foreground", bn)}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual */}
          <div className="relative animate-fade-up delay-200">
            <HeroVisual t={t} bn={bn} />
          </div>
        </div>
      </Container>
    </section>
  );
}

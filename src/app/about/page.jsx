"use client";

import Link from "next/link";
import {
  LuStethoscope,
  LuHeartPulse,
  LuBookOpen,
  LuShieldCheck,
  LuTarget,
  LuTrendingUp,
  LuUsers,
  LuGraduationCap,
  LuAward,
  LuSparkles,
  LuArrowRight,
  LuActivity,
  LuClipboardCheck,
  LuLanguages,
  LuQrCode,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, buttonVariants, cn } from "@/components/ui";
import StatsBand from "@/components/home/StatsBand";
import CtaBand from "@/components/home/CtaBand";

const AboutPage = () => {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const chips = [
    { key: "practicalTraining", Icon: LuClipboardCheck },
    { key: "expertMentors", Icon: LuStethoscope },
    { key: "careerGrowth", Icon: LuTrendingUp },
  ];

  const heroTiles = [
    { Icon: LuClipboardCheck, label: "practicalTraining", color: "text-primary", soft: "bg-primary/10" },
    { Icon: LuStethoscope, label: "expertMentors", color: "text-accent", soft: "bg-accent/10" },
    { Icon: LuQrCode, label: null, textEn: "QR Resources", textBn: "QR রিসোর্স", color: "text-secondary", soft: "bg-secondary/10" },
    { Icon: LuLanguages, label: null, textEn: "Bangla & English", textBn: "বাংলা ও ইংরেজি", color: "text-coral", soft: "bg-coral/10" },
  ];

  const mission = [
    { key: "globalLeadership", Icon: LuShieldCheck, color: "text-primary", soft: "bg-primary/10" },
    { key: "employmentGoals", Icon: LuUsers, color: "text-accent", soft: "bg-accent/10" },
    { key: "practicalSkills", Icon: LuActivity, color: "text-secondary", soft: "bg-secondary/10" },
    { key: "careerPaths", Icon: LuTrendingUp, color: "text-coral", soft: "bg-coral/10" },
  ];

  const values = [
    { key: "pioneers", Icon: LuClipboardCheck, color: "text-primary" },
    { key: "growth", Icon: LuTrendingUp, color: "text-accent" },
    { key: "impact", Icon: LuHeartPulse, color: "text-coral" },
    { key: "community", Icon: LuUsers, color: "text-secondary" },
    { key: "excellence", Icon: LuAward, color: "text-primary" },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-medical-mesh">
        <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />
        <Container className="relative">
          <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-20">
            <div className="animate-fade-up">
              <div className="mb-4 inline-flex items-center gap-2">
                <span className="h-px w-6 bg-primary/50" />
                <LuSparkles className="text-sm text-primary" />
                <span className={cn("text-xs font-bold uppercase tracking-[0.16em] text-primary", bn)}>
                  {t("aboutPage.badge")}
                </span>
              </div>
              <h1 className={cn("font-heading text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl", bn)}>
                {t("aboutPage.title1")}
                <span className="text-gradient-medical">{t("aboutPage.title2")}</span>
              </h1>
              <p className={cn("mt-5 text-lg font-medium text-foreground/80", bn)}>{t("aboutPage.subtitle")}</p>
              <div className={cn("mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground", bn)}>
                <p>{t("aboutPage.description1")}</p>
                <p>{t("aboutPage.description2")}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {chips.map(({ key, Icon }) => (
                  <span
                    key={key}
                    className={cn("inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-soft", bn)}
                  >
                    <Icon className="text-primary" /> {t(`aboutPage.${key}`)}
                  </span>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/courses" className={cn(buttonVariants({ variant: "primary", size: "lg" }), bn)}>
                  {t("aboutPage.exploreCourses")} <LuArrowRight className="text-sm" />
                </Link>
              </div>
            </div>

            {/* Visual */}
            <div className="relative animate-fade-up delay-200">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-primary/20 to-accent/20 blur-2xl" />
              <div className="relative rounded-3xl border border-border bg-card p-6 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-white shadow-glow">
                    <LuHeartPulse className="text-2xl" />
                  </span>
                  <div>
                    <p className="font-heading text-lg font-bold text-foreground">Sabbir Book</p>
                    <p className={cn("text-xs text-muted-foreground", bn)}>{t("home.tagline")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {heroTiles.map(({ Icon, label, textEn, textBn, color, soft }, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-surface-soft p-4">
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", soft)}>
                        <Icon className={cn("text-xl", color)} />
                      </span>
                      <p className={cn("mt-3 text-sm font-semibold text-foreground", bn)}>
                        {label ? t(`aboutPage.${label}`) : isBengali ? textBn : textEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <StatsBand />

      {/* Mission & Vision */}
      <section className="py-20">
        <Container>
          <SectionHeading
            bengali={isBengali}
            icon={<LuTarget />}
            eyebrow={t("aboutPage.missionBadge")}
            title={
              <>
                {t("aboutPage.missionTitle1")}
                <span className="text-gradient-medical">{t("aboutPage.missionTitle2")}</span>
              </>
            }
          />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {mission.map(({ key, Icon, color, soft }) => (
              <div
                key={key}
                className="group flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card"
              >
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", soft)}>
                  <Icon className={cn("text-2xl", color)} />
                </span>
                <div>
                  <h3 className={cn("font-heading text-lg font-semibold text-foreground", bn)}>{t(`aboutPage.${key}`)}</h3>
                  <p className={cn("mt-1.5 text-sm leading-relaxed text-muted-foreground", bn)}>{t(`aboutPage.${key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="bg-surface-soft py-20">
        <Container>
          <SectionHeading
            bengali={isBengali}
            icon={<LuAward />}
            eyebrow={t("aboutPage.valuesBadge")}
            title={
              <>
                {t("aboutPage.valuesTitle1")}
                <span className="text-gradient-medical">{t("aboutPage.valuesTitle2")}</span>
              </>
            }
          />
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {values.map(({ key, Icon, color }) => (
              <div
                key={key}
                className="group rounded-2xl border border-border bg-card p-6 text-center shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
              >
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft transition-transform duration-300 group-hover:scale-110">
                  <Icon className={cn("text-2xl", color)} />
                </span>
                <h3 className={cn("mt-4 font-heading text-lg font-semibold text-foreground", bn)}>{t(`aboutPage.${key}`)}</h3>
                <p className={cn("mt-1 text-xs font-medium", color, bn)}>{t(`aboutPage.${key}Subtitle`)}</p>
                <p className={cn("mt-2.5 text-sm leading-relaxed text-muted-foreground", bn)}>{t(`aboutPage.${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand />
    </main>
  );
};

export default AboutPage;

"use client";

import Link from "next/link";
import type { IconType } from "react-icons";
import {
  LuBone,
  LuHeartPulse,
  LuFlaskConical,
  LuPill,
  LuMicroscope,
  LuBug,
  LuUsers,
  LuScale,
  LuArrowRight,
  LuStethoscope,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, cn } from "@/components/ui";

interface Subject {
  key: string;
  en: string;
  Icon: IconType;
  color: string; // tailwind text color for the icon
  soft: string; // tailwind bg tint
}

const subjects: Subject[] = [
  { key: "anatomy", en: "Anatomy", Icon: LuBone, color: "text-primary", soft: "bg-primary/10" },
  { key: "physiology", en: "Physiology", Icon: LuHeartPulse, color: "text-coral", soft: "bg-coral/10" },
  { key: "biochemistry", en: "Biochemistry", Icon: LuFlaskConical, color: "text-accent", soft: "bg-accent/10" },
  { key: "pharmacology", en: "Pharmacology", Icon: LuPill, color: "text-secondary", soft: "bg-secondary/10" },
  { key: "pathology", en: "Pathology", Icon: LuMicroscope, color: "text-primary", soft: "bg-primary/10" },
  { key: "microbiology", en: "Microbiology", Icon: LuBug, color: "text-accent", soft: "bg-accent/10" },
  { key: "communityMedicine", en: "Community Medicine", Icon: LuUsers, color: "text-secondary", soft: "bg-secondary/10" },
  { key: "forensicMedicine", en: "Forensic Medicine", Icon: LuScale, color: "text-coral", soft: "bg-coral/10" },
];

export default function MedicalCategories() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          bengali={isBengali}
          icon={<LuStethoscope />}
          eyebrow={t("medicalCategories.eyebrow")}
          title={t("medicalCategories.title")}
          subtitle={t("medicalCategories.subtitle")}
        />

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {subjects.map(({ key, en, Icon, color, soft }) => (
            <Link
              key={key}
              href={`/courses?category=${encodeURIComponent(en)}`}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card"
            >
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", soft)}>
                <Icon className={cn("text-2xl", color)} />
              </span>
              <h3 className={cn("mt-4 font-heading text-base font-semibold text-foreground", bn)}>
                {t(`medicalCategories.items.${key}`)}
              </h3>
              <p className={cn("mt-1 text-xs leading-relaxed text-muted-foreground", bn)}>
                {t(`medicalCategories.items.${key}Desc`)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {t("medicalCategories.viewAll")} <LuArrowRight className="text-xs" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

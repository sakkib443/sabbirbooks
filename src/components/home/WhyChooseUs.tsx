"use client";

import type { IconType } from "react-icons";
import {
  LuStethoscope,
  LuClipboardCheck,
  LuQrCode,
  LuLanguages,
  LuMonitorSmartphone,
  LuShieldCheck,
  LuSparkles,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, cn } from "@/components/ui";

interface Feature {
  key: string;
  Icon: IconType;
  color: string;
  soft: string;
}

const features: Feature[] = [
  { key: "faculty", Icon: LuStethoscope, color: "text-primary", soft: "bg-primary/10" },
  { key: "exam", Icon: LuClipboardCheck, color: "text-accent", soft: "bg-accent/10" },
  { key: "qr", Icon: LuQrCode, color: "text-secondary", soft: "bg-secondary/10" },
  { key: "bilingual", Icon: LuLanguages, color: "text-primary", soft: "bg-primary/10" },
  { key: "device", Icon: LuMonitorSmartphone, color: "text-accent", soft: "bg-accent/10" },
  { key: "trusted", Icon: LuShieldCheck, color: "text-coral", soft: "bg-coral/10" },
];

export default function WhyChooseUs() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          bengali={isBengali}
          icon={<LuSparkles />}
          eyebrow={t("whyChoose.eyebrow")}
          title={t("whyChoose.title")}
          subtitle={t("whyChoose.subtitle")}
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ key, Icon, color, soft }) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card"
            >
              <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110", soft)}>
                <Icon className={cn("text-2xl", color)} />
              </span>
              <h3 className={cn("mt-5 font-heading text-lg font-semibold text-foreground", bn)}>
                {t(`whyChoose.items.${key}Title`)}
              </h3>
              <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", bn)}>
                {t(`whyChoose.items.${key}Desc`)}
              </p>
              <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

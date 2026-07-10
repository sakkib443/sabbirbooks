"use client";

import Link from "next/link";
import { LuArrowRight, LuStethoscope, LuBookOpen } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, cn } from "@/components/ui";

export default function CtaBand() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  return (
    <section className="py-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-strong px-6 py-14 text-center shadow-glow sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-10" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent/25 blur-2xl" />

          <div className="relative mx-auto max-w-2xl">
            <h2 className={cn("font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl", bn)}>
              {t("cta.title")}
            </h2>
            <p className={cn("mx-auto mt-4 max-w-xl text-white/85", bn)}>{t("cta.subtitle")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/courses"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-base font-semibold text-primary shadow-soft transition-transform hover:scale-[1.03]",
                  bn
                )}
              >
                <LuStethoscope className="text-lg" /> {t("cta.primary")} <LuArrowRight className="text-sm" />
              </Link>
              <Link
                href="/books"
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/60 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10",
                  bn
                )}
              >
                <LuBookOpen className="text-lg" /> {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

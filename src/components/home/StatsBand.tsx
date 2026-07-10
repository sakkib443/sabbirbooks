"use client";

import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuUsers, LuGraduationCap, LuBookOpen, LuHeart } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, cn } from "@/components/ui";

interface Stat {
  Icon: IconType;
  target: number;
  suffix: string;
  labelKey: string;
}

const stats: Stat[] = [
  { Icon: LuUsers, target: 12000, suffix: "+", labelKey: "students" },
  { Icon: LuGraduationCap, target: 40, suffix: "+", labelKey: "courses" },
  { Icon: LuBookOpen, target: 120, suffix: "+", labelKey: "books" },
  { Icon: LuHeart, target: 98, suffix: "%", labelKey: "satisfaction" },
];

function Counter({ target, active }: { target: number; active: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active]);
  return <>{value.toLocaleString("en-US")}</>;
}

export default function StatsBand() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const ref = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0b262c] py-16 text-white">
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-medical-dots opacity-[0.08]" />
      <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

      <Container className="relative">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <span className="h-px w-6 bg-primary/60" />
            <span className={cn("text-xs font-bold uppercase tracking-[0.16em] text-primary", bn)}>
              {t("stats.eyebrow")}
            </span>
            <span className="h-px w-6 bg-primary/60" />
          </div>
          <h2 className={cn("font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl", bn)}>
            {t("stats.title")}
          </h2>
          <p className={cn("mt-3 text-white/60", bn)}>{t("stats.subtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {stats.map(({ Icon, target, suffix, labelKey }) => (
            <div
              key={labelKey}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition-colors hover:bg-white/10"
            >
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="text-2xl" />
              </span>
              <p className="font-heading text-3xl font-bold text-white sm:text-4xl">
                <Counter target={target} active={active} />
                {suffix}
              </p>
              <p className={cn("mt-1 text-sm text-white/55", bn)}>{t(`stats.${labelKey}`)}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

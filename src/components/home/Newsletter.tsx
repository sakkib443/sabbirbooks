"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { LuMail, LuSend, LuCheck } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, Button, Input, cn } from "@/components/ui";

export default function Newsletter() {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) setDone(true);
  };

  return (
    <section className="pb-24">
      <Container>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-soft px-6 py-12 sm:px-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <LuMail className="text-2xl" />
              </span>
              <h2 className={cn("mt-4 font-heading text-2xl font-bold text-foreground sm:text-3xl", bn)}>
                {t("newsletter.title")}
              </h2>
              <p className={cn("mt-2 text-muted-foreground", bn)}>{t("newsletter.subtitle")}</p>
            </div>

            <div>
              {done ? (
                <div className={cn("flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft px-5 py-4 font-medium text-accent", bn)}>
                  <LuCheck className="text-xl" />
                  {isBengali ? "সাবস্ক্রাইব করার জন্য ধন্যবাদ!" : "Thanks for subscribing!"}
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("newsletter.placeholder")}
                    aria-label={t("newsletter.placeholder")}
                    className={cn("bg-card", bn)}
                  />
                  <Button type="submit" variant="accent" className={cn("shrink-0", bn)}>
                    {t("newsletter.button")} <LuSend className="text-sm" />
                  </Button>
                </form>
              )}
              <p className={cn("mt-3 text-xs text-muted-foreground", bn)}>{t("newsletter.note")}</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

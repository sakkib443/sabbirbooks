"use client";

/**
 * The shared shell every policy page renders in.
 *
 * One component rather than four hand-written pages: a payment gateway reads
 * these documents side by side, and four separately-styled pages with slightly
 * different contact blocks is exactly how the phone number in one ends up
 * disagreeing with the one in another. Here the contact block is written once
 * and the sibling links are generated from LEGAL_PAGES, so adding a policy
 * cannot leave the other three pointing at a set of three.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuMail, LuPhone, LuMapPin, LuClock, LuFileText } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, cn } from "@/components/ui";
import {
  BUSINESS_ADDRESS,
  BUSINESS_ADDRESS_BN,
  LEGAL_PAGES,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_HOURS_BN,
  SUPPORT_PHONE,
  SUPPORT_PHONE_INTL,
  type LegalSlug,
} from "@/config/business";
import { POLICIES, POLICY_UPDATED } from "./policyContent";

const S = {
  en: {
    updated: "Last updated",
    otherPolicies: "Other policies",
    contactHeading: "Questions about this policy?",
    contactIntro: "Call or write to us — we answer during business hours.",
    address: "Address",
    hours: "Support hours",
  },
  bn: {
    updated: "সর্বশেষ হালনাগাদ",
    otherPolicies: "অন্যান্য পলিসি",
    contactHeading: "এই পলিসি নিয়ে প্রশ্ন আছে?",
    contactIntro: "ফোন করুন বা লিখুন — অফিস সময়ে আমরা উত্তর দিই।",
    address: "ঠিকানা",
    hours: "সাপোর্ট সময়",
  },
};

export default function PolicyPage({ slug }: { slug: LegalSlug }) {
  const { isBengali } = useLanguage();
  const pathname = usePathname();
  const bn = isBengali ? "hind-siliguri" : "";
  const lang = isBengali ? "bn" : "en";
  const doc = POLICIES[slug][lang];
  const s = S[lang];

  return (
    <main className="py-10 sm:py-14">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
          <article>
            <header className="border-b border-border pb-6">
              <h1 className={cn("text-3xl font-bold tracking-tight text-foreground sm:text-4xl", bn)}>
                {doc.title}
              </h1>
              <p className={cn("mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground", bn)}>
                {doc.intro}
              </p>
              <p className={cn("mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground", bn)}>
                {s.updated}: {POLICY_UPDATED[lang]}
              </p>
            </header>

            {/* Sections are spaced by the list, not by margins on each heading —
                a margin on the first child collapses through the border above. */}
            <div className="mt-8 flex flex-col gap-8">
              {doc.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className={cn("text-lg font-semibold text-foreground sm:text-xl", bn)}>
                    {section.heading}
                  </h2>
                  <div className="mt-3 flex flex-col gap-3">
                    {section.body.map((para, i) => (
                      <p
                        key={i}
                        className={cn("max-w-2xl text-[15px] leading-7 text-muted-foreground", bn)}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* The gateway's review looks for a reachable human on every policy
                page, not only on a contact page — so it is here, not linked. */}
            <section className="mt-12 rounded-2xl border border-border bg-muted/50 p-6">
              <h2 className={cn("text-lg font-semibold text-foreground", bn)}>{s.contactHeading}</h2>
              <p className={cn("mt-1.5 text-sm text-muted-foreground", bn)}>{s.contactIntro}</p>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                <li>
                  <a
                    href={`tel:${SUPPORT_PHONE_INTL}`}
                    className="group flex items-start gap-3 text-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                      <LuPhone className="text-primary" />
                    </span>
                    <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                      {SUPPORT_PHONE}
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="group flex items-start gap-3 text-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                      <LuMail className="text-primary" />
                    </span>
                    <span className="break-all font-medium text-foreground transition-colors group-hover:text-primary">
                      {SUPPORT_EMAIL}
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                    <LuMapPin className="text-primary" />
                  </span>
                  <span>
                    <span className={cn("block text-xs text-muted-foreground", bn)}>{s.address}</span>
                    <span className={cn("font-medium text-foreground", bn)}>
                      {isBengali ? BUSINESS_ADDRESS_BN : BUSINESS_ADDRESS}
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                    <LuClock className="text-primary" />
                  </span>
                  <span>
                    <span className={cn("block text-xs text-muted-foreground", bn)}>{s.hours}</span>
                    <span className={cn("font-medium text-foreground", bn)}>
                      {isBengali ? SUPPORT_HOURS_BN : SUPPORT_HOURS}
                    </span>
                  </span>
                </li>
              </ul>
            </section>
          </article>

          {/* Sibling policies. Sticky on desktop so a long document keeps them
              reachable; a plain block on phones, where sticky would eat screen. */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <h2
              className={cn(
                "mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                bn
              )}
            >
              {s.otherPolicies}
            </h2>
            <ul className="flex flex-col gap-1">
              {LEGAL_PAGES.map((page) => {
                const href = `/${page.slug}`;
                const active = pathname === href;
                return (
                  <li key={page.slug}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-primary-soft font-semibold text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        bn
                      )}
                    >
                      <LuFileText className="shrink-0 text-base" />
                      {isBengali ? page.bn : page.en}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </Container>
    </main>
  );
}

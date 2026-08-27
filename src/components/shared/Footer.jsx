"use client";

import Link from "next/link";
import React, { useState } from "react";
import { FaFacebookF, FaYoutube, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import {
  LuMail,
  LuPhone,
  LuMapPin,
  LuSend,
  LuHeart,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/components/ui";
import { BrandMark, useBrand } from "./Brand";
import { PUBLIC_PAGES_ENABLED } from "@/config/site";

const Footer = () => {
  const [email, setEmail] = useState("");
  const { t, language } = useLanguage();
  const bn = language === "bn" ? "hind-siliguri" : "";
  const { name: brandName } = useBrand();

  // Same reasoning as the navbar: while the site is one book page, these routes
  // all redirect home, and a footer full of links that bounce is worse than a
  // short one. They return with NEXT_PUBLIC_PUBLIC_PAGES=on.
  const explore = PUBLIC_PAGES_ENABLED
    ? [
        { to: "/", label: t("navbar.home") },
        { to: "/courses", label: t("navbar.courses") },
        { to: "/books", label: t("navbar.books") },
        { to: "/about", label: t("navbar.about") },
        { to: "/contact", label: t("navbar.contact") },
      ]
    : [];

  // Subject links point into the course catalogue, which is switched off too.
  const subjects = PUBLIC_PAGES_ENABLED
    ? [
        { key: "anatomy", en: "Anatomy" },
        { key: "physiology", en: "Physiology" },
        { key: "pharmacology", en: "Pharmacology" },
        { key: "pathology", en: "Pathology" },
        { key: "microbiology", en: "Microbiology" },
      ]
    : [];

  const socials = [
    { icon: FaFacebookF, href: "#", label: "Facebook" },
    { icon: FaYoutube, href: "#", label: "YouTube" },
    { icon: FaLinkedinIn, href: "#", label: "LinkedIn" },
    { icon: FaWhatsapp, href: "#", label: "WhatsApp" },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#0b262c] text-white/70">
      {/* ambient medical glow */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent/15 blur-[120px]" />
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-secondary" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-12">
          {/* Brand + newsletter */}
          <div className="col-span-2 md:col-span-4 lg:col-span-5">
            {/* Name/logo come from site settings — the footer sits on a dark
                slab, so the wordmark is forced white here. */}
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BrandMark />
              <span className="text-xl font-bold tracking-tight text-white">{brandName}</span>
            </Link>
            <p className={cn("mt-4 max-w-sm text-sm leading-relaxed text-white/55", bn)}>
              {t("footer.brandDescription")}
            </p>

            <div className="mt-6">
              <p className={cn("mb-2.5 text-sm font-semibold text-white", bn)}>
                {t("footer.newsletterTitle")}
              </p>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="flex max-w-sm gap-2"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("footer.enterEmail")}
                  aria-label={t("footer.enterEmail")}
                  className={cn(
                    "h-11 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40",
                    bn
                  )}
                />
                <button
                  type="submit"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-transform hover:scale-105"
                  aria-label={t("footer.subscribe")}
                >
                  <LuSend className="text-base" />
                </button>
              </form>
            </div>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <h4 className={cn("mb-4 text-sm font-semibold uppercase tracking-wider text-white", bn)}>
              {t("footer.explore")}
            </h4>
            <ul className="space-y-2.5">
              {explore.map((link) => (
                <li key={link.to}>
                  <Link
                    href={link.to}
                    className={cn(
                      "group inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-primary",
                      bn
                    )}
                  >
                    <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-2.5" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Subjects */}
          <div className="lg:col-span-2">
            <h4 className={cn("mb-4 text-sm font-semibold uppercase tracking-wider text-white", bn)}>
              {t("footer.subjects")}
            </h4>
            <ul className="space-y-2.5">
              {subjects.map((s) => (
                <li key={s.key}>
                  <Link
                    href={`/courses?category=${encodeURIComponent(s.en)}`}
                    className={cn(
                      "group inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-primary",
                      bn
                    )}
                  >
                    <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-2.5" />
                    {t(`medicalCategories.items.${s.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 md:col-span-4 lg:col-span-3">
            <h4 className={cn("mb-4 text-sm font-semibold uppercase tracking-wider text-white", bn)}>
              {t("footer.contactUs")}
            </h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <a href="tel:01799075202" className="group flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <LuPhone className="text-sm text-primary" />
                  </span>
                  <span className="text-white/60 transition-colors group-hover:text-primary">
                    01799075202
                  </span>
                </a>
              </li>
              <li>
                <a href="mailto:info@sabbirbook.com" className="group flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <LuMail className="text-sm text-primary" />
                  </span>
                  <span className="break-all text-white/60 transition-colors group-hover:text-primary">
                    info@sabbirbook.com
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <LuMapPin className="text-sm text-primary" />
                </span>
                <span className={cn("text-white/60", bn)}>{t("footer.addressValue")}</span>
              </li>
            </ul>

            <div className="mt-5 flex gap-2.5">
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-all hover:border-primary hover:bg-primary hover:text-white"
                >
                  <s.icon className="text-sm" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:px-6 md:flex-row lg:px-8">
          <p className={cn("text-center text-sm text-white/45 md:text-left", bn)}>
            {t("footer.copyright")}
          </p>
          <p className={cn("flex items-center gap-1.5 text-sm text-white/45", bn)}>
            {t("footer.madeWith")}
            <LuHeart className="fill-coral text-xs text-coral" />
            {t("footer.inBangladesh")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

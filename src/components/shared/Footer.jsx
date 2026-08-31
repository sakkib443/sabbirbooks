"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useState } from "react";
import { FaFacebookF, FaYoutube, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import {
  LuMail,
  LuPhone,
  LuMapPin,
  LuSend,
  LuHeart,
  LuExternalLink,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/components/ui";
import { BrandMark, useBrand } from "./Brand";
import { PUBLIC_PAGES_ENABLED } from "@/config/site";
import { BUILT_BY, BUILT_BY_URL, LEGAL_PAGES } from "@/config/business";

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

  // Bengali strings for the parts added for the payment gateway's review. They
  // are not in src/locales because they must be present whatever an admin does
  // to the site's settings — a compliance line that can be renamed away is not
  // a compliance line.
  const L = language === "bn"
    ? {
        payTitle: "আমরা যেসব মাধ্যমে পেমেন্ট নিই",
        payNote: "SSLCommerz-এর মাধ্যমে কার্ড, মোবাইল ব্যাংকিং ও ইন্টারনেট ব্যাংকিং। আপনার কার্ড বা পিন আমরা দেখি না।",
        payAlt: "SSLCommerz-এর মাধ্যমে গৃহীত পেমেন্ট মাধ্যমসমূহ — ভিসা, মাস্টারকার্ড, অ্যামেক্স, বিকাশ, নগদ, রকেট, উপায় ও ব্যাংকসমূহ",
        productOf: "এটি",
        productOfSuffix: "-এর একটি প্রোডাক্ট",
      }
    : {
        payTitle: "Payment methods we accept",
        payNote: "Cards, mobile banking and internet banking through SSLCommerz. We never see your card or PIN.",
        payAlt: "Payment methods accepted through SSLCommerz — Visa, Mastercard, AMEX, bKash, Nagad, Rocket, Upay and banks",
        productOf: "A product of",
        productOfSuffix: "",
      };

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

          {/* Explore — dropped entirely when the marketing site is off, rather
              than left as a heading over an empty list. */}
          <div className={cn("lg:col-span-2", explore.length === 0 && "hidden")}>
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
          <div className={cn("lg:col-span-2", subjects.length === 0 && "hidden")}>
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

      {/* Payment methods — required by SSLCommerz: a shop taking their gateway
          must show which channels it accepts. This is their own banner, served
          from our public/ rather than hotlinked, so it cannot break if they
          move the file. It carries a white background of its own, hence the
          white card: on the dark slab the logos would otherwise sit on nothing. */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h4 className={cn("mb-1 text-sm font-semibold uppercase tracking-wider text-white", bn)}>
            {L.payTitle}
          </h4>
          <p className={cn("mb-4 max-w-2xl text-xs leading-relaxed text-white/45", bn)}>
            {L.payNote}
          </p>
          {/* The banner is ~9:1, so on a phone it is scrolled at a legible
              height rather than shrunk to a row of unreadable specks. */}
          <div className="overflow-x-auto rounded-xl bg-white p-3">
            <Image
              src="/payments/sslcommerz-banner.png"
              alt={L.payAlt}
              width={5235}
              height={586}
              sizes="(max-width: 640px) 640px, 1200px"
              className="h-20 w-auto max-w-none lg:h-24"
            />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          {/* Policy pages. A payment gateway's review looks for these from any
              page on the site, so they live in the footer, not behind a menu. */}
          <ul className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start">
            {LEGAL_PAGES.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${page.slug}`}
                  className={cn(
                    "text-sm text-white/55 underline-offset-4 transition-colors hover:text-primary hover:underline",
                    bn
                  )}
                >
                  {language === "bn" ? page.bn : page.en}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-4 md:flex-row">
            <p className={cn("text-center text-sm text-white/45 md:text-left", bn)}>
              {t("footer.copyright")}
            </p>

            {/* Who built and runs the site. Laid out as inline text, not as a
                flex row: Bengali attaches its possessive to the name with no
                space ("Ejobs IT-এর"), and a gap between flex items puts one
                there. The external-link mark trails the whole sentence for the
                same reason — inside the link it would land between the name and
                its possessive. */}
            <p className={cn("text-sm text-white/45", bn)}>
              {L.productOf}{" "}
              <a
                href={BUILT_BY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white/75 underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {BUILT_BY}
              </a>
              {L.productOfSuffix}
              <LuExternalLink className="ml-1 inline align-[-0.1em] text-[11px]" aria-hidden />
            </p>

            <p className={cn("flex items-center gap-1.5 text-sm text-white/45", bn)}>
              {t("footer.madeWith")}
              <LuHeart className="fill-coral text-xs text-coral" />
              {t("footer.inBangladesh")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

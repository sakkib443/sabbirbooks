"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LuMail, LuPhone, LuMapPin, LuClock, LuSend, LuArrowRight, LuCheck, LuSparkles } from "react-icons/lu";
import { FaFacebookF, FaYoutube, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import { useLanguage } from "@/context/LanguageContext";
import { Container, SectionHeading, Button, Input, cn } from "@/components/ui";
import API_BASE_URL from "@/config/api";

// Static contact defaults — a later agent can wire these to the settings API.
const INFO = {
  email: "info@sabbirbook.com",
  phone: "+880 1838-150832",
  whatsapp: "8801838150832",
  mapEmbed: "https://www.google.com/maps?q=Dhaka,Bangladesh&z=12&output=embed",
};

const ContactPage = () => {
  const { t, isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMessageSent(true);
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      setError(isBengali ? "মেসেজ পাঠাতে ব্যর্থ। পরে আবার চেষ্টা করুন।" : "Failed to send message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const infoCards = [
    { Icon: LuMail, titleKey: "emailUs", value: INFO.email, link: `mailto:${INFO.email}` },
    { Icon: LuPhone, titleKey: "callUs", value: INFO.phone, link: `tel:${INFO.phone.replace(/[^0-9+]/g, "")}` },
    { Icon: LuMapPin, titleKey: "visitUs", value: t("footer.addressValue"), link: "#map" },
    { Icon: LuClock, titleKey: "officeHours", value: t("contactPage.officeHoursValue"), link: null },
  ];

  const socials = [
    { Icon: FaFacebookF, href: "#", label: "Facebook" },
    { Icon: FaYoutube, href: "#", label: "YouTube" },
    { Icon: FaLinkedinIn, href: "#", label: "LinkedIn" },
    { Icon: FaWhatsapp, href: `https://wa.me/${INFO.whatsapp}`, label: "WhatsApp" },
  ];

  const labelClass = cn("mb-1.5 block text-sm font-medium text-foreground", bn);
  const fieldClass =
    "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

  return (
    <main>
      {/* Success modal */}
      {messageSent && (
        <>
          <div className="fixed inset-0 z-[9998] bg-foreground/50 backdrop-blur-sm" onClick={() => setMessageSent(false)} />
          <div className="fixed left-1/2 top-1/2 z-[9999] w-11/12 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
              <LuCheck className="text-3xl text-accent" />
            </div>
            <h3 className={cn("font-heading text-xl font-bold text-foreground", bn)}>{t("contactPage.messageSent")}</h3>
            <p className={cn("mt-2 text-muted-foreground", bn)}>{t("contactPage.messageResponse")}</p>
            <Button onClick={() => setMessageSent(false)} className={cn("mt-6", bn)}>
              {t("contactPage.close")}
            </Button>
          </div>
        </>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-medical-mesh">
        <div className="pointer-events-none absolute inset-0 bg-medical-grid opacity-60" />
        <Container className="relative py-16 lg:py-20">
          <SectionHeading
            bengali={isBengali}
            icon={<LuSparkles />}
            eyebrow={t("contactPage.badge")}
            title={
              <>
                {t("contactPage.title1")}
                <span className="text-gradient-medical">{t("contactPage.title2")}</span>
              </>
            }
            subtitle={t("contactPage.subtitle")}
          />
        </Container>
      </section>

      {/* Info cards */}
      <Container className="relative z-10 -mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {infoCards.map(({ Icon, titleKey, value, link }, i) => {
            const inner = (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="text-xl" />
                </span>
                <p className={cn("mt-4 text-sm text-muted-foreground", bn)}>{t(`contactPage.${titleKey}`)}</p>
                <p className={cn("mt-0.5 font-semibold text-foreground", bn)}>{value}</p>
              </>
            );
            const cls =
              "block rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-card";
            return link ? (
              <a key={i} href={link} className={cls}>
                {inner}
              </a>
            ) : (
              <div key={i} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </Container>

      {/* Form + side */}
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <h2 className={cn("font-heading text-2xl font-bold text-foreground", bn)}>{t("contactPage.sendMessage")}</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={labelClass}>{t("contactPage.yourName")}</label>
                  <Input id="name" value={formData.name} onChange={handleChange} required placeholder={isBengali ? "আপনার নাম" : "John Doe"} className={bn} />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>{t("contactPage.emailAddress")}</label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className={labelClass}>{t("contactPage.subject")}</label>
                <Input id="subject" value={formData.subject} onChange={handleChange} required placeholder={t("contactPage.howCanWeHelp")} className={bn} />
              </div>
              <div>
                <label htmlFor="message" className={labelClass}>{t("contactPage.message")}</label>
                <textarea
                  id="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder={t("contactPage.yourMessageHere")}
                  className={cn(fieldClass, "resize-none", bn)}
                />
              </div>
              {error && (
                <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
              )}
              <Button type="submit" disabled={loading} className={cn("w-full", bn)} size="lg">
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isBengali ? "পাঠানো হচ্ছে..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <LuSend className="text-lg" /> {t("contactPage.send")}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Side */}
          <div className="space-y-6">
            <div id="map" className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <iframe
                src={INFO.mapEmbed}
                width="100%"
                height="260"
                className="border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Sabbir Book location"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{t("contactPage.followUs")}</h3>
              <p className={cn("mt-1 text-sm text-muted-foreground", bn)}>{t("contactPage.socialDescription")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {socials.map(({ Icon, href, label }, i) => (
                  <Link
                    key={i}
                    href={href}
                    target="_blank"
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-all hover:scale-110 hover:bg-primary hover:text-white"
                  >
                    <Icon className="text-base" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C4B] p-6 text-white">
              <h3 className={cn("font-heading text-lg font-bold", bn)}>{t("contactPage.needQuickHelp")}</h3>
              <p className={cn("mt-1.5 text-sm text-white/85", bn)}>{t("contactPage.whatsappDescription")}</p>
              <a
                href={`https://wa.me/${INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("group mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-[#128C4B] transition-all hover:shadow-lg", bn)}
              >
                <FaWhatsapp className="text-lg" /> {t("contactPage.chatWhatsapp")}
                <LuArrowRight className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
};

export default ContactPage;

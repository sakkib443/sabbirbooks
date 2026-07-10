"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LuLanguages, LuCheck, LuChevronDown } from "react-icons/lu";
import { cn } from "@/components/ui";

const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "bn", label: "বাংলা", shortLabel: "বাং" },
];

const LanguageSwitcher = ({ variant = "default" }) => {
  const { language, setLanguage, isLoaded } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  if (!isLoaded) {
    return <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />;
  }

  // Compact segmented control — used inside the mobile menu.
  if (variant === "compact") {
    return (
      <div className="inline-flex gap-1 rounded-xl border border-border bg-muted p-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              language === lang.code
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
              lang.code === "bn" && "hind-siliguri"
            )}
          >
            {language === lang.code && <LuCheck className="text-sm" />}
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/40 hover:bg-primary-soft"
        aria-label="Switch language"
      >
        <LuLanguages className="text-base text-primary" />
        <span
          className={cn(
            "text-[13px] font-semibold text-foreground",
            language === "bn" && "hind-siliguri"
          )}
        >
          {currentLang.shortLabel}
        </span>
        <LuChevronDown
          className={cn(
            "text-sm text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200",
          isOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        )}
      >
        <div className="p-1.5">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                language === lang.code ? "bg-primary-soft" : "hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "flex-1 text-[13px] font-medium",
                  language === lang.code ? "text-primary" : "text-muted-foreground",
                  lang.code === "bn" && "hind-siliguri"
                )}
              >
                {lang.label}
              </span>
              {language === lang.code && <LuCheck className="text-sm text-primary" />}
            </button>
          ))}
        </div>
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      </div>
    </div>
  );
};

export default LanguageSwitcher;

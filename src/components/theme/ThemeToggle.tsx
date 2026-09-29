"use client";

import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "./ThemeProvider";
import type { ThemePreference } from "./theme-core";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: typeof FiSun;
}[] = [
  { value: "light", label: "Light", Icon: FiSun },
  { value: "dark", label: "Dark", Icon: FiMoon },
  { value: "system", label: "System", Icon: FiMonitor },
];

/**
 * Which palette the control paints itself in.
 *
 * The dashboard and the public site are two different token sets — `dash-*`
 * against `border`/`card`/`foreground` — so the same markup has to be able to
 * wear either. A second copy of this component is the alternative, and then
 * only one of them gets fixed the next time something changes.
 */
export type ThemeToggleTone = "dashboard" | "site";

const TONES: Record<ThemeToggleTone, { shell: string; active: string; idle: string }> = {
  dashboard: {
    shell: "border-dash-line bg-dash-soft",
    active: "bg-dash-card text-brand-ink shadow-sm",
    idle: "text-dash-mute hover:bg-dash-card/60 hover:text-dash-ink3",
  },
  site: {
    shell: "border-border bg-muted/40",
    active: "bg-card text-primary shadow-sm",
    idle: "text-muted-foreground hover:bg-card/60 hover:text-foreground",
  },
};

/**
 * Three-state theme control: light / dark / follow system. A radiogroup rather
 * than a two-state switch because "system" is a real, and the default, choice —
 * a switch cannot express it.
 */
export default function ThemeToggle({
  className = "",
  tone = "dashboard",
}: {
  className?: string;
  tone?: ThemeToggleTone;
}) {
  const { theme, setTheme } = useTheme();
  const t = TONES[tone];

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-xl border p-0.5 ${t.shell} ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              active ? t.active : t.idle
            }`}
          >
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

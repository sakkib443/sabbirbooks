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
 * Three-state theme control for the dashboard topbar: light / dark / follow
 * system. Rendered as a radiogroup rather than a two-state switch because
 * "system" is a real, and the default, choice — a switch cannot express it.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-xl border border-dash-line bg-dash-soft p-0.5 ${className}`}
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
              active
                ? "bg-dash-card text-brand-ink shadow-sm"
                : "text-dash-mute hover:bg-dash-card/60 hover:text-dash-ink3"
            }`}
          >
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

"use client";

// Form building blocks for admin create/edit forms. Text inputs reuse the shared
// UI <Input>; here we add a labelled Field wrapper, Textarea, Select, and two
// repeatable-list editors (string list + icon/text pair list).
import { forwardRef, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Input, cn } from "@/components/ui";

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-coral">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium text-coral">{error}</p>}
    </div>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 transition-colors",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        "disabled:opacity-55 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground",
        "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        "disabled:opacity-55 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ── Repeatable list of plain strings (curriculum, software, job positions…) ──
export function StringListEditor({
  values,
  onChange,
  placeholder = "Add item…",
  addLabel = "Add item",
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const update = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, ""]);

  return (
    <div className="space-y-2">
      {values.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={val}
            placeholder={placeholder}
            onChange={(e) => update(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-coral/40 hover:bg-coral/10 hover:text-coral"
            aria-label="Remove"
          >
            <LuTrash2 />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
      >
        <LuPlus /> {addLabel}
      </button>
    </div>
  );
}

// ── Repeatable list of { icon, text } pairs (courseIncludes) ──
export function PairListEditor({
  values,
  onChange,
}: {
  values: { icon: string; text: string }[];
  onChange: (next: { icon: string; text: string }[]) => void;
}) {
  const update = (i: number, key: "icon" | "text", v: string) => {
    const next = values.map((row, idx) => (idx === i ? { ...row, [key]: v } : row));
    onChange(next);
  };
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => onChange([...values, { icon: "", text: "" }]);

  return (
    <div className="space-y-2">
      {values.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={row.icon}
            placeholder="Icon (e.g. LuClock)"
            className="w-40 shrink-0"
            onChange={(e) => update(i, "icon", e.target.value)}
          />
          <Input
            value={row.text}
            placeholder="Text (e.g. 24 hours on-demand video)"
            onChange={(e) => update(i, "text", e.target.value)}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-coral/40 hover:bg-coral/10 hover:text-coral"
            aria-label="Remove"
          >
            <LuTrash2 />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
      >
        <LuPlus /> Add include
      </button>
    </div>
  );
}

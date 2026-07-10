"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Input, cn } from "@/components/ui";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode; // left-aligned adornment (e.g. an email icon)
  rightSlot?: ReactNode; // right-aligned adornment (e.g. show/hide toggle)
  error?: string;
  hint?: string;
  bengali?: boolean;
}

// Labelled input used across the auth forms. Forwards its ref to the underlying
// <input> so it plugs straight into react-hook-form's register().
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, icon, rightSlot, error, hint, bengali, className, id, ...props }, ref) => {
    const bn = bengali ? "hind-siliguri" : "";
    return (
      <div>
        <label htmlFor={id} className={cn("mb-1.5 block text-sm font-medium text-foreground", bn)}>
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </span>
          )}
          <Input
            id={id}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            className={cn(
              icon && "pl-11",
              rightSlot && "pr-11",
              error && "border-coral focus:border-coral focus:ring-coral/25",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
          )}
        </div>
        {error ? (
          <p className={cn("mt-1.5 text-xs font-medium text-coral", bn)}>{error}</p>
        ) : hint ? (
          <p className={cn("mt-1.5 text-xs text-muted-foreground", bn)}>{hint}</p>
        ) : null}
      </div>
    );
  }
);
FormField.displayName = "FormField";

export default FormField;

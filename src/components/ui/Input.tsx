import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 transition-colors",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        "disabled:opacity-55 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export default Input;

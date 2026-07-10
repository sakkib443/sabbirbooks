import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "accent" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background disabled:opacity-55 disabled:pointer-events-none whitespace-nowrap select-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover hover:shadow-glow",
  accent: "bg-accent text-accent-foreground shadow-soft hover:brightness-105 hover:shadow-glow",
  secondary: "bg-secondary text-secondary-foreground shadow-soft hover:brightness-105",
  outline: "border border-primary/40 text-primary bg-transparent hover:bg-primary-soft hover:border-primary",
  ghost: "text-foreground/80 hover:bg-muted hover:text-primary",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[15px]",
  lg: "h-12 px-8 text-base",
};

// Exported so links can look like buttons: <Link className={buttonVariants({ variant: "accent" })} />
export function buttonVariants(
  { variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}
): string {
  return cn(base, variants[variant], sizes[size]);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export default Button;

import type { ElementType, ReactNode } from "react";
import { cn } from "./cn";

// Centered page gutter used by every section for consistent width + padding.
export function Container({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  );
}

export default Container;

// Tiny className joiner — no external deps. Filters out falsy values so
// conditional classes (`cond && "cls"`) collapse cleanly.
// `bigint` is included because React 19's ReactNode type allows it, so
// consumer patterns like `icon && "pl-11"` (icon: ReactNode) type-check.
export type ClassValue = string | number | bigint | null | false | undefined;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

export default cn;

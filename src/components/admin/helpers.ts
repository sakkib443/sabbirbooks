// Small shared formatting/util helpers for the admin panel.

// URL-friendly slug: lowercase, spaces/punct → single dash, trimmed.
export function slugify(input: string): string {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿]+/g, "-") // keep latin + bengali code points
    .replace(/^-+|-+$/g, "");
}

// Bangladeshi Taka formatting. Accepts number or numeric string ("৳12,000").
export function formatBDT(value: number | string | undefined | null): string {
  const n =
    typeof value === "number"
      ? value
      : parseInt(String(value ?? "").replace(/[^0-9.]/g, ""), 10);
  if (!n || isNaN(n)) return "৳0";
  return `৳${n.toLocaleString("en-US")}`;
}

export function formatNumber(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "0";
  return value.toLocaleString("en-US");
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// For <input type="date"> value (yyyy-mm-dd).
export function toDateInput(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

type BadgeVariant = "primary" | "accent" | "secondary" | "coral" | "outline" | "muted";

// Maps a publish/order/qr status string to a UI Badge variant.
export function statusVariant(status?: string): BadgeVariant {
  switch (status) {
    case "published":
    case "paid":
    case "delivered":
    case "access-granted":
    case "replied":
      return "accent";
    case "draft":
    case "pending":
    case "unread":
      return "muted";
    case "processing":
    case "shipped":
    case "read":
      return "secondary";
    case "archived":
    case "cancelled":
    case "failed":
      return "coral";
    default:
      return "primary";
  }
}

// Title-case a raw status/enum for display.
export function prettyLabel(value?: string): string {
  if (!value) return "—";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

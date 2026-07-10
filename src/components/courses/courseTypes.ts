// Shared types + helpers for the Courses pages.
// The public API returns `category` and `mentor` as ObjectId strings on the
// list endpoint (GET /api/courses) but as populated objects on the detail
// endpoint (GET /api/courses/:id) — the helpers below handle both shapes.

export interface Category {
  _id: string;
  id?: number;
  name: string;
}

export interface Mentor {
  _id: string;
  id?: string;
  name: string;
  designation?: string;
  subject?: string;
  image?: string;
  details?: string;
  specialized_area?: string[];
  education_qualification?: string[];
  training_experience?: { years?: string; students?: string };
}

export interface CourseInclude {
  icon?: string;
  text: string;
  _id?: string;
}

export interface Course {
  _id: string;
  id: number;
  title: string;
  slug: string;
  category?: string | Category;
  mentor?: string | Mentor;
  type?: "Online" | "Offline" | "Recorded" | string;
  status?: string;
  image?: string;
  fee?: string;
  offerPrice?: string;
  admissionFee?: number;
  rating?: number;
  totalRating?: number;
  totalStudentsEnroll?: number;
  technology?: string;
  courseStart?: string;
  durationMonth?: number;
  curriculum?: string[];
  lectures?: number;
  totalExam?: number;
  totalProject?: number;
  details?: string;
  courseOverview?: string;
  courseIncludes?: CourseInclude[];
  softwareYoullLearn?: string[];
  jobPositions?: string[];
}

// Format a numeric-ish string/number as Bangladeshi Taka, or null when
// empty/invalid so callers can fall back gracefully.
export function formatBDT(v?: string | number | null): string | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return "৳" + n.toLocaleString("en-US");
}

export function isFree(fee?: string | number): boolean {
  return !fee || Number(fee) === 0;
}

// The saving between fee and offerPrice, or null when there is no real discount.
export function savingBDT(fee?: string, offerPrice?: string): string | null {
  const f = Number(fee);
  const o = Number(offerPrice);
  if (!offerPrice || Number.isNaN(f) || Number.isNaN(o) || o >= f) return null;
  return formatBDT(f - o);
}

// `category` may be an id string (list) or a populated object (detail).
export function categoryId(c?: string | Category): string | undefined {
  if (!c) return undefined;
  return typeof c === "string" ? c : c._id;
}

export function categoryName(
  c?: string | Category,
  lookup?: Record<string, string>
): string | undefined {
  if (!c) return undefined;
  if (typeof c === "object") return c.name;
  return lookup?.[c];
}

// `mentor` may be an id string (list) or a populated object (detail).
export function resolveMentor(
  m?: string | Mentor,
  lookup?: Record<string, Mentor>
): Mentor | undefined {
  if (!m) return undefined;
  if (typeof m === "object") return m;
  return lookup?.[m];
}

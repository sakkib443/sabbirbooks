// Recorded courses (25 Oct 2026): the few server calls the public course pages
// make — the list, one course with its lessons, whether the visitor already has
// it, and buying it. The server decides every price and every lock; nothing
// here is trusted (see lessonAccess.ts and coursePricing.ts on the server).
import API_BASE_URL from "@/config/api";
import { STORAGE_KEYS } from "@/components/auth/authClient";

export interface RecordedCourse {
  _id: string;
  id?: number;
  slug?: string;
  /** English; `titleBn` is the Bengali (as on modules and lessons). */
  title: string;
  titleBn?: string;
  image?: string;
  details?: string;
  detailsBn?: string;
  type?: string;
  status?: string;
  fee?: string | number;
  offerPrice?: string | number;
  lectures?: number;
  courseIncludes?: { icon?: string; text?: string; textBn?: string }[];
}

export interface RecordedLesson {
  _id: string;
  title: string;
  titleBn?: string;
  type?: string;
  videoUrl?: string;
  videoDuration?: number;
  isFree?: boolean;
  locked?: boolean;
  order?: number;
  moduleId?: string | { _id: string };
}

export interface RecordedModule {
  _id: string;
  title: string;
  titleBn?: string;
  order?: number;
  lessons: RecordedLesson[];
}

export interface CourseAccess {
  hasAccess: boolean;
  pending?: boolean;
}

export const getToken = (): string => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE_KEYS.token) || "";
  } catch {
    return "";
  }
};

const auth = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...auth(), ...(init.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  // The server's own message, or none — each page words its fallback in the
  // visitor's language.
  if (!res.ok || json.success === false) throw new Error(json.message || "");
  return json.data as T;
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** What the buyer pays — the offer price when it is lower, as on the server. */
export const coursePrice = (c: Pick<RecordedCourse, "fee" | "offerPrice">) => {
  const fee = num(c.fee);
  const offer = num(c.offerPrice);
  return offer > 0 && offer < fee ? offer : fee;
};
/** The struck-through price, when there is an offer. */
export const courseListPrice = (c: Pick<RecordedCourse, "fee" | "offerPrice">) => {
  const fee = num(c.fee);
  return coursePrice(c) < fee ? fee : 0;
};

export const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

export const isLoggedIn = () => !!getToken();

/**
 * The course's own words in the visitor's language (the site's EN/বাং switch),
 * falling back to the other language when only one was written.
 */
export const pick = (bn: boolean, en?: string, bnText?: string) => (bn ? bnText || en : en || bnText) || "";
export const titleOf = (bn: boolean, x: { title?: string; titleBn?: string }) => pick(bn, x.title, x.titleBn);


/** The published recorded courses, newest first. */
export const listRecordedCourses = () =>
  call<RecordedCourse[]>("/courses?type=Recorded&sort=newest&limit=60").then((d) => d || []);

export const getCourse = (id: string) => call<RecordedCourse>(`/courses/${encodeURIComponent(id)}`);

/** The course's modules with their lessons — locked ones come without a video. */
export async function getCurriculum(courseId: string): Promise<RecordedModule[]> {
  const [mods, lessons] = await Promise.all([
    call<RecordedModule[]>(`/modules/course/${courseId}`),
    call<RecordedLesson[]>(`/lessons/course/${courseId}`),
  ]);
  const byModule = new Map<string, RecordedLesson[]>();
  for (const l of lessons || []) {
    const mid = typeof l.moduleId === "object" ? l.moduleId?._id : l.moduleId;
    if (!mid) continue;
    if (!byModule.has(mid)) byModule.set(mid, []);
    byModule.get(mid)!.push(l);
  }
  return (mods || [])
    .filter((m) => (m as { isPublished?: boolean }).isPublished !== false)
    .map((m) => ({
      ...m,
      lessons: (byModule.get(m._id) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter((m) => m.lessons.length > 0);
}

export const checkAccess = (courseId: string) =>
  isLoggedIn()
    ? call<CourseAccess>(`/enrollments/check-access/${courseId}`).catch(() => ({ hasAccess: false }))
    : Promise.resolve({ hasAccess: false } as CourseAccess);

/** Payment gateway the server has keys for (SSLCommerz — card, bKash, Nagad…). */
export const gatewayReady = () =>
  call<{ sslcommerz?: { configured?: boolean } }>("/payment/gateways")
    .then((g) => !!g?.sslcommerz?.configured)
    .catch(() => false);

/** The shop's Send Money numbers (Settings → Payment). */
export async function walletNumbers(): Promise<{ id: "bkash" | "nagad" | "rocket"; label: string; labelEn: string; number: string }[]> {
  try {
    const s = await call<Record<string, string>>("/settings");
    return [
      { id: "bkash" as const, label: "বিকাশ", labelEn: "bKash", number: s?.paymentBkashNumber || "" },
      { id: "nagad" as const, label: "নগদ", labelEn: "Nagad", number: s?.paymentNagadNumber || "" },
      { id: "rocket" as const, label: "রকেট", labelEn: "Rocket", number: s?.paymentRocketNumber || "" },
    ].filter((w) => w.number);
  } catch {
    return [];
  }
}

export const enrollFree = (courseId: string) =>
  call("/payment/free/enroll", { method: "POST", body: JSON.stringify({ courseId }) });

/** Online payment: returns the gateway page to send the buyer to. */
export async function startGateway(course: RecordedCourse): Promise<string> {
  const d = await call<{ GatewayPageURL?: string }>("/payment/sslcommerz/init", {
    method: "POST",
    body: JSON.stringify({ courseId: course._id, courseName: course.title }),
  });
  if (!d?.GatewayPageURL) throw new Error("");
  return d.GatewayPageURL;
}

/** Send Money order — waits for the admin to check the TrxID. */
export const submitSendMoney = (
  courseId: string,
  d: { channel: string; senderNumber: string; transactionId: string }
) =>
  call("/payment/manual/submit", {
    method: "POST",
    body: JSON.stringify({
      courseId,
      paymentType: d.channel,
      senderNumber: d.senderNumber,
      transactionId: d.transactionId,
    }),
  });

export const learnHref = (courseId: string) => `/dashboard/user/courses/${courseId}/learn`;

/** A YouTube (or youtu.be) link as an embeddable player URL. */
export function youtubeEmbed(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2];
    else id = u.searchParams.get("v");
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
  } catch {
    return null;
  }
}

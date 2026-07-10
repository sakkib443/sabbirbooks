// Types + data helpers for the recorded-course player (/learn/[courseId]).
//
// Endpoints (confirmed against the server modules):
//   GET /api/courses/:id                     → course (mentor populated)
//   GET /api/modules/course/:courseId        → modules (sorted by order)
//   GET /api/lessons/course/:courseId        → lessons (moduleId populated {title,order})
//   GET /api/enrollments/check-access/:id     → { hasAccess, enrollment }  (auth)
//
// Gating is enforced client-side: a lesson is playable when the student has an
// active enrollment (hasAccess) OR the lesson is flagged isFree (preview).
import API_BASE_URL from "@/config/api";
import { getToken } from "@/components/dashboard/dashboardApi";

export type LessonType = "video" | "text" | "quiz" | "assignment";

export interface LearnMentor {
  _id?: string;
  name?: string;
  image?: string;
  designation?: string;
}

export interface LearnCourse {
  _id: string;
  id?: number;
  title?: string;
  slug?: string;
  image?: string;
  type?: string;
  fee?: string;
  offerPrice?: string;
  lectures?: number;
  mentor?: LearnMentor | string;
}

export interface LearnMaterial {
  _id?: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}

export interface LearnLesson {
  _id: string;
  moduleId: string | { _id: string; title?: string; order?: number };
  title: string;
  titleBn?: string;
  description?: string;
  type: LessonType;
  videoUrl?: string;
  videoDuration?: number;
  textContent?: string;
  materials?: LearnMaterial[];
  order: number;
  isFree?: boolean;
  isPublished?: boolean;
}

export interface LearnModule {
  _id: string;
  title: string;
  titleBn?: string;
  description?: string;
  order: number;
}

// A module with its ordered lessons — the shape the sidebar renders.
export interface CurriculumModule extends LearnModule {
  lessons: LearnLesson[];
}

function moduleIdOf(lesson: LearnLesson): string {
  return typeof lesson.moduleId === "object" ? lesson.moduleId._id : lesson.moduleId;
}

// A lesson is playable if the student is enrolled OR it's a free preview.
export function isLessonPlayable(lesson: LearnLesson, hasAccess: boolean): boolean {
  return hasAccess || Boolean(lesson.isFree);
}

// Merge modules + lessons into an ordered curriculum. Lessons whose module was
// not returned (e.g. an unpublished module) are grouped from their populated
// moduleId so nothing silently disappears.
export function buildCurriculum(
  modules: LearnModule[],
  lessons: LearnLesson[]
): CurriculumModule[] {
  const byModule = new Map<string, LearnLesson[]>();
  for (const lesson of lessons) {
    const key = moduleIdOf(lesson);
    if (!key) continue;
    const arr = byModule.get(key) || [];
    arr.push(lesson);
    byModule.set(key, arr);
  }

  const known = new Set(modules.map((m) => m._id));
  const result: CurriculumModule[] = modules
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m) => ({
      ...m,
      lessons: (byModule.get(m._id) || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }));

  // Append orphan modules (present only via populated lesson.moduleId).
  for (const [key, arr] of byModule) {
    if (known.has(key)) continue;
    const first = arr[0];
    const pop = typeof first.moduleId === "object" ? first.moduleId : undefined;
    result.push({
      _id: key,
      title: pop?.title || "Lessons",
      order: pop?.order ?? 999,
      lessons: arr.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    });
  }

  return result;
}

// Flatten curriculum into a single ordered lesson list (module-then-lesson).
export function flattenLessons(curriculum: CurriculumModule[]): LearnLesson[] {
  return curriculum.flatMap((m) => m.lessons);
}

// ── Fetchers ────────────────────────────────────────────────────────────────
async function getJson<T>(path: string, withAuth = false): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (withAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: T };
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export interface LearnData {
  course: LearnCourse | null;
  curriculum: CurriculumModule[];
  hasAccess: boolean;
}

export async function fetchLearnData(courseId: string): Promise<LearnData> {
  const loggedIn = Boolean(getToken());

  // The URL id may be a Mongo _id, a numeric id, or a slug — /courses/:id
  // resolves all three. Modules/lessons/access, however, key on the Mongo
  // ObjectId, so resolve the course first and use its _id downstream.
  const course = await getJson<LearnCourse>(`/courses/${encodeURIComponent(courseId)}`);
  const realId = course?._id || courseId;

  const [modules, lessons, access] = await Promise.all([
    getJson<LearnModule[]>(`/modules/course/${encodeURIComponent(realId)}`),
    getJson<LearnLesson[]>(`/lessons/course/${encodeURIComponent(realId)}`),
    loggedIn
      ? getJson<{ hasAccess?: boolean }>(`/enrollments/check-access/${encodeURIComponent(realId)}`, true)
      : Promise.resolve(null),
  ]);

  const curriculum = buildCurriculum(
    Array.isArray(modules) ? modules : [],
    Array.isArray(lessons) ? lessons : []
  );

  return {
    course: course ?? null,
    curriculum,
    hasAccess: Boolean(access?.hasAccess),
  };
}

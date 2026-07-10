import { Suspense } from "react";
import CoursesBrowser, { CoursesBrowserFallback } from "@/components/courses/CoursesBrowser";

// The browser reads ?category= / ?search= via useSearchParams, so it must sit
// inside a Suspense boundary to keep the route prerenderable (Next.js 16).
export default function CoursesPage() {
  return (
    <Suspense fallback={<CoursesBrowserFallback />}>
      <CoursesBrowser />
    </Suspense>
  );
}

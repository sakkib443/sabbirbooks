import RecordedCourseList from "@/components/recorded/RecordedCourseList";

export const metadata = { title: "কোর্স" };

// The recorded courses (25 Oct 2026). The old catalogue browser is still in
// components/courses/CoursesBrowser for when the wider site returns.
export default function CoursesPage() {
  return <RecordedCourseList />;
}

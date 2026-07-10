import CourseDetailView from "@/components/courses/CourseDetailView";

// Detail reads its id via useParams inside the client view, so no Suspense
// boundary is required here.
export default function CourseDetailPage() {
  return <CourseDetailView />;
}

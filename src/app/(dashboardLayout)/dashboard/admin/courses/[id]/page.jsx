'use client';

import { useParams } from 'next/navigation';
import CourseEditor from '@/components/admin/courses/CourseEditor';

// Courses → a course's own page: its details, then its modules and classes.
export default function EditCoursePage() {
  const { id } = useParams();
  return <CourseEditor courseId={id} />;
}

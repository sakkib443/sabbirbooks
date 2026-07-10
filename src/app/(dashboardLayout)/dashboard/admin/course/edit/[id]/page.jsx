'use client';

import { useParams } from 'next/navigation';
import CourseForm from '@/components/admin/course/CourseForm';

// Create & Edit share the same form — see components/admin/course/CourseForm.jsx
// Supports ?tab=modules to open the Modules & Lessons tab directly (Recorded courses).
const EditCoursePage = () => {
  const { id } = useParams();
  return <CourseForm mode="edit" courseId={id} />;
};

export default EditCoursePage;

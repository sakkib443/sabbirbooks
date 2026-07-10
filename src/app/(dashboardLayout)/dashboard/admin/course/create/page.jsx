'use client';

import CourseForm from '@/components/admin/course/CourseForm';

// Create & Edit share the same form — see components/admin/course/CourseForm.jsx
const CreateCoursePage = () => <CourseForm mode="create" />;

export default CreateCoursePage;

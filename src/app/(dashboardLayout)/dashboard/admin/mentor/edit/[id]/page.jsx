'use client';

import { useParams } from 'next/navigation';
import MentorForm from '@/components/admin/mentor/MentorForm';

export default function EditMentorPage() {
  const { id } = useParams();
  return <MentorForm mode="edit" mentorId={id} />;
}

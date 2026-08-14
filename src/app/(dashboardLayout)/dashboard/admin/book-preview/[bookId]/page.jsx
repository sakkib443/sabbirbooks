'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Old nested admin URL → standalone full-screen player. */
export default function BookPreviewRedirect() {
  const { bookId } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (bookId) router.replace(`/book-preview/${bookId}`);
  }, [bookId, router]);

  return (
    <div className="p-8 text-dash-mute text-sm">প্রিভিউ খোলা হচ্ছে…</div>
  );
}

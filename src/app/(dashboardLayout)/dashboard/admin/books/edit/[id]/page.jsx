'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLoader, FiAlertCircle } from 'react-icons/fi';
import BookForm from '@/components/admin/book/BookForm';

const API =
  ((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')) + '/api';

// Map the API book document onto BookForm's field shape. Numbers become strings
// for controlled inputs; secureFileUrl is select:false server-side so it arrives
// blank — the form treats that as "keep existing".
const toFormValues = (b) => ({
  title: b.title || '',
  slug: b.slug || '',
  author: b.author || '',
  category: b.category || '',
  description: b.description || '',
  coverImage: b.coverImage || '',
  price: b.price ?? '',
  offerPrice: b.offerPrice ?? '',
  language: b.language || 'both',
  format: b.format || 'printed',
  stock: b.stock ?? '',
  secureFileUrl: '',
  previewImages: Array.isArray(b.previewImages) ? b.previewImages : [],
  previewPdfUrl: b.previewPdfUrl || '',
  status: b.status || 'published',
  isFeatured: !!b.isFeatured,
});

export default function EditBookPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', values: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/books/${id}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false || !json.data) {
          throw new Error(json.message || 'Book not found');
        }
        if (alive) setState({ loading: false, error: '', values: toFormValues(json.data) });
      } catch (err) {
        if (alive) setState({ loading: false, error: err.message || 'Failed to load book', values: null });
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <FiLoader className="animate-spin mr-2" /> Loading book…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-8">
        <Link href="/dashboard/admin/books" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6">
          <FiArrowLeft /> Back to books
        </Link>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600">
          <FiAlertCircle /> {state.error}
        </div>
      </div>
    );
  }

  return <BookForm mode="edit" bookId={id} initialValues={state.values} />;
}

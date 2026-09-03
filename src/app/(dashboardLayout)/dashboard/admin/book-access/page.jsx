// Who can read the book, how they came by it, and whether it matches an order.
import BookAccessManager from '@/components/admin/bookAccess/BookAccessManager';

export const metadata = { title: 'Book access' };

export default function BookAccessPage() {
  return <BookAccessManager />;
}

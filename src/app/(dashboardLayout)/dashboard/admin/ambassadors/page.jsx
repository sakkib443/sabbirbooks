// The screen moved and grew: campus ambassadors are now affiliates, and the
// affiliates screen can add and edit them, not just review applications. This
// stays so an old bookmark still lands somewhere useful.
import { redirect } from 'next/navigation';

export default function AmbassadorsPage() {
  redirect('/dashboard/admin/affiliates');
}

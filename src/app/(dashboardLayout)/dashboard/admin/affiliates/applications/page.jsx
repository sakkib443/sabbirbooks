// The review queue: the same screen, opened on what is waiting. Its own route
// so it can be a menu item and a bookmark, rather than a filter you must
// remember to click.
import AffiliatesManager from '@/components/admin/ambassador/AffiliatesManager';

export const metadata = { title: 'Affiliate applications' };

export default function AffiliateApplicationsPage() {
  return <AffiliatesManager defaultTab="pending" />;
}

// Everyone selling under their own code. The default view is the people who
// are actually active; applications waiting for review are next door.
import AffiliatesManager from '@/components/admin/ambassador/AffiliatesManager';

export const metadata = { title: 'Affiliates' };

export default function AffiliatesPage() {
  return <AffiliatesManager defaultTab="approved" />;
}

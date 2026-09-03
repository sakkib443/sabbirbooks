// What the server read for SMS, and what the gateway says when asked.
import SmsStatusPanel from '@/components/admin/sms/SmsStatusPanel';

export const metadata = { title: 'SMS' };

export default function SmsStatusPage() {
  return <SmsStatusPanel />;
}

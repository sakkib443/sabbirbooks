'use client';

/**
 * The "ask us on WhatsApp" button.
 *
 * WhatsApp is how this shop actually talks to its customers — the order alerts
 * go there, the courier calls that number — but the storefront gave a visitor
 * with a question no way to start that conversation. So it floats above the
 * page, always reachable, on every public screen.
 *
 * It sits above the phone's bottom tab bar rather than under it, and clears the
 * iPhone home indicator: a support button hidden behind the navigation is a
 * support button nobody uses.
 */

import { FaWhatsapp } from 'react-icons/fa';
import { useLanguage } from '@/context/LanguageContext';
import { WHATSAPP_NUMBER } from '@/config/business';

const TEXT = {
  bn: {
    label: 'হোয়াটসঅ্যাপে জিজ্ঞাসা করুন',
    // Pre-filled so the shop knows what the message is about before reading it,
    // and so the visitor does not have to compose an opening line.
    message: 'আসসালামু আলাইকুম, Anatomy MAGIC VIVA বইটি সম্পর্কে জানতে চাই।',
  },
  en: {
    label: 'Ask us on WhatsApp',
    message: 'Hello, I would like to know about the Anatomy MAGIC VIVA book.',
  },
};

export default function WhatsAppButton() {
  const { isBengali } = useLanguage();
  const t = isBengali ? TEXT.bn : TEXT.en;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t.message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.label}
      title={t.label}
      // bottom-20 on phones clears the tab bar; bottom-6 once that bar is gone.
      className="group fixed bottom-20 right-4 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3.5 pr-4 text-white shadow-lg transition-all hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/40 sm:right-6 lg:bottom-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <FaWhatsapp className="shrink-0 text-2xl" />
      {/* The label is there for a pointer, and for every screen reader; on a
          phone the icon alone carries it, because a wide pill sitting over the
          page is in the way of the thing it is offering to help with. */}
      <span
        className={`hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 sm:inline-block sm:group-hover:max-w-[16rem] ${
          isBengali ? 'hind-siliguri' : ''
        }`}
      >
        {t.label}
      </span>
    </a>
  );
}

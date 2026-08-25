'use client';

/**
 * Blocks a signed-in student who has no WhatsApp number until they give one.
 *
 * The registration form makes the number mandatory, but Google sign-in cannot:
 * it builds the account from the Google profile alone, and there is no field to
 * ask in. So the requirement is enforced here instead — the moment such an
 * account loads any page, this covers it and does not let go.
 *
 * "Does not let go" is literal, and deliberate per the shop's instruction: no
 * close button, no click-outside, no Escape, and background scrolling is locked.
 * The only ways out are giving the number or logging out.
 *
 * The server is the one that decides: /auth/me returns `profileComplete`, which
 * is false only for a student with an empty WhatsApp number. Staff accounts are
 * never gated — they are created by an admin, not by signup.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LuGraduationCap, LuLoaderCircle, LuLogOut, LuPhone, LuShieldCheck } from 'react-icons/lu';
import { API_BASE, getToken, getUser, clearSession } from '@/lib/session';
import { useLanguage } from '@/context/LanguageContext';
import CollegePicker from './CollegePicker';

// Pages where the gate must stay out of the way: the user is either not signed
// in yet, or is in the middle of the very flow that fixes this.
const EXEMPT = ['/login', '/register'];

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;

export default function ProfileGate() {
  const pathname = usePathname();
  const { isBengali } = useLanguage();
  const bn = isBengali ? 'hind-siliguri' : '';
  const t = (en, bnText) => (isBengali ? bnText : en);

  const [needed, setNeeded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [college, setCollege] = useState(null);
  const [collegeName, setCollegeName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState(null);

  const exempt = EXEMPT.some((p) => pathname?.startsWith(p));

  const check = useCallback(async () => {
    if (exempt || !getToken()) {
      setNeeded(false);
      setChecked(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setNeeded(false);
        setChecked(true);
        return;
      }
      const body = await res.json();
      const data = body?.data;
      setMe(data || null);
      setNeeded(data?.profileComplete === false);
    } catch {
      // A network blip must not throw up a modal the user cannot dismiss.
      setNeeded(false);
    } finally {
      setChecked(true);
    }
  }, [exempt]);

  useEffect(() => {
    check();
  }, [check]);

  // Lock the page behind the modal.
  useEffect(() => {
    if (!needed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [needed]);

  if (!checked || !needed) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!BD_MOBILE.test(whatsapp.trim())) {
      setError(t('Enter a valid WhatsApp number, e.g. 01712345678', 'সঠিক WhatsApp নম্বর দিন, যেমন 01712345678'));
      return;
    }
    if (!college && !collegeName.trim()) {
      setError(t('Choose your medical college', 'আপনার মেডিকেল কলেজ বেছে নিন'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          whatsappNumber: whatsapp.trim(),
          medicalCollege: college?._id,
          medicalCollegeName: college?.name || collegeName.trim(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body.message || t('Could not save. Try again.', 'সংরক্ষণ হয়নি। আবার চেষ্টা করুন।'));
      }
      // Re-ask the server rather than assuming — it owns the completeness rule.
      await check();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearSession();
    window.location.href = '/login';
  };

  const stored = getUser();
  const name = me?.firstName || stored?.firstName || '';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-gate-title"
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-card sm:p-7">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <LuPhone className="text-xl" />
        </span>

        <h2 id="profile-gate-title" className={`font-heading text-xl font-bold text-foreground ${bn}`}>
          {name
            ? t(`One more step, ${name}`, `আর একটা ধাপ, ${name}`)
            : t('One more step', 'আর একটা ধাপ')}
        </h2>
        <p className={`mt-1.5 text-sm text-muted-foreground ${bn}`}>
          {t(
            'We send order updates on WhatsApp, so we need your number before you continue.',
            'অর্ডারের সব খবর আমরা WhatsApp-এ পাঠাই — তাই এগোনোর আগে আপনার নম্বরটা দরকার।'
          )}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <label className="block">
            <span className={`mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground ${bn}`}>
              <span className="text-primary"><LuPhone /></span>
              {t('WhatsApp number', 'WhatsApp নম্বর')}
            </span>
            <input
              autoFocus
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                setError('');
              }}
              placeholder="01XXXXXXXXX"
              className={`w-full rounded-xl border bg-background px-4 py-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 ${
                error ? 'border-coral' : 'border-border'
              }`}
            />
          </label>

          <CollegePicker
            bengali={isBengali}
            label={t('Medical college', 'মেডিকেল কলেজ')}
            placeholder={t('Choose your college', 'কলেজ বেছে নিন')}
            value={college}
            customName={collegeName}
            onChange={(picked, typed) => {
              setCollege(picked);
              setCollegeName(typed);
              setError('');
            }}
          />

          {error && (
            <p role="alert" className={`rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral ${bn}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 ${bn}`}
          >
            {saving ? (
              <>
                <LuLoaderCircle className="animate-spin text-lg" /> {t('Saving…', 'সংরক্ষণ হচ্ছে…')}
              </>
            ) : (
              <>
                <LuShieldCheck className="text-lg" /> {t('Save and continue', 'সংরক্ষণ করে এগোন')}
              </>
            )}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${bn}`}>
            <LuGraduationCap /> {t('Used only to reach you about orders', 'শুধু অর্ডারের যোগাযোগে ব্যবহার হবে')}
          </span>
          <button
            type="button"
            onClick={logout}
            className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-coral ${bn}`}
          >
            <LuLogOut /> {t('Log out', 'লগ আউট')}
          </button>
        </div>
      </div>
    </div>
  );
}

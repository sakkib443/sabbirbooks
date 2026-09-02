'use client';

/**
 * The Campus Ambassador application.
 *
 * A long form filled in once, by a student who has no account — so it is one
 * scrollable page rather than a wizard. A wizard hides how much is left, and
 * loses everything typed so far the moment a step fails to advance; a form this
 * length is better honest about its size.
 *
 * Validation runs on submit, not per keystroke: pointing out that an email is
 * malformed while someone is still halfway through typing it is noise. The
 * server validates the same rules again — this is the courtesy, that is the
 * guard.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LuCircleCheck,
  LuLoaderCircle,
  LuTriangleAlert,
  LuUpload,
  LuUser,
  LuGraduationCap,
  LuMegaphone,
  LuBriefcase,
  LuLightbulb,
  LuFileCheck,
  LuTicket,
  LuArrowRight,
} from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';
import { Container, cn } from '@/components/ui';
import API_BASE_URL from '@/config/api';
import AmbassadorHero from './AmbassadorHero';
import {
  ACADEMIC_YEARS,
  AGREEMENT_KEYS,
  PROMO_CHANNELS,
  REACH_BANDS,
  ambassadorStrings,
} from './ambassadorStrings';

const inputCls =
  'w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20';

const BD_PHONE = /^01[3-9]\d{8}$/;
const LOOKS_LIKE_URL = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;

export default function AmbassadorApply() {
  const { isBengali } = useLanguage();
  const S = useMemo(() => ambassadorStrings(isBengali), [isBengali]);
  const bn = isBengali ? 'hind-siliguri' : '';

  const [colleges, setColleges] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    nickname: '',
    phone: '',
    whatsapp: '',
    whatsappSame: true,
    email: '',
    facebookUrl: '',
    instagramUrl: '',
    medicalCollege: '',
    medicalCollegeName: '',
    batch: '',
    academicYear: '',
    city: '',
    idCardUrl: '',
    reach: '',
    promoteChannels: [],
    promoteChannelOther: '',
    isGroupAdmin: false,
    hasPriorExperience: false,
    experienceNote: '',
    comfortableSharingContent: true,
    suggestions: '',
    agreement: Object.fromEntries(AGREEMENT_KEYS.map((k) => [k, false])),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    // Clearing as they fix it, rather than leaving a red field that is now
    // correct until they press submit again.
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/medical-colleges`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.success) setColleges(j.data || []);
      })
      .catch(() => {
        /* the college box falls back to free text — see the note on its input */
      });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * The code they will get, previewed as they fill the form in.
   *
   * Mirrors couponCode.ts on the server exactly: the nickname wins when given,
   * otherwise the longest non-honorific word. If these two ever disagree the
   * applicant is shown a code they will not get, which is worse than showing
   * none — so any change here belongs in that file too.
   */
  const codePreview = useMemo(() => {
    const college = colleges.find((c) => String(c._id) === form.medicalCollege);
    const abbr = (college?.abbreviation || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!abbr) return '';

    const nick = (form.nickname || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (nick.length >= 2) return `${abbr}${nick.slice(0, 8)}20`;

    const words = form.fullName
      .toUpperCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^A-Z]/g, ''))
      .filter((w) => w.length >= 2 && !['MD', 'MOHAMMAD', 'MOHAMMED', 'MST', 'MRS', 'MR', 'DR', 'MISS'].includes(w));
    if (!words.length) return '';
    const pick = words.reduce((best, w) => (w.length > best.length ? w : best), words[0]);
    return `${abbr}${pick.slice(0, 8)}20`;
  }, [colleges, form.medicalCollege, form.fullName, form.nickname]);

  const validate = () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = true;
    if (!BD_PHONE.test(form.phone.trim())) e.phone = true;
    if (!form.whatsappSame && form.whatsapp.trim() && !BD_PHONE.test(form.whatsapp.trim()))
      e.whatsapp = true;
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = true;
    if (!LOOKS_LIKE_URL.test(form.facebookUrl.trim())) e.facebookUrl = true;
    if (form.instagramUrl.trim() && !LOOKS_LIKE_URL.test(form.instagramUrl.trim()))
      e.instagramUrl = true;
    if (!form.medicalCollegeName.trim()) e.medicalCollegeName = true;
    if (!form.batch.trim()) e.batch = true;
    if (!form.academicYear) e.academicYear = true;
    if (!form.city.trim()) e.city = true;
    if (!form.reach) e.reach = true;
    if (!form.promoteChannels.length) e.promoteChannels = true;
    if (!AGREEMENT_KEYS.every((k) => form.agreement[k])) e.agreement = true;
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      // Take them to the first problem. A form this long can put a red field
      // three screens above where the submit button is.
      const first = document.querySelector('[data-invalid="true"]');
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ambassador/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          nickname: form.nickname.trim() || undefined,
          phone: form.phone.trim(),
          whatsapp: (form.whatsappSame ? form.phone : form.whatsapp).trim(),
          email: form.email.trim().toLowerCase(),
          facebookUrl: form.facebookUrl.trim(),
          instagramUrl: form.instagramUrl.trim() || undefined,
          medicalCollege: form.medicalCollege || undefined,
          medicalCollegeName: form.medicalCollegeName.trim(),
          batch: form.batch.trim(),
          academicYear: form.academicYear,
          city: form.city.trim(),
          idCardUrl: form.idCardUrl || undefined,
          reach: form.reach,
          promoteChannels: form.promoteChannels,
          promoteChannelOther: form.promoteChannelOther.trim() || undefined,
          isGroupAdmin: form.isGroupAdmin,
          hasPriorExperience: form.hasPriorExperience,
          experienceNote: form.experienceNote.trim() || undefined,
          comfortableSharingContent: form.comfortableSharingContent,
          suggestions: form.suggestions.trim() || undefined,
          agreement: form.agreement,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || S.errTitle);
      setDone(json.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err.message || S.errTitle);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickFile = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`${API_BASE_URL}/ambassador/id-card`, { method: 'POST', body });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || 'Upload failed');
      set('idCardUrl', json.data.url);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // The pitch above the form belongs to this component, not to the page, for one
  // reason: once the application is in, the pitch has done its job. Rendering it
  // from the page left a submitted applicant looking at "Bring MAGIC VIVA to
  // your campus" with their confirmation three screens below the fold.
  if (done) return <Submitted S={S} bn={bn} data={done} />;

  return (
    <>
      <AmbassadorHero />
      <Container className="max-w-3xl py-10 pb-16">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <header className="rounded-2xl border border-border bg-card p-6">
          <h2 className={cn('text-xl font-bold text-foreground', bn)}>{S.formTitle}</h2>
          <p className={cn('mt-1.5 text-sm text-muted-foreground', bn)}>{S.formIntro}</p>
        </header>

        {/* ── 1. Personal ───────────────────────────────────── */}
        <Section icon={LuUser} title={S.s1} bn={bn}>
          <Field label={S.fullName} required S={S} bn={bn} invalid={errors.fullName}>
            <input
              className={inputCls}
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder={S.fullNamePh}
              autoComplete="name"
            />
          </Field>

          {/* The name the code is built from. Asked for rather than guessed:
              "Md. Sakib Al Hasan" could become SAKIB, HASAN or AL, and only
              they know which one a batchmate would recognise. */}
          <Field label={S.nickname} S={S} bn={bn} help={S.nicknameHint}>
            <input
              className={inputCls}
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              placeholder={S.nicknamePh}
              maxLength={20}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={S.phone} required S={S} bn={bn} invalid={errors.phone}>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder={S.phonePh}
                inputMode="numeric"
                autoComplete="tel"
              />
            </Field>
            <Field label={S.whatsapp} S={S} bn={bn} invalid={errors.whatsapp}>
              <input
                className={cn(inputCls, form.whatsappSame && 'opacity-50')}
                value={form.whatsappSame ? form.phone : form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder={S.phonePh}
                inputMode="numeric"
                disabled={form.whatsappSame}
              />
              <label className={cn('mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground', bn)}>
                <input
                  type="checkbox"
                  checked={form.whatsappSame}
                  onChange={(e) => set('whatsappSame', e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                {S.whatsappSame}
              </label>
            </Field>
          </div>

          <Field label={S.email} required S={S} bn={bn} invalid={errors.email}>
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder={S.emailPh}
              type="email"
              autoComplete="email"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={S.facebook} required S={S} bn={bn} invalid={errors.facebookUrl}>
              <input
                className={inputCls}
                value={form.facebookUrl}
                onChange={(e) => set('facebookUrl', e.target.value)}
                placeholder={S.facebookPh}
              />
            </Field>
            <Field label={S.instagram} S={S} bn={bn} invalid={errors.instagramUrl}>
              <input
                className={inputCls}
                value={form.instagramUrl}
                onChange={(e) => set('instagramUrl', e.target.value)}
                placeholder={S.instagramPh}
              />
            </Field>
          </div>
        </Section>

        {/* ── 2. Academic ───────────────────────────────────── */}
        <Section icon={LuGraduationCap} title={S.s2} bn={bn}>
          <Field label={S.college} required S={S} bn={bn} invalid={errors.medicalCollegeName}>
            {/* A native select over 112 rows, not a typeahead: it is searchable
                by typing on every platform, works with no JS, and cannot leave
                the field holding a name the directory does not have. */}
            <select
              className={inputCls}
              value={form.medicalCollege}
              onChange={(e) => {
                const c = colleges.find((x) => String(x._id) === e.target.value);
                setForm((f) => ({
                  ...f,
                  medicalCollege: e.target.value,
                  medicalCollegeName: c?.name || '',
                }));
                setErrors((x) => ({ ...x, medicalCollegeName: undefined }));
              }}
            >
              <option value="">{S.collegePh}</option>
              {colleges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          {/* The reward made concrete the moment we can name it. */}
          {codePreview && (
            <p className={cn('flex items-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm text-foreground', bn)}>
              <LuTicket className="shrink-0 text-accent" />
              <span>
                {isBengali ? 'আপনার কুপন কোড হবে' : 'Your coupon code will be'}{' '}
                <strong className="font-mono tracking-wide">{codePreview}</strong>
              </span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={S.batch} required S={S} bn={bn} help={S.batchHelp} invalid={errors.batch}>
              <input
                className={inputCls}
                value={form.batch}
                onChange={(e) => set('batch', e.target.value)}
                placeholder={S.batchPh}
              />
            </Field>
            <Field label={S.year} required S={S} bn={bn} invalid={errors.academicYear}>
              <select
                className={inputCls}
                value={form.academicYear}
                onChange={(e) => set('academicYear', e.target.value)}
              >
                <option value="">{S.yearPh}</option>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {S.years[y]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={S.city} required S={S} bn={bn} invalid={errors.city}>
            <input
              className={inputCls}
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder={S.cityPh}
            />
          </Field>

          <Field label={S.idCard} S={S} bn={bn} help={S.idCardHelp}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60',
                bn
              )}
            >
              {uploading ? (
                <>
                  <LuLoaderCircle className="animate-spin" /> {S.idCardUploading}
                </>
              ) : form.idCardUrl ? (
                <>
                  <LuCircleCheck className="text-accent" /> {S.idCardDone} — {S.idCardChange}
                </>
              ) : (
                <>
                  <LuUpload /> {S.idCardPick}
                </>
              )}
            </button>
          </Field>
        </Section>

        {/* ── 3. Reach ──────────────────────────────────────── */}
        <Section icon={LuMegaphone} title={S.s3} bn={bn}>
          <Field label={S.reach} required S={S} bn={bn} invalid={errors.reach}>
            <div className="grid gap-2 sm:grid-cols-2">
              {REACH_BANDS.map((r) => (
                <Choice
                  key={r}
                  type="radio"
                  checked={form.reach === r}
                  onChange={() => set('reach', r)}
                  label={S.reaches[r]}
                  bn={bn}
                />
              ))}
            </div>
          </Field>

          <Field label={S.channels} required S={S} bn={bn} help={S.channelsHelp} invalid={errors.promoteChannels}>
            <div className="grid gap-2 sm:grid-cols-2">
              {PROMO_CHANNELS.map((c) => (
                <Choice
                  key={c}
                  type="checkbox"
                  checked={form.promoteChannels.includes(c)}
                  onChange={(on) =>
                    set(
                      'promoteChannels',
                      on
                        ? [...form.promoteChannels, c]
                        : form.promoteChannels.filter((x) => x !== c)
                    )
                  }
                  label={S.channelLabels[c]}
                  bn={bn}
                />
              ))}
            </div>
            {form.promoteChannels.includes('other') && (
              <input
                className={cn(inputCls, 'mt-3')}
                value={form.promoteChannelOther}
                onChange={(e) => set('promoteChannelOther', e.target.value)}
                placeholder={S.channelOther}
              />
            )}
          </Field>

          <YesNo
            label={S.groupAdmin}
            value={form.isGroupAdmin}
            onChange={(v) => set('isGroupAdmin', v)}
            S={S}
            bn={bn}
          />
        </Section>

        {/* ── 4. Experience ─────────────────────────────────── */}
        <Section icon={LuBriefcase} title={S.s4} bn={bn}>
          <YesNo
            label={S.priorExp}
            value={form.hasPriorExperience}
            onChange={(v) => set('hasPriorExperience', v)}
            S={S}
            bn={bn}
          />
          {form.hasPriorExperience && (
            <Field label={S.expNote} S={S} bn={bn}>
              <textarea
                rows={3}
                className={inputCls}
                value={form.experienceNote}
                onChange={(e) => set('experienceNote', e.target.value)}
                placeholder={S.expNotePh}
              />
            </Field>
          )}
        </Section>

        {/* ── 6. Promotion ──────────────────────────────────── */}
        <Section icon={LuLightbulb} title={S.s6} bn={bn}>
          <YesNo
            label={S.comfortable}
            value={form.comfortableSharingContent}
            onChange={(v) => set('comfortableSharingContent', v)}
            S={S}
            bn={bn}
          />
          <Field label={S.suggestions} S={S} bn={bn}>
            <textarea
              rows={3}
              className={inputCls}
              value={form.suggestions}
              onChange={(e) => set('suggestions', e.target.value)}
              placeholder={S.suggestionsPh}
            />
          </Field>
        </Section>

        {/* ── 7. Agreement ──────────────────────────────────── */}
        <Section icon={LuFileCheck} title={S.s7} bn={bn}>
          <p className={cn('text-sm text-muted-foreground', bn)}>{S.agreeIntro}</p>
          <div
            data-invalid={errors.agreement ? 'true' : undefined}
            className={cn(
              'flex flex-col gap-2 rounded-xl p-1',
              errors.agreement && 'ring-2 ring-coral/40'
            )}
          >
            {AGREEMENT_KEYS.map((k) => (
              <Choice
                key={k}
                type="checkbox"
                checked={form.agreement[k]}
                onChange={(on) => {
                  setForm((f) => ({ ...f, agreement: { ...f.agreement, [k]: on } }));
                  setErrors((e) => ({ ...e, agreement: undefined }));
                }}
                label={S.agreements[k]}
                bn={bn}
              />
            ))}
          </div>
        </Section>

        {serverError && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral',
              bn
            )}
          >
            <LuTriangleAlert className="mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}
        {Object.keys(errors).length > 0 && !serverError && (
          <p className={cn('text-sm text-coral', bn)}>{S.fixErrors}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60',
            bn
          )}
        >
          {submitting ? (
            <>
              <LuLoaderCircle className="animate-spin" /> {S.submitting}
            </>
          ) : (
            <>
              {S.submit} <LuArrowRight />
            </>
          )}
        </button>
      </form>
      </Container>
    </>
  );
}

// ── Pieces ──────────────────────────────────────────────────

function Section({ icon: Icon, title, bn, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h3 className={cn('mb-5 flex items-center gap-2.5 text-base font-bold text-foreground', bn)}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="text-base" />
        </span>
        {title}
      </h3>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({ label, required, help, invalid, S, bn, children }) {
  return (
    <div data-invalid={invalid ? 'true' : undefined}>
      <label className={cn('mb-1.5 block text-sm font-medium text-foreground', bn)}>
        {label}{' '}
        <span className={cn('text-xs font-normal', required ? 'text-coral' : 'text-muted-foreground')}>
          ({required ? S.required : S.optional})
        </span>
      </label>
      {help && <p className={cn('mb-2 text-xs text-muted-foreground', bn)}>{help}</p>}
      <div className={cn(invalid && '[&_input]:border-coral [&_select]:border-coral')}>{children}</div>
    </div>
  );
}

/** A radio or checkbox that is a whole tappable row — thumbs, not pixels. */
function Choice({ type, checked, onChange, label, bn }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors',
        checked ? 'border-primary/40 bg-primary-soft' : 'border-border bg-card hover:border-primary/30'
      )}
    >
      <input
        type={type}
        checked={checked}
        onChange={(e) => onChange(type === 'checkbox' ? e.target.checked : true)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className={cn('leading-snug text-foreground', bn)}>{label}</span>
    </label>
  );
}

function YesNo({ label, value, onChange, S, bn }) {
  return (
    <div>
      <p className={cn('mb-2 text-sm font-medium text-foreground', bn)}>{label}</p>
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors',
              value === v
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30',
              bn
            )}
          >
            {v ? S.yes : S.no}
          </button>
        ))}
      </div>
    </div>
  );
}

function Submitted({ S, bn, data }) {
  return (
    <Container className="max-w-xl py-16">
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <LuCircleCheck className="text-2xl text-accent" />
        </span>
        <h2 className={cn('text-2xl font-bold text-foreground', bn)}>{S.doneTitle}</h2>
        <p className={cn('mt-2 text-muted-foreground', bn)}>{S.doneBody}</p>

        <div className="mt-6 rounded-xl bg-muted p-5">
          <p className={cn('text-xs font-semibold uppercase tracking-wider text-muted-foreground', bn)}>
            {S.doneIdLabel}
          </p>
          <p className="mt-1 font-mono text-xl font-bold tracking-wider text-foreground">
            {data.applicationId}
          </p>
          <p className={cn('mt-2 text-xs text-muted-foreground', bn)}>{S.doneIdHelp}</p>
        </div>

        <Link
          href="/"
          className={cn(
            'mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary',
            bn
          )}
        >
          {S.doneHome}
        </Link>
      </div>
    </Container>
  );
}

'use client';

/**
 * The pitch above the application form.
 *
 * Its whole job is to answer "what do I get" before asking for twenty fields.
 * The three perks are the offer stated in numbers — ৳20 to their friends, ৳30
 * to them — because that is what a student decides on, not a paragraph about
 * community.
 */

import { LuTicket, LuTag, LuWallet, LuMegaphone, LuKeyRound } from 'react-icons/lu';
import { useLanguage } from '@/context/LanguageContext';
import { Container, cn } from '@/components/ui';
import { ambassadorStrings } from './ambassadorStrings';

const PERK_ICONS = [LuTicket, LuTag, LuWallet];

export default function AmbassadorHero() {
  const { isBengali } = useLanguage();
  const S = ambassadorStrings(isBengali);
  const bn = isBengali ? 'hind-siliguri' : '';

  return (
    <section className="border-b border-border bg-surface-soft">
      <Container className="max-w-4xl py-14 sm:py-20">
        <div className="text-center">
          <span
            className={cn(
              'mb-4 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold text-primary',
              bn
            )}
          >
            <LuMegaphone /> {S.badge}
          </span>
          <h1
            className={cn(
              'font-heading text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl',
              bn
            )}
          >
            {S.heroTitle}
          </h1>
          <p className={cn('mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground', bn)}>
            {S.heroSub}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {S.perks.map((p, i) => {
            const Icon = PERK_ICONS[i];
            return (
              <div key={p.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="text-lg" />
                </span>
                <h3 className={cn('font-semibold text-foreground', bn)}>{p.title}</h3>
                <p className={cn('mt-1.5 text-sm leading-relaxed text-muted-foreground', bn)}>
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className={cn('mb-4 text-base font-bold text-foreground', bn)}>{S.howTitle}</h2>
          {/* Numbered because the steps genuinely happen in this order — apply,
              then review, then the code goes live. */}
          <ol className="flex flex-col gap-3">
            {S.how.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className={cn('text-sm leading-relaxed text-muted-foreground', bn)}>{step}</span>
              </li>
            ))}
          </ol>
          <p
            className={cn(
              'mt-5 flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-xs leading-relaxed text-muted-foreground',
              bn
            )}
          >
            <LuKeyRound className="mt-0.5 shrink-0 text-primary" />
            {S.loginNote}
          </p>
        </div>
      </Container>
    </section>
  );
}

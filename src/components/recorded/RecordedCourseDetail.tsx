"use client";

/**
 * /courses/<id> — one recorded course (redesigned 11 Nov 2026, in the order
 * the shop set):
 *
 *   Hero      left: name, short description, four small numbers
 *             right: the intro video (or picture), Enroll now + Contact us
 *   Body      Course overview → Course curriculum → What you get + Benefits
 *             → How to buy → FAQ;  beside it the price card (Buy, WhatsApp)
 *
 * Each thing is said once: the short description is the top, the long one
 * the overview. Everything comes from the course (with the site's standard
 * wording where the shop left Benefits or FAQ empty) and follows EN/বাং.
 * The course editor (admin) has the same parts, by the same names, in the
 * same order.
 *
 * The button changes with the visitor — buy, waiting for approval, or watch.
 * Staff see the page as a buyer does, with a link to Course View.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LuPlay, LuLock, LuVideo, LuClock, LuChevronDown, LuCircleCheck, LuHourglass, LuLayers, LuInfinity,
  LuPhone, LuX, LuShoppingCart, LuCreditCard, LuBadgeCheck, LuChevronRight, LuSparkles,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { Container, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { SUPPORT_PHONE, WHATSAPP_NUMBER } from "@/config/business";
import {
  checkAccess, coursePrice, courseListPrice, getCourse, getCurriculum, learnHref, pick, taka, titleOf, youtubeEmbed,
  type CourseAccess, type RecordedCourse, type RecordedLesson, type RecordedModule,
} from "./recordedApi";
import { COURSE_SECTIONS, DEFAULT_BENEFITS, DEFAULT_FAQ, HOW_TO_BUY } from "./courseSections";

const T = {
  bn: {
    home: "হোম", courses: "কোর্স", notFound: "কোর্সটি পাওয়া যায়নি।", allCourses: "সব কোর্স",
    recorded: "রেকর্ডেড কোর্স", lifetime: "আজীবন অ্যাক্সেস",
    modules: "মডিউল", classes: "ক্লাস", totalTime: "মোট সময়", access: "অ্যাক্সেস", forever: "আজীবন",
    hours: (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} ঘণ্টা` : `${m} মিনিট`),
    watch: "কোর্স দেখুন", enroll: "এখনই ভর্তি হন", buy: "এখনই কিনুন", startFree: "ফ্রি তে শুরু করুন",
    contact: "যোগাযোগ করুন", whatsapp: "WhatsApp-এ কথা বলুন",
    pendingTitle: "আপনার অর্ডার যাচাই হচ্ছে", pendingSub: "পেমেন্ট মিলিয়ে অ্যাডমিন অনুমোদন দিলেই কোর্সটা খুলে যাবে।",
    curriculumTitle: (m: number, c: number) => `${m}টি মডিউল · ${c}টি ক্লাস`,
    soon: "ক্লাসগুলো শীঘ্রই যোগ হবে।", classCount: (n: number) => `${n}টি ক্লাস`, min: (m: number) => `${m} মি.`,
    play: "দেখুন", free: "ফ্রি", seats: "ভর্তি চলছে", off: (p: number) => `${p}% ছাড়`, call: "কল করুন",
    staffNote: "আপনি স্টাফ হিসেবে লগইন করা — ক্রেতা এভাবেই দেখবে। পুরো কোর্স দেখতে:", courseView: "Course View",
    close: "বন্ধ করুন", previewNone: "এই কোর্সের ক্লাসগুলো কেনার পর খুলবে।", introVideo: "পরিচিতি ভিডিও দেখুন",
  },
  en: {
    home: "Home", courses: "Courses", notFound: "Course not found.", allCourses: "All courses",
    recorded: "Recorded course", lifetime: "Lifetime access",
    modules: "Modules", classes: "Classes", totalTime: "Total time", access: "Access", forever: "Lifetime",
    hours: (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} hrs` : `${m} min`),
    watch: "Watch the course", enroll: "Enroll now", buy: "Buy now", startFree: "Start for free",
    contact: "Contact us", whatsapp: "Chat on WhatsApp",
    pendingTitle: "Your order is being checked", pendingSub: "The course opens as soon as an admin matches the payment and approves it.",
    curriculumTitle: (m: number, c: number) => `${m} ${m === 1 ? "module" : "modules"} · ${c} ${c === 1 ? "class" : "classes"}`,
    soon: "The classes will be added soon.", classCount: (n: number) => `${n} ${n === 1 ? "class" : "classes"}`, min: (m: number) => `${m} min`,
    play: "Watch", free: "Free", seats: "Enrolment open", off: (p: number) => `${p}% off`, call: "Call",
    staffNote: "You're signed in as staff — this is what a buyer sees. To watch the whole course:", courseView: "Course View",
    close: "Close", previewNone: "The classes open after you buy the course.", introVideo: "Watch the intro",
  },
};

const SECTIONS = ["overview", "curriculum", "includes", "how", "faq"] as const;

/** The first sentence or two of a long text, for a course with no short description. */
function shorten(text: string, max = 180): string {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf(". "), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return stop > 60 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : max)}…`;
}

export default function RecordedCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { isBengali: bn } = useLanguage();
  const L = bn ? T.bn : T.en;
  const S = bn ? COURSE_SECTIONS.bn : COURSE_SECTIONS.en;
  const [course, setCourse] = useState<RecordedCourse | null>(null);
  const [modules, setModules] = useState<RecordedModule[]>([]);
  const [access, setAccess] = useState<CourseAccess>({ hasAccess: false });
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<{ title: string; url?: string } | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getCourse(id);
        const [mods, acc] = await Promise.all([getCurriculum(c._id), checkAccess(c._id)]);
        if (!alive) return;
        setCourse(c);
        setModules(mods);
        setAccess(acc);
        setOpen(mods[0] ? { [mods[0]._id]: true } : {});
        setState("ok");
      } catch {
        if (alive) setState("missing");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const font = bn ? "hind-siliguri" : "";

  if (state === "loading") {
    return (
      <div className="bg-[#070b14] py-16">
        <Container><div className="h-72 animate-pulse rounded-2xl bg-white/5" /></Container>
      </div>
    );
  }
  if (state === "missing" || !course) {
    return (
      <Container className={cn("py-20 text-center", font)}>
        <p className="text-lg text-muted-foreground">{L.notFound}</p>
        <Link href="/courses" className="mt-4 inline-block font-semibold text-primary">← {L.allCourses}</Link>
      </Container>
    );
  }

  // A buyer's view for staff too: only a real enrollment counts as owning it.
  const owned = access.hasAccess && !access.staff;
  const canPlayLesson = (l: RecordedLesson) => !l.locked && !!l.videoUrl && (owned || !!l.isFree);
  const title = titleOf(bn, course);
  const details = pick(bn, course.details, course.detailsBn);
  const summary = pick(bn, course.summary, course.summaryBn) || shorten(details);
  const price = coursePrice(course);
  const list = courseListPrice(course);
  const offPct = list > 0 ? Math.round(((list - price) / list) * 100) : 0;
  const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
  // videoDuration is in seconds.
  const minutes = Math.round(modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.videoDuration || 0), 0), 0) / 60);
  const checkoutHref = `/courses/${course.slug || course._id}/checkout`;
  const promo = course.promoVideo && youtubeEmbed(course.promoVideo) ? course.promoVideo : "";
  const firstFree = owned ? undefined : modules.flatMap((m) => m.lessons).find((l) => l.isFree && canPlayLesson(l));
  const embed = youtubeEmbed(preview?.url);
  const includes = (course.courseIncludes || []).map((x) => pick(bn, x.text, x.textBn)).filter(Boolean);
  const benefits = (course.benefits || []).map((x) => pick(bn, x.text, x.textBn)).filter(Boolean);
  const faqs: [string, string][] = (course.faqs || [])
    .map((f) => [pick(bn, f.q, f.qBn), pick(bn, f.a, f.aBn)] as [string, string])
    .filter(([q, a]) => q && a);
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(title)}`;
  const go = (sec: string) => document.getElementById(`sec-${sec}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const priceText = price > 0 ? taka(price) : L.free;
  const playHero = () =>
    promo
      ? setPreview({ title, url: promo })
      : firstFree
        ? setPreview({ title: titleOf(bn, firstFree), url: firstFree.videoUrl })
        : go("curriculum");

  /** The buy / watch button; null while an order waits for approval. */
  const actionButton = (label: string, className: string) =>
    owned ? (
      <Link href={learnHref(course._id)} className={className}><LuPlay /> {L.watch}</Link>
    ) : access.pending ? null : (
      <Link href={checkoutHref} className={className}><LuShoppingCart /> {price > 0 ? label : L.startFree}</Link>
    );
  const pendingBox = access.pending && !owned ? (
    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold"><LuHourglass /> {L.pendingTitle}</p>
      <p className="mt-1 text-amber-800/80">{L.pendingSub}</p>
    </div>
  ) : null;
  const staffNote = access.staff ? (
    <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
      {L.staffNote}{" "}
      <Link href={`/dashboard/admin/courses/view?course=${course._id}`} className="font-semibold text-primary hover:underline">{L.courseView}</Link>
    </p>
  ) : null;

  const stats = [
    { label: L.modules, value: String(modules.length), icon: LuLayers },
    { label: L.classes, value: String(lessonCount), icon: LuVideo },
    { label: L.totalTime, value: minutes > 0 ? L.hours(minutes) : "—", icon: LuClock },
    { label: L.access, value: L.forever, icon: LuInfinity, hot: true },
  ];

  return (
    <main className={cn("bg-surface-soft pb-44 lg:pb-16", font)}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#070b14] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }}
        />
        <div className="pointer-events-none absolute -left-40 -top-24 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-[-6rem] h-96 w-96 rounded-full bg-rose-500/15 blur-3xl" />

        <Container className="relative grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:py-14">
          {/* Left */}
          <div>
            <nav className="mb-5 flex flex-wrap items-center gap-1 text-xs text-white/50">
              <Link href="/" className="hover:text-white">{L.home}</Link>
              <LuChevronRight className="h-3 w-3" />
              <Link href="/courses" className="hover:text-white">{L.courses}</Link>
              <LuChevronRight className="h-3 w-3" />
              <span className="line-clamp-1 text-white/80">{title}</span>
            </nav>
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/85"><LuVideo className="h-3.5 w-3.5" /> {L.recorded}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300"><LuInfinity className="h-3.5 w-3.5" /> {L.lifetime}</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">{title}</h1>
            {summary && <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">{summary}</p>}
            <div className="mt-7 grid max-w-xl grid-cols-4 gap-2">
              {stats.map((s) => (
                <div key={s.label} className={cn("rounded-lg border px-2.5 py-2", s.hot ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.04]")}>
                  <p className={cn("flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", s.hot ? "text-emerald-300" : "text-white/45")}>
                    <s.icon className="h-3 w-3 shrink-0" /> <span className="truncate">{s.label}</span>
                  </p>
                  <p className="mt-0.5 text-sm font-bold sm:text-base">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: video + two buttons */}
          <div className="rounded-[1.25rem] bg-gradient-to-br from-white/20 via-white/5 to-white/10 p-px shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
            <div className="rounded-[1.2rem] bg-[#0d1322] p-3">
              <button type="button" onClick={playHero} className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-white/5" aria-label={promo ? L.introVideo : title}>
                {course.image && !imgFailed ? (
                  <img src={course.image} alt={title} onError={() => setImgFailed(true)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="absolute left-1/2 top-1/2 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl ring-[10px] ring-rose-500/25 transition group-hover:scale-110">
                  <LuPlay className="ml-1 h-8 w-8" />
                </span>
                {promo && (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                    <LuSparkles className="h-3.5 w-3.5" /> {L.introVideo}
                  </span>
                )}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {actionButton(L.enroll, "flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400") || (
                  <span className="flex h-12 items-center justify-center rounded-xl bg-amber-400/15 px-2 text-center text-xs font-semibold text-amber-200">{L.pendingTitle}</span>
                )}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white transition hover:bg-white/10">
                  <LuPhone /> {L.contact}
                </a>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {/* Tabs */}
          <nav className="sticky top-[72px] z-20 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 p-1.5 shadow-soft backdrop-blur">
            {SECTIONS.map((s) => (
              <button key={s} type="button" onClick={() => go(s)} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary-soft hover:text-primary">
                {S[s]}
              </button>
            ))}
          </nav>

          {/* ── Course overview ── */}
          <section id="sec-overview" className="scroll-mt-36">
            <SectionHead label={S.overview} />
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <p className="whitespace-pre-line text-[15px] leading-[1.85] text-muted-foreground">{details || summary}</p>
            </div>
          </section>

          {/* ── Course curriculum ── */}
          <section id="sec-curriculum" className="scroll-mt-36">
            <SectionHead label={S.curriculum} title={L.curriculumTitle(modules.length, lessonCount)} />
            {modules.length === 0 ? (
              <p className="rounded-2xl bg-card p-6 text-muted-foreground">{L.soon}</p>
            ) : (
              <div className="space-y-3">
                {modules.map((m, mi) => (
                  <div key={m._id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                    <button type="button" onClick={() => setOpen((o) => ({ ...o, [m._id]: !o[m._id] }))} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                      <span className="flex items-center gap-3 font-semibold text-foreground">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{String(mi + 1).padStart(2, "0")}</span>
                        {titleOf(bn, m)}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        {L.classCount(m.lessons.length)}
                        <LuChevronDown className={cn("transition", open[m._id] && "rotate-180")} />
                      </span>
                    </button>
                    {open[m._id] && (
                      <ul className="divide-y divide-border border-t border-border bg-surface-soft/40">
                        {m.lessons.map((l, li) => {
                          const canPlay = canPlayLesson(l);
                          return (
                            <li key={l._id} className="flex items-center gap-3 px-5 py-3 text-sm">
                              <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">{li + 1}.</span>
                              {canPlay ? <LuPlay className="shrink-0 text-primary" /> : <LuLock className="shrink-0 text-muted-foreground" />}
                              <span className="flex-1 text-foreground">{titleOf(bn, l)}</span>
                              {l.isFree && !owned && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{L.free}</span>}
                              {!!l.videoDuration && <span className="text-muted-foreground">{L.min(Math.max(1, Math.round(l.videoDuration / 60)))}</span>}
                              {canPlay && (owned ? (
                                <Link href={`${learnHref(course._id)}?lesson=${l._id}`} className="font-semibold text-primary hover:underline">{L.play}</Link>
                              ) : (
                                <button type="button" onClick={() => setPreview({ title: titleOf(bn, l), url: l.videoUrl })} className="font-semibold text-primary hover:underline">{L.play}</button>
                              ))}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── What you get + Benefits ── */}
          <section id="sec-includes" className="grid scroll-mt-36 gap-4 sm:grid-cols-2">
            <InfoList title={S.includes} items={includes.length ? includes : [L.classCount(lessonCount)]} tone="emerald" />
            <InfoList title={S.benefits} items={benefits.length ? benefits : bn ? DEFAULT_BENEFITS.bn : DEFAULT_BENEFITS.en} tone="sky" />
          </section>

          {/* ── How to buy ── */}
          <section id="sec-how" className="scroll-mt-36">
            <SectionHead label={S.how} />
            <ol className="grid gap-3 sm:grid-cols-3">
              {(bn ? HOW_TO_BUY.bn : HOW_TO_BUY.en).map((s, i) => (
                <li key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white">{i + 1}</span>
                  <p className="text-sm font-medium text-foreground">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── FAQ ── */}
          <section id="sec-faq" className="scroll-mt-36">
            <SectionHead label={S.faq} />
            <div className="space-y-3">
              {(faqs.length ? faqs : bn ? DEFAULT_FAQ.bn : DEFAULT_FAQ.en).map(([q, a], i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-foreground">
                    {q}
                    <LuChevronDown className={cn("shrink-0 transition", faqOpen === i && "rotate-180")} />
                  </button>
                  {faqOpen === i && <p className="whitespace-pre-line border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">{a}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Price card ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-glow">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> {L.seats}
            </span>
            <div className="rounded-xl border-2 border-primary/30 bg-primary-soft/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{L.recorded}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground">{priceText}</span>
                {list > 0 && <span className="text-sm text-muted-foreground line-through">{taka(list)}</span>}
                {offPct > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{L.off(offPct)}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{L.lifetime} · {L.classCount(lessonCount)}</p>
            </div>
            {actionButton(L.buy, btnGreen)}
            {pendingBox}
            {staffNote}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white transition hover:brightness-95">
              <FaWhatsapp className="h-4 w-4" /> {L.whatsapp}
            </a>
            <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <LuPhone className="h-4 w-4" /> {L.call}: {SUPPORT_PHONE}
            </a>
            <p className="flex items-center justify-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <LuCreditCard className="h-4 w-4 text-emerald-500" /> bKash · Nagad · Card
            </p>
          </div>
        </aside>
      </Container>

      {/* ── Phone: price + button stay at the bottom, just above the site's own
          bottom menu (BottomNav, ~60px + the iPhone safe area). ── */}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-none text-foreground">{priceText}</p>
            {list > 0 && <p className="text-xs text-muted-foreground line-through">{taka(list)}</p>}
          </div>
          <div className="w-44">{actionButton(L.buy, btnGreen) || <span className="block text-right text-xs font-semibold text-amber-700">{L.pendingTitle}</span>}</div>
        </div>
        {(access.staff || access.pending) && <div className="mx-auto mt-2 max-w-xl">{staffNote || pendingBox}</div>}
      </div>

      {/* ── Video player ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            {embed ? (
              <iframe src={embed} title={preview.title} className="aspect-video w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : preview.url ? (
              <video src={preview.url} controls className="aspect-video w-full" />
            ) : (
              <p className="p-10 text-center text-white/70">{L.previewNone}</p>
            )}
            <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
              <p className="font-semibold text-foreground">{preview.title}</p>
              <button type="button" onClick={() => setPreview(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><LuX /> {L.close}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionHead({ label, title }: { label: string; title?: string }) {
  return (
    <div className="mb-5">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold text-foreground sm:text-[1.7rem]">
        <span className="h-7 w-1.5 rounded-full bg-rose-500" /> {label}
      </h2>
      {title && <p className="ml-[1.1rem] mt-1 text-sm font-semibold text-muted-foreground">{title}</p>}
    </div>
  );
}

function InfoList({ title, items, tone }: { title: string; items: string[]; tone: "emerald" | "sky" }) {
  const color = tone === "emerald" ? "text-emerald-500" : "text-sky-500";
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
        <LuBadgeCheck className={cn("h-5 w-5", color)} /> {title}
      </h3>
      <ul className="space-y-2.5 text-sm text-muted-foreground">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2.5"><LuCircleCheck className={cn("mt-0.5 h-4 w-4 shrink-0", color)} /> {t}</li>
        ))}
      </ul>
    </div>
  );
}

const btnGreen =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-white shadow-soft transition hover:bg-emerald-600";

"use client";

/**
 * /courses/<id> — one recorded course (11 Nov 2026, the shop's layout):
 *
 *   Hero      left: name, short description, total time (other numbers are
 *             switches)   right: the video — YouTube, a video link or an
 *             uploaded file — and "Buy now · ৳price" (Contact is a switch)
 *   Body      Course overview → Course curriculum → What you get (+ Benefits)
 *             → How to buy → FAQ; the price card beside it
 *
 * Every part after the overview, and the hero's numbers and Contact button,
 * has an on/off switch in the course editor (course.display); unset parts
 * follow DEFAULT_DISPLAY, which is the shop's choice — less on the page.
 * Each thing is said once; everything follows EN/বাং.
 *
 * The button changes with the visitor — buy, waiting for approval, or watch.
 * Staff see the page as a buyer does, with a link to Course View.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LuPlay, LuLock, LuVideo, LuClock, LuChevronDown, LuCircleCheck, LuHourglass, LuLayers, LuInfinity,
  LuPhone, LuX, LuShoppingCart, LuCreditCard, LuBadgeCheck, LuChevronRight,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { Container, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { SUPPORT_PHONE, WHATSAPP_NUMBER } from "@/config/business";
import {
  checkAccess, coursePrice, courseListPrice, getCourse, getCurriculum, learnHref, pick, taka, titleOf, youtubeEmbed,
  type CourseAccess, type RecordedCourse, type RecordedLesson, type RecordedModule,
} from "./recordedApi";
import { COURSE_SECTIONS, DEFAULT_BENEFITS, DEFAULT_FAQ, HOW_TO_BUY, isVideoFile, isYouTube, shows, type DisplayKey } from "./courseSections";

const T = {
  bn: {
    home: "হোম", courses: "কোর্স", notFound: "কোর্সটি পাওয়া যায়নি।", allCourses: "সব কোর্স",
    recorded: "রেকর্ডেড কোর্স", lifetime: "আজীবন অ্যাক্সেস",
    modules: "মডিউল", classes: "ক্লাস", totalTime: "মোট সময়", access: "অ্যাক্সেস", forever: "আজীবন",
    hours: (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} ঘণ্টা` : `${m} মিনিট`),
    watch: "কোর্স দেখুন", buy: "এখনই কিনুন", startFree: "ফ্রি তে শুরু করুন",
    contact: "যোগাযোগ করুন", contactShort: "যোগাযোগ", whatsapp: "WhatsApp-এ কথা বলুন",
    pendingTitle: "আপনার অর্ডার যাচাই হচ্ছে", pendingSub: "পেমেন্ট মিলিয়ে অ্যাডমিন অনুমোদন দিলেই কোর্সটা খুলে যাবে।",
    moduleCount: (n: number) => `${n}টি মডিউল`,
    soonModule: "ক্লাস শীঘ্রই যোগ হবে",
    soon: "ক্লাসগুলো শীঘ্রই যোগ হবে।", classCount: (n: number) => `${n}টি ক্লাস`, min: (m: number) => `${m} মি.`,
    play: "দেখুন", free: "ফ্রি", seats: "ভর্তি চলছে", off: (p: number) => `${p}% ছাড়`, call: "কল করুন",
    staffNote: "আপনি স্টাফ হিসেবে লগইন করা — ক্রেতা এভাবেই দেখবে। পুরো কোর্স দেখতে:", courseView: "Course View",
    close: "বন্ধ করুন", previewNone: "এই কোর্সের ক্লাসগুলো কেনার পর খুলবে।",
  },
  en: {
    home: "Home", courses: "Courses", notFound: "Course not found.", allCourses: "All courses",
    recorded: "Recorded course", lifetime: "Lifetime access",
    modules: "Modules", classes: "Classes", totalTime: "Total time", access: "Access", forever: "Lifetime",
    hours: (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} hrs` : `${m} min`),
    watch: "Watch the course", buy: "Buy now", startFree: "Start for free",
    contact: "Contact us", contactShort: "Contact", whatsapp: "Chat on WhatsApp",
    pendingTitle: "Your order is being checked", pendingSub: "The course opens as soon as an admin matches the payment and approves it.",
    moduleCount: (n: number) => `${n} ${n === 1 ? "module" : "modules"}`,
    soonModule: "Classes coming soon",
    soon: "The classes will be added soon.", classCount: (n: number) => `${n} ${n === 1 ? "class" : "classes"}`, min: (m: number) => `${m} min`,
    play: "Watch", free: "Free", seats: "Enrolment open", off: (p: number) => `${p}% off`, call: "Call",
    staffNote: "You're signed in as staff — this is what a buyer sees. To watch the whole course:", courseView: "Course View",
    close: "Close", previewNone: "The classes open after you buy the course.",
  },
};

/** The first sentence or two of a long text, for a course with no short description. */
function shorten(text: string, max = 180): string {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf("।"), cut.lastIndexOf(". "), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  return stop > 60 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : max)}…`;
}

/** A YouTube video's still, for when the course has no picture of its own. */
const youtubeThumb = (url: string) => {
  const m = youtubeEmbed(url)?.match(/embed\/([^?]+)/);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : "";
};

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
  // The phone's bottom buy bar shows only once the hero's buttons are out of
  // sight — never two buy buttons on screen at once.
  const heroButtonsRef = useRef<HTMLDivElement | null>(null);
  const [heroButtonsSeen, setHeroButtonsSeen] = useState(true);
  useEffect(() => {
    const el = heroButtonsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setHeroButtonsSeen(e.isIntersecting), { rootMargin: "0px 0px -60px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [state]);

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

  // The player sits over the page: the page behind it does not scroll, and
  // Esc closes it.
  useEffect(() => {
    if (!preview) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [preview]);

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

  const on = (k: DisplayKey) => shows(course.display as Partial<Record<DisplayKey, boolean>>, k);
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
  // The hero's video: the intro video field, or — as the shop first did — a
  // video link put in the picture's place. YouTube, or a video file.
  const imageIsVideo = isYouTube(course.image) || isVideoFile(course.image);
  const heroVideo = course.promoVideo || (imageIsVideo ? course.image || "" : "");
  const picture = course.image && !imageIsVideo && !imgFailed ? course.image : isYouTube(heroVideo) ? youtubeThumb(heroVideo) : "";
  const firstFree = owned ? undefined : modules.flatMap((m) => m.lessons).find((l) => l.isFree && canPlayLesson(l));
  const includes = (course.courseIncludes || []).map((x) => pick(bn, x.text, x.textBn)).filter(Boolean);
  const benefits = (course.benefits || []).map((x) => pick(bn, x.text, x.textBn)).filter(Boolean);
  const faqs: [string, string][] = (course.faqs || [])
    .map((f) => [pick(bn, f.q, f.qBn), pick(bn, f.a, f.aBn)] as [string, string])
    .filter(([q, a]) => q && a);
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(title)}`;
  const priceText = price > 0 ? taka(price) : L.free;
  const playHero = () =>
    heroVideo
      ? setPreview({ title, url: heroVideo })
      : firstFree
        ? setPreview({ title: titleOf(bn, firstFree), url: firstFree.videoUrl })
        : document.getElementById("sec-curriculum")?.scrollIntoView({ behavior: "smooth", block: "start" });

  /** Buy (with the price on it) / watch; null while an order waits for approval. */
  const actionButton = (className: string) =>
    owned ? (
      <Link href={learnHref(course._id)} className={className}><LuPlay /> {L.watch}</Link>
    ) : access.pending ? null : (
      <Link href={checkoutHref} className={className}>
        <LuShoppingCart className="hidden shrink-0 sm:block" />
        {price > 0 ? (
          <>
            {L.buy}
            <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[0.95em] font-extrabold">{priceText}</span>
            {offPct > 0 && <span className="hidden text-xs font-semibold line-through opacity-70 sm:inline">{taka(list)}</span>}
          </>
        ) : (
          L.startFree
        )}
      </Link>
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
    { key: "time" as const, label: L.totalTime, value: minutes > 0 ? L.hours(minutes) : "", icon: LuClock },
    { key: "modules" as const, label: L.modules, value: String(modules.length), icon: LuLayers },
    { key: "classes" as const, label: L.classes, value: String(lessonCount), icon: LuVideo },
    { key: "access" as const, label: L.access, value: L.forever, icon: LuInfinity },
  ].filter((s) => on(s.key) && s.value);
  const onlyTime = stats.length === 1 && stats[0].key === "time";

  const embed = youtubeEmbed(preview?.url);

  return (
    <main className={cn("bg-surface-soft pb-44 lg:pb-16", font)}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#070b14] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            // Faint, and fading out towards the edges (the shop found it too busy).
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%)",
          }}
        />
        <div className="pointer-events-none absolute -left-40 -top-24 h-[28rem] w-[28rem] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-[-6rem] h-96 w-96 rounded-full bg-rose-500/15 blur-3xl" />

        {/* Phone (the shop, 11 Nov 2026): name → one line of description →
            video → the two buttons side by side. Computer: name, description
            and buttons on the left, the video on the right. */}
        <Container className="relative grid gap-x-10 gap-y-5 py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-16">
          {/* Name + short description */}
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <nav className="mb-5 hidden flex-wrap items-center gap-1 text-xs text-white/50 sm:flex">
              <Link href="/" className="hover:text-white">{L.home}</Link>
              <LuChevronRight className="h-3 w-3" />
              <Link href="/courses" className="hover:text-white">{L.courses}</Link>
              <LuChevronRight className="h-3 w-3" />
              <span className="line-clamp-1 text-white/80">{title}</span>
            </nav>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/85 sm:mb-4">
              <LuVideo className="h-3.5 w-3.5" /> {L.recorded}
            </span>
            <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">{title}</h1>
            {/* One line on a phone; two at most on a computer. */}
            {summary && <p className="mt-2 line-clamp-1 max-w-xl text-[15px] leading-relaxed text-white/70 sm:mt-4 sm:text-lg lg:line-clamp-2">{summary}</p>}

            {onlyTime ? (
              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300"><LuClock className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">{L.totalTime}</p>
                  <p className="text-2xl font-extrabold">{stats[0].value}</p>
                </div>
              </div>
            ) : stats.length > 0 && (
              <div className={cn("mt-7 grid max-w-xl gap-2", stats.length >= 4 ? "grid-cols-4" : stats.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
                {stats.map((s) => (
                  <div key={s.key} className={cn("rounded-lg border px-3 py-2", s.key === "time" ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.04]")}>
                    <p className={cn("flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", s.key === "time" ? "text-emerald-300" : "text-white/45")}>
                      <s.icon className="h-3 w-3 shrink-0" /> <span className="truncate">{s.label}</span>
                    </p>
                    <p className="mt-0.5 text-sm font-bold sm:text-base">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* The video — right on a computer, under the description on a phone */}
          <div className="rounded-[1.4rem] bg-gradient-to-br from-white/25 via-white/5 to-white/15 p-px shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <div className="rounded-[1.35rem] bg-[#0d1322] p-2 sm:p-4">
              <button type="button" onClick={playHero} className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-white/5" aria-label={title}>
                {picture ? (
                  <img src={picture} alt={title} onError={() => setImgFailed(true)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                ) : isVideoFile(heroVideo) ? (
                  <video src={`${heroVideo}#t=1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 text-white shadow-2xl ring-[10px] ring-rose-500/25 transition duration-300 group-hover:scale-110 group-hover:ring-rose-500/35 sm:h-20 sm:w-20 sm:ring-[12px]">
                  <LuPlay className="ml-1 h-7 w-7 sm:h-9 sm:w-9" />
                </span>
              </button>
            </div>
          </div>

          {/* The two buttons, side by side: buy (the price on it) and WhatsApp
              (a switch) — under the video on a phone, under the description
              on a computer. */}
          <div ref={heroButtonsRef} className={cn("flex gap-2.5 sm:gap-3 lg:col-start-1 lg:row-start-2 lg:max-w-xl lg:self-start", !on("contact") && "lg:max-w-sm")}>
            {actionButton("flex h-[52px] min-w-0 flex-[1.35] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 text-[15px] font-extrabold text-white shadow-[0_12px_30px_-10px_rgba(16,185,129,0.7)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400 sm:h-14 sm:gap-2.5 sm:px-6 sm:text-base") || (
              <span className="flex h-[52px] min-w-0 flex-[1.35] items-center justify-center rounded-2xl bg-amber-400/15 px-3 text-center text-xs font-semibold text-amber-200 sm:h-14 sm:text-sm">{L.pendingTitle}</span>
            )}
            {on("contact") && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/10 px-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#25D366]/20 sm:h-14 sm:gap-2.5 sm:px-5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white sm:h-8 sm:w-8"><FaWhatsapp className="h-4 w-4" /></span>
                <span className="truncate sm:hidden">{L.contactShort}</span>
                <span className="hidden truncate sm:inline">{L.contact}</span>
              </a>
            )}
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-12">
          {/* ── Course overview ── */}
          {(details || summary) && (
            <section id="sec-overview" className="scroll-mt-28">
              <SectionHead label={S.overview} />
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
                <p className="whitespace-pre-line text-[15px] leading-[1.9] text-muted-foreground">{details || summary}</p>
              </div>
            </section>
          )}

          {/* ── Course curriculum ── */}
          {on("curriculum") && (
            <section id="sec-curriculum" className="scroll-mt-28">
              <SectionHead label={S.curriculum} title={[L.moduleCount(modules.length), lessonCount ? L.classCount(lessonCount) : "", minutes ? L.hours(minutes) : ""].filter(Boolean).join(" · ")} />
              {modules.length === 0 ? (
                <p className="rounded-2xl bg-card p-6 text-muted-foreground">{L.soon}</p>
              ) : (
                <div className="space-y-3">
                  {modules.map((m, mi) => (
                    <div key={m._id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                      <button
                        type="button"
                        onClick={() => m.lessons.length && setOpen((o) => ({ ...o, [m._id]: !o[m._id] }))}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      >
                        <span className="flex items-center gap-3 font-semibold text-foreground">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">{String(mi + 1).padStart(2, "0")}</span>
                          {titleOf(bn, m)}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                          {m.lessons.length ? L.classCount(m.lessons.length) : L.soonModule}
                          {m.lessons.length > 0 && <LuChevronDown className={cn("transition", open[m._id] && "rotate-180")} />}
                        </span>
                      </button>
                      {open[m._id] && m.lessons.length > 0 && (
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
          )}

          {/* ── What you get (+ Benefits) ── */}
          {((on("includes") && includes.length > 0) || on("benefits")) && (
            <section id="sec-includes" className={cn("grid scroll-mt-28 gap-4", on("includes") && includes.length > 0 && on("benefits") && "sm:grid-cols-2")}>
              {on("includes") && includes.length > 0 && <InfoList title={S.includes} items={includes} tone="emerald" />}
              {on("benefits") && <InfoList title={S.benefits} items={benefits.length ? benefits : bn ? DEFAULT_BENEFITS.bn : DEFAULT_BENEFITS.en} tone="sky" />}
            </section>
          )}

          {/* ── How to buy ── */}
          {on("how") && (
            <section id="sec-how" className="scroll-mt-28">
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
          )}

          {/* ── FAQ ── */}
          {on("faq") && (
            <section id="sec-faq" className="scroll-mt-28">
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
          )}
        </div>

        {/* ── Price card ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-4 rounded-2xl border border-border bg-card p-5 shadow-glow">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> {L.seats}
            </span>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-extrabold text-foreground">{priceText}</span>
                {list > 0 && <span className="text-base text-muted-foreground line-through">{taka(list)}</span>}
                {offPct > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{L.off(offPct)}</span>}
              </div>
              {on("time") && minutes > 0 && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><LuClock className="h-4 w-4" /> {L.totalTime}: {L.hours(minutes)}</p>}
            </div>
            {actionButton(btnGreen)}
            {pendingBox}
            {staffNote}
            {on("contact") && (
              <>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white transition hover:brightness-95">
                  <FaWhatsapp className="h-4 w-4" /> {L.whatsapp}
                </a>
                <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                  <LuPhone className="h-4 w-4" /> {L.call}: {SUPPORT_PHONE}
                </a>
              </>
            )}
            <p className="flex items-center justify-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <LuCreditCard className="h-4 w-4 text-emerald-500" /> bKash · Nagad · Card
            </p>
          </div>
        </aside>
      </Container>

      {/* ── Phone: price + button stay at the bottom, just above the site's own
          bottom menu (BottomNav, ~60px + the iPhone safe area). ── */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur transition duration-300 lg:hidden",
          heroButtonsSeen && "pointer-events-none translate-y-full opacity-0"
        )}
      >
        <div className="mx-auto max-w-xl">
          {actionButton(btnGreen) || <span className="block text-center text-sm font-semibold text-amber-700">{L.pendingTitle}</span>}
        </div>
        {(access.staff || access.pending) && <div className="mx-auto mt-2 max-w-xl">{staffNote || pendingBox}</div>}
      </div>

      {/* ── Video player: over the page, centred ── */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-8" onClick={() => setPreview(null)}>
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setPreview(null)} className="absolute -top-11 right-0 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20">
              <LuX /> {L.close}
            </button>
            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              {embed ? (
                <iframe src={`${embed}&autoplay=1`} title={preview.title} className="aspect-video w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
              ) : preview.url ? (
                <video src={preview.url} controls autoPlay playsInline className="aspect-video w-full bg-black" />
              ) : (
                <p className="p-10 text-center text-white/70">{L.previewNone}</p>
              )}
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-white/80">{preview.title}</p>
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

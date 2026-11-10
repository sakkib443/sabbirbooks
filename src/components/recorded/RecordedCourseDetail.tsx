"use client";

/**
 * /courses/<id> — one recorded course. Redesigned 11 Nov 2026 after the
 * shop's reference (a diploma-course page): a dark hero with the numbers and
 * a video card, tabs above the content, the overview with what the course covers, a
 * sticky price card, the curriculum, and common questions. All the words come
 * from the course itself (title/titleBn, details/detailsBn, modules, classes,
 * includes) and follow the site's EN/বাং switch.
 *
 * The button changes with the visitor — buy, waiting for approval, or watch.
 * Staff see the page as a buyer does (so a paid course never looks free from
 * the admin's own account) with a link to Course View.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LuPlay, LuLock, LuVideo, LuClock, LuSmartphone, LuChevronDown, LuCircleCheck, LuHourglass,
  LuLayers, LuInfinity, LuPhone, LuX, LuShoppingCart, LuCreditCard, LuBadgeCheck, LuChevronRight,
} from "react-icons/lu";
import { Container, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { SUPPORT_PHONE, WHATSAPP_NUMBER } from "@/config/business";
import {
  checkAccess, coursePrice, courseListPrice, getCourse, getCurriculum, learnHref, pick, taka, titleOf, youtubeEmbed,
  type CourseAccess, type RecordedCourse, type RecordedLesson, type RecordedModule,
} from "./recordedApi";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: LuVideo,
  clock: LuClock,
  device: LuSmartphone,
};

const T = {
  bn: {
    home: "হোম",
    courses: "কোর্স",
    notFound: "কোর্সটি পাওয়া যায়নি।",
    allCourses: "সব কোর্স",
    recorded: "রেকর্ডেড কোর্স",
    lifetime: "আজীবন অ্যাক্সেস",
    modules: "মডিউল",
    classes: "ক্লাস",
    totalTime: "মোট সময়",
    access: "অ্যাক্সেস",
    forever: "আজীবন",
    hours: (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} ঘণ্টা` : `${m} মিনিট`),
    youGet: "কোর্সে যা পাবেন",
    watch: "কোর্স দেখুন",
    buy: "এখনই কিনুন",
    startFree: "ফ্রি তে শুরু করুন",
    contact: "যোগাযোগ করুন",
    pendingTitle: "আপনার অর্ডার যাচাই হচ্ছে",
    pendingSub: "পেমেন্ট মিলিয়ে অ্যাডমিন অনুমোদন দিলেই কোর্সটা খুলে যাবে।",
    tabs: { overview: "বিবরণ", curriculum: "কারিকুলাম", how: "কীভাবে কিনবেন", faq: "প্রশ্নোত্তর" },
    overviewLabel: "ওভারভিউ",
    overviewTitle: "কোর্স ওভারভিউ",
    learn: "এই কোর্সে যা শিখবেন",
    perks: "সুবিধা",
    perkList: ["যেকোনো সময়, যতবার খুশি দেখুন", "মোবাইল ও কম্পিউটারে", "একবার কিনলে আজীবন অ্যাক্সেস", "নিজের গতিতে শিখুন"],
    howTitle: "কীভাবে কিনবেন",
    steps: ["“এখনই কিনুন” চাপুন, লগইন করুন", "অনলাইনে বা বিকাশ/নগদে পেমেন্ট করুন", "পেমেন্ট মিললেই কোর্স খুলে যাবে"],
    curriculumLabel: "কারিকুলাম",
    curriculumTitle: (m: number, c: number) => `${m}টি মডিউল, ${c}টি ক্লাস`,
    soon: "ক্লাসগুলো শীঘ্রই যোগ হবে।",
    classCount: (n: number) => `${n}টি ক্লাস`,
    min: (m: number) => `${m} মি.`,
    play: "দেখুন",
    free: "ফ্রি",
    seats: "ভর্তি চলছে",
    off: (p: number) => `${p}% ছাড়`,
    call: "কল করুন",
    question: "প্রশ্ন আছে?",
    staffNote: "আপনি স্টাফ হিসেবে লগইন করা — ক্রেতা এভাবেই দেখবে। পুরো কোর্স দেখতে:",
    courseView: "Course View",
    faqTitle: "সাধারণ প্রশ্ন",
    faq: [
      ["কেনার পর কোথায় দেখব?", "লগইন করে “আমার কোর্স” থেকে। মোবাইল বা কম্পিউটার, যেকোনোটায় দেখা যাবে।"],
      ["কতদিন দেখা যাবে?", "একবার কিনলে আজীবন — যতবার খুশি দেখতে পারবেন।"],
      ["পেমেন্ট কীভাবে করব?", "অনলাইনে (কার্ড, বিকাশ, নগদ) অথবা বিকাশ/নগদে Send Money করে TrxID দিয়ে। অনলাইন পেমেন্টে সাথে সাথে খোলে, Send Money-তে অ্যাডমিন মিলিয়ে নিলে খোলে।"],
      ["কোনো সমস্যা হলে?", `কল বা WhatsApp করুন: ${SUPPORT_PHONE}`],
    ] as [string, string][],
    close: "বন্ধ করুন",
    previewNone: "এই কোর্সের ক্লাসগুলো কেনার পর খুলবে।",
  },
  en: {
    home: "Home",
    courses: "Courses",
    notFound: "Course not found.",
    allCourses: "All courses",
    recorded: "Recorded course",
    lifetime: "Lifetime access",
    modules: "Modules",
    classes: "Classes",
    totalTime: "Total time",
    access: "Access",
    forever: "Lifetime",
    hours: (m: number) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10} hrs` : `${m} min`),
    youGet: "What you get",
    watch: "Watch the course",
    buy: "Buy now",
    startFree: "Start for free",
    contact: "Contact us",
    pendingTitle: "Your order is being checked",
    pendingSub: "The course opens as soon as an admin matches the payment and approves it.",
    tabs: { overview: "Overview", curriculum: "Curriculum", how: "How to buy", faq: "FAQ" },
    overviewLabel: "Overview",
    overviewTitle: "Course overview",
    learn: "What you will learn",
    perks: "Benefits",
    perkList: ["Watch any time, as often as you like", "On mobile and computer", "Buy once, lifetime access", "Learn at your own pace"],
    howTitle: "How to buy",
    steps: ["Press “Buy now” and log in", "Pay online, or by bKash/Nagad", "The course opens once paid"],
    curriculumLabel: "Curriculum",
    curriculumTitle: (m: number, c: number) => `${m} ${m === 1 ? "module" : "modules"}, ${c} ${c === 1 ? "class" : "classes"}`,
    soon: "The classes will be added soon.",
    classCount: (n: number) => `${n} ${n === 1 ? "class" : "classes"}`,
    min: (m: number) => `${m} min`,
    play: "Watch",
    free: "Free",
    seats: "Enrolment open",
    off: (p: number) => `${p}% off`,
    call: "Call",
    question: "Questions?",
    staffNote: "You're signed in as staff — this is what a buyer sees. To watch the whole course:",
    courseView: "Course View",
    faqTitle: "Common questions",
    faq: [
      ["Where do I watch after buying?", "Log in and open “My courses” — on mobile or computer."],
      ["How long can I watch?", "Buy once, lifetime access — watch as often as you like."],
      ["How do I pay?", "Online (card, bKash, Nagad), or by bKash/Nagad Send Money with the TrxID. Online payments open at once; Send Money opens once an admin checks it."],
      ["Something wrong?", `Call or WhatsApp us: ${SUPPORT_PHONE}`],
    ] as [string, string][],
    close: "Close",
    previewNone: "The classes open after you buy the course.",
  },
};

const SECTIONS = ["overview", "curriculum", "how", "faq"] as const;

export default function RecordedCourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { isBengali: bn } = useLanguage();
  const L = bn ? T.bn : T.en;
  const [course, setCourse] = useState<RecordedCourse | null>(null);
  const [modules, setModules] = useState<RecordedModule[]>([]);
  const [access, setAccess] = useState<CourseAccess>({ hasAccess: false });
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<RecordedLesson | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

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
      <div className="bg-[#0b1220] py-16">
        <Container>
          <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
        </Container>
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
  const price = coursePrice(course);
  const list = courseListPrice(course);
  const offPct = list > 0 ? Math.round(((list - price) / list) * 100) : 0;
  const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
  // videoDuration is in seconds.
  const minutes = Math.round(modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.videoDuration || 0), 0), 0) / 60);
  const checkoutHref = `/courses/${course.slug || course._id}/checkout`;
  const firstFree = owned ? undefined : modules.flatMap((m) => m.lessons).find((l) => l.isFree && canPlayLesson(l));
  const embed = youtubeEmbed(preview?.videoUrl);
  const includes = (course.courseIncludes || []).map((x) => ({ icon: x.icon, text: pick(bn, x.text, x.textBn) })).filter((x) => x.text);
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(title)}`;
  const go = (sec: string) => document.getElementById(`sec-${sec}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const priceText = price > 0 ? taka(price) : L.free;

  const mainButton = owned ? (
    <Link href={learnHref(course._id)} className={btnGreen}><LuPlay /> {L.watch}</Link>
  ) : access.pending ? null : (
    <Link href={checkoutHref} className={btnGreen}><LuShoppingCart /> {price > 0 ? L.buy : L.startFree}</Link>
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
      <section className="relative overflow-hidden bg-[#0b1220] text-white">
        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />
        <Container className="relative grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-14">
          <div className="flex flex-col justify-center">
            <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-white/60">
              <Link href="/" className="hover:text-white">{L.home}</Link>
              <LuChevronRight className="h-3 w-3" />
              <Link href="/courses" className="hover:text-white">{L.courses}</Link>
              <LuChevronRight className="h-3 w-3" />
              <span className="line-clamp-1 text-white/90">{title}</span>
            </nav>
            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/10 px-3 py-1 text-white/90">{L.recorded}</span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-300">{L.lifetime}</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-[2.75rem]">{title}</h1>
            {details && <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-white/70 line-clamp-5">{details}</p>}
            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className={cn("rounded-xl border px-4 py-3", s.hot ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/5")}>
                  <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider", s.hot ? "text-emerald-300" : "text-white/50")}>
                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Video card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => (firstFree ? setPreview(firstFree) : go("curriculum"))}
              className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-white/5"
              aria-label={title}
            >
              {course.image ? (
                <img src={course.image} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-600 to-teal-800" />
              )}
              <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg ring-8 ring-rose-500/25 transition group-hover:scale-110">
                <LuPlay className="ml-1 h-7 w-7" />
              </span>
            </button>
            {includes.length > 0 && (
              <div className="mt-3 px-1">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">{L.youGet}</p>
                <div className="flex flex-wrap gap-2">
                  {includes.map((x, i) => {
                    const Icon = ICONS[x.icon || ""] || LuCircleCheck;
                    return (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/85">
                        <Icon className="h-3.5 w-3.5 text-emerald-300" /> {x.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Buying is the price card's job (one buy button on the page,
                the shop asked 11 Nov 2026); the hero only offers to talk. */}
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-500 text-sm font-bold text-white transition hover:bg-rose-600">
              <LuPhone /> {L.contact}
            </a>
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-14">
          {/* ── Tabs: part of the content below the hero, beside the price card ── */}
          <nav className="sticky top-[72px] z-20 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card/95 p-1.5 shadow-soft backdrop-blur">
            {SECTIONS.map((s) => (
              <button key={s} type="button" onClick={() => go(s)} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary-soft hover:text-primary">
                {L.tabs[s]}
              </button>
            ))}
          </nav>
          {/* ── Overview ── */}
          <section id="sec-overview" className="scroll-mt-36">
            <SectionLabel>{L.overviewLabel}</SectionLabel>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">{L.overviewTitle}</h2>
            {details && <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{details}</p>}
            {modules.length > 0 && (
              <>
                <h3 className="mb-3 mt-7 font-bold text-foreground">{L.learn}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {modules.map((m) => (
                    <div key={m._id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
                      <LuCircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-sm font-medium text-foreground">{titleOf(bn, m)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoList title={L.youGet} items={includes.length ? includes.map((x) => x.text) : [L.classCount(lessonCount)]} />
              <InfoList title={L.perks} items={L.perkList} />
            </div>
          </section>

          {/* ── Curriculum ── */}
          <section id="sec-curriculum" className="scroll-mt-36">
            <SectionLabel>{L.curriculumLabel}</SectionLabel>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">{L.curriculumTitle(modules.length, lessonCount)}</h2>
            <div className="mb-5 mt-3 flex flex-wrap gap-2 text-xs">
              {minutes > 0 && <Chip>{L.totalTime}: {L.hours(minutes)}</Chip>}
              <Chip>{L.lifetime}</Chip>
              <Chip>{L.recorded}</Chip>
            </div>
            {modules.length === 0 ? (
              <p className="rounded-2xl bg-card p-6 text-muted-foreground">{L.soon}</p>
            ) : (
              <div className="space-y-3">
                {modules.map((m, mi) => (
                  <div key={m._id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                    <button type="button" onClick={() => setOpen((o) => ({ ...o, [m._id]: !o[m._id] }))} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                      <span className="flex items-center gap-3 font-semibold text-foreground">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-bold text-primary">{String(mi + 1).padStart(2, "0")}</span>
                        {titleOf(bn, m)}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                        {L.classCount(m.lessons.length)}
                        <LuChevronDown className={cn("transition", open[m._id] && "rotate-180")} />
                      </span>
                    </button>
                    {open[m._id] && (
                      <ul className="divide-y divide-border border-t border-border">
                        {m.lessons.map((l) => {
                          const canPlay = canPlayLesson(l);
                          return (
                            <li key={l._id} className="flex items-center gap-3 px-5 py-3 text-sm">
                              {canPlay ? <LuPlay className="shrink-0 text-primary" /> : <LuLock className="shrink-0 text-muted-foreground" />}
                              <span className="flex-1 text-foreground">{titleOf(bn, l)}</span>
                              {l.isFree && !owned && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{L.free}</span>}
                              {!!l.videoDuration && <span className="text-muted-foreground">{L.min(Math.max(1, Math.round(l.videoDuration / 60)))}</span>}
                              {canPlay && (owned ? (
                                <Link href={`${learnHref(course._id)}?lesson=${l._id}`} className="font-semibold text-primary hover:underline">{L.play}</Link>
                              ) : (
                                <button type="button" onClick={() => setPreview(l)} className="font-semibold text-primary hover:underline">{L.play}</button>
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

          {/* ── How to buy ── */}
          <section id="sec-how" className="scroll-mt-36">
            <SectionLabel>{L.tabs.how}</SectionLabel>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">{L.howTitle}</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {L.steps.map((s, i) => (
                <li key={i} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white">{i + 1}</span>
                  <p className="text-sm font-medium text-foreground">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── FAQ ── */}
          <section id="sec-faq" className="scroll-mt-36">
            <SectionLabel>{L.tabs.faq}</SectionLabel>
            <h2 className="mb-5 text-2xl font-extrabold text-foreground sm:text-3xl">{L.faqTitle}</h2>
            <div className="space-y-3">
              {L.faq.map(([q, a], i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold text-foreground">
                    {q}
                    <LuChevronDown className={cn("shrink-0 transition", faqOpen === i && "rotate-180")} />
                  </button>
                  {faqOpen === i && <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">{a}</p>}
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
            {mainButton}
            {pendingBox}
            {staffNote}
            <a href={`tel:${SUPPORT_PHONE}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground transition hover:bg-muted">
              <LuPhone /> {L.call}: {SUPPORT_PHONE}
            </a>
            <ul className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              {[...new Set([...includes.map((x) => x.text), ...L.perkList.slice(0, 2)])].map((t, i) => (
                <li key={i} className="flex items-center gap-2"><LuBadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>
              ))}
              <li className="flex items-center gap-2"><LuCreditCard className="h-4 w-4 shrink-0 text-emerald-500" /> bKash · Nagad · Card</li>
            </ul>
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
          <div className="w-44">{mainButton || <span className="block text-right text-xs font-semibold text-amber-700">{L.pendingTitle}</span>}</div>
        </div>
        {(access.staff || access.pending) && <div className="mx-auto mt-2 max-w-xl">{staffNote || pendingBox}</div>}
      </div>

      {/* ── Preview player ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            {embed ? (
              <iframe src={embed} title={titleOf(bn, preview)} className="aspect-video w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : preview.videoUrl ? (
              <video src={preview.videoUrl} controls className="aspect-video w-full" />
            ) : (
              <p className="p-10 text-center text-white/70">{L.previewNone}</p>
            )}
            <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
              <p className="font-semibold text-foreground">{titleOf(bn, preview)}</p>
              <button type="button" onClick={() => setPreview(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><LuX /> {L.close}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-rose-500">
      <span className="h-0.5 w-6 rounded bg-rose-500" /> {children}
    </p>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-muted-foreground">{children}</span>;
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h3 className="mb-3 font-bold text-foreground">{title}</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2"><LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>
        ))}
      </ul>
    </div>
  );
}

const btnGreen =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-white shadow-soft transition hover:bg-emerald-600";

"use client";

/**
 * /courses/<id> (25 Oct 2026) — one recorded course: what it is, every class in
 * it (the free preview plays here), and one button that changes with the
 * visitor — buy, waiting for approval, or watch.
 *
 * Follows the site's EN/বাং switch: the page's words and the course's own
 * (title / titleBn, details / detailsBn, text / textBn).
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LuPlay, LuLock, LuVideo, LuClock, LuSmartphone, LuChevronDown, LuCircleCheck, LuHourglass, LuArrowLeft,
} from "react-icons/lu";
import { Container, cn } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
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
    notFound: "কোর্সটি পাওয়া যায়নি।",
    allCourses: "সব কোর্স",
    watch: "কোর্স দেখুন",
    pendingTitle: "আপনার অর্ডার যাচাই হচ্ছে",
    pendingSub: "পেমেন্ট মিলিয়ে অ্যাডমিন অনুমোদন দিলেই কোর্সটা খুলে যাবে।",
    buy: "এখনই কিনুন",
    startFree: "ফ্রি তে শুরু করুন",
    classes: (n: number) => `${n}টি ক্লাস`,
    about: (m: number) => `প্রায় ${m} মিনিট`,
    devices: "মোবাইল ও কম্পিউটারে",
    free: "ফ্রি",
    previewOne: "▶ ফ্রি একটা ক্লাস দেখুন",
    close: "বন্ধ করুন",
    inside: "কোর্সে যা আছে",
    soon: "ক্লাসগুলো শীঘ্রই যোগ হবে।",
    min: (m: number) => `${m} মি.`,
    play: "দেখুন",
  },
  en: {
    notFound: "Course not found.",
    allCourses: "All courses",
    watch: "Watch the course",
    pendingTitle: "Your order is being checked",
    pendingSub: "The course opens as soon as an admin matches the payment and approves it.",
    buy: "Buy now",
    startFree: "Start for free",
    classes: (n: number) => `${n} ${n === 1 ? "class" : "classes"}`,
    about: (m: number) => `About ${m} min`,
    devices: "On mobile and computer",
    free: "Free",
    previewOne: "▶ Watch a free class",
    close: "Close",
    inside: "What's in the course",
    soon: "The classes will be added soon.",
    min: (m: number) => `${m} min`,
    play: "Watch",
  },
};

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
      <Container className="py-14">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </Container>
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

  const title = titleOf(bn, course);
  const details = pick(bn, course.details, course.detailsBn);
  const price = coursePrice(course);
  const list = courseListPrice(course);
  const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
  // videoDuration is in seconds.
  const minutes = Math.round(modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + (l.videoDuration || 0), 0), 0) / 60);
  const checkoutHref = `/courses/${course.slug || course._id}/checkout`;
  const firstFree = modules.flatMap((m) => m.lessons).find((l) => !l.locked && l.videoUrl);
  const embed = youtubeEmbed(preview?.videoUrl);
  const play = (l: RecordedLesson) => {
    setPreview(l);
    setTimeout(() => document.getElementById("course-preview")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const cta = access.hasAccess ? (
    <Link href={learnHref(course._id)} className={btn}>
      <LuPlay /> {L.watch}
    </Link>
  ) : access.pending ? (
    <div className="rounded-xl bg-accent-soft p-4 text-sm text-foreground">
      <p className="flex items-center gap-2 font-semibold"><LuHourglass /> {L.pendingTitle}</p>
      <p className="mt-1 text-muted-foreground">{L.pendingSub}</p>
    </div>
  ) : (
    <Link href={checkoutHref} className={btn}>
      {price > 0 ? L.buy : L.startFree}
    </Link>
  );

  return (
    <main className={cn("bg-surface-soft pb-16", font)}>
      {/* Top band */}
      <section className="bg-gradient-to-br from-primary-strong to-primary text-primary-foreground">
        <Container className="py-10 sm:py-14 lg:pr-[400px]">
          <Link href="/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm opacity-80 hover:opacity-100">
            <LuArrowLeft /> {L.allCourses}
          </Link>
          <h1 className="text-2xl font-bold leading-snug sm:text-4xl">{title}</h1>
          {details && <p className="mt-3 max-w-2xl whitespace-pre-line opacity-90">{details}</p>}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-90">
            <span className="inline-flex items-center gap-1.5"><LuVideo /> {L.classes(lessonCount)}</span>
            {minutes > 0 && <span className="inline-flex items-center gap-1.5"><LuClock /> {L.about(minutes)}</span>}
            <span className="inline-flex items-center gap-1.5"><LuSmartphone /> {L.devices}</span>
          </div>
        </Container>
      </section>

      <Container className="relative grid gap-8 pt-8 lg:grid-cols-[1fr_360px]">
        {/* Buy card — beside the content on a computer, first on a phone */}
        <aside className="lg:col-start-2 lg:row-start-1 lg:-mt-48">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
            <div className="aspect-video bg-primary-soft">
              {course.image ? (
                <img src={course.image} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-primary"><LuPlay className="h-12 w-12" /></div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div>
                {price > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-foreground">{taka(price)}</span>
                    {list > 0 && <span className="ml-2 text-muted-foreground line-through">{taka(list)}</span>}
                  </>
                ) : (
                  <span className="text-3xl font-bold text-primary">{L.free}</span>
                )}
              </div>
              {cta}
              {!access.hasAccess && firstFree && (
                <button type="button" onClick={() => play(firstFree)} className="w-full text-sm font-semibold text-primary hover:underline">
                  {L.previewOne}
                </button>
              )}
              {!!course.courseIncludes?.length && (
                <ul className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  {course.courseIncludes.map((x, i) => {
                    const Icon = ICONS[x.icon || ""] || LuCircleCheck;
                    const text = pick(bn, x.text, x.textBn);
                    return text ? (
                      <li key={i} className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {text}</li>
                    ) : null;
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* Classes */}
        <section className="lg:col-start-1 lg:row-start-1">
          {preview && (
            <div id="course-preview" className="mb-6 scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-black">
              {embed ? (
                <iframe
                  src={embed}
                  title={titleOf(bn, preview)}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={preview.videoUrl} controls className="aspect-video w-full" />
              )}
              <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
                <p className="font-semibold text-foreground">{titleOf(bn, preview)}</p>
                <button type="button" onClick={() => setPreview(null)} className="text-sm text-muted-foreground hover:text-foreground">{L.close}</button>
              </div>
            </div>
          )}

          <h2 className="mb-4 text-xl font-bold text-foreground">{L.inside}</h2>
          {modules.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-muted-foreground">{L.soon}</p>
          ) : (
            <div className="space-y-3">
              {modules.map((m, mi) => (
                <div key={m._id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [m._id]: !o[m._id] }))}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-foreground">
                      <span className="mr-2 text-primary">{mi + 1}.</span>{titleOf(bn, m)}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      {L.classes(m.lessons.length)}
                      <LuChevronDown className={cn("transition", open[m._id] && "rotate-180")} />
                    </span>
                  </button>
                  {open[m._id] && (
                    <ul className="divide-y divide-border border-t border-border">
                      {m.lessons.map((l) => {
                        const canPlay = !l.locked && !!l.videoUrl;
                        return (
                          <li key={l._id} className="flex items-center gap-3 px-5 py-3 text-sm">
                            {canPlay ? <LuPlay className="shrink-0 text-primary" /> : <LuLock className="shrink-0 text-muted-foreground" />}
                            <span className="flex-1 text-foreground">{titleOf(bn, l)}</span>
                            {l.isFree && !access.hasAccess && (
                              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{L.free}</span>
                            )}
                            {!!l.videoDuration && <span className="text-muted-foreground">{L.min(Math.max(1, Math.round(l.videoDuration / 60)))}</span>}
                            {canPlay && (
                              access.hasAccess ? (
                                <Link href={`${learnHref(course._id)}?lesson=${l._id}`} className="font-semibold text-primary hover:underline">{L.play}</Link>
                              ) : (
                                <button type="button" onClick={() => play(l)} className="font-semibold text-primary hover:underline">
                                  {L.play}
                                </button>
                              )
                            )}
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
      </Container>
    </main>
  );
}

const btn =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-soft transition hover:bg-primary-hover";

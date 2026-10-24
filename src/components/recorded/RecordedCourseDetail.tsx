"use client";

/**
 * /courses/<id> (25 Oct 2026) — one recorded course: what it is, every class in
 * it (the free preview plays here), and one button that changes with the
 * visitor — buy, waiting for approval, or watch.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LuPlay, LuLock, LuVideo, LuClock, LuSmartphone, LuChevronDown, LuCircleCheck, LuHourglass, LuArrowLeft,
} from "react-icons/lu";
import { Container, cn } from "@/components/ui";
import {
  checkAccess, coursePrice, courseListPrice, getCourse, getCurriculum, learnHref, taka, youtubeEmbed,
  type CourseAccess, type RecordedCourse, type RecordedLesson, type RecordedModule,
} from "./recordedApi";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: LuVideo,
  clock: LuClock,
  device: LuSmartphone,
};

export default function RecordedCourseDetail() {
  const { id } = useParams<{ id: string }>();
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

  if (state === "loading") {
    return (
      <Container className="py-14">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </Container>
    );
  }
  if (state === "missing" || !course) {
    return (
      <Container className="hind-siliguri py-20 text-center">
        <p className="text-lg text-muted-foreground">কোর্সটি পাওয়া যায়নি।</p>
        <Link href="/courses" className="mt-4 inline-block font-semibold text-primary">← সব কোর্স</Link>
      </Container>
    );
  }

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
      <LuPlay /> কোর্স দেখুন
    </Link>
  ) : access.pending ? (
    <div className="rounded-xl bg-accent-soft p-4 text-sm text-foreground">
      <p className="flex items-center gap-2 font-semibold"><LuHourglass /> আপনার অর্ডার যাচাই হচ্ছে</p>
      <p className="mt-1 text-muted-foreground">পেমেন্ট মিলিয়ে অ্যাডমিন অনুমোদন দিলেই কোর্সটা খুলে যাবে।</p>
    </div>
  ) : (
    <Link href={checkoutHref} className={btn}>
      {price > 0 ? "এখনই কিনুন" : "ফ্রি তে শুরু করুন"}
    </Link>
  );

  return (
    <main className="hind-siliguri bg-surface-soft pb-16">
      {/* Top band */}
      <section className="bg-gradient-to-br from-primary-strong to-primary text-primary-foreground">
        <Container className="py-10 sm:py-14 lg:pr-[400px]">
          <Link href="/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm opacity-80 hover:opacity-100">
            <LuArrowLeft /> সব কোর্স
          </Link>
          <h1 className="text-2xl font-bold leading-snug sm:text-4xl">{course.title}</h1>
          {course.details && <p className="mt-3 max-w-2xl whitespace-pre-line opacity-90">{course.details}</p>}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-90">
            <span className="inline-flex items-center gap-1.5"><LuVideo /> {lessonCount}টি ক্লাস</span>
            {minutes > 0 && <span className="inline-flex items-center gap-1.5"><LuClock /> প্রায় {minutes} মিনিট</span>}
            <span className="inline-flex items-center gap-1.5"><LuSmartphone /> মোবাইল ও কম্পিউটারে</span>
          </div>
        </Container>
      </section>

      <Container className="relative grid gap-8 pt-8 lg:grid-cols-[1fr_360px]">
        {/* Buy card — beside the content on a computer, first on a phone */}
        <aside className="lg:col-start-2 lg:row-start-1 lg:-mt-48">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-border bg-card shadow-glow">
            <div className="aspect-video bg-primary-soft">
              {course.image ? (
                <img src={course.image} alt={course.title} className="h-full w-full object-cover" />
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
                  <span className="text-3xl font-bold text-primary">ফ্রি</span>
                )}
              </div>
              {cta}
              {!access.hasAccess && firstFree && (
                <button type="button" onClick={() => play(firstFree)} className="w-full text-sm font-semibold text-primary hover:underline">
                  ▶ ফ্রি একটা ক্লাস দেখুন
                </button>
              )}
              {!!course.courseIncludes?.length && (
                <ul className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
                  {course.courseIncludes.map((x, i) => {
                    const Icon = ICONS[x.icon || ""] || LuCircleCheck;
                    return (
                      <li key={i} className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {x.text}</li>
                    );
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
                  title={preview.title}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={preview.videoUrl} controls className="aspect-video w-full" />
              )}
              <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
                <p className="font-semibold text-foreground">{preview.title}</p>
                <button type="button" onClick={() => setPreview(null)} className="text-sm text-muted-foreground hover:text-foreground">বন্ধ করুন</button>
              </div>
            </div>
          )}

          <h2 className="mb-4 text-xl font-bold text-foreground">কোর্সে যা আছে</h2>
          {modules.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-muted-foreground">ক্লাসগুলো শীঘ্রই যোগ হবে।</p>
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
                      <span className="mr-2 text-primary">{mi + 1}.</span>{m.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      {m.lessons.length}টি ক্লাস
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
                            <span className="flex-1 text-foreground">{l.title}</span>
                            {l.isFree && !access.hasAccess && (
                              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">ফ্রি</span>
                            )}
                            {!!l.videoDuration && <span className="text-muted-foreground">{Math.max(1, Math.round(l.videoDuration / 60))} মি.</span>}
                            {canPlay && (
                              access.hasAccess ? (
                                <Link href={`${learnHref(course._id)}?lesson=${l._id}`} className="font-semibold text-primary hover:underline">দেখুন</Link>
                              ) : (
                                <button type="button" onClick={() => play(l)} className="font-semibold text-primary hover:underline">
                                  দেখুন
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

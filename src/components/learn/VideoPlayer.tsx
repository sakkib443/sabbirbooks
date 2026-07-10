"use client";

/* eslint-disable @next/next/no-img-element */
// The media area of the course player. Renders one of:
//  • a locked overlay (premium lesson, not enrolled) → enroll CTA,
//  • an HTML5 <video controls> for Cloudinary video lessons,
//  • rich text for `text` lessons,
//  • a graceful note for quiz/assignment (not playable here).
import Link from "next/link";
import {
  LuLock,
  LuVideoOff,
  LuFileText,
  LuClipboardList,
  LuStethoscope,
  LuChevronRight,
} from "react-icons/lu";
import { buttonVariants, cn } from "@/components/ui";
import type { LearnCourse, LearnLesson } from "./types";
import { isLessonPlayable } from "./types";

export default function VideoPlayer({
  lesson,
  course,
  hasAccess,
  enrollHref,
  isBengali,
}: {
  lesson: LearnLesson | null;
  course: LearnCourse | null;
  hasAccess: boolean;
  enrollHref: string;
  isBengali: boolean;
}) {
  const bn = isBengali ? "hind-siliguri" : "";

  const S = isBengali
    ? {
        empty: "একটি লেসন নির্বাচন করুন",
        emptyText: "শুরু করতে বাম পাশ থেকে একটি লেসন বেছে নিন।",
        locked: "এই লেসনটি লক করা আছে",
        lockedText: "সম্পূর্ণ কোর্সটি আনলক করতে এনরোল করুন। ফ্রি লেসনগুলো এখনই দেখতে পারবেন।",
        enroll: "এনরোল করে আনলক করুন",
        noVideo: "এই লেসনের ভিডিও এখনো যোগ করা হয়নি।",
        quiz: "এই লেসনটি একটি কুইজ",
        assignment: "এই লেসনটি একটি অ্যাসাইনমেন্ট",
        quizText: "কুইজ ও অ্যাসাইনমেন্ট প্লেয়ারে দেখা যায় না।",
        unsupported: "এই লেসনটি এখানে দেখা যাচ্ছে না।",
      }
    : {
        empty: "Select a lesson",
        emptyText: "Choose a lesson from the list on the left to begin.",
        locked: "This lesson is locked",
        lockedText: "Enroll to unlock the full course. Free preview lessons are available right away.",
        enroll: "Enroll to unlock",
        noVideo: "The video for this lesson hasn't been added yet.",
        quiz: "This lesson is a quiz",
        assignment: "This lesson is an assignment",
        quizText: "Quizzes and assignments aren't playable in the video area.",
        unsupported: "This lesson can't be displayed here.",
      };

  // ── Empty (no lesson picked) ──────────────────────────────────────────────
  if (!lesson) {
    return (
      <Frame>
        <div className="flex flex-col items-center px-6 text-center text-white/80">
          <LuStethoscope className="mb-3 text-4xl text-white/60" />
          <p className={cn("font-heading text-lg font-semibold text-white", bn)}>{S.empty}</p>
          <p className={cn("mt-1 max-w-sm text-sm text-white/70", bn)}>{S.emptyText}</p>
        </div>
      </Frame>
    );
  }

  // ── Locked (premium lesson, no access) ────────────────────────────────────
  if (!isLessonPlayable(lesson, hasAccess)) {
    return (
      <Frame poster={course?.image}>
        <div className="flex max-w-md flex-col items-center px-6 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
            <LuLock className="text-3xl" />
          </span>
          <p className={cn("font-heading text-xl font-bold text-white", bn)}>{S.locked}</p>
          <p className={cn("mt-2 text-sm text-white/80", bn)}>{S.lockedText}</p>
          <Link
            href={enrollHref}
            className={cn(buttonVariants({ variant: "accent", size: "lg" }), "mt-5", bn)}
          >
            {S.enroll} <LuChevronRight />
          </Link>
        </div>
      </Frame>
    );
  }

  // ── Video ─────────────────────────────────────────────────────────────────
  if (lesson.type === "video") {
    if (!lesson.videoUrl) {
      return (
        <Frame poster={course?.image}>
          <div className="flex flex-col items-center px-6 text-center text-white/80">
            <LuVideoOff className="mb-3 text-4xl text-white/60" />
            <p className={cn("text-sm text-white/80", bn)}>{S.noVideo}</p>
          </div>
        </Frame>
      );
    }
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-card">
        <video
          key={lesson._id}
          src={lesson.videoUrl}
          poster={course?.image}
          controls
          controlsList="nodownload"
          preload="metadata"
          className="h-full w-full"
        />
      </div>
    );
  }

  // ── Text ──────────────────────────────────────────────────────────────────
  if (lesson.type === "text") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary">
          <LuFileText /> {isBengali ? "পাঠ্য লেসন" : "Reading"}
        </div>
        {lesson.textContent ? (
          <div className={cn("whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90", bn)}>
            {lesson.textContent}
          </div>
        ) : lesson.description ? (
          <p className={cn("text-[15px] leading-relaxed text-muted-foreground", bn)}>
            {lesson.description}
          </p>
        ) : (
          <p className={cn("text-sm text-muted-foreground", bn)}>{S.unsupported}</p>
        )}
      </div>
    );
  }

  // ── Quiz / assignment (not playable here) ─────────────────────────────────
  return (
    <Frame poster={course?.image}>
      <div className="flex flex-col items-center px-6 text-center text-white/80">
        <LuClipboardList className="mb-3 text-4xl text-white/60" />
        <p className={cn("font-heading text-lg font-semibold text-white", bn)}>
          {lesson.type === "quiz" ? S.quiz : S.assignment}
        </p>
        <p className={cn("mt-1 max-w-sm text-sm text-white/70", bn)}>{S.quizText}</p>
      </div>
    </Frame>
  );
}

// Dark 16:9 stage used for overlays (empty / locked / no-video / quiz).
function Frame({ children, poster }: { children: React.ReactNode; poster?: string }) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-foreground shadow-card">
      {poster && (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/40" />
      <div className="relative flex items-center justify-center">{children}</div>
    </div>
  );
}

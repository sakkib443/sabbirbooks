"use client";

// Curriculum sidebar: module → lesson list. Premium lessons are locked (lock
// icon) unless the student is enrolled; isFree lessons always show a "Free"
// badge and stay clickable. The active lesson is highlighted. Modules are
// collapsible; the one holding the active lesson starts open.
import { useState } from "react";
import {
  LuChevronDown,
  LuLock,
  LuPlay,
  LuFileText,
  LuClipboardList,
  LuCircleCheck,
  LuVideo,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { Badge, cn } from "@/components/ui";
import type { CurriculumModule, LearnLesson, LessonType } from "./types";
import { isLessonPlayable } from "./types";

const TYPE_ICON: Record<LessonType, IconType> = {
  video: LuVideo,
  text: LuFileText,
  quiz: LuClipboardList,
  assignment: LuClipboardList,
};

function fmtDuration(sec?: number): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LessonSidebar({
  curriculum,
  selectedId,
  hasAccess,
  onSelect,
  isBengali,
}: {
  curriculum: CurriculumModule[];
  selectedId: string | null;
  hasAccess: boolean;
  onSelect: (lesson: LearnLesson) => void;
  isBengali: boolean;
}) {
  const bn = isBengali ? "hind-siliguri" : "";

  const S = isBengali
    ? { lessons: "লেসন", free: "ফ্রি", module: "মডিউল" }
    : { lessons: "lessons", free: "Free", module: "Module" };

  // Which modules are open. Default: the module containing the selected lesson,
  // else the first module.
  const initialOpen = () => {
    const set = new Set<string>();
    const owner = curriculum.find((m) => m.lessons.some((l) => l._id === selectedId));
    if (owner) set.add(owner._id);
    else if (curriculum[0]) set.add(curriculum[0]._id);
    return set;
  };
  const [open, setOpen] = useState<Set<string>>(initialOpen);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {curriculum.map((mod, mi) => {
        const isOpen = open.has(mod._id);
        return (
          <div key={mod._id}>
            <button
              type="button"
              onClick={() => toggle(mod._id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary">
                {mi + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-semibold text-foreground", bn)}>
                  {isBengali && mod.titleBn ? mod.titleBn : mod.title}
                </span>
                <span className={cn("text-xs text-muted-foreground", bn)}>
                  {mod.lessons.length} {S.lessons}
                </span>
              </span>
              <LuChevronDown
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {isOpen && (
              <ul className="pb-1.5">
                {mod.lessons.map((lesson) => {
                  const active = lesson._id === selectedId;
                  const playable = isLessonPlayable(lesson, hasAccess);
                  const locked = !playable;
                  const Icon = TYPE_ICON[lesson.type] || LuVideo;
                  const dur = fmtDuration(lesson.videoDuration);
                  return (
                    <li key={lesson._id}>
                      <button
                        type="button"
                        onClick={() => onSelect(lesson)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 pl-5 text-left transition-colors",
                          active ? "bg-primary-soft" : "hover:bg-muted/50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm",
                            active
                              ? "bg-primary text-primary-foreground"
                              : locked
                              ? "bg-muted text-muted-foreground"
                              : "bg-accent-soft text-accent"
                          )}
                        >
                          {locked ? (
                            <LuLock className="text-xs" />
                          ) : active ? (
                            <LuPlay className="text-xs" />
                          ) : (
                            <Icon className="text-xs" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-sm",
                              active ? "font-semibold text-primary" : "text-foreground/85",
                              bn
                            )}
                          >
                            {isBengali && lesson.titleBn ? lesson.titleBn : lesson.title}
                          </span>
                          {dur && (
                            <span className="text-xs text-muted-foreground">{dur}</span>
                          )}
                        </span>
                        {lesson.isFree && locked && (
                          <Badge variant="accent" className={cn("shrink-0", bn)}>
                            {S.free}
                          </Badge>
                        )}
                        {active && !locked && (
                          <LuCircleCheck className="shrink-0 text-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

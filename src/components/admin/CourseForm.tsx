"use client";

// Create/edit form for a Course. Scalars use react-hook-form + zod; the four
// repeatable lists (curriculum, includes, software, job positions) are
// controlled arrays. Numeric fields are captured as strings and coerced on
// submit. The numeric `id` is added by the page on create (backend requires it).
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuWand } from "react-icons/lu";
import { Button, Input } from "@/components/ui";
import { Field, Textarea, Select, StringListEditor, PairListEditor } from "./FormControls";
import { slugify } from "./helpers";
import type { Category, Mentor, Course, CourseType, PublishStatus, CourseInclude } from "./types";

const schema = z
  .object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().min(1, "Slug is required"),
    category: z.string().min(1, "Category is required"),
    mentor: z.string().min(1, "Mentor is required"),
    type: z.enum(["Online", "Offline", "Recorded"]),
    status: z.enum(["draft", "published", "archived"]),
    image: z.string().url("Image must be a valid URL"),
    fee: z.string().min(1, "Fee is required"),
    offerPrice: z.string().optional(),
    admissionFee: z.string().optional(),
    technology: z.string().min(1, "Technology is required"),
    lectures: z.string().min(1, "Lectures is required"),
    totalStudentsEnroll: z.string().optional(),
    details: z.string().min(1, "Details are required"),
    courseOverview: z.string().min(1, "Course overview is required"),
    courseStart: z.string().optional(),
    durationMonth: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "Recorded") {
      if (!data.courseStart?.trim())
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["courseStart"], message: "Required for Online/Offline" });
      if (!data.durationMonth || Number(data.durationMonth) < 1)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["durationMonth"], message: "Required (≥1) for Online/Offline" });
    }
  });

type FormValues = z.infer<typeof schema>;

export interface CoursePayload {
  title: string;
  slug: string;
  category: string;
  mentor: string;
  type: CourseType;
  status: PublishStatus;
  image: string;
  fee: string;
  offerPrice?: string;
  admissionFee?: number;
  technology: string;
  lectures: number;
  totalStudentsEnroll?: number;
  details: string;
  courseOverview: string;
  courseIncludes: CourseInclude[];
  softwareYoullLearn: string[];
  jobPositions: string[];
  courseStart?: string;
  durationMonth?: number;
  curriculum?: string[];
}

const cleanStrings = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);
const cleanPairs = (arr: CourseInclude[]) =>
  arr.map((p) => ({ icon: p.icon.trim(), text: p.text.trim() })).filter((p) => p.icon && p.text);

export function CourseForm({
  categories,
  mentors,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  categories: Category[];
  mentors: Mentor[];
  initial?: Course;
  submitting: boolean;
  onSubmit: (payload: CoursePayload) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      category: initial?.category ?? "",
      mentor: initial?.mentor ?? "",
      type: initial?.type ?? "Online",
      status: initial?.status ?? "published",
      image: initial?.image ?? "",
      fee: initial?.fee ?? "",
      offerPrice: initial?.offerPrice ?? "",
      admissionFee: initial?.admissionFee != null ? String(initial.admissionFee) : "",
      technology: initial?.technology ?? "",
      lectures: initial?.lectures != null ? String(initial.lectures) : "",
      totalStudentsEnroll: initial?.totalStudentsEnroll != null ? String(initial.totalStudentsEnroll) : "",
      details: initial?.details ?? "",
      courseOverview: initial?.courseOverview ?? "",
      courseStart: initial?.courseStart ?? "",
      durationMonth: initial?.durationMonth != null ? String(initial.durationMonth) : "",
    },
  });

  const [curriculum, setCurriculum] = useState<string[]>(initial?.curriculum?.length ? initial.curriculum : [""]);
  const [includes, setIncludes] = useState<CourseInclude[]>(initial?.courseIncludes?.length ? initial.courseIncludes : []);
  const [software, setSoftware] = useState<string[]>(initial?.softwareYoullLearn?.length ? initial.softwareYoullLearn : [""]);
  const [jobs, setJobs] = useState<string[]>(initial?.jobPositions?.length ? initial.jobPositions : [""]);
  const [listError, setListError] = useState<string | null>(null);

  const type = watch("type");

  const submit = (v: FormValues) => {
    const curr = cleanStrings(curriculum);
    if (v.type !== "Recorded" && curr.length === 0) {
      setListError("Add at least one curriculum topic for Online/Offline courses.");
      return;
    }
    setListError(null);

    const payload: CoursePayload = {
      title: v.title.trim(),
      slug: slugify(v.slug) || slugify(v.title),
      category: v.category,
      mentor: v.mentor,
      type: v.type,
      status: v.status,
      image: v.image.trim(),
      fee: v.fee.trim(),
      offerPrice: v.offerPrice?.trim() || undefined,
      admissionFee: v.admissionFee ? Number(v.admissionFee) : undefined,
      technology: v.technology.trim(),
      lectures: Number(v.lectures),
      totalStudentsEnroll: v.totalStudentsEnroll ? Number(v.totalStudentsEnroll) : undefined,
      details: v.details.trim(),
      courseOverview: v.courseOverview.trim(),
      courseIncludes: cleanPairs(includes),
      softwareYoullLearn: cleanStrings(software),
      jobPositions: cleanStrings(jobs),
    };
    if (v.type !== "Recorded") {
      payload.courseStart = v.courseStart?.trim();
      payload.durationMonth = v.durationMonth ? Number(v.durationMonth) : undefined;
      payload.curriculum = curr;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title?.message}>
          <Input placeholder="Clinical Anatomy Masterclass" {...register("title")} />
        </Field>
        <Field label="Slug" required error={errors.slug?.message}>
          <div className="flex gap-2">
            <Input placeholder="clinical-anatomy-masterclass" {...register("slug")} />
            <button
              type="button"
              onClick={() => setValue("slug", slugify(watch("title")), { shouldValidate: true })}
              className="shrink-0 rounded-xl border border-border px-3 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title="Generate from title"
            >
              <LuWand />
            </button>
          </div>
        </Field>
        <Field label="Category" required error={errors.category?.message}>
          <Select {...register("category")}>
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mentor" required error={errors.mentor?.message}>
          <Select {...register("mentor")}>
            <option value="">Select mentor…</option>
            {mentors.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type" required error={errors.type?.message}>
          <Select {...register("type")}>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Recorded">Recorded</option>
          </Select>
        </Field>
        <Field label="Status" required error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Fee (৳)" required error={errors.fee?.message} hint="Stored as text, e.g. 12000">
          <Input placeholder="12000" {...register("fee")} />
        </Field>
        <Field label="Offer price (৳)" error={errors.offerPrice?.message}>
          <Input placeholder="9000" {...register("offerPrice")} />
        </Field>
        <Field label="Admission fee (৳)" error={errors.admissionFee?.message} hint="Minimum to confirm seat (0 = full)">
          <Input type="number" placeholder="0" {...register("admissionFee")} />
        </Field>
        <Field label="Lectures" required error={errors.lectures?.message}>
          <Input type="number" placeholder="24" {...register("lectures")} />
        </Field>
        <Field label="Technology / topic" required error={errors.technology?.message}>
          <Input placeholder="Anatomy" {...register("technology")} />
        </Field>
        <Field label="Students enrolled" error={errors.totalStudentsEnroll?.message} hint="Optional display count">
          <Input type="number" placeholder="260" {...register("totalStudentsEnroll")} />
        </Field>
      </div>

      <Field label="Cover image URL" required error={errors.image?.message}>
        <Input placeholder="https://…/course.jpg" {...register("image")} />
      </Field>

      {type !== "Recorded" && (
        <div className="grid gap-4 rounded-xl border border-border bg-surface-soft/40 p-4 sm:grid-cols-2">
          <Field label="Course start" required error={errors.courseStart?.message}>
            <Input placeholder="15 August 2026" {...register("courseStart")} />
          </Field>
          <Field label="Duration (months)" required error={errors.durationMonth?.message}>
            <Input type="number" placeholder="6" {...register("durationMonth")} />
          </Field>
          <Field label="Curriculum topics" required className="sm:col-span-2">
            <StringListEditor values={curriculum} onChange={setCurriculum} placeholder="e.g. Upper limb anatomy" />
          </Field>
        </div>
      )}

      <Field label="Details" required error={errors.details?.message}>
        <Textarea rows={3} placeholder="Full course description…" {...register("details")} />
      </Field>
      <Field label="Course overview" required error={errors.courseOverview?.message}>
        <Textarea rows={3} placeholder="What students will achieve…" {...register("courseOverview")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Software you'll learn">
          <StringListEditor values={software} onChange={setSoftware} placeholder="e.g. Complete Anatomy" />
        </Field>
        <Field label="Job positions">
          <StringListEditor values={jobs} onChange={setJobs} placeholder="e.g. Medical Officer" />
        </Field>
      </div>
      <Field label="Course includes" hint="Icon name + short text (e.g. LuClock · 24h video)">
        <PairListEditor values={includes} onChange={setIncludes} />
      </Field>

      {listError && <p className="text-sm font-medium text-coral">{listError}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Create course"}
        </Button>
      </div>
    </form>
  );
}

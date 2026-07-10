"use client";

// Create/edit form for a Mentor. Scalars go through react-hook-form + zod;
// the three list fields (specialized area, qualifications, experience) are
// controlled arrays validated on submit. `id` is supplied by the page on create.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { Field, Textarea, StringListEditor } from "./FormControls";
import type { Mentor } from "./types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  designation: z.string().min(1, "Designation is required"),
  subject: z.string().min(1, "Subject is required"),
  image: z.string().url("Image must be a valid URL"),
  details: z.string().min(1, "Details are required"),
  lifeJourney: z.string().min(1, "Life journey is required"),
  years: z.string().min(1, "Required"),
  students: z.string().min(1, "Required"),
  password: z.string().optional(),
  isPublished: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface MentorPayload {
  name: string;
  email: string;
  phone: string;
  designation: string;
  subject: string;
  image: string;
  details: string;
  lifeJourney: string;
  training_experience: { years: string; students: string };
  specialized_area: string[];
  education_qualification: string[];
  work_experience: string[];
  password?: string;
  isPublished: boolean;
}

const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

export function MentorForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Mentor;
  submitting: boolean;
  onSubmit: (payload: MentorPayload) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      designation: initial?.designation ?? "",
      subject: initial?.subject ?? "",
      image: initial?.image ?? "",
      details: initial?.details ?? "",
      lifeJourney: initial?.lifeJourney ?? "",
      years: initial?.training_experience?.years ?? "",
      students: initial?.training_experience?.students ?? "",
      password: "",
      isPublished: initial?.isPublished ?? true,
    },
  });

  const [specialized, setSpecialized] = useState<string[]>(initial?.specialized_area?.length ? initial.specialized_area : [""]);
  const [education, setEducation] = useState<string[]>(initial?.education_qualification?.length ? initial.education_qualification : [""]);
  const [experience, setExperience] = useState<string[]>(initial?.work_experience?.length ? initial.work_experience : [""]);
  const [listError, setListError] = useState<string | null>(null);

  const submit = (v: FormValues) => {
    const sp = clean(specialized);
    const ed = clean(education);
    const ex = clean(experience);
    if (!sp.length || !ed.length || !ex.length) {
      setListError("Specialized area, qualifications and experience each need at least one entry.");
      return;
    }
    setListError(null);
    onSubmit({
      name: v.name.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      designation: v.designation.trim(),
      subject: v.subject.trim(),
      image: v.image.trim(),
      details: v.details.trim(),
      lifeJourney: v.lifeJourney.trim(),
      training_experience: { years: v.years.trim(), students: v.students.trim() },
      specialized_area: sp,
      education_qualification: ed,
      work_experience: ex,
      password: v.password?.trim() || undefined,
      isPublished: v.isPublished ?? true,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name?.message}>
          <Input placeholder="Dr. Sabbir Ahmed" {...register("name")} />
        </Field>
        <Field label="Designation" required error={errors.designation?.message}>
          <Input placeholder="Senior Consultant" {...register("designation")} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" placeholder="mentor@example.com" {...register("email")} />
        </Field>
        <Field label="Phone" required error={errors.phone?.message}>
          <Input placeholder="01XXXXXXXXX" {...register("phone")} />
        </Field>
        <Field label="Subject" required error={errors.subject?.message}>
          <Input placeholder="Anatomy" {...register("subject")} />
        </Field>
        <Field label="Image URL" required error={errors.image?.message}>
          <Input placeholder="https://…/mentor.jpg" {...register("image")} />
        </Field>
        <Field label="Training — years" required error={errors.years?.message}>
          <Input placeholder="8+ years" {...register("years")} />
        </Field>
        <Field label="Training — students" required error={errors.students?.message}>
          <Input placeholder="1200+" {...register("students")} />
        </Field>
      </div>

      <Field label="Details" required error={errors.details?.message}>
        <Textarea rows={3} placeholder="Short professional bio…" {...register("details")} />
      </Field>
      <Field label="Life journey" required error={errors.lifeJourney?.message}>
        <Textarea rows={3} placeholder="Career/life story…" {...register("lifeJourney")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Specialized areas" required>
          <StringListEditor values={specialized} onChange={setSpecialized} placeholder="e.g. Cardiology" />
        </Field>
        <Field label="Education qualifications" required>
          <StringListEditor values={education} onChange={setEducation} placeholder="e.g. MBBS, Dhaka Medical" />
        </Field>
      </div>
      <Field label="Work experience" required>
        <StringListEditor values={experience} onChange={setExperience} placeholder="e.g. Consultant, Square Hospital" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={initial ? "Reset login password (optional)" : "Login password (optional)"}
          hint="Leave blank to use the backend default."
        >
          <Input type="text" placeholder="Optional password" {...register("password")} />
        </Field>
        <Field label="Visibility">
          <label className="flex h-11 items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("isPublished")} />
            Show on public website
          </label>
        </Field>
      </div>

      {listError && <p className="text-sm font-medium text-coral">{listError}</p>}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Create mentor"}
        </Button>
      </div>
    </form>
  );
}

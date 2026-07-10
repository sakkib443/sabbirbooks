"use client";

// Create/edit form for a QR resource. Scalars via react-hook-form + zod; the
// content blocks use the dedicated BlocksEditor. slug is optional (backend
// auto-generates when blank). Empty blocks are dropped before submit.
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { Field, Textarea, Select } from "./FormControls";
import { BlocksEditor } from "./BlocksEditor";
import { slugify } from "./helpers";
import type { Book, QrBlock, QrResource, QrStatus } from "./types";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  questionNo: z.string().min(1, "Question number is required"),
  questionText: z.string().optional(),
  book: z.string().optional(),
  bookTitle: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

type FormValues = z.infer<typeof schema>;

export interface QrPayload {
  title: string;
  questionNo: string;
  questionText?: string;
  book?: string;
  bookTitle?: string;
  slug?: string;
  status: QrStatus;
  blocks: QrBlock[];
}

export function QrForm({
  books,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  books: Book[];
  initial?: QrResource;
  submitting: boolean;
  onSubmit: (payload: QrPayload) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      questionNo: initial ? String(initial.questionNo ?? "") : "",
      questionText: initial?.questionText ?? "",
      book: initial?.book ?? "",
      bookTitle: initial?.bookTitle ?? "",
      slug: initial?.slug ?? "",
      status: initial?.status ?? "published",
    },
  });

  const [blocks, setBlocks] = useState<QrBlock[]>(initial?.blocks ?? []);

  const onBookChange = (id: string) => {
    setValue("book", id);
    const b = books.find((x) => x._id === id);
    if (b && !watch("bookTitle")) setValue("bookTitle", b.title);
  };

  const submit = (v: FormValues) => {
    const cleanBlocks = blocks
      .map((b) => ({ ...b, value: b.value.trim(), caption: b.caption?.trim() || undefined }))
      .filter((b) => b.value);
    const slug = v.slug?.trim() ? slugify(v.slug) : undefined;
    onSubmit({
      title: v.title.trim(),
      questionNo: v.questionNo.trim(),
      questionText: v.questionText?.trim() || undefined,
      book: v.book || undefined,
      bookTitle: v.bookTitle?.trim() || undefined,
      slug,
      status: v.status,
      blocks: cleanBlocks,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title?.message} className="sm:col-span-2">
          <Input placeholder="e.g. Brachial plexus — explained" {...register("title")} />
        </Field>
        <Field label="Book (optional)" hint="Link to a catalog book, or leave blank">
          <Select value={watch("book") || ""} onChange={(e) => onBookChange(e.target.value)}>
            <option value="">No linked book</option>
            {books.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Book title (free text)" hint="Used when there is no linked book">
          <Input placeholder="e.g. Clinical Anatomy Vol. 1" {...register("bookTitle")} />
        </Field>
        <Field label="Question number" required error={errors.questionNo?.message}>
          <Input placeholder="12a" {...register("questionNo")} />
        </Field>
        <Field label="Status" required error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </Field>
        <Field label="Slug" hint="Leave blank to auto-generate" className="sm:col-span-2">
          <Input placeholder="auto-generated-if-blank" {...register("slug")} />
        </Field>
      </div>

      <Field label="Question text (optional)" error={errors.questionText?.message}>
        <Textarea rows={2} placeholder="The question as printed in the book…" {...register("questionText")} />
      </Field>

      <Field label="Content blocks" hint="Text, image and video shown on the scanned page">
        <BlocksEditor blocks={blocks} onChange={setBlocks} />
      </Field>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Create resource"}
        </Button>
      </div>
    </form>
  );
}

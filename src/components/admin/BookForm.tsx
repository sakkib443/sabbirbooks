"use client";

// Create/edit form for a Book. Backend auto-generates the numeric `id`.
// printed → stock required; digital → secureFileUrl required (create only, since
// it's select:false and never returned, so we don't overwrite it on edit unless
// the admin re-enters it). Scalars via react-hook-form + zod.
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuWand } from "react-icons/lu";
import { Button, Input } from "@/components/ui";
import { Field, Textarea, Select, StringListEditor } from "./FormControls";
import { slugify } from "./helpers";
import type { Book, PublishStatus } from "./types";

function makeSchema(isEdit: boolean) {
  return z
    .object({
      title: z.string().min(1, "Title is required"),
      slug: z.string().min(1, "Slug is required"),
      author: z.string().min(1, "Author is required"),
      description: z.string().min(1, "Description is required"),
      coverImage: z.string().url("Cover image must be a valid URL"),
      price: z.string().min(1, "Price is required"),
      offerPrice: z.string().optional(),
      category: z.string().min(1, "Category is required"),
      language: z.enum(["bn", "en", "both"]),
      format: z.enum(["printed", "digital"]),
      stock: z.string().optional(),
      secureFileUrl: z.string().optional(),
      previewPdfUrl: z.string().optional(),
      status: z.enum(["draft", "published", "archived"]),
      isFeatured: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.format === "printed") {
        if (data.stock === undefined || data.stock === "" || Number(data.stock) < 0)
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["stock"], message: "Stock is required for printed books" });
      }
      if (data.format === "digital" && !isEdit) {
        const v = data.secureFileUrl?.trim();
        if (!v) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["secureFileUrl"], message: "Secure file URL is required for digital books" });
        else if (!/^https?:\/\//i.test(v))
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["secureFileUrl"], message: "Must be a valid URL" });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export interface BookPayload {
  title: string;
  slug: string;
  author: string;
  description: string;
  coverImage: string;
  price: number;
  offerPrice?: number;
  category: string;
  language: "bn" | "en" | "both";
  format: "printed" | "digital";
  stock?: number;
  secureFileUrl?: string;
  previewImages?: string[];
  previewPdfUrl?: string;
  status: PublishStatus;
  isFeatured: boolean;
}

const cleanStrings = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);

export function BookForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Book;
  submitting: boolean;
  onSubmit: (payload: BookPayload) => void;
  onCancel: () => void;
}) {
  const schema = useMemo(() => makeSchema(!!initial), [initial]);
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
      author: initial?.author ?? "",
      description: initial?.description ?? "",
      coverImage: initial?.coverImage ?? "",
      price: initial?.price != null ? String(initial.price) : "",
      offerPrice: initial?.offerPrice != null ? String(initial.offerPrice) : "",
      category: initial?.category ?? "",
      language: initial?.language ?? "both",
      format: initial?.format ?? "printed",
      stock: initial?.stock != null ? String(initial.stock) : "",
      secureFileUrl: "",
      previewPdfUrl: initial?.previewPdfUrl ?? "",
      status: initial?.status ?? "published",
      isFeatured: initial?.isFeatured ?? false,
    },
  });

  const [previews, setPreviews] = useState<string[]>(initial?.previewImages?.length ? initial.previewImages : [""]);

  const format = watch("format");

  const submit = (v: FormValues) => {
    const previewImages = cleanStrings(previews);
    const secure = v.secureFileUrl?.trim();
    onSubmit({
      title: v.title.trim(),
      slug: slugify(v.slug) || slugify(v.title),
      author: v.author.trim(),
      description: v.description.trim(),
      coverImage: v.coverImage.trim(),
      price: Number(v.price),
      offerPrice: v.offerPrice ? Number(v.offerPrice) : undefined,
      category: v.category.trim(),
      language: v.language,
      format: v.format,
      stock: v.format === "printed" ? Number(v.stock || 0) : undefined,
      secureFileUrl: v.format === "digital" && secure ? secure : undefined,
      previewImages: previewImages.length ? previewImages : undefined,
      previewPdfUrl: v.previewPdfUrl?.trim() || undefined,
      status: v.status,
      isFeatured: v.isFeatured ?? false,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title?.message}>
          <Input placeholder="Gray's Anatomy for Students" {...register("title")} />
        </Field>
        <Field label="Slug" required error={errors.slug?.message}>
          <div className="flex gap-2">
            <Input placeholder="grays-anatomy" {...register("slug")} />
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
        <Field label="Author" required error={errors.author?.message}>
          <Input placeholder="Richard Drake" {...register("author")} />
        </Field>
        <Field label="Category" required error={errors.category?.message}>
          <Input placeholder="Anatomy" {...register("category")} />
        </Field>
        <Field label="Format" required error={errors.format?.message}>
          <Select {...register("format")}>
            <option value="printed">Printed</option>
            <option value="digital">Digital</option>
          </Select>
        </Field>
        <Field label="Language" required error={errors.language?.message}>
          <Select {...register("language")}>
            <option value="both">Bangla + English</option>
            <option value="bn">Bangla</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <Field label="Price (৳)" required error={errors.price?.message}>
          <Input type="number" placeholder="1200" {...register("price")} />
        </Field>
        <Field label="Offer price (৳)" error={errors.offerPrice?.message}>
          <Input type="number" placeholder="950" {...register("offerPrice")} />
        </Field>
        {format === "printed" ? (
          <Field label="Stock" required error={errors.stock?.message}>
            <Input type="number" placeholder="50" {...register("stock")} />
          </Field>
        ) : (
          <Field
            label="Secure file URL"
            required={!initial}
            error={errors.secureFileUrl?.message}
            hint={initial ? "Hidden for security — leave blank to keep current." : "The purchasable PDF (kept private)."}
          >
            <Input placeholder="https://…/book.pdf" {...register("secureFileUrl")} />
          </Field>
        )}
        <Field label="Status" required error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
      </div>

      <Field label="Cover image URL" required error={errors.coverImage?.message}>
        <Input placeholder="https://…/cover.jpg" {...register("coverImage")} />
      </Field>
      <Field label="Description" required error={errors.description?.message}>
        <Textarea rows={3} placeholder="What the book covers…" {...register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preview images" hint="Public sample page URLs">
          <StringListEditor values={previews} onChange={setPreviews} placeholder="https://…/page-1.jpg" />
        </Field>
        <Field label="Preview PDF URL" error={errors.previewPdfUrl?.message}>
          <Input placeholder="https://…/preview.pdf" {...register("previewPdfUrl")} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" {...register("isFeatured")} />
        Feature this book on the storefront
      </label>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Create book"}
        </Button>
      </div>
    </form>
  );
}

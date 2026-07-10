"use client";

// Courses — list + create/edit + delete.
// Endpoints: GET /courses?status=all, POST /courses/create-course (needs a
// numeric `id` = max existing id + 1), PATCH /courses/:id, DELETE /courses/:id.
// Category & mentor come back as ObjectId strings in the list, so we fetch
// /categories and /mentors to resolve display names.
import { useCallback, useMemo, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuPlus, LuGraduationCap, LuPencil, LuTrash2 } from "react-icons/lu";
import { Button, Badge } from "@/components/ui";
import { PageHeader, EmptyState, StatusBadge } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CourseForm, type CoursePayload } from "@/components/admin/CourseForm";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatBDT } from "@/components/admin/helpers";
import type { Course, Category, Mentor } from "@/components/admin/types";

export default function AdminCoursesPage() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [c, cat, men] = await Promise.all([
      adminRequest<Course[]>("/courses?status=all&limit=100"),
      adminRequest<Category[]>("/categories"),
      adminRequest<Mentor[]>("/mentors"),
    ]);
    if (c.ok && Array.isArray(c.data)) setCourses(c.data);
    else setError(c.message || "Failed to load courses.");
    if (Array.isArray(cat.data)) setCategories(cat.data);
    if (Array.isArray(men.data)) setMentors(men.data);
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c._id, c.name])), [categories]);
  const mentorMap = useMemo(() => new Map(mentors.map((m) => [m._id, m.name])), [mentors]);

  const nextCourseId = () => {
    const max = courses.reduce((m, c) => (typeof c.id === "number" && c.id > m ? c.id : m), 0);
    return max + 1;
  };

  const openCreate = () => {
    if (categories.length === 0 || mentors.length === 0) {
      toast.error("Add at least one category and one mentor first.");
      return;
    }
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Course) => {
    setEditing(c);
    setFormOpen(true);
  };

  const submit = async (payload: CoursePayload) => {
    setSaving(true);
    let res;
    if (editing) {
      res = await adminRequest(`/courses/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      res = await adminRequest("/courses/create-course", {
        method: "POST",
        body: JSON.stringify({ ...payload, id: nextCourseId() }),
      });
    }
    setSaving(false);
    if (res.ok && res.success) {
      toast.success(editing ? "Course updated." : "Course created.");
      setFormOpen(false);
      setEditing(null);
      load();
    } else {
      toast.error(res.message || "Failed to save course.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminRequest(`/courses/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok && res.success) {
      toast.success("Course deleted.");
      setDeleteTarget(null);
      load();
    } else {
      toast.error(res.message || "Failed to delete course.");
    }
  };

  const columns: Column<Course>[] = [
    {
      key: "title",
      header: "Course",
      render: (c) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.image}
            alt={c.title}
            className="h-10 w-14 shrink-0 rounded-md border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{c.title}</p>
            <p className="truncate text-xs text-muted-foreground">{mentorMap.get(c.mentor) || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (c) => catMap.get(c.category) || "—" },
    { key: "type", header: "Type", render: (c) => <Badge variant="outline">{c.type}</Badge> },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (c) => (
        <div className="text-right">
          <span className="font-medium">{formatBDT(c.offerPrice || c.fee)}</span>
          {c.offerPrice && (
            <span className="ml-1 text-xs text-muted-foreground line-through">{formatBDT(c.fee)}</span>
          )}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status || "published"} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(c)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="Edit"
          >
            <LuPencil />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(c)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-coral/10 hover:text-coral"
            aria-label="Delete"
          >
            <LuTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Create and manage the course catalog."
        actions={
          <Button onClick={openCreate}>
            <LuPlus /> New course
          </Button>
        }
      />

      <AdminTable
        columns={columns}
        rows={courses}
        rowKey={(c) => c._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState
            icon={<LuGraduationCap />}
            title="No courses yet"
            description="Create your first course to get started."
          />
        }
      />

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit course" : "New course"}
        size="xl"
      >
        <CourseForm
          categories={categories}
          mentors={mentors}
          initial={editing ?? undefined}
          submitting={saving}
          onSubmit={submit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete course"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </div>
  );
}

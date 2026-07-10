"use client";

// Categories — list + create. Backend auto-generates the numeric `id`; create
// only needs { name }. POST /categories/create-category, GET /categories.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuPlus, LuTags } from "react-icons/lu";
import { Button, Input } from "@/components/ui";
import { PageHeader, EmptyState } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { Field } from "@/components/admin/FormControls";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatDate } from "@/components/admin/helpers";
import type { Category } from "@/components/admin/types";

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminRequest<Category[]>("/categories");
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.message || "Failed to load categories.");
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    setSaving(true);
    const res = await adminRequest("/categories/create-category", {
      method: "POST",
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (res.ok && res.success) {
      toast.success("Category created.");
      setName("");
      setOpen(false);
      load();
    } else {
      toast.error(res.message || "Failed to create category.");
    }
  };

  const columns: Column<Category>[] = [
    { key: "id", header: "ID", render: (r) => <span className="text-muted-foreground">#{r.id}</span> },
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "created", header: "Created", render: (r) => formatDate(r.createdAt), align: "right" },
  ];

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Course categories used across the catalog."
        actions={
          <Button onClick={() => setOpen(true)}>
            <LuPlus /> New category
          </Button>
        }
      />

      <AdminTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState
            icon={<LuTags />}
            title="No categories yet"
            description="Create your first category to organise courses."
          />
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New category"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </>
        }
      >
        <Field label="Category name" required>
          <Input
            value={name}
            autoFocus
            placeholder="e.g. Anatomy"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </Field>
      </Modal>
    </div>
  );
}

"use client";

// Books — list + create/edit + delete.
// Endpoints: GET /books?status=all, POST /books, PATCH /books/:id, DELETE /books/:id.
// Backend auto-generates the numeric id. Book category is a plain string.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuPlus, LuBookOpen, LuPencil, LuTrash2, LuStar } from "react-icons/lu";
import { Button, Badge } from "@/components/ui";
import { PageHeader, EmptyState, StatusBadge } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BookForm, type BookPayload } from "@/components/admin/BookForm";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatBDT } from "@/components/admin/helpers";
import type { Book } from "@/components/admin/types";

export default function AdminBooksPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminRequest<Book[]>("/books?status=all&limit=100");
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.message || "Failed to load books.");
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (b: Book) => {
    setEditing(b);
    setFormOpen(true);
  };

  const submit = async (payload: BookPayload) => {
    setSaving(true);
    const res = editing
      ? await adminRequest(`/books/${editing._id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await adminRequest("/books", { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok && res.success) {
      toast.success(editing ? "Book updated." : "Book created.");
      setFormOpen(false);
      setEditing(null);
      load();
    } else {
      toast.error(res.message || "Failed to save book.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminRequest(`/books/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok && res.success) {
      toast.success("Book deleted.");
      setDeleteTarget(null);
      load();
    } else {
      toast.error(res.message || "Failed to delete book.");
    }
  };

  const columns: Column<Book>[] = [
    {
      key: "title",
      header: "Book",
      render: (b) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.coverImage}
            alt={b.title}
            className="h-12 w-9 shrink-0 rounded-md border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
              {b.title}
              {b.isFeatured && <LuStar className="shrink-0 text-accent" title="Featured" />}
            </p>
            <p className="truncate text-xs text-muted-foreground">{b.author}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (b) => b.category },
    { key: "format", header: "Format", render: (b) => <Badge variant="outline">{b.format}</Badge> },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (b) => (b.format === "printed" ? (b.stock ?? 0) : "—"),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (b) => (
        <div className="text-right">
          <span className="font-medium">{formatBDT(b.offerPrice || b.price)}</span>
          {b.offerPrice != null && b.offerPrice > 0 && (
            <span className="ml-1 text-xs text-muted-foreground line-through">{formatBDT(b.price)}</span>
          )}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status || "published"} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(b)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="Edit"
          >
            <LuPencil />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(b)}
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
        title="Books"
        description="Manage the printed & digital book catalog."
        actions={
          <Button onClick={openCreate}>
            <LuPlus /> New book
          </Button>
        }
      />

      <AdminTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState
            icon={<LuBookOpen />}
            title="No books yet"
            description="Add your first book to the catalog."
          />
        }
      />

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit book" : "New book"}
        size="lg"
      >
        <BookForm
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
        title="Delete book"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </div>
  );
}

"use client";

// QR Resources — the signature feature. Each resource maps a printed-book
// question to a page of text/image/video content, reachable by scanning a QR
// that encodes `${origin}/r/${slug}`.
// Endpoints: GET /qr, POST /qr, PATCH /qr/:id, DELETE /qr/:id.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuPlus, LuQrCode, LuPencil, LuTrash2, LuEye, LuLayers } from "react-icons/lu";
import { Button, Card } from "@/components/ui";
import { PageHeader, EmptyState, StatusBadge, LoadingState, ErrorState } from "@/components/admin/primitives";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { QrForm, type QrPayload } from "@/components/admin/QrForm";
import { QrCard } from "@/components/admin/QrCard";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatNumber } from "@/components/admin/helpers";
import type { QrResource, Book } from "@/components/admin/types";

export default function AdminQrPage() {
  const toast = useToast();
  const [rows, setRows] = useState<QrResource[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<QrResource | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<QrResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [qr, bk] = await Promise.all([
      adminRequest<QrResource[]>("/qr?limit=100"),
      adminRequest<Book[]>("/books?status=all&limit=100"),
    ]);
    if (qr.ok && Array.isArray(qr.data)) setRows(qr.data);
    else setError(qr.message || "Failed to load QR resources.");
    if (Array.isArray(bk.data)) setBooks(bk.data);
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: QrResource) => {
    setEditing(r);
    setFormOpen(true);
  };

  const submit = async (payload: QrPayload) => {
    setSaving(true);
    const res = editing
      ? await adminRequest(`/qr/${editing._id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await adminRequest("/qr", { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok && res.success) {
      toast.success(editing ? "QR resource updated." : "QR resource created.");
      setFormOpen(false);
      setEditing(null);
      load();
    } else {
      toast.error(res.message || "Failed to save QR resource.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminRequest(`/qr/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok && res.success) {
      toast.success("QR resource deleted.");
      setDeleteTarget(null);
      load();
    } else {
      toast.error(res.message || "Failed to delete QR resource.");
    }
  };

  return (
    <div>
      <PageHeader
        title="QR Resources"
        description="Generate scannable pages that link printed-book questions to rich content."
        actions={
          <Button onClick={openCreate}>
            <LuPlus /> New resource
          </Button>
        }
      />

      {loading ? (
        <Card>
          <LoadingState label="Loading QR resources…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LuQrCode />}
            title="No QR resources yet"
            description="Create your first resource to generate a scannable QR code."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r._id} className="flex flex-col p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-base font-bold text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Q{String(r.questionNo)}
                    {r.bookTitle ? ` · ${r.bookTitle}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status || "published"} />
              </div>

              <div className="flex justify-center py-2">
                <QrCard slug={r.slug} filenameBase={`qr-${r.slug}`} />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <LuLayers /> {formatNumber(r.blocks?.length || 0)} blocks
                </span>
                <span className="inline-flex items-center gap-1">
                  <LuEye /> {formatNumber(r.views || 0)} views
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-primary-soft hover:text-primary"
                    aria-label="Edit"
                  >
                    <LuPencil />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(r)}
                    className="rounded-lg p-1.5 transition-colors hover:bg-coral/10 hover:text-coral"
                    aria-label="Delete"
                  >
                    <LuTrash2 />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit QR resource" : "New QR resource"}
        size="lg"
      >
        <QrForm
          books={books}
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
        title="Delete QR resource"
        message={`Delete "${deleteTarget?.title}"? The QR link will stop working.`}
      />
    </div>
  );
}

"use client";

// Mentors — list + create + edit + delete. Create needs a unique string `id`
// (computed here as max numeric id + 1) plus all profile fields. The backend
// also auto-provisions a mentor-role login user and returns one-time credentials.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuPlus, LuUsers, LuPencil, LuTrash2 } from "react-icons/lu";
import { Button, Badge } from "@/components/ui";
import { PageHeader, EmptyState } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MentorForm, type MentorPayload } from "@/components/admin/MentorForm";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import type { Mentor } from "@/components/admin/types";

export default function AdminMentorsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Mentor | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Mentor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminRequest<Mentor[]>("/mentors");
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.message || "Failed to load mentors.");
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const nextMentorId = () => {
    const nums = rows
      .map((r) => parseInt(String(r.id).replace(/\D/g, ""), 10))
      .filter((n) => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return String(max + 1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (m: Mentor) => {
    setEditing(m);
    setFormOpen(true);
  };

  const submit = async (payload: MentorPayload) => {
    setSaving(true);
    let res;
    if (editing) {
      res = await adminRequest(`/mentors/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      res = await adminRequest("/mentors/create-mentor", {
        method: "POST",
        body: JSON.stringify({ ...payload, id: nextMentorId() }),
      });
    }
    setSaving(false);
    if (res.ok && res.success) {
      const creds = (res.raw as { credentials?: { password?: string | null; email?: string } } | null)?.credentials;
      if (!editing && creds?.password) {
        toast.success(`Mentor created. Login: ${creds.email} / ${creds.password}`);
      } else {
        toast.success(editing ? "Mentor updated." : "Mentor created.");
      }
      setFormOpen(false);
      setEditing(null);
      load();
    } else {
      toast.error(res.message || "Failed to save mentor.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminRequest(`/mentors/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok && res.success) {
      toast.success("Mentor deleted.");
      setDeleteTarget(null);
      load();
    } else {
      toast.error(res.message || "Failed to delete mentor.");
    }
  };

  const columns: Column<Mentor>[] = [
    {
      key: "mentor",
      header: "Mentor",
      render: (m) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.image}
            alt={m.name}
            className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">{m.email || m.phone}</p>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Designation", render: (m) => m.designation },
    { key: "subject", header: "Subject", render: (m) => m.subject },
    {
      key: "published",
      header: "Visible",
      render: (m) =>
        m.isPublished === false ? (
          <Badge variant="muted">Hidden</Badge>
        ) : (
          <Badge variant="accent">Public</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(m)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="Edit"
          >
            <LuPencil />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(m)}
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
        title="Mentors"
        description="Teaching faculty shown across courses and the website."
        actions={
          <Button onClick={openCreate}>
            <LuPlus /> New mentor
          </Button>
        }
      />

      <AdminTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState
            icon={<LuUsers />}
            title="No mentors yet"
            description="Add your first mentor profile."
          />
        }
      />

      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editing ? "Edit mentor" : "New mentor"}
        size="lg"
      >
        <MentorForm
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
        title="Delete mentor"
        message={`Delete "${deleteTarget?.name}"? Their linked login will be deactivated.`}
      />
    </div>
  );
}

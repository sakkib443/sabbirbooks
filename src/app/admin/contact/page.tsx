"use client";

// Contact messages — list + view + mark read/replied + delete.
// Endpoints: GET /contacts, PATCH /contacts/:id, DELETE /contacts/:id.
import { useCallback, useMemo, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuMail, LuTrash2, LuEye } from "react-icons/lu";
import { Button, Badge } from "@/components/ui";
import { PageHeader, EmptyState, StatusBadge } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Select } from "@/components/admin/FormControls";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatDateTime } from "@/components/admin/helpers";
import type { ContactMessage } from "@/components/admin/types";

const FILTERS = ["all", "unread", "read", "replied"];

export default function AdminContactPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<ContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminRequest<ContactMessage[]>("/contacts");
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.message || "Failed to load messages.");
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((m) => m.status === filter)),
    [rows, filter]
  );

  const setStatus = async (m: ContactMessage, status: ContactMessage["status"], silent = false) => {
    const res = await adminRequest(`/contacts/${m._id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok && res.success) {
      setRows((prev) => prev.map((x) => (x._id === m._id ? { ...x, status } : x)));
      if (!silent) toast.success(`Marked ${status}.`);
    } else if (!silent) {
      toast.error(res.message || "Failed to update.");
    }
  };

  const open = (m: ContactMessage) => {
    setActive(m);
    if (m.status === "unread") setStatus(m, "read", true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminRequest(`/contacts/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok && res.success) {
      toast.success("Message deleted.");
      setRows((prev) => prev.filter((x) => x._id !== deleteTarget._id));
      setDeleteTarget(null);
      if (active?._id === deleteTarget._id) setActive(null);
    } else {
      toast.error(res.message || "Failed to delete message.");
    }
  };

  const columns: Column<ContactMessage>[] = [
    {
      key: "from",
      header: "From",
      render: (m) => (
        <div className="flex items-center gap-2">
          {m.status === "unread" && <span className="h-2 w-2 shrink-0 rounded-full bg-coral" />}
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
          </div>
        </div>
      ),
    },
    { key: "subject", header: "Subject", render: (m) => <span className="line-clamp-1">{m.subject}</span> },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
    { key: "date", header: "Received", align: "right", render: (m) => formatDateTime(m.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => open(m)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            aria-label="View"
          >
            <LuEye />
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
        title="Contact messages"
        description="Enquiries submitted through the website contact form."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 w-40">
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "all" ? "All messages" : f}
              </option>
            ))}
          </Select>
        }
      />

      <AdminTable
        columns={columns}
        rows={filtered}
        rowKey={(m) => m._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={<EmptyState icon={<LuMail />} title="No messages" description="Contact form submissions appear here." />}
      />

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.subject}
        description={active ? `${active.name} · ${active.email}` : undefined}
        footer={
          active && (
            <>
              <Badge variant="outline" className="mr-auto">
                {formatDateTime(active.createdAt)}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setStatus(active, "replied")}>
                Mark replied
              </Button>
              <a
                href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition-all hover:bg-primary-hover"
              >
                <LuMail /> Reply by email
              </a>
            </>
          )
        }
      >
        {active && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{active.message}</p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete message"
        message={`Delete the message from "${deleteTarget?.name}"?`}
      />
    </div>
  );
}

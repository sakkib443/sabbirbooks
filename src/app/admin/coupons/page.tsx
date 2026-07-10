"use client";

// Coupons — list + create + activate/deactivate + delete.
// Endpoints: GET /coupon, POST /coupon, PATCH /coupon/:id, DELETE /coupon/:id.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LuPlus, LuTicket, LuTrash2 } from "react-icons/lu";
import { Button, Input, Badge } from "@/components/ui";
import { PageHeader, EmptyState } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field, Select } from "@/components/admin/FormControls";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatDate, formatBDT } from "@/components/admin/helpers";
import type { Coupon } from "@/components/admin/types";

const schema = z.object({
  code: z.string().min(2, "Code is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string().min(1, "Value is required"),
  maxUses: z.string().optional(),
  minPurchase: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().min(1, "Expiry date is required"),
});
type FormValues = z.infer<typeof schema>;

export default function AdminCouponsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { discountType: "percentage", validFrom: "", maxUses: "100", minPurchase: "0" },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminRequest<Coupon[]>("/coupon");
    if (res.ok && Array.isArray(res.data)) setRows(res.data);
    else setError(res.message || "Failed to load coupons.");
    setLoading(false);
  }, []);

  useIsoEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    reset({ code: "", discountType: "percentage", discountValue: "", maxUses: "100", minPurchase: "0", validFrom: "", validUntil: "" });
    setOpen(true);
  };

  const submit = async (v: FormValues) => {
    setSaving(true);
    const body = {
      code: v.code.trim().toUpperCase(),
      discountType: v.discountType,
      discountValue: Number(v.discountValue),
      maxUses: v.maxUses ? Number(v.maxUses) : 100,
      minPurchase: v.minPurchase ? Number(v.minPurchase) : 0,
      validFrom: v.validFrom || undefined,
      validUntil: v.validUntil,
    };
    const res = await adminRequest("/coupon", { method: "POST", body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok && res.success) {
      toast.success("Coupon created.");
      setOpen(false);
      load();
    } else {
      toast.error(res.message || "Failed to create coupon.");
    }
  };

  const toggleActive = async (c: Coupon) => {
    const res = await adminRequest(`/coupon/${c._id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok && res.success) {
      toast.success(c.isActive ? "Coupon deactivated." : "Coupon activated.");
      load();
    } else {
      toast.error(res.message || "Failed to update coupon.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await adminRequest(`/coupon/${deleteTarget._id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok && res.success) {
      toast.success("Coupon deleted.");
      setDeleteTarget(null);
      load();
    } else {
      toast.error(res.message || "Failed to delete coupon.");
    }
  };

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Code",
      render: (c) => <span className="font-mono font-semibold text-foreground">{c.code}</span>,
    },
    {
      key: "discount",
      header: "Discount",
      render: (c) =>
        c.discountType === "percentage" ? `${c.discountValue}%` : formatBDT(c.discountValue),
    },
    {
      key: "uses",
      header: "Uses",
      align: "center",
      render: (c) => `${c.usedCount ?? 0} / ${c.maxUses}`,
    },
    { key: "min", header: "Min spend", align: "right", render: (c) => formatBDT(c.minPurchase || 0) },
    { key: "expires", header: "Expires", render: (c) => formatDate(c.validUntil) },
    {
      key: "active",
      header: "Active",
      render: (c) => (
        <button type="button" onClick={() => toggleActive(c)} aria-label="Toggle active">
          {c.isActive ? <Badge variant="accent">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <button
          type="button"
          onClick={() => setDeleteTarget(c)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-coral/10 hover:text-coral"
          aria-label="Delete"
        >
          <LuTrash2 />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Discount codes applied at course checkout."
        actions={
          <Button onClick={openCreate}>
            <LuPlus /> New coupon
          </Button>
        }
      />

      <AdminTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c._id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={
          <EmptyState icon={<LuTicket />} title="No coupons yet" description="Create a discount code to get started." />
        }
      />

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="New coupon"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(submit)} disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required error={errors.code?.message} className="sm:col-span-2">
            <Input placeholder="MEDIC20" className="uppercase" {...register("code")} />
          </Field>
          <Field label="Discount type" required>
            <Select {...register("discountType")}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (৳)</option>
            </Select>
          </Field>
          <Field label="Discount value" required error={errors.discountValue?.message}>
            <Input type="number" placeholder="20" {...register("discountValue")} />
          </Field>
          <Field label="Max uses" error={errors.maxUses?.message}>
            <Input type="number" placeholder="100" {...register("maxUses")} />
          </Field>
          <Field label="Min purchase (৳)" error={errors.minPurchase?.message}>
            <Input type="number" placeholder="0" {...register("minPurchase")} />
          </Field>
          <Field label="Valid from" hint="Defaults to now" error={errors.validFrom?.message}>
            <Input type="date" {...register("validFrom")} />
          </Field>
          <Field label="Valid until" required error={errors.validUntil?.message}>
            <Input type="date" {...register("validUntil")} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete coupon"
        message={`Delete coupon "${deleteTarget?.code}"?`}
      />
    </div>
  );
}

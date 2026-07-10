"use client";

// Orders — list + fulfillment status update. Degrades gracefully if the orders
// module isn't live yet (404 → friendly placeholder instead of a crash).
// Endpoints: GET /orders?status=&page=&limit=, PATCH /orders/:id/status.
import { useCallback, useState } from "react";
import { useIsoEffect } from "@/components/admin/hooks";
import { LuShoppingCart, LuInfo } from "react-icons/lu";
import { Card, Badge } from "@/components/ui";
import { PageHeader, EmptyState, StatusBadge } from "@/components/admin/primitives";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Select } from "@/components/admin/FormControls";
import { useToast } from "@/components/admin/Toast";
import { adminRequest } from "@/components/admin/adminApi";
import { formatBDT, formatDate } from "@/components/admin/helpers";
import type { Order, OrderStatus } from "@/components/admin/types";

const FULFILLMENT: OrderStatus[] = ["processing", "shipped", "delivered", "cancelled"];
const FILTERS = ["all", "pending", "paid", "processing", "shipped", "delivered", "cancelled"];

function customerLabel(order: Order): string {
  const u = order.user;
  if (!u) return "—";
  if (typeof u === "string") return u.slice(-6);
  return u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "—";
}

export default function AdminOrdersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await adminRequest<Order[]>(`/orders${q}`);
    if (res.ok && Array.isArray(res.data)) {
      setRows(res.data);
    } else if (res.status === 404 || res.status === 0 || res.status === 501) {
      setUnavailable(true);
    } else {
      setError(res.message || "Failed to load orders.");
    }
    setLoading(false);
  }, [filter]);

  useIsoEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (order: Order, status: OrderStatus) => {
    setUpdatingId(order._id);
    const res = await adminRequest(`/orders/${order._id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    if (res.ok && res.success) {
      toast.success(`Order marked ${status}.`);
      load();
    } else {
      toast.error(res.message || "Failed to update status.");
    }
  };

  const columns: Column<Order>[] = [
    {
      key: "order",
      header: "Order",
      render: (o) => (
        <div>
          <p className="font-medium text-foreground">{o.orderNumber || o._id.slice(-6)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
        </div>
      ),
    },
    { key: "customer", header: "Customer", render: (o) => customerLabel(o) },
    {
      key: "items",
      header: "Items",
      align: "center",
      render: (o) => o.items?.reduce((n, i) => n + (i.quantity || 1), 0) ?? 0,
    },
    { key: "total", header: "Total", align: "right", render: (o) => <span className="font-medium">{formatBDT(o.total)}</span> },
    {
      key: "payment",
      header: "Payment",
      render: (o) => <Badge variant="outline">{o.payment?.status || "pending"}</Badge>,
    },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    {
      key: "update",
      header: "Update",
      align: "right",
      render: (o) => (
        <Select
          value={FULFILLMENT.includes(o.status) ? o.status : ""}
          disabled={updatingId === o._id}
          onChange={(e) => e.target.value && updateStatus(o, e.target.value as OrderStatus)}
          className="ml-auto h-9 w-36 text-xs"
        >
          <option value="">Set status…</option>
          {FULFILLMENT.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Book orders and fulfillment status."
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 w-40">
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === "all" ? "All statuses" : f}
              </option>
            ))}
          </Select>
        }
      />

      {unavailable ? (
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-2xl text-primary">
              <LuInfo />
            </div>
            <div>
              <p className="font-semibold text-foreground">Orders module loading</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The orders endpoint isn&apos;t available yet. This page will populate once it&apos;s live.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <AdminTable
          columns={columns}
          rows={rows}
          rowKey={(o) => o._id}
          loading={loading}
          error={error}
          onRetry={load}
          empty={
            <EmptyState
              icon={<LuShoppingCart />}
              title="No orders yet"
              description="Orders will appear here as customers buy books."
            />
          }
        />
      )}
    </div>
  );
}

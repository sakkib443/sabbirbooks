"use client";

// My Orders: the student's book orders (GET /api/orders/my). Shows order
// number, items, status and total; digital paid items get a Download button,
// printed items show shipping status/address. Empty state → browse /books.
import { useEffect, useState, useCallback } from "react";
import { LuShoppingBag } from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { dashRequest, type DashOrder } from "@/components/dashboard/dashboardApi";
import {
  PageHeading,
  Loader,
  ErrorState,
  EmptyState,
} from "@/components/dashboard/primitives";
import OrderCard from "@/components/dashboard/OrderCard";

type Status = "loading" | "ready" | "error";

export default function MyOrdersPage() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";

  const [status, setStatus] = useState<Status>("loading");
  const [orders, setOrders] = useState<DashOrder[]>([]);

  const S = isBengali
    ? {
        title: "আমার অর্ডার",
        subtitle: "আপনার বইয়ের অর্ডার ও ডাউনলোড এখানে।",
        count: (n: number) => `${n} টি অর্ডার`,
        emptyTitle: "কোনো অর্ডার নেই",
        emptyText: "বই ব্রাউজ করে আপনার প্রথম অর্ডার দিন।",
        browse: "বই দেখুন",
        errMsg: "অর্ডার লোড করা যায়নি। আবার চেষ্টা করুন।",
        retry: "আবার চেষ্টা করুন",
      }
    : {
        title: "My Orders",
        subtitle: "Your book orders and downloads.",
        count: (n: number) => `${n} ${n === 1 ? "order" : "orders"}`,
        emptyTitle: "No orders yet",
        emptyText: "Browse the books and place your first order.",
        browse: "Browse books",
        errMsg: "Could not load your orders. Please try again.",
        retry: "Try again",
      };

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await dashRequest<DashOrder[]>("/orders/my");
    if (!res.ok && res.status !== 404) {
      setStatus("error");
      return;
    }
    setOrders(Array.isArray(res.data) ? res.data : []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <Loader bn={bn} />;
  if (status === "error")
    return <ErrorState message={S.errMsg} onRetry={load} retryLabel={S.retry} bn={bn} />;

  return (
    <div>
      <PageHeading
        icon={LuShoppingBag}
        title={S.title}
        subtitle={orders.length > 0 ? S.count(orders.length) : S.subtitle}
        bn={bn}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={LuShoppingBag}
          title={S.emptyTitle}
          text={S.emptyText}
          ctaHref="/books"
          ctaLabel={S.browse}
          bn={bn}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} isBengali={isBengali} />
          ))}
        </div>
      )}
    </div>
  );
}

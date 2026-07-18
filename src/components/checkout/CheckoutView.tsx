"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LuShieldCheck,
  LuLock,
  LuLoaderCircle,
  LuTriangleAlert,
  LuMinus,
  LuPlus,
  LuArrowLeft,
  LuStethoscope,
  LuChevronRight,
  LuPackageX,
} from "react-icons/lu";
import { useLanguage } from "@/context/LanguageContext";
import { Container, Button, buttonVariants, cn } from "@/components/ui";
import OrderSummary from "./OrderSummary";
import ShippingForm, { type ShippingFormValues } from "./ShippingForm";
import PaymentMethod from "./PaymentMethod";
import CheckoutSuccess from "./CheckoutSuccess";
import {
  fetchBook,
  fetchCourse,
  fetchPaymentSettings,
  getStoredUser,
  getToken,
  payForCourse,
  submitBookManual,
  submitCourseManual,
} from "./checkoutApi";
import ManualPaymentDetails from "./ManualPaymentDetails";
import {
  CheckoutBook,
  CheckoutCourse,
  CheckoutStep,
  CheckoutType,
  ManualChannel,
  ManualDetails,
  PaymentSettings,
  ShippingAddress,
  SuccessResult,
  effectiveCoursePrice,
} from "./types";

type Phase = "loading" | "notfound" | "ready" | "processing" | "success";

export default function CheckoutView() {
  const { isBengali } = useLanguage();
  const bn = isBengali ? "hind-siliguri" : "";
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = (searchParams.get("type") as CheckoutType | null) ?? null;
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");

  const [phase, setPhase] = useState<Phase>("loading");
  const [course, setCourse] = useState<CheckoutCourse | null>(null);
  const [book, setBook] = useState<CheckoutBook | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<CheckoutStep>("idle");
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<SuccessResult | null>(null);

  // ── Manual payment (bKash/Rocket/Nagad) state ─────────────────────────────
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [details, setDetails] = useState<ManualDetails>({
    channel: "bkash",
    transactionId: "",
    senderNumber: "",
    sentAt: "",
    note: "",
  });
  const [manualErrors, setManualErrors] = useState<
    Partial<Record<"transactionId" | "senderNumber" | "sentAt", string>>
  >({});
  const channel = details.channel;
  const setChannel = (c: ManualChannel) => setDetails((d) => ({ ...d, channel: c }));
  const patchDetails = (patch: Partial<ManualDetails>) => {
    setDetails((d) => ({ ...d, ...patch }));
    setManualErrors({});
  };

  const S = useMemo(() => (isBengali ? BN : EN), [isBengali]);

  // Channels the admin has configured a receiving number for.
  const availableChannels = useMemo<ManualChannel[]>(() => {
    if (!settings) return [];
    const out: ManualChannel[] = [];
    if (settings.bkash) out.push("bkash");
    if (settings.rocket) out.push("rocket");
    if (settings.nagad) out.push("nagad");
    return out;
  }, [settings]);
  const receivingNumber = settings ? settings[channel] : "";

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isBook = type === "book";
  const isCourse = type === "course";
  const isPrinted = isBook && book?.format === "printed";
  const stock = book?.stock ?? 0;
  const outOfStock = isPrinted && stock <= 0;
  // Free courses skip payment entirely (instant enroll); everything else is manual.
  const isFreeCourse = isCourse && !!course && effectiveCoursePrice(course) <= 0;
  const needsPayment = !outOfStock && !isFreeCourse;

  // ── Shipping form (only enforced for printed books) ───────────────────────
  const shippingSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, S.shipErrName),
        phone: z.string().min(6, S.shipErrPhone),
        address: z.string().min(1, S.shipErrAddress),
        city: z.string().min(1, S.shipErrCity),
        note: z.string().optional(),
      }),
    [S]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    mode: "onSubmit",
  });

  // ── Auth gate + item fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      // Not logged in → send to login (checkout requires an account).
      router.replace("/login");
      return;
    }
    if (type !== "course" && type !== "book") {
      setPhase("notfound");
      return;
    }
    if (isCourse && !id) return void setPhase("notfound");
    if (isBook && !slug) return void setPhase("notfound");

    let active = true;
    setPhase("loading");
    (async () => {
      if (type === "course") {
        const c = await fetchCourse(id as string);
        if (!active) return;
        if (!c || !c._id) return setPhase("notfound");
        setCourse(c);
        setPhase("ready");
      } else {
        const b = await fetchBook(slug as string);
        if (!active) return;
        if (!b || !b._id) return setPhase("notfound");
        setBook(b);
        if (b.format === "printed") setQuantity((q) => Math.min(q, Math.max(1, b.stock ?? 1)));
        setPhase("ready");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, slug]);

  // Load the admin-configured receiving numbers once; default to the first
  // configured wallet.
  useEffect(() => {
    fetchPaymentSettings().then((s) => {
      setSettings(s);
      const avail: ManualChannel[] = [];
      if (s.bkash) avail.push("bkash");
      if (s.rocket) avail.push("rocket");
      if (s.nagad) avail.push("nagad");
      if (avail.length) {
        setDetails((d) => (avail.includes(d.channel) ? d : { ...d, channel: avail[0] }));
      }
    });
  }, []);

  // Prefill shipping name/phone from the stored user once we know it's a printed book.
  useEffect(() => {
    if (!isPrinted) return;
    const u = getStoredUser();
    if (!u) return;
    reset({
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.name || "",
      phone: u.phoneNumber ?? "",
      address: "",
      city: "",
      note: "",
    });
  }, [isPrinted, reset]);

  // ── Run the end-to-end flow (A: course, B: book) ──────────────────────────
  const validateManual = (): boolean => {
    const e: typeof manualErrors = {};
    if (!details.transactionId.trim()) e.transactionId = S.manualErrTxn;
    if (!details.senderNumber.trim()) e.senderNumber = S.manualErrSender;
    if (!details.sentAt) e.sentAt = S.manualErrSentAt;
    setManualErrors(e);
    return Object.keys(e).length === 0;
  };

  const runCheckout = async (shipping?: ShippingAddress) => {
    if (!getToken()) return router.replace("/login");
    setSubmitError("");
    setStep("creating");
    setPhase("processing");
    try {
      if (type === "course" && course) {
        if (isFreeCourse) {
          // Free course → instant enrollment, no manual payment.
          const r = await payForCourse({
            course,
            method: "bkash",
            onProgress: setStep,
            genericErr: S.genericErr,
          });
          setResult({
            kind: "course",
            courseTitle: course.title,
            reference: r.reference,
            method: r.method,
            amount: r.amount,
          });
        } else {
          const r = await submitCourseManual({
            course,
            details,
            onProgress: setStep,
            genericErr: S.genericErr,
          });
          setResult({
            kind: "manual",
            itemKind: "course",
            title: course.title,
            reference: r.reference,
            amount: r.amount,
            channel: details.channel,
          });
        }
      } else if (type === "book" && book) {
        const order = await submitBookManual({
          book,
          quantity,
          details,
          shippingAddress: shipping,
          onProgress: setStep,
          genericErr: S.genericErr,
        });
        setResult({
          kind: "manual",
          itemKind: "book",
          title: book.title,
          reference: order.orderNumber,
          amount: order.total,
          channel: details.channel,
          isPrintedBook: order.deliveryType !== "digital",
        });
      } else {
        throw new Error(S.genericErr);
      }
      setStep("done");
      setPhase("success");
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : S.genericErr;
      setSubmitError(msg === "__NETWORK__" ? S.network : msg);
      setStep("idle");
      setPhase("ready");
    }
  };

  const onConfirm = () => {
    if (outOfStock) return;
    if (needsPayment) {
      if (availableChannels.length === 0) {
        setSubmitError(S.manualNotConfigured);
        return;
      }
      if (!validateManual()) return;
    }
    if (isPrinted) {
      // Gate the flow behind a valid shipping address.
      void handleSubmit((vals) => runCheckout(vals))();
    } else {
      void runCheckout();
    }
  };

  // ── Render: loading ───────────────────────────────────────────────────────
  if (phase === "loading") return <CheckoutSkeleton bn={bn} S={S} />;

  // ── Render: not found / bad params ────────────────────────────────────────
  if (phase === "notfound") {
    return (
      <main className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-soft">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <LuStethoscope className="text-3xl" />
            </div>
            <h1 className={cn("font-heading text-2xl font-bold text-foreground", bn)}>
              {S.notFoundTitle}
            </h1>
            <p className={cn("mx-auto mt-2 max-w-sm text-sm text-muted-foreground", bn)}>
              {S.notFoundText}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/courses" className={cn(buttonVariants({ variant: "primary" }), bn)}>
                {S.browseCourses}
              </Link>
              <Link href="/books" className={cn(buttonVariants({ variant: "outline" }), bn)}>
                {S.browseBooks}
              </Link>
            </div>
          </div>
        </Container>
      </main>
    );
  }

  // ── Render: success ───────────────────────────────────────────────────────
  if (phase === "success" && result) {
    return (
      <main className="py-10 sm:py-14">
        <Container>
          <CheckoutSuccess result={result} L={successLabels(S, bn)} />
        </Container>
      </main>
    );
  }

  // ── Render: checkout form ─────────────────────────────────────────────────
  const processing = phase === "processing";
  const backHref = isCourse ? "/courses" : "/books";

  return (
    <main className="py-8 sm:py-12">
      <Container>
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={cn("mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary", bn)}>
              <LuLock className="text-sm" /> {S.eyebrow}
            </p>
            <h1 className={cn("font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl", bn)}>
              {S.title}
            </h1>
          </div>
          <Link
            href={backHref}
            className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary", bn)}
          >
            <LuArrowLeft /> {S.back}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-8">
          {/* Left: form column */}
          <div className="order-2 space-y-6 lg:order-1">
            {/* Quantity (printed books only) */}
            {isPrinted && !outOfStock && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>
                      {S.qtyHeading}
                    </h2>
                    <p className={cn("text-sm text-muted-foreground", bn)}>
                      {S.inStock(stock)}
                    </p>
                  </div>
                  <QuantityStepper
                    value={quantity}
                    min={1}
                    max={Math.max(1, stock)}
                    onChange={setQuantity}
                    disabled={processing}
                    label={S.qtyHeading}
                  />
                </div>
              </div>
            )}

            {/* Shipping (printed books only) */}
            {isPrinted && !outOfStock && (
              <ShippingForm register={register} errors={errors} bn={bn} S={shippingLabels(S)} />
            )}

            {/* Out of stock notice */}
            {outOfStock && (
              <div className={cn("flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-5", bn)}>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral/15 text-coral">
                  <LuPackageX className="text-lg" />
                </span>
                <div>
                  <p className="font-semibold text-coral">{S.outOfStockTitle}</p>
                  <p className="mt-0.5 text-sm text-coral/90">{S.outOfStockText}</p>
                </div>
              </div>
            )}

            {/* Manual payment (bKash / Rocket / Nagad) */}
            {needsPayment && availableChannels.length > 0 && (
              <>
                <PaymentMethod
                  value={channel}
                  onChange={setChannel}
                  available={availableChannels}
                  disabled={processing}
                  bn={bn}
                  S={paymentSelLabels(S)}
                />
                <ManualPaymentDetails
                  channel={channel}
                  receivingNumber={receivingNumber}
                  instructions={settings?.instructions}
                  details={details}
                  onChange={patchDetails}
                  errors={manualErrors}
                  disabled={processing}
                  bn={bn}
                  S={manualLabels(S)}
                />
              </>
            )}

            {/* Manual payment not configured by admin yet */}
            {needsPayment && settings && availableChannels.length === 0 && (
              <div className={cn("flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-5", bn)}>
                <LuTriangleAlert className="mt-0.5 shrink-0 text-coral" />
                <p className="text-sm text-coral">{S.manualNotConfigured}</p>
              </div>
            )}

            {/* Free course — no payment needed */}
            {isFreeCourse && (
              <div className={cn("flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 p-5", bn)}>
                <LuShieldCheck className="mt-0.5 shrink-0 text-accent" />
                <p className="text-sm text-foreground">{S.freeCourseNote}</p>
              </div>
            )}
          </div>

          {/* Right: order summary + pay (sticky) */}
          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24 space-y-4">
              <OrderSummary
                type={type as CheckoutType}
                course={course}
                book={book}
                quantity={quantity}
                bn={bn}
                S={summaryLabels(S)}
              />

              {!outOfStock && (
                <>
                  {submitError && (
                    <div
                      role="alert"
                      className={cn("flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral", bn)}
                    >
                      <LuTriangleAlert className="mt-0.5 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <Button
                    size="lg"
                    variant="accent"
                    className={cn("w-full", bn)}
                    disabled={processing || (needsPayment && availableChannels.length === 0)}
                    onClick={onConfirm}
                  >
                    {processing ? (
                      <>
                        <LuLoaderCircle className="animate-spin text-lg" /> {stepLabel(step, S)}
                      </>
                    ) : (
                      <>
                        <LuLock className="text-base" /> {isFreeCourse ? S.enrollFree : S.submitPay}
                      </>
                    )}
                  </Button>

                  <p className={cn("flex items-center justify-center gap-1.5 text-xs text-muted-foreground", bn)}>
                    <LuShieldCheck className="text-accent" /> {isFreeCourse ? S.secureNote : S.verifyNote}
                  </p>
                </>
              )}

              {outOfStock && (
                <Link
                  href="/books"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full", bn)}
                >
                  {S.browseBooks} <LuChevronRight />
                </Link>
              )}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

// ── Quantity stepper ─────────────────────────────────────────────────────────
function QuantityStepper({
  value,
  min,
  max,
  onChange,
  disabled,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1" aria-label={label}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
        aria-label="decrease"
      >
        <LuMinus />
      </button>
      <span className="w-9 text-center font-semibold text-foreground tabular-nums">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
        aria-label="increase"
      >
        <LuPlus />
      </button>
    </div>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────
function CheckoutSkeleton({ bn, S }: { bn: string; S: Copy }) {
  return (
    <main className="py-8 sm:py-12">
      <Container>
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-8">
          <div className="order-2 space-y-6 lg:order-1">
            <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-28 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="order-1 space-y-4 lg:order-2">
            <div className="h-56 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
        <span className="sr-only">{S.loading}</span>
      </Container>
    </main>
  );
}

// ── Step → button label ──────────────────────────────────────────────────────
function stepLabel(step: CheckoutStep, S: Copy): string {
  switch (step) {
    case "creating":
      return S.stepCreating;
    case "initiating":
      return S.stepInitiating;
    case "paying":
      return S.stepPaying;
    case "confirming":
      return S.stepConfirming;
    default:
      return S.stepProcessing;
  }
}

// ── Copy (bilingual, local — no locale JSON edits) ───────────────────────────
type Copy = typeof EN;

const EN = {
  loading: "Loading checkout…",
  eyebrow: "Secure checkout",
  title: "Complete your purchase",
  back: "Back",
  confirmPay: "Confirm & Pay",
  submitPay: "Submit Payment",
  enrollFree: "Enroll for Free",
  secureNote: "Your enrollment is processed securely.",
  verifyNote: "Your payment will be verified by our team, usually within 24 hours.",
  stepProcessing: "Processing…",
  stepCreating: "Placing order…",
  stepInitiating: "Submitting…",
  stepPaying: "Submitting…",
  stepConfirming: "Submitting details…",
  genericErr: "Something went wrong. Please try again.",
  network: "Could not reach the server. Check your connection.",
  // not found
  notFoundTitle: "We couldn't load this item",
  notFoundText:
    "The checkout link is invalid or the course/book is no longer available. Please pick an item to continue.",
  browseCourses: "Browse courses",
  browseBooks: "Browse books",
  // quantity / stock
  qtyHeading: "Quantity",
  inStock: (n: number) => `${n} in stock`,
  outOfStockTitle: "Out of stock",
  outOfStockText: "This printed book is currently unavailable. Please check back later.",
  // order summary
  sumHeading: "Order summary",
  sumCourse: "Course",
  sumBook: "Book",
  sumPrinted: "Printed",
  sumDigital: "Digital",
  sumBy: "by",
  sumUnitPrice: "Price",
  sumQuantity: "Quantity",
  sumSubtotal: "Subtotal",
  sumTotal: "Total",
  sumFree: "Free",
  sumSave: "You save",
  sumDuration: (m: number) => `${m} ${m === 1 ? "month" : "months"} programme`,
  // shipping
  shipHeading: "Shipping address",
  shipSubtitle: "Where should we deliver your printed book?",
  shipName: "Full name",
  shipNamePh: "e.g. Dr. Ayesha Rahman",
  shipPhone: "Phone",
  shipPhonePh: "01XXXXXXXXX",
  shipAddress: "Address",
  shipAddressPh: "House, road, area",
  shipCity: "City / District",
  shipCityPh: "e.g. Dhaka",
  shipNote: "Delivery note",
  shipNotePh: "Landmark or instructions",
  shipOptional: "optional",
  shipErrName: "Name is required",
  shipErrPhone: "Enter a valid phone number",
  shipErrAddress: "Address is required",
  shipErrCity: "City is required",
  // payment — manual (bKash / Rocket / Nagad)
  payHeading: "Payment method",
  paySubtitle: "Choose the wallet you'll send money from.",
  manualHeading: "Payment details",
  manualSubtitle: "After sending the money, fill in the details below so we can verify it.",
  manualSendTo: (c: string) => `Send Money to this ${c} number`,
  manualCopy: "Copy",
  manualCopied: "Copied",
  manualTxn: "Transaction ID (TrxID)",
  manualTxnPh: "e.g. 9F3AB7C2D1",
  manualSender: "Sender number",
  manualSenderPh: "The number you sent from",
  manualSentAt: "Date & time sent",
  manualNote: "Note",
  manualNotePh: "Anything we should know",
  manualErrTxn: "Transaction ID is required",
  manualErrSender: "Sender number is required",
  manualErrSentAt: "Please select when you sent the payment",
  manualNotConfigured: "Online payment is being set up. Please contact us to complete your purchase.",
  freeCourseNote: "This course is free — click below to enroll instantly.",
  chBkash: "bKash",
  chRocket: "Rocket",
  chNagad: "Nagad",
  // manual pending success
  pendingTitle: "Payment submitted!",
  pendingCourseSub:
    "Your payment is now awaiting verification. You'll get course access once an admin approves it (usually within 24 hours).",
  pendingBookDigitalSub:
    "Your order is placed. Your download unlocks once your payment is verified (usually within 24 hours).",
  pendingBookPrintedSub:
    "Your order is placed. We'll prepare it for delivery once your payment is verified (usually within 24 hours).",
  pendingRefLabel: "Reference",
  pendingChannelLabel: "Paid via",
  pendingStatusLabel: "Status",
  pendingStatusValue: "Awaiting verification",
  viewMyOrders: "View my orders",
  // success
  successTitle: "Payment successful!",
  successCourseSub: "Your enrollment is confirmed. You now have access to the course.",
  successBookDigitalSub: "Your order is complete. Download your digital book below.",
  successBookPrintedSub: "Your order is confirmed and is being prepared for delivery.",
  successRef: "Reference",
  successOrder: "Order number",
  successPaid: "Amount paid",
  successMethod: "Method",
  successStatus: "Status",
  successDownload: "Download book",
  successDownloading: "Preparing download…",
  successDownloadReady: "Your secure file opens in a new tab.",
  successGoToCourses: "Go to My Courses",
  successShippingNote:
    "We'll ship your book to the address provided and update the status as it progresses.",
  successContinueCourses: "Browse more courses",
  successContinueBooks: "Continue shopping",
  successDownloadErr: "Could not get the download link. Please try again.",
  // status names
  status_processing: "Processing",
  status_access_granted: "Access granted",
  status_shipped: "Shipped",
  status_delivered: "Delivered",
  status_pending: "Pending",
  status_paid: "Paid",
};

const BN: Copy = {
  loading: "চেকআউট লোড হচ্ছে…",
  eyebrow: "নিরাপদ চেকআউট",
  title: "আপনার ক্রয় সম্পন্ন করুন",
  back: "ফিরে যান",
  confirmPay: "নিশ্চিত করুন ও পেমেন্ট দিন",
  submitPay: "পেমেন্ট সাবমিট করুন",
  enrollFree: "ফ্রিতে এনরোল করুন",
  secureNote: "আপনার এনরোলমেন্ট নিরাপদভাবে প্রক্রিয়া করা হয়।",
  verifyNote: "আপনার পেমেন্ট আমাদের টিম যাচাই করবে, সাধারণত ২৪ ঘণ্টার মধ্যে।",
  stepProcessing: "প্রসেস হচ্ছে…",
  stepCreating: "অর্ডার তৈরি হচ্ছে…",
  stepInitiating: "সাবমিট হচ্ছে…",
  stepPaying: "সাবমিট হচ্ছে…",
  stepConfirming: "তথ্য সাবমিট হচ্ছে…",
  genericErr: "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
  network: "সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট চেক করুন।",
  notFoundTitle: "এই আইটেমটি লোড করা যায়নি",
  notFoundText:
    "চেকআউট লিংকটি সঠিক নয় অথবা কোর্স/বইটি আর নেই। এগিয়ে যেতে একটি আইটেম নির্বাচন করুন।",
  browseCourses: "কোর্স দেখুন",
  browseBooks: "বই দেখুন",
  qtyHeading: "পরিমাণ",
  inStock: (n: number) => `স্টকে ${n} টি আছে`,
  outOfStockTitle: "স্টকে নেই",
  outOfStockText: "এই প্রিন্টেড বইটি এই মুহূর্তে অনুপলব্ধ। পরে আবার দেখুন।",
  sumHeading: "অর্ডার সারাংশ",
  sumCourse: "কোর্স",
  sumBook: "বই",
  sumPrinted: "প্রিন্টেড",
  sumDigital: "ডিজিটাল",
  sumBy: "লেখক:",
  sumUnitPrice: "মূল্য",
  sumQuantity: "পরিমাণ",
  sumSubtotal: "সাবটোটাল",
  sumTotal: "সর্বমোট",
  sumFree: "ফ্রি",
  sumSave: "সাশ্রয়",
  sumDuration: (m: number) => `${m} মাসের প্রোগ্রাম`,
  shipHeading: "ডেলিভারি ঠিকানা",
  shipSubtitle: "আপনার প্রিন্টেড বই কোথায় পৌঁছে দেব?",
  shipName: "পুরো নাম",
  shipNamePh: "যেমন: ডা. আয়েশা রহমান",
  shipPhone: "ফোন",
  shipPhonePh: "01XXXXXXXXX",
  shipAddress: "ঠিকানা",
  shipAddressPh: "বাসা, রোড, এলাকা",
  shipCity: "শহর / জেলা",
  shipCityPh: "যেমন: ঢাকা",
  shipNote: "ডেলিভারি নোট",
  shipNotePh: "ল্যান্ডমার্ক বা নির্দেশনা",
  shipOptional: "ঐচ্ছিক",
  shipErrName: "নাম দিন",
  shipErrPhone: "সঠিক ফোন নম্বর দিন",
  shipErrAddress: "ঠিকানা দিন",
  shipErrCity: "শহর দিন",
  payHeading: "পেমেন্ট পদ্ধতি",
  paySubtitle: "যে ওয়ালেট থেকে টাকা পাঠাবেন সেটি বেছে নিন।",
  manualHeading: "পেমেন্টের তথ্য",
  manualSubtitle: "টাকা পাঠানোর পর নিচের তথ্যগুলো দিন, যাতে আমরা যাচাই করতে পারি।",
  manualSendTo: (c: string) => `এই ${c} নাম্বারে Send Money করুন`,
  manualCopy: "কপি",
  manualCopied: "কপি হয়েছে",
  manualTxn: "ট্রানজেকশন আইডি (TrxID)",
  manualTxnPh: "যেমন: 9F3AB7C2D1",
  manualSender: "যে নাম্বার থেকে পাঠিয়েছেন",
  manualSenderPh: "যে নাম্বার থেকে পাঠিয়েছেন",
  manualSentAt: "কখন পাঠিয়েছেন (তারিখ ও সময়)",
  manualNote: "নোট",
  manualNotePh: "অতিরিক্ত কিছু জানানোর থাকলে",
  manualErrTxn: "ট্রানজেকশন আইডি দিন",
  manualErrSender: "সেন্ডার নাম্বার দিন",
  manualErrSentAt: "কখন পাঠিয়েছেন তা নির্বাচন করুন",
  manualNotConfigured: "অনলাইন পেমেন্ট সেটআপ করা হচ্ছে। অর্ডার সম্পন্ন করতে আমাদের সাথে যোগাযোগ করুন।",
  freeCourseNote: "এই কোর্সটি ফ্রি — নিচে ক্লিক করে সাথে সাথে এনরোল করুন।",
  chBkash: "বিকাশ",
  chRocket: "রকেট",
  chNagad: "নগদ",
  pendingTitle: "পেমেন্ট সাবমিট হয়েছে!",
  pendingCourseSub:
    "আপনার পেমেন্ট এখন যাচাইয়ের অপেক্ষায়। অ্যাডমিন অনুমোদন করলে (সাধারণত ২৪ ঘণ্টার মধ্যে) কোর্স অ্যাক্সেস পাবেন।",
  pendingBookDigitalSub:
    "আপনার অর্ডার নেওয়া হয়েছে। পেমেন্ট যাচাই হলে (সাধারণত ২৪ ঘণ্টার মধ্যে) ডাউনলোড আনলক হবে।",
  pendingBookPrintedSub:
    "আপনার অর্ডার নেওয়া হয়েছে। পেমেন্ট যাচাই হলে (সাধারণত ২৪ ঘণ্টার মধ্যে) ডেলিভারির জন্য প্রস্তুত করা হবে।",
  pendingRefLabel: "রেফারেন্স",
  pendingChannelLabel: "পেমেন্ট মাধ্যম",
  pendingStatusLabel: "স্ট্যাটাস",
  pendingStatusValue: "যাচাইয়ের অপেক্ষায়",
  viewMyOrders: "আমার অর্ডার দেখুন",
  successTitle: "পেমেন্ট সফল হয়েছে!",
  successCourseSub: "আপনার এনরোলমেন্ট নিশ্চিত হয়েছে। এখন আপনি কোর্সটি অ্যাক্সেস করতে পারবেন।",
  successBookDigitalSub: "আপনার অর্ডার সম্পন্ন হয়েছে। নিচে থেকে ডিজিটাল বই ডাউনলোড করুন।",
  successBookPrintedSub: "আপনার অর্ডার নিশ্চিত হয়েছে এবং ডেলিভারির জন্য প্রস্তুত করা হচ্ছে।",
  successRef: "রেফারেন্স",
  successOrder: "অর্ডার নম্বর",
  successPaid: "পরিশোধিত পরিমাণ",
  successMethod: "পদ্ধতি",
  successStatus: "স্ট্যাটাস",
  successDownload: "বই ডাউনলোড করুন",
  successDownloading: "ডাউনলোড প্রস্তুত হচ্ছে…",
  successDownloadReady: "আপনার নিরাপদ ফাইলটি নতুন ট্যাবে খুলবে।",
  successGoToCourses: "আমার কোর্সে যান",
  successShippingNote:
    "আমরা প্রদত্ত ঠিকানায় আপনার বই পাঠাব এবং অগ্রগতি অনুযায়ী স্ট্যাটাস আপডেট করব।",
  successContinueCourses: "আরও কোর্স দেখুন",
  successContinueBooks: "কেনাকাটা চালিয়ে যান",
  successDownloadErr: "ডাউনলোড লিংক পাওয়া যায়নি। আবার চেষ্টা করুন।",
  status_processing: "প্রক্রিয়াধীন",
  status_access_granted: "অ্যাক্সেস দেওয়া হয়েছে",
  status_shipped: "পাঠানো হয়েছে",
  status_delivered: "ডেলিভারড",
  status_pending: "অপেক্ষমাণ",
  status_paid: "পরিশোধিত",
};

// ── Label mappers to the child components ────────────────────────────────────
function summaryLabels(S: Copy) {
  return {
    heading: S.sumHeading,
    course: S.sumCourse,
    book: S.sumBook,
    printed: S.sumPrinted,
    digital: S.sumDigital,
    by: S.sumBy,
    unitPrice: S.sumUnitPrice,
    quantity: S.sumQuantity,
    subtotal: S.sumSubtotal,
    total: S.sumTotal,
    free: S.sumFree,
    save: S.sumSave,
    duration: S.sumDuration,
  };
}

function shippingLabels(S: Copy) {
  return {
    heading: S.shipHeading,
    subtitle: S.shipSubtitle,
    name: S.shipName,
    namePh: S.shipNamePh,
    phone: S.shipPhone,
    phonePh: S.shipPhonePh,
    address: S.shipAddress,
    addressPh: S.shipAddressPh,
    city: S.shipCity,
    cityPh: S.shipCityPh,
    note: S.shipNote,
    notePh: S.shipNotePh,
    optional: S.shipOptional,
  };
}

function channelName(S: Copy, id: ManualChannel): string {
  return id === "bkash" ? S.chBkash : id === "rocket" ? S.chRocket : S.chNagad;
}

function paymentSelLabels(S: Copy) {
  return {
    heading: S.payHeading,
    subtitle: S.paySubtitle,
    channelName: (id: ManualChannel) => channelName(S, id),
  };
}

function manualLabels(S: Copy) {
  return {
    heading: S.manualHeading,
    subtitle: S.manualSubtitle,
    sendTo: S.manualSendTo,
    copy: S.manualCopy,
    copied: S.manualCopied,
    txnId: S.manualTxn,
    txnIdPh: S.manualTxnPh,
    senderNumber: S.manualSender,
    senderNumberPh: S.manualSenderPh,
    sentAt: S.manualSentAt,
    note: S.manualNote,
    notePh: S.manualNotePh,
    optional: S.shipOptional,
    channelName: (id: ManualChannel) => channelName(S, id),
  };
}

function successLabels(S: Copy, bn: string) {
  return {
    bn,
    title: S.successTitle,
    courseSub: S.successCourseSub,
    bookDigitalSub: S.successBookDigitalSub,
    bookPrintedSub: S.successBookPrintedSub,
    refLabel: S.successRef,
    orderLabel: S.successOrder,
    paidLabel: S.successPaid,
    methodLabel: S.successMethod,
    statusLabel: S.successStatus,
    download: S.successDownload,
    downloading: S.successDownloading,
    downloadReady: S.successDownloadReady,
    goToCourses: S.successGoToCourses,
    shippingNote: S.successShippingNote,
    continueCourses: S.successContinueCourses,
    continueBooks: S.successContinueBooks,
    downloadErr: S.successDownloadErr,
    network: S.network,
    // Pending (manual payment awaiting verification)
    pendingTitle: S.pendingTitle,
    pendingCourseSub: S.pendingCourseSub,
    pendingBookDigitalSub: S.pendingBookDigitalSub,
    pendingBookPrintedSub: S.pendingBookPrintedSub,
    pendingRefLabel: S.pendingRefLabel,
    pendingChannelLabel: S.pendingChannelLabel,
    pendingStatusLabel: S.pendingStatusLabel,
    pendingStatusValue: S.pendingStatusValue,
    viewMyOrders: S.viewMyOrders,
    amountLabel: S.successPaid,
    channelName: (id: ManualChannel) => channelName(S, id),
    methodNames: {
      bkash: S.chBkash,
      rocket: S.chRocket,
      nagad: S.chNagad,
      sslcommerz: "SSLCommerz",
      manual: S.successMethod,
      free: S.sumFree,
      status_processing: S.status_processing,
      "status_access-granted": S.status_access_granted,
      status_shipped: S.status_shipped,
      status_delivered: S.status_delivered,
      status_pending: S.status_pending,
      status_paid: S.status_paid,
    } as Record<string, string>,
  };
}

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
import PayModeSelector from "./PayModeSelector";
import CheckoutSuccess from "./CheckoutSuccess";
import {
  checkoutBook,
  fetchBook,
  fetchCheckoutOptions,
  fetchCourse,
  fetchGatewayStatus,
  fetchPaymentSettings,
  getStoredUser,
  getToken,
  payForCourse,
  submitBookCod,
  submitBookManual,
  submitCourseManual,
} from "./checkoutApi";
import ManualPaymentDetails from "./ManualPaymentDetails";
import GatewayChoice from "./GatewayChoice";
import {
  getAvailability,
  preferredGateway,
  resolvePayMode,
  type GatewayId,
  type GatewayStatus,
} from "./paymentOptions";
import {
  CheckoutBook,
  CheckoutCourse,
  CheckoutOptions,
  CheckoutStep,
  CheckoutType,
  DeliveryArea,
  ManualChannel,
  ManualDetails,
  PayMode,
  PaymentSettings,
  ShippingAddress,
  SuccessResult,
  effectiveBookPrice,
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

  // ── Pay now vs pay the courier, and where the parcel is going ─────────────
  const [payMode, setPayMode] = useState<PayMode>("cod");
  const [area, setArea] = useState<DeliveryArea>("inside-dhaka");
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  // Which hosted checkouts the server holds credentials for. Stays null until the
  // answer arrives (and if it never does), which reads as "no gateway" everywhere
  // downstream — so a slow or failing config call degrades to today's checkout
  // instead of blocking the buyer.
  const [gateways, setGateways] = useState<GatewayStatus | null>(null);
  const [gatewayId, setGatewayId] = useState<GatewayId>("bkash");

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

  // What the shop can actually accept right now. The rules live in
  // paymentOptions.ts as pure functions so every combination of them is unit
  // tested — this is the code that decides whether the live manual/COD revenue
  // path stays reachable, and it is not a thing to leave as inline conditionals.
  const availability = useMemo(
    () =>
      getAvailability({
        isPrintedBook: Boolean(isPrinted),
        outOfStock,
        isFreeCourse,
        codEnabled: options?.codEnabled !== false,
        onlinePaymentEnabled: options?.onlinePaymentEnabled !== false,
        manualChannels: availableChannels,
        gateways,
      }),
    [isPrinted, outOfStock, isFreeCourse, options, availableChannels, gateways]
  );

  const codAllowed = availability.cod;
  const onlineAllowed = options?.onlinePaymentEnabled !== false;
  // The chosen mode, forced back to whatever is actually available.
  const effectivePayMode = resolvePayMode(payMode, availability);
  const isCod = needsPayment && effectivePayMode === "cod";
  const isGateway = needsPayment && effectivePayMode === "gateway";
  // Manual Send-Money details are only asked for on the manual path — unchanged.
  const isManual = needsPayment && effectivePayMode === "online";

  const bookSubtotal = isBook && book ? effectiveBookPrice(book) * quantity : 0;

  // Delivery charge for the selected zone, mirroring the server's rule so the
  // buyer is never surprised by a different number on the confirmation. The
  // server recomputes it regardless — this is display, not the source of truth.
  const deliveryCharge = useMemo(() => {
    if (!isPrinted || !options) return 0;
    const freeAbove = options.freeDeliveryAbove || 0;
    if (freeAbove > 0 && bookSubtotal >= freeAbove) return 0;
    const base = options.deliveryCharge?.[area] ?? 0;
    return base + (effectivePayMode === "cod" ? options.codExtraCharge || 0 : 0);
  }, [isPrinted, options, area, bookSubtotal, effectivePayMode]);

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

  // Delivery rates and which payment methods the shop accepts.
  useEffect(() => {
    fetchCheckoutOptions().then((o) => {
      if (!o) return;
      setOptions(o);
      // Land on whichever method is actually on, preferring COD — it is what
      // most buyers here expect, and it needs no wallet setup to work.
      if (o.codEnabled === false) setPayMode("online");
    });
  }, []);

  // Which hosted gateways are configured. Note what does NOT happen here: the
  // default pay mode is left alone. Buyers land on cash-on-delivery today and
  // they still do — a gateway becoming available adds a card to the list, it does
  // not quietly move anyone onto a different way of paying.
  useEffect(() => {
    fetchGatewayStatus().then((g) => {
      if (!g) return;
      setGateways(g);
      setGatewayId(g.bkash.configured ? "bkash" : g.sslcommerz.configured ? "sslcommerz" : "bkash");
    });
  }, []);

  // A digital book or a course can only be paid for online.
  useEffect(() => {
    if (!isPrinted && payMode === "cod") setPayMode("online");
  }, [isPrinted, payMode]);

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
        if (isGateway) {
          // Hosted checkout. On a real gateway this navigates away and never
          // comes back — the order is settled by the gateway's server-to-server
          // callback, so the buyer closing the tab mid-payment still produces a
          // paid order. The success screen is reached via /payment/return.
          const chosen = availability.gatewayOptions.includes(gatewayId)
            ? gatewayId
            : preferredGateway(availability);
          if (!chosen) throw new Error(S.genericErr);
          const live = Boolean(gateways?.[chosen]?.configured);

          const res = await checkoutBook({
            book,
            quantity,
            method: chosen,
            isLiveGateway: live,
            shippingAddress: shipping,
            onProgress: setStep,
            genericErr: S.genericErr,
          });

          if (res.redirected) return; // leaving the page; keep the spinner up
          setResult({ kind: "book", order: res.order });
        } else if (isCod) {
          // Nothing is paid now — the order is placed and the courier collects.
          const order = await submitBookCod({
            book,
            quantity,
            shippingAddress: shipping as ShippingAddress,
            onProgress: setStep,
            genericErr: S.genericErr,
          });
          setResult({
            kind: "cod",
            title: book.title,
            reference: order.orderNumber,
            orderId: order._id,
            amount: order.total,
            deliveryCharge: order.deliveryCharge ?? 0,
            supportPhone: options?.supportPhone,
            deliveryNote: options?.deliveryNote,
          });
        } else {
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
            orderId: order._id,
            amount: order.total,
            channel: details.channel,
            isPrintedBook: order.deliveryType !== "digital",
          });
        }
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
    // Wallet details are only required on the MANUAL path — a cash-on-delivery
    // buyer has no transaction id to give (demanding one was what made COD
    // impossible to actually complete), and a hosted-gateway buyer has not paid
    // yet, so there is nothing for them to copy down either.
    if (isManual) {
      if (availableChannels.length === 0) {
        setSubmitError(S.manualNotConfigured);
        return;
      }
      if (!validateManual()) return;
    }
    if (isPrinted) {
      // Gate the flow behind a valid shipping address, and carry the zone the
      // delivery charge was quoted for.
      void handleSubmit((vals) => runCheckout({ ...vals, area }))();
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

        {/* Source order is the mobile order: fill the form, then review and pay.
            The columns used to carry order-2 / order-1, which only reversed on
            phones — the grid is one column below lg, so the summary and its
            Submit Payment button were painted ABOVE every input. Buyers had to
            fill the address, scroll back up, and hunt for the button. On lg the
            grid columns place these left and right regardless of order, so
            dropping the utilities changes nothing on desktop. */}
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-8">
          {/* Left: form column */}
          <div className="space-y-6">
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
              <ShippingForm
                register={register}
                errors={errors}
                bn={bn}
                S={shippingLabels(S)}
                area={area}
                onAreaChange={setArea}
                areaCharges={options?.deliveryCharge}
              />
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

            {/* Pay now, or pay the courier */}
            {needsPayment && (
              <PayModeSelector
                value={effectivePayMode}
                onChange={setPayMode}
                codAllowed={codAllowed}
                onlineAllowed={onlineAllowed}
                gatewayAllowed={availability.gateway}
                codReason={isBook && !isPrinted ? S.codDigitalOnly : undefined}
                disabled={processing}
                bn={bn}
                S={payModeLabels(S)}
              />
            )}

            {/* Hosted checkout — how it works, and which one, if there's a choice */}
            {isGateway && (
              <>
                <GatewayChoice
                  value={gatewayId}
                  onChange={setGatewayId}
                  options={availability.gatewayOptions}
                  sandbox={
                    availability.gatewayOptions.length > 0 &&
                    availability.gatewayOptions.every((g) => gateways?.[g]?.live === false)
                  }
                  disabled={processing}
                  bn={bn}
                  S={gatewayLabels(S)}
                />
                <div className={cn("rounded-2xl border border-accent/30 bg-accent-soft/40 p-5", bn)}>
                  <div className="flex items-start gap-3">
                    <LuShieldCheck className="mt-0.5 shrink-0 text-accent" />
                    <div className="text-sm text-foreground">
                      <p className="font-semibold">{S.gatewayHowTitle}</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
                        <li>{S.gatewayStep1}</li>
                        <li>{S.gatewayStep2}</li>
                        <li>{S.gatewayStep3}</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Cash on delivery — what actually happens next */}
            {isCod && (
              <div className={cn("rounded-2xl border border-accent/30 bg-accent-soft/40 p-5", bn)}>
                <div className="flex items-start gap-3">
                  <LuShieldCheck className="mt-0.5 shrink-0 text-accent" />
                  <div className="text-sm text-foreground">
                    <p className="font-semibold">{S.codHowTitle}</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
                      <li>{S.codStep1}</li>
                      <li>{S.codStep2}</li>
                      <li>{S.codStep3}</li>
                    </ol>
                    {options?.deliveryNote && (
                      <p className="mt-3 text-xs text-muted-foreground">{options.deliveryNote}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manual payment (bKash / Rocket / Nagad) — only when paying by hand */}
            {isManual && availableChannels.length > 0 && (
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
            {isManual && settings && availableChannels.length === 0 && (
              <div className={cn("flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-5", bn)}>
                <LuTriangleAlert className="mt-0.5 shrink-0 text-coral" />
                <p className="text-sm text-coral">
                  {availability.gateway
                    ? S.manualNotConfiguredUseGateway
                    : codAllowed
                      ? S.manualNotConfiguredUseCod
                      : S.manualNotConfigured}
                </p>
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

          {/* Right: order summary + pay (sticky on desktop, last on mobile) */}
          <div>
            <div className="lg:sticky lg:top-24 space-y-4">
              <OrderSummary
                type={type as CheckoutType}
                course={course}
                book={book}
                quantity={quantity}
                bn={bn}
                S={summaryLabels(S)}
                showDelivery={Boolean(isPrinted && !outOfStock)}
                deliveryCharge={deliveryCharge}
                isCod={isCod}
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
                    disabled={processing || (isManual && availableChannels.length === 0)}
                    onClick={onConfirm}
                  >
                    {processing ? (
                      <>
                        <LuLoaderCircle className="animate-spin text-lg" /> {stepLabel(step, S)}
                      </>
                    ) : (
                      <>
                        <LuLock className="text-base" />{" "}
                        {isFreeCourse
                          ? S.enrollFree
                          : isCod
                            ? S.placeCodOrder
                            : isGateway
                              ? S.payNow
                              : S.submitPay}
                      </>
                    )}
                  </Button>

                  <p className={cn("flex items-center justify-center gap-1.5 text-xs text-muted-foreground", bn)}>
                    <LuShieldCheck className="text-accent" />{" "}
                    {isFreeCourse
                      ? S.secureNote
                      : isCod
                        ? S.codConfirmNote
                        : isGateway
                          ? S.gatewaySecureNote
                          : S.verifyNote}
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
          <div className="space-y-6">
            <div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />
            <div className="h-28 w-full animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="space-y-4">
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
    case "redirecting":
      return S.stepRedirecting;
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
  placeCodOrder: "Place Order",
  enrollFree: "Enroll for Free",
  secureNote: "Your enrollment is processed securely.",
  verifyNote: "Your payment will be verified by our team, usually within 24 hours.",
  codConfirmNote: "No payment now — pay the courier when your book arrives.",

  // Pay-now vs cash-on-delivery
  payModeHeading: "How would you like to pay?",
  payModeSubtitle: "Choose one — you can pay now, or when the book reaches you.",
  codTitle: "Cash on Delivery",
  codText: "Pay the courier in cash when your book arrives.",
  onlineTitle: "Pay now (bKash / Rocket / Nagad)",
  onlineText: "Send Money to our number and enter the transaction ID.",
  codUnavailable: "Cash on delivery is unavailable right now.",
  codDigitalOnly: "Cash on delivery is only for printed books.",
  codHowTitle: "How cash on delivery works",
  codStep1: "Place the order — nothing is charged now.",
  codStep2: "We confirm the order by phone and hand it to the courier.",
  codStep3: "Pay the courier in cash when the book reaches you.",
  manualNotConfiguredUseCod:
    "Online payment is not set up yet — please choose Cash on Delivery.",
  manualNotConfiguredUseGateway:
    "Send Money is not set up yet — please use Pay Instantly instead.",

  // Hosted gateway (bKash / SSLCommerz)
  payNow: "Pay Now",
  gatewayTitle: "Pay instantly",
  gatewayText: "Pay with bKash or card on a secure page. Your order confirms at once.",
  gatewayBadge: "Instant",
  gatewaySecureNote: "You'll finish the payment on the provider's own secure page.",
  gatewayHowTitle: "How paying instantly works",
  gatewayStep1: "We take you to the payment provider's secure page.",
  gatewayStep2: "Complete the payment there with your wallet PIN or card.",
  gatewayStep3: "You come straight back and your order is confirmed — no waiting for verification.",
  gatewayPickHeading: "Choose a payment provider",
  gatewayPickSubtitle: "Both are secure. Pick whichever you prefer.",
  gatewayBkash: "bKash",
  gatewayBkashText: "Pay directly from your bKash wallet.",
  gatewaySsl: "Cards & other wallets",
  gatewaySslText: "Card, Nagad, Rocket and internet banking via SSLCommerz.",
  gatewaySandboxNote: "Test mode — no real money will be charged.",

  // Payment return screen (back from the gateway)
  retLoading: "Confirming your payment…",
  retSuccessTitle: "Payment successful!",
  retSuccessSub: "Your payment went through and your order is confirmed.",
  retFailTitle: "Payment did not go through",
  retFailSub:
    "No money has been taken. You can try again, or place the order with Cash on Delivery instead.",
  retCancelTitle: "Payment cancelled",
  retCancelSub: "You cancelled the payment, so nothing was charged. Your order is still waiting.",
  retRefLabel: "Order number",
  retTryAgain: "Try again",
  retViewOrder: "View my order",
  retBackToBooks: "Back to books",

  // Delivery
  areaLabel: "Delivery area",
  insideDhaka: "Inside Dhaka",
  outsideDhaka: "Outside Dhaka",
  deliveryCharge: "Delivery charge",
  freeDelivery: "Free",

  // Cash-on-delivery confirmation screen
  codSuccessTitle: "Order placed!",
  codSuccessSub: "We will call you shortly to confirm, then send the book to your address.",
  codCollectLabel: "Pay on delivery",
  codNextTitle: "What happens next",
  codNext1: "We call you to confirm the order and your address.",
  codNext2: "The book is handed to the courier and sent to you.",
  codNext3: "Pay the courier in cash and receive your book.",
  codSupport: "Any problem? Call",
  stepProcessing: "Processing…",
  stepCreating: "Placing order…",
  stepInitiating: "Submitting…",
  stepPaying: "Submitting…",
  stepRedirecting: "Opening secure payment…",
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
  placeCodOrder: "অর্ডার কনফার্ম করুন",
  enrollFree: "ফ্রিতে এনরোল করুন",
  secureNote: "আপনার এনরোলমেন্ট নিরাপদভাবে প্রক্রিয়া করা হয়।",
  verifyNote: "আপনার পেমেন্ট আমাদের টিম যাচাই করবে, সাধারণত ২৪ ঘণ্টার মধ্যে।",
  codConfirmNote: "এখন কোনো টাকা লাগবে না — বই হাতে পেয়ে কুরিয়ারকে দেবেন।",

  // Pay-now vs cash-on-delivery
  payModeHeading: "টাকা কীভাবে দিতে চান?",
  payModeSubtitle: "একটি বেছে নিন — এখনই দিতে পারেন, অথবা বই হাতে পেয়ে দিতে পারেন।",
  codTitle: "ক্যাশ অন ডেলিভারি",
  codText: "বই হাতে পাওয়ার সময় কুরিয়ারকে নগদ টাকা দেবেন।",
  onlineTitle: "এখনই পেমেন্ট (বিকাশ / রকেট / নগদ)",
  onlineText: "আমাদের নম্বরে Send Money করে ট্রানজেকশন আইডি দিন।",
  codUnavailable: "ক্যাশ অন ডেলিভারি এখন বন্ধ আছে।",
  codDigitalOnly: "ক্যাশ অন ডেলিভারি শুধু ছাপা বইয়ের জন্য।",
  codHowTitle: "ক্যাশ অন ডেলিভারি যেভাবে কাজ করে",
  codStep1: "অর্ডার দিন — এখন কোনো টাকা কাটা হবে না।",
  codStep2: "আমরা ফোনে অর্ডারটি নিশ্চিত করে কুরিয়ারে পাঠিয়ে দেব।",
  codStep3: "বই হাতে পাওয়ার সময় কুরিয়ারকে নগদ টাকা দেবেন।",
  manualNotConfiguredUseCod:
    "অনলাইন পেমেন্ট এখনো চালু হয়নি — ক্যাশ অন ডেলিভারি বেছে নিন।",
  manualNotConfiguredUseGateway:
    "Send Money এখনো চালু হয়নি — এখনই পেমেন্ট অপশনটি ব্যবহার করুন।",

  // Hosted gateway (bKash / SSLCommerz)
  payNow: "এখনই পেমেন্ট করুন",
  gatewayTitle: "সাথে সাথে পেমেন্ট",
  gatewayText: "বিকাশ বা কার্ড দিয়ে নিরাপদ পেজে পেমেন্ট করুন। অর্ডার সাথে সাথেই কনফার্ম হবে।",
  gatewayBadge: "ইনস্ট্যান্ট",
  gatewaySecureNote: "পেমেন্টটি প্রোভাইডারের নিজস্ব নিরাপদ পেজে সম্পন্ন হবে।",
  gatewayHowTitle: "সাথে সাথে পেমেন্ট যেভাবে কাজ করে",
  gatewayStep1: "আমরা আপনাকে পেমেন্ট প্রোভাইডারের নিরাপদ পেজে নিয়ে যাব।",
  gatewayStep2: "সেখানে ওয়ালেট পিন বা কার্ড দিয়ে পেমেন্ট সম্পন্ন করুন।",
  gatewayStep3: "সাথে সাথেই ফিরে আসবেন এবং অর্ডার কনফার্ম হয়ে যাবে — যাচাইয়ের অপেক্ষা নেই।",
  gatewayPickHeading: "পেমেন্ট প্রোভাইডার বেছে নিন",
  gatewayPickSubtitle: "দুটোই নিরাপদ। যেটি পছন্দ সেটি বেছে নিন।",
  gatewayBkash: "বিকাশ",
  gatewayBkashText: "সরাসরি আপনার বিকাশ ওয়ালেট থেকে পেমেন্ট করুন।",
  gatewaySsl: "কার্ড ও অন্যান্য ওয়ালেট",
  gatewaySslText: "SSLCommerz-এর মাধ্যমে কার্ড, নগদ, রকেট ও ইন্টারনেট ব্যাংকিং।",
  gatewaySandboxNote: "টেস্ট মোড — আসল কোনো টাকা কাটা হবে না।",

  // Payment return screen (back from the gateway)
  retLoading: "আপনার পেমেন্ট নিশ্চিত করা হচ্ছে…",
  retSuccessTitle: "পেমেন্ট সফল হয়েছে!",
  retSuccessSub: "আপনার পেমেন্ট সম্পন্ন হয়েছে এবং অর্ডার কনফার্ম হয়েছে।",
  retFailTitle: "পেমেন্ট সম্পন্ন হয়নি",
  retFailSub:
    "কোনো টাকা কাটা হয়নি। আবার চেষ্টা করতে পারেন, অথবা ক্যাশ অন ডেলিভারিতে অর্ডার করতে পারেন।",
  retCancelTitle: "পেমেন্ট বাতিল হয়েছে",
  retCancelSub: "আপনি পেমেন্ট বাতিল করেছেন, তাই কোনো টাকা কাটা হয়নি। অর্ডারটি এখনো অপেক্ষায় আছে।",
  retRefLabel: "অর্ডার নম্বর",
  retTryAgain: "আবার চেষ্টা করুন",
  retViewOrder: "আমার অর্ডার দেখুন",
  retBackToBooks: "বই দেখুন",

  // Delivery
  areaLabel: "ডেলিভারি এলাকা",
  insideDhaka: "ঢাকার ভেতরে",
  outsideDhaka: "ঢাকার বাইরে",
  deliveryCharge: "ডেলিভারি চার্জ",
  freeDelivery: "ফ্রি",

  // Cash-on-delivery confirmation screen
  codSuccessTitle: "অর্ডার হয়ে গেছে!",
  codSuccessSub: "আমরা একটু পরেই ফোন করে অর্ডারটি নিশ্চিত করব, তারপর আপনার ঠিকানায় বই পাঠিয়ে দেব।",
  codCollectLabel: "ডেলিভারির সময় দিতে হবে",
  codNextTitle: "এরপর যা হবে",
  codNext1: "আমরা ফোন করে অর্ডার ও ঠিকানা নিশ্চিত করব।",
  codNext2: "বইটি কুরিয়ারে দিয়ে আপনার ঠিকানায় পাঠানো হবে।",
  codNext3: "বই হাতে পেয়ে কুরিয়ারকে নগদ টাকা দেবেন।",
  codSupport: "কোনো সমস্যা হলে কল করুন",
  stepProcessing: "প্রসেস হচ্ছে…",
  stepCreating: "অর্ডার তৈরি হচ্ছে…",
  stepInitiating: "সাবমিট হচ্ছে…",
  stepPaying: "সাবমিট হচ্ছে…",
  stepRedirecting: "নিরাপদ পেমেন্ট পেজ খোলা হচ্ছে…",
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
    delivery: S.deliveryCharge,
    codNote: S.codConfirmNote,
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
    areaLabel: S.areaLabel,
    insideDhaka: S.insideDhaka,
    outsideDhaka: S.outsideDhaka,
    free: S.freeDelivery,
  };
}

function payModeLabels(S: Copy) {
  return {
    heading: S.payModeHeading,
    subtitle: S.payModeSubtitle,
    codTitle: S.codTitle,
    codText: S.codText,
    onlineTitle: S.onlineTitle,
    onlineText: S.onlineText,
    codUnavailable: S.codUnavailable,
    gatewayTitle: S.gatewayTitle,
    gatewayText: S.gatewayText,
    gatewayBadge: S.gatewayBadge,
  };
}

function gatewayLabels(S: Copy) {
  return {
    heading: S.gatewayPickHeading,
    subtitle: S.gatewayPickSubtitle,
    bkash: S.gatewayBkash,
    bkashText: S.gatewayBkashText,
    sslcommerz: S.gatewaySsl,
    sslcommerzText: S.gatewaySslText,
    sandboxNote: S.gatewaySandboxNote,
  };
}

// Copy for the /payment/return screen. Exported so the return route can render
// in the buyer's language without duplicating the dictionary.
export function paymentReturnLabels(isBengali: boolean) {
  const S = isBengali ? BN : EN;
  return {
    loading: S.retLoading,
    successTitle: S.retSuccessTitle,
    successSub: S.retSuccessSub,
    failTitle: S.retFailTitle,
    failSub: S.retFailSub,
    cancelTitle: S.retCancelTitle,
    cancelSub: S.retCancelSub,
    refLabel: S.retRefLabel,
    tryAgain: S.retTryAgain,
    viewOrder: S.retViewOrder,
    backToBooks: S.retBackToBooks,
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
    // Cash on delivery
    codTitle: S.codSuccessTitle,
    codSub: S.codSuccessSub,
    codCollectLabel: S.codCollectLabel,
    codDeliveryLabel: S.deliveryCharge,
    codNextTitle: S.codNextTitle,
    codNext1: S.codNext1,
    codNext2: S.codNext2,
    codNext3: S.codNext3,
    codSupport: S.codSupport,
    channelName: (id: ManualChannel) => channelName(S, id),
    methodNames: {
      bkash: S.chBkash,
      rocket: S.chRocket,
      nagad: S.chNagad,
      sslcommerz: "SSLCommerz",
      manual: S.successMethod,
      cod: S.codTitle,
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

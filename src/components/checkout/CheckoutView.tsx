"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
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
  LuCalendarClock,
  LuTruck,
  LuTicket,
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
  fetchMe,
  fetchPaymentSettings,
  getStoredUser,
  getToken,
  payForCourse,
  submitBookCod,
  submitBookManual,
  submitCourseManual,
  validateBookCoupon,
  type AppliedCoupon,
} from "./checkoutApi";
import ManualPaymentDetails from "./ManualPaymentDetails";
import GatewayChoice from "./GatewayChoice";
import { LEGAL_PAGES } from "@/config/business";
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
  ManualChannel,
  ManualDetails,
  OrderResult,
  PayMode,
  PaymentSettings,
  PreOrderInfo,
  ShippingAddress,
  SuccessResult,
  effectiveCoursePrice,
  formatReleaseDate,
  formatTk,
} from "./types";
import { upazilasOf } from "./bdGeoData";
import { priceBook, resolveOffers } from "@/lib/bookOffers";

// How many copies of an unprinted book one buyer may pre-order.
//
// A pre-order has no stock to cap the stepper against, and an uncapped stepper
// on a book that does not exist yet is how a mis-tap becomes a 200-copy order
// the shop has to unwind by hand. Bulk buyers phone the shop.
const PREORDER_MAX_QTY = 10;

// What the buyer is agreeing to when they tick the box. Not all four policies:
// the delivery timeline is stated inside the terms and is linked from the
// footer, and a consent line with four links stops being read at all. These
// three are the ones a payment gateway's review expects to see accepted before
// money moves — what is being sold, what happens to their data, and how they
// get it back.
const CONSENT_POLICIES = ["terms-and-conditions", "refund-policy", "privacy-policy"] as const;

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
  // Deliberately unchecked on every visit, and never remembered: consent has to
  // be given for the order being placed now, not inherited from a previous one.
  const [agreed, setAgreed] = useState(false);

  // ── Pay now vs pay the courier, and where the parcel is going ─────────────
  const [payMode, setPayMode] = useState<PayMode>("cod");
  // The buyer's medical college, from /auth/me — decides free local delivery.
  const [myCollege, setMyCollege] = useState("");
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  // ── Coupon (books) — stacks on top of the book's own offers ───────────────
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

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
  // A pre-order is sold before the print run exists, so `stock: 0` is its normal
  // state, not a reason to refuse the sale — order.service.ts skips the stock
  // check for these lines. Gating on stock here would make every pre-order
  // unbuyable while the server was perfectly willing to take the order.
  // Pre-order MODE and its headline percent, resolved through the offers helper so
  // a book that turns pre-order on via the new offers block (not the legacy flag)
  // still shows the pre-order UI and skips the stock gate.
  const bookOffers = useMemo(() => (isBook && book ? resolveOffers(book) : null), [isBook, book]);
  const isPreOrder = !!bookOffers?.preorder.enabled;
  // The pre-order discount as shown on the badge — a percent or a fixed ৳ amount.
  const preOrderDisc = bookOffers?.preorder
    ? bookOffers.preorder.type === "fixed"
      ? formatTk(bookOffers.preorder.amount)
      : `${bookOffers.preorder.percent}%`
    : "";
  const preOrderReleaseDate = formatReleaseDate(book?.expectedReleaseDate, isBengali);
  const outOfStock = isPrinted && !isPreOrder && stock <= 0;
  const maxQty = isPreOrder ? PREORDER_MAX_QTY : Math.max(1, stock);
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

  /**
   * This exact checkout, query string and all, for `?redirect=` on the way to
   * login. Rebuilt from the params rather than read off `window.location` so it
   * is the same string on the server and the client, and carries only the two
   * keys this page needs — never a stray token someone appended to the URL.
   */
  const backHere = `/checkout?${new URLSearchParams({
    type: String(type || ""),
    ...(slug ? { slug: String(slug) } : {}),
    ...(id ? { id: String(id) } : {}),
  }).toString()}`;

  const codAllowed = availability.cod;
  const onlineAllowed = options?.onlinePaymentEnabled !== false;

  /* This page used to scroll itself to the address form on arrival, because it
     opened wherever the homepage had been left. That turned out to be a
     stylesheet bug, not a checkout one — `overflow-x: hidden` on body made body
     the scroll container, so Next's own scroll-to-top scrolled a window that
     was not the thing scrolling. Fixed at the source in globals.css; every
     page now opens at the top, which is what the shop asked for, and this page
     needs nothing special. */
  // The chosen mode, forced back to whatever is actually available.
  const effectivePayMode = resolvePayMode(payMode, availability);
  const isCod = needsPayment && effectivePayMode === "cod";
  const isGateway = needsPayment && effectivePayMode === "gateway";
  // Manual Send-Money details are only asked for on the manual path — unchanged.
  const isManual = needsPayment && effectivePayMode === "online";

  // The one place the client prices a book, through the shared offers helper the
  // server mirrors. `payingOnline` decides whether the online-payment offer is in
  // force — so choosing gateway vs COD re-prices the summary in real time. The
  // server re-computes it all at order time; this only has to agree with it.
  const payingOnline = needsPayment && effectivePayMode !== "cod";
  const bp = useMemo(
    () => (isBook && book ? priceBook(book, { online: payingOnline, quantity }) : null),
    [isBook, book, payingOnline, quantity]
  );
  const bookSubtotal = bp?.subtotal ?? 0;

  // The coupon discount, on the product price AFTER the book's own offers — the
  // same base and formula the server uses, so the summary and the invoice agree.
  // Recomputes when the pay mode (and thus the online offer) changes the base.
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon || !bp) return 0;
    const base = bp.payable;
    if (appliedCoupon.discountType === "percent") {
      const pct = Math.min(90, Math.max(0, Number(appliedCoupon.discountValue) || 0));
      return Math.min(Math.round((base * pct) / 100), base);
    }
    return Math.min(Math.max(0, Number(appliedCoupon.discountValue) || 0), base);
  }, [appliedCoupon, bp]);

  // Total taka off (offers + coupon). Kept for the delivery-threshold maths; the
  // summary itemises it with names via discountLines below.
  const discount = (bp?.saved ?? 0) + couponDiscount;

  /**
   * "৳20 off" / "5% off" — the extra for paying now, shown above that option so
   * it is read while the choice is still being made.
   *
   * Built from the book's own online offer rather than from bp.onlineSaved,
   * because bp prices the mode currently SELECTED: once the buyer has picked
   * cash on delivery, onlineSaved is zero and the reason to switch back would
   * disappear from the screen at exactly the moment it matters.
   */
  const onlineOfferLine = useMemo(() => {
    const o = bp?.offers.online;
    if (!o?.enabled) return undefined;
    if (o.type === "percent") return o.percent > 0 ? S.onlineOffPct(o.percent) : undefined;
    return o.amount > 0 ? S.onlineOffTk(o.amount) : undefined;
  }, [bp, S]);

  // Named discount rows for the summary: the headline offer, the extra online
  // offer, then the coupon. A blank admin label falls back to a default.
  const discountLines = useMemo(() => {
    if (!bp) return [] as { label: string; amount: number }[];
    const out: { label: string; amount: number }[] = [];
    if (bp.headlineSaved > 0 && bp.headline.mode !== "none") {
      out.push({
        label: bp.headline.label || S.sumOfferNames[bp.headline.mode],
        amount: bp.headlineSaved,
      });
    }
    if (bp.onlineSaved > 0) {
      out.push({
        label: bp.offers.online.label || S.sumOfferNames.online,
        amount: bp.onlineSaved,
      });
    }
    if (couponDiscount > 0 && appliedCoupon) {
      out.push({
        label: appliedCoupon.name?.trim() || S.couponLine(appliedCoupon.code),
        amount: couponDiscount,
      });
    }
    return out;
  }, [bp, S, couponDiscount, appliedCoupon]);

  // ── Shipping form (only enforced for printed books) ───────────────────────
  const shippingSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, S.shipErrName),
        phone: z.string().min(6, S.shipErrPhone),
        address: z.string().min(1, S.shipErrAddress),
        // The three geography levels are now a guided cascade — division, then
        // its districts, then that district's upazilas — and the list covers
        // all of Bangladesh, so requiring all three is the whole point rather
        // than a burden. `city` is derived from the upazila at submit.
        division: z.string().min(1, S.shipErrDivision),
        district: z.string().min(1, S.shipErrDistrict),
        upazila: z.string().min(1, S.shipErrUpazila),
        note: z.string().optional(),
      }),
    [S]
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    mode: "onSubmit",
  });

  // Where the address came from, when it did not come from the buyer. Held so
  // the form can say so, and so the notice can vanish the moment either value
  // is edited.
  const [prefilled, setPrefilled] = useState<{
    district: string;
    division: string;
    college: string;
  } | null>(null);

  // useWatch rather than watch(): watch() hands back a function the React
  // Compiler refuses to memoize, and it would opt this whole 1400-line
  // component out of compilation to read two fields.
  const districtValue = (useWatch({ control, name: "district" }) ?? "").trim();
  const divisionValue = (useWatch({ control, name: "division" }) ?? "").trim();
  const prefillIntact =
    !!prefilled &&
    districtValue === prefilled.district &&
    divisionValue === prefilled.division;

  // Delivery is one flat charge everywhere, waived in two cases, mirroring the
  // server so the total never changes after Pay. The server recomputes it
  // regardless — this is display, not the source of truth.
  //
  // 1. A subtotal at or above freeDeliveryAbove.
  // 2. Free local delivery: the buyer studies at freeDeliveryCollege AND is
  //    shipping within freeDeliveryDivision. Shipping to any other division
  //    brings the charge back — hence the live divisionValue, not the college's.
  const freeDeliveryAbove = options?.freeDeliveryAbove || 0;
  const deliveryIsFreeBySubtotal =
    freeDeliveryAbove > 0 && bookSubtotal - discount >= freeDeliveryAbove;
  const deliveryIsFreeLocal =
    !!options?.freeDeliveryCollege &&
    myCollege === options.freeDeliveryCollege &&
    divisionValue === options.freeDeliveryDivision;
  const deliveryIsFree = deliveryIsFreeBySubtotal || deliveryIsFreeLocal;
  const deliveryCharge =
    !isPrinted || !options || deliveryIsFree
      ? 0
      : (options.deliveryCharge ?? 0) +
        (effectivePayMode === "cod" ? options.codExtraCharge || 0 : 0);

  // ── Auth gate + item fetch ────────────────────────────────────────────────
  useEffect(() => {
    if (!getToken()) {
      // Not logged in → login, and BACK HERE afterwards. Without the redirect a
      // buyer who has already decided to buy is dropped on the homepage and has
      // to find the order button again — the commonest way this shop was losing
      // a sale it had already won.
      router.replace(`/login?redirect=${encodeURIComponent(backHere)}`);
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
        // Stock only caps the quantity for a book that has been printed. A
        // pre-order's stock is 0 by definition, and clamping to it would pin
        // every pre-order to a single copy. Resolve pre-order through the offers
        // helper so the new offers.preorder toggle counts, not just the legacy flag.
        if (b.format === "printed" && !resolveOffers(b).preorder.enabled) {
          setQuantity((q) => Math.min(q, Math.max(1, b.stock ?? 1)));
        }
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
      // most buyers here expect, and it needs no wallet setup to work. With COD
      // off, the hosted gateway is the only way to pay (the manual flow is gone).
      if (o.codEnabled === false) setPayMode("gateway");
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

  // A digital book or a course has no cash-on-delivery — move to the gateway.
  // Guarded on the book being LOADED: while it is still fetching, `book` is null
  // and isPrinted reads false, and firing then would flip a printed book's
  // default off COD before its format even arrives.
  useEffect(() => {
    const bookStillLoading = isBook && !book;
    if (!bookStillLoading && !isPrinted && payMode === "cod") setPayMode("gateway");
  }, [isBook, book, isPrinted, payMode]);

  // Prefill the shipping form from what the shop already knows about the buyer.
  //
  // Two sources in this order on purpose: the stored user gives name and phone
  // with no round trip, so the form is never blank while a request is in
  // flight; /auth/me then supplies the district and division snapshotted from
  // the medical college chosen at signup. Only the geography is ever guessed —
  // the street address is left empty, because a student's college is very often
  // not where they want a parcel sent.
  useEffect(() => {
    if (!isPrinted) return;
    let active = true;
    // The stored record is parsed JSON, so its type is whatever TS inferred
    // from other call sites — which does not include the WhatsApp number this
    // form now prefers. Name the fields this one reads.
    const u = getStoredUser() as {
      firstName?: string;
      lastName?: string;
      name?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
    } | null;
    reset({
      name: u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.name || "" : "",
      // Phone fills from the stored record now and, a moment later, from
      // /auth/me. WhatsApp first in both, so the field never briefly shows a
      // different number and then changes under the buyer's eyes.
      phone: (u?.whatsappNumber ?? u?.phoneNumber ?? "") as string,
      address: "",
      division: "",
      district: "",
      upazila: "",
      note: "",
    });
    void fetchMe().then((me) => {
      if (!active || !me) return;
      // Never overwrite something the buyer has already typed while this call
      // was in flight.
      const current = getValues();

      // The college drives free local delivery, independent of any address.
      setMyCollege((me.medicalCollegeName ?? "").trim());

      // Contact: the WhatsApp number the student signed up with, first.
      //
      // It used to be phoneNumber first and only "when the field is still
      // empty" — and both halves were wrong. The shop's rule is that the
      // WhatsApp number is THE number: it is what a student actually answers,
      // it is where the order texts go, and it is the one they gave on
      // purpose. And the emptiness guard, meant to protect what the buyer had
      // typed while this call was in flight, was instead protecting whatever
      // the browser had autofilled a moment earlier — which is how an order
      // reached us carrying an office number nobody at the shop recognised.
      //
      // So it is set outright. This resolves within a second of the form
      // mounting, long before anyone finishes typing a number, and the field
      // stays editable afterwards for the buyer who genuinely wants the parcel
      // called through to somebody else.
      const contact = (me.whatsappNumber || me.phoneNumber || "").trim();
      if (contact) setValue("phone", contact);

      // A staff account, or a student who signed up before colleges existed,
      // has no college geography — nothing more to prefill, no notice to show.
      const district = (me.district ?? "").trim();
      const division = (me.division ?? "").trim();
      const upazila = (me.upazila ?? "").trim();
      if (!district && !division) return;

      // Division BEFORE district BEFORE upazila: each select only lists the
      // options scoped to the one above it, so the parent has to be in place
      // for the child value to land on a real option.
      if (division && !(current.division ?? "").trim()) setValue("division", division);
      if (district && !(current.district ?? "").trim()) setValue("district", district);
      // Only set the upazila if it is a real option under this district — the
      // directory's area field is free text and may not match, or be blank.
      if (
        upazila &&
        !(current.upazila ?? "").trim() &&
        upazilasOf(division, district).includes(upazila)
      ) {
        setValue("upazila", upazila);
      }
      setPrefilled({ district, division, college: (me.medicalCollegeName ?? "").trim() });
    });
    return () => {
      active = false;
    };
  }, [isPrinted, reset, setValue, getValues]);

  // ── Run the end-to-end flow (A: course, B: book) ──────────────────────────
  const validateManual = (): boolean => {
    const e: typeof manualErrors = {};
    if (!details.transactionId.trim()) e.transactionId = S.manualErrTxn;
    if (!details.senderNumber.trim()) e.senderNumber = S.manualErrSender;
    if (!details.sentAt) e.sentAt = S.manualErrSentAt;
    setManualErrors(e);
    return Object.keys(e).length === 0;
  };

  // Validate the typed code against the current post-offer price and apply it.
  // The server re-checks on create, so this is a preview that cannot be forged.
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || !bp) return;
    setCouponBusy(true);
    setCouponErr("");
    try {
      const c = await validateBookCoupon(code, bp.payable, S.couponInvalid);
      setAppliedCoupon(c);
      setCouponInput("");
    } catch (e) {
      setAppliedCoupon(null);
      const msg = e instanceof Error ? e.message : S.couponInvalid;
      setCouponErr(msg === "__NETWORK__" ? S.network : msg);
    } finally {
      setCouponBusy(false);
    }
  };
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponErr("");
    setCouponInput("");
  };

  const runCheckout = async (shipping?: ShippingAddress) => {
    // Their session expired between opening the page and pressing the button.
    // Same return path, so signing in again drops them back on the order they
    // were halfway through rather than at the start.
    if (!getToken()) return router.replace(`/login?redirect=${encodeURIComponent(backHere)}`);
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
        // The order the server sends back is the truth about what was charged.
        // The ship promise is not on it at all — the note and the date are copy
        // that only ever lived on the Book — so it is read from there, gated on
        // the server's own verdict. `?? isPreOrder` covers an order document
        // written before the field existed: falling back to what the page was
        // showing beats silently dropping the one thing a pre-order buyer wants
        // to know.
        const preOrderFor = (o: OrderResult): PreOrderInfo | undefined =>
          (o.isPreOrder ?? isPreOrder)
            ? { note: book.preOrderNote, expectedReleaseDate: book.expectedReleaseDate }
            : undefined;

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
            couponCode: appliedCoupon?.code,
            onProgress: setStep,
            genericErr: S.genericErr,
          });

          if (res.redirected) return; // leaving the page; keep the spinner up
          setResult({ kind: "book", order: res.order, preOrder: preOrderFor(res.order) });
        } else if (isCod) {
          // Nothing is paid now — the order is placed and the courier collects.
          const order = await submitBookCod({
            book,
            quantity,
            shippingAddress: shipping as ShippingAddress,
            couponCode: appliedCoupon?.code,
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
            preOrder: preOrderFor(order),
          });
        } else {
          const order = await submitBookManual({
            book,
            quantity,
            details,
            shippingAddress: shipping,
            couponCode: appliedCoupon?.code,
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
            preOrder: preOrderFor(order),
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
    // Checked here as well as on the button's disabled state: the button can be
    // re-enabled from devtools, and this is the one place every payment path
    // — cash on delivery, manual wallet, hosted gateway — passes through.
    if (!agreed) {
      setSubmitError(S.consentRequired);
      return;
    }
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
      // Gate the flow behind a valid shipping address. Blank geo fields are
      // dropped rather than sent as "".
      void handleSubmit((vals) =>
        runCheckout({
          ...vals,
          division: vals.division?.trim() || undefined,
          district: vals.district?.trim() || undefined,
          upazila: vals.upazila?.trim() || undefined,
          // city carries the upazila: the server still requires a city and the
          // order alert prints it, and the upazila is the most local unit we
          // have. See order.interface.ts.
          city: vals.upazila?.trim() || vals.district?.trim() || "",
        })
      )();
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
            {/* Pre-order — said plainly and first, because "this book does not
                exist yet" changes what the buyer is agreeing to. */}
            {isPreOrder && (
              <div className="rounded-2xl border border-coral/30 bg-coral/10 p-5 shadow-soft sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-coral/15 text-coral">
                    <LuCalendarClock className="text-lg" />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("font-heading text-base font-bold text-coral", bn)}>
                      {S.preOrderBadge(preOrderDisc)}
                    </p>
                    <p className={cn("mt-1 text-sm text-foreground", bn)}>
                      {book?.preOrderNote?.trim() || S.preOrderFallback}
                    </p>
                    {preOrderReleaseDate && (
                      <p
                        className={cn(
                          "mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground",
                          bn
                        )}
                      >
                        <LuTruck className="text-coral" /> {S.preOrderShipOn(preOrderReleaseDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quantity (printed books only) */}
            {isPrinted && !outOfStock && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>
                      {S.qtyHeading}
                    </h2>
                    {/* An unprinted book has no stock count worth quoting — a
                        "0 in stock" line under a book you can buy is nonsense. */}
                    <p className={cn("text-sm text-muted-foreground", bn)}>
                      {isPreOrder ? S.preOrderQtyNote : S.inStock(stock)}
                    </p>
                  </div>
                  <QuantityStepper
                    value={quantity}
                    min={1}
                    max={maxQty}
                    onChange={setQuantity}
                    disabled={processing}
                    label={S.qtyHeading}
                  />
                </div>
              </div>
            )}

            {/* Shipping (printed books only) */}
            {isPrinted && !outOfStock && (
              <div>
              <ShippingForm
                register={register}
                errors={errors}
                control={control}
                setValue={setValue}
                bn={bn}
                S={shippingLabels(S)}
                prefill={
                  prefillIntact && prefilled
                    ? {
                        text: prefilled.college
                          ? S.shipPrefilledFrom(prefilled.college)
                          : S.shipPrefilled,
                        clearLabel: S.shipPrefillClear,
                        onClear: () => {
                          setValue("division", "");
                          setValue("district", "");
                          setValue("upazila", "");
                          setPrefilled(null);
                        },
                      }
                    : null
                }
              />
              </div>
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
                onlineOfferLine={onlineOfferLine}
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
              {/* Coupon — books only; stacks on top of the book's own offers */}
              {isBook && needsPayment && (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
                  <p className={cn("mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground", bn)}>
                    <LuTicket className="text-primary" /> {S.couponHeading}
                  </p>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{appliedCoupon.code}</p>
                        {couponDiscount > 0 && (
                          <p className={cn("text-xs font-medium text-accent", bn)}>
                            {S.couponApplied(formatTk(couponDiscount))}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        disabled={processing}
                        className={cn("shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-coral", bn)}
                      >
                        {S.couponRemove}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            if (couponErr) setCouponErr("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void applyCoupon();
                            }
                          }}
                          placeholder={S.couponPlaceholder}
                          disabled={couponBusy || processing}
                          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm uppercase tracking-wide outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
                        />
                        <button
                          type="button"
                          onClick={() => void applyCoupon()}
                          disabled={couponBusy || processing || !couponInput.trim()}
                          className={cn(buttonVariants({ variant: "outline" }), "shrink-0", bn)}
                        >
                          {couponBusy ? <LuLoaderCircle className="animate-spin" /> : S.couponApply}
                        </button>
                      </div>
                      {couponErr && <p className={cn("mt-1.5 text-xs text-coral", bn)}>{couponErr}</p>}
                    </>
                  )}
                </div>
              )}

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
                unit={bp?.list}
                discountLines={discountLines}
                isPreOrder={isPreOrder}
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

                  {/* Consent, immediately above the button it gates — not at
                      the top of the page where it would be scrolled past and
                      not remembered as having been given. */}
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                      agreed
                        ? "border-accent/40 bg-accent-soft"
                        : "border-border bg-muted/40 hover:border-primary/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        // Clear the nag as soon as they comply, rather than
                        // leaving a red line under a box they just ticked.
                        if (e.target.checked && submitError === S.consentRequired) setSubmitError("");
                      }}
                      disabled={processing}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-accent"
                    />
                    <span className={cn("text-[13px] leading-relaxed text-muted-foreground", bn)}>
                      {S.consentPrefix}{" "}
                      {CONSENT_POLICIES.map((slug, i) => {
                        const page = LEGAL_PAGES.find((p) => p.slug === slug)!;
                        return (
                          <span key={slug}>
                            {/* Last separator is the language's "and"; the ones
                                before it are commas. */}
                            {i > 0 && (i === CONSENT_POLICIES.length - 1 ? ` ${S.consentAnd} ` : ", ")}
                            <Link
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              // Opens in a tab of its own: a buyer who reads the
                              // refund policy must not lose the cart behind it.
                              onClick={(e) => e.stopPropagation()}
                              className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
                            >
                              {isBengali ? page.bn : page.en}
                            </Link>
                          </span>
                        );
                      })}
                      {S.consentSuffix}
                    </span>
                  </label>

                  <Button
                    size="lg"
                    variant="accent"
                    className={cn("w-full", bn)}
                    disabled={!agreed || processing || (isManual && availableChannels.length === 0)}
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

  // Consent. The buyer must agree before an order is placed — a payment
  // gateway's review asks to see this, and it is where the refund window and
  // the delivery timeline are actually agreed to.
  consentPrefix: "I have read and agree to the",
  consentAnd: "and",
  consentSuffix: ".",
  consentRequired: "Please accept the terms and policies before continuing.",

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
  onlineOffPct: (v: number) => `${v}% off`,
  onlineOffTk: (v: number) => `৳${v} off`,
  gatewayTitle: "Pay now",
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
  // pre-order
  preOrderBadge: (disc: string) => `Pre-order · ${disc} off`,
  preOrderFallback: "This book is not printed yet. Order now at the pre-order price.",
  preOrderShipOn: (d: string) => `Delivery starts ${d}`,
  preOrderQtyNote: "Not printed yet — reserved for you",
  preOrderShipTitle: "About your pre-order",
  preOrderShipGeneric: "This is a pre-order — we'll ship it as soon as it's printed.",
  sumPreOrderSaved: "Pre-order discount",
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
  sumPreOrder: "Pre-order",
  sumPreOrderDiscount: (pct: number) => `Pre-order discount (${pct}%)`,
  // Default names for the three offers when the admin left a label blank.
  sumOfferNames: { preorder: "Pre-order offer", normal: "Discount", online: "Online payment discount" },
  // Coupon
  couponHeading: "Have a coupon?",
  couponPlaceholder: "Coupon code",
  couponApply: "Apply",
  couponRemove: "Remove",
  couponApplied: (amt: string) => `Coupon applied — you save ${amt}`,
  couponInvalid: "This coupon could not be applied.",
  couponLine: (code: string) => `Coupon (${code})`,
  sumDuration: (m: number) => `${m} ${m === 1 ? "month" : "months"} programme`,
  // shipping
  shipHeading: "Shipping address",
  shipSubtitle: "Where should we deliver your printed book?",
  shipName: "Full name",
  shipNamePh: "e.g. Dr. Ayesha Rahman",
  shipPhone: "WhatsApp number",
  shipPhonePh: "01XXXXXXXXX",
  shipAddress: "Address (house / road / village)",
  shipAddressPh: "House, road, village",
  shipDivision: "Division",
  shipDistrict: "District",
  shipUpazila: "Upazila / Thana",
  shipSelectPh: "Select",
  shipSelectDistrictFirst: "Pick a division first",
  shipSelectUpazilaFirst: "Pick a district first",
  shipPrefilled: "District and division were filled in from your profile. Shipping somewhere else? Change them.",
  shipPrefilledFrom: (college: string) =>
    `District and division were filled in from ${college}. Sending the book home instead? Change them.`,
  shipPrefillClear: "Different address",
  zoneFollowsDistrict: (district: string, zone: string) =>
    `Delivery is charged by district — ${district} counts as ${zone}.`,
  shipNote: "Delivery note",
  shipNotePh: "Landmark or instructions",
  shipOptional: "optional",
  shipErrName: "Name is required",
  shipErrPhone: "Enter a valid phone number",
  shipErrAddress: "Address is required",
  shipErrDivision: "Select a division",
  shipErrDistrict: "Select a district",
  shipErrUpazila: "Select an upazila / thana",
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

  // সম্মতি
  consentPrefix: "আমি",
  consentAnd: "ও",
  consentSuffix: " পড়েছি এবং মেনে নিচ্ছি।",
  consentRequired: "এগিয়ে যাওয়ার আগে শর্তাবলি ও পলিসিগুলো মেনে নিন।",

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
  onlineOffPct: (v: number) => `${v}% ছাড়ে`,
  onlineOffTk: (v: number) => `৳${v} ছাড়ে`,
  gatewayTitle: "এখনই পেমেন্ট করুন",
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
  preOrderBadge: (disc: string) => `প্রি-অর্ডার · ${disc} ছাড়`,
  preOrderFallback: "বইটি এখনো ছাপা হয়নি। প্রি-অর্ডার দামে এখনই অর্ডার করুন।",
  preOrderShipOn: (d: string) => `${d} থেকে ডেলিভারি শুরু`,
  preOrderQtyNote: "এখনো ছাপা হয়নি — আপনার জন্য রাখা থাকবে",
  preOrderShipTitle: "আপনার প্রি-অর্ডার সম্পর্কে",
  preOrderShipGeneric: "এটি একটি প্রি-অর্ডার — ছাপা হওয়ার সাথে সাথেই পাঠিয়ে দেওয়া হবে।",
  sumPreOrderSaved: "প্রি-অর্ডার ছাড়",
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
  sumPreOrder: "প্রি-অর্ডার",
  sumPreOrderDiscount: (pct: number) => `প্রি-অর্ডার ছাড় (${pct}%)`,
  sumOfferNames: { preorder: "প্রি-অর্ডার অফার", normal: "ছাড়", online: "অনলাইন পেমেন্টে ছাড়" },
  // Coupon
  couponHeading: "কুপন আছে?",
  couponPlaceholder: "কুপন কোড",
  couponApply: "প্রয়োগ",
  couponRemove: "সরান",
  couponApplied: (amt: string) => `কুপন প্রয়োগ হয়েছে — সাশ্রয় ${amt}`,
  couponInvalid: "এই কুপনটি প্রয়োগ করা গেল না।",
  couponLine: (code: string) => `কুপন (${code})`,
  sumDuration: (m: number) => `${m} মাসের প্রোগ্রাম`,
  shipHeading: "ডেলিভারি ঠিকানা",
  shipSubtitle: "আপনার প্রিন্টেড বই কোথায় পৌঁছে দেব?",
  shipName: "পুরো নাম",
  shipNamePh: "যেমন: ডা. আয়েশা রহমান",
  shipPhone: "হোয়াটসঅ্যাপ নম্বর",
  shipPhonePh: "01XXXXXXXXX",
  shipAddress: "ঠিকানা (বাসা / রোড / গ্রাম)",
  shipAddressPh: "বাসা, রোড, গ্রাম",
  shipDivision: "বিভাগ",
  shipDistrict: "জেলা",
  shipUpazila: "উপজেলা / থানা",
  shipSelectPh: "নির্বাচন করুন",
  shipSelectDistrictFirst: "আগে বিভাগ বেছে নিন",
  shipSelectUpazilaFirst: "আগে জেলা বেছে নিন",
  shipPrefilled:
    "জেলা ও বিভাগ আপনার প্রোফাইল থেকে বসানো হয়েছে। অন্য ঠিকানায় পাঠাতে চাইলে বদলে নিন।",
  shipPrefilledFrom: (college: string) =>
    `জেলা ও বিভাগ ${college} অনুযায়ী বসানো হয়েছে। বাড়ির ঠিকানায় পাঠাতে চাইলে বদলে নিন।`,
  shipPrefillClear: "অন্য ঠিকানা",
  zoneFollowsDistrict: (district: string, zone: string) =>
    `ডেলিভারি চার্জ জেলা অনুযায়ী হিসাব হয় — ${district} মানে ${zone}।`,
  shipNote: "ডেলিভারি নোট",
  shipNotePh: "ল্যান্ডমার্ক বা নির্দেশনা",
  shipOptional: "ঐচ্ছিক",
  shipErrName: "নাম দিন",
  shipErrPhone: "সঠিক ফোন নম্বর দিন",
  shipErrAddress: "ঠিকানা দিন",
  shipErrDivision: "বিভাগ বেছে নিন",
  shipErrDistrict: "জেলা বেছে নিন",
  shipErrUpazila: "উপজেলা / থানা বেছে নিন",
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
    preOrder: S.sumPreOrder,
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
    division: S.shipDivision,
    district: S.shipDistrict,
    upazila: S.shipUpazila,
    selectPh: S.shipSelectPh,
    pickDivisionFirst: S.shipSelectDistrictFirst,
    pickDistrictFirst: S.shipSelectUpazilaFirst,
    note: S.shipNote,
    notePh: S.shipNotePh,
    optional: S.shipOptional,
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
    // Pre-order
    preOrderTitle: S.preOrderShipTitle,
    preOrderShipOn: S.preOrderShipOn,
    preOrderGeneric: S.preOrderShipGeneric,
    preOrderSavedLabel: S.sumPreOrderSaved,
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

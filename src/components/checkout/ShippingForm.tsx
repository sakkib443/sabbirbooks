"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { LuTruck, LuUser, LuPhone, LuMapPin, LuBadgePercent } from "react-icons/lu";
import { Input, cn } from "@/components/ui";

// Shape of the shipping fields — kept in sync with the zod schema in CheckoutView.
//
// The form asks for four things only (22 Oct 2026, the shop asked for a short
// checkout): name, mobile, medical college and the address line. Division,
// district and upazila are no longer shown — they are filled from the college
// when the buyer ticks "deliver to my college" (that is what prices a college's
// own delivery rate), and otherwise stay empty; the address line carries the
// rest. `note` is asked for beside the confirm button, not here.
export interface ShippingFormValues {
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address: string;
  division?: string;
  district?: string;
  upazila?: string;
  note?: string;
}

interface Labels {
  heading: string;
  name: string;
  namePh: string;
  phone: string;
  phonePh: string;
  address: string;
  addressPh: string;
}

// A line under the college about its own delivery rate: either that it applies,
// or what it would be if the parcel went to the college.
export interface DeliveryHint {
  applied: boolean;
  text: string;
}

// Presentational: the react-hook-form instance lives in CheckoutView so the
// confirm button can gate the whole flow behind a valid address.
export function ShippingForm({
  register,
  errors,
  bn,
  S,
  collegeSlot,
  deliveryHint,
}: {
  register: UseFormRegister<ShippingFormValues>;
  errors: FieldErrors<ShippingFormValues>;
  bn: string;
  S: Labels;
  // The medical-college picker, rendered by the parent (it owns the chosen
  // college, which prices delivery), placed above the address it can fill.
  collegeSlot?: React.ReactNode;
  deliveryHint?: DeliveryHint | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h2 className={cn("flex items-center gap-2 font-heading text-base font-bold text-foreground", bn)}>
        <LuTruck className="text-primary" /> {S.heading}
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-3 sm:gap-x-3">
        <Field
          bn={bn}
          label={S.name}
          icon={<LuUser />}
          error={errors.name?.message}
          input={
            <Input placeholder={S.namePh} autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
          }
        />
        <Field
          bn={bn}
          label={S.phone}
          icon={<LuPhone />}
          error={errors.phone?.message}
          input={
            <Input
              placeholder={S.phonePh}
              type="tel"
              inputMode="tel"
              // NOT autoComplete="tel": the browser drops in whichever number it
              // has saved, and an order once arrived carrying an office number
              // the buyer never typed. This form fills the account's own number.
              autoComplete="off"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          }
        />
        {collegeSlot && <div className="col-span-2">{collegeSlot}</div>}
        {deliveryHint && (
          <p
            className={cn(
              "col-span-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs",
              deliveryHint.applied
                ? "border-accent/30 bg-accent-soft/60 text-foreground"
                : "border-border bg-surface-soft text-muted-foreground",
              bn
            )}
          >
            <LuBadgePercent className={cn("mt-0.5 shrink-0", deliveryHint.applied ? "text-accent" : "text-primary")} />
            <span>{deliveryHint.text}</span>
          </p>
        )}
        <div className="col-span-2">
          <Field
            bn={bn}
            label={S.address}
            icon={<LuMapPin />}
            error={errors.address?.message}
            input={
              <Input
                placeholder={S.addressPh}
                // Same reason as the phone: a saved street-address profile lands
                // here whole. Let the buyer type the one line this form asks for.
                autoComplete="off"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  input,
  error,
  bn,
}: {
  label: string;
  icon: React.ReactNode;
  input: React.ReactNode;
  error?: string;
  bn: string;
}) {
  return (
    <label className="block">
      <span className={cn("mb-1 flex items-center gap-1.5 text-sm font-medium text-foreground", bn)}>
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      {input}
      {error && <span className={cn("mt-1 block text-xs text-coral", bn)}>{error}</span>}
    </label>
  );
}

export default ShippingForm;

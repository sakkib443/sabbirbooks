"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { LuTruck, LuUser, LuPhone, LuMapPin, LuBuilding2, LuNotebookPen } from "react-icons/lu";
import { Input, cn } from "@/components/ui";

// Shape of the shipping fields — kept in sync with the zod schema in CheckoutView.
export interface ShippingFormValues {
  name: string;
  phone: string;
  address: string;
  city: string;
  note?: string;
}

interface Labels {
  heading: string;
  subtitle: string;
  name: string;
  namePh: string;
  phone: string;
  phonePh: string;
  address: string;
  addressPh: string;
  city: string;
  cityPh: string;
  note: string;
  notePh: string;
  optional: string;
}

// Presentational: the react-hook-form instance lives in CheckoutView so the
// "Confirm & Pay" button can gate the whole flow behind a valid address.
export function ShippingForm({
  register,
  errors,
  bn,
  S,
}: {
  register: UseFormRegister<ShippingFormValues>;
  errors: FieldErrors<ShippingFormValues>;
  bn: string;
  S: Labels;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <LuTruck className="text-lg" />
        </span>
        <div>
          <h2 className={cn("font-heading text-lg font-bold text-foreground", bn)}>{S.heading}</h2>
          <p className={cn("text-sm text-muted-foreground", bn)}>{S.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          bn={bn}
          label={S.name}
          icon={<LuUser />}
          error={errors.name?.message}
          input={
            <Input
              placeholder={S.namePh}
              autoComplete="name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
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
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          }
        />
        <div className="sm:col-span-2">
          <Field
            bn={bn}
            label={S.address}
            icon={<LuMapPin />}
            error={errors.address?.message}
            input={
              <Input
                placeholder={S.addressPh}
                autoComplete="street-address"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
            }
          />
        </div>
        <Field
          bn={bn}
          label={S.city}
          icon={<LuBuilding2 />}
          error={errors.city?.message}
          input={
            <Input
              placeholder={S.cityPh}
              autoComplete="address-level2"
              aria-invalid={!!errors.city}
              {...register("city")}
            />
          }
        />
        <Field
          bn={bn}
          label={`${S.note} · ${S.optional}`}
          icon={<LuNotebookPen />}
          error={undefined}
          input={<Input placeholder={S.notePh} {...register("note")} />}
        />
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
      <span className={cn("mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground", bn)}>
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      {input}
      {error && <span className={cn("mt-1 block text-xs text-coral", bn)}>{error}</span>}
    </label>
  );
}

export default ShippingForm;

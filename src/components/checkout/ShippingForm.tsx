"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import {
  LuTruck,
  LuUser,
  LuPhone,
  LuMapPin,
  LuBuilding2,
  LuNotebookPen,
  LuCheck,
  LuGraduationCap,
  LuInfo,
  LuMap,
} from "react-icons/lu";
import { Input, cn } from "@/components/ui";
import type { DeliveryArea } from "./types";
import { formatTk } from "./types";
import { BD_DISTRICTS, BD_DIVISIONS } from "./bdGeo";

// Shape of the shipping fields — kept in sync with the zod schema in CheckoutView.
export interface ShippingFormValues {
  name: string;
  phone: string;
  address: string;
  city: string;
  district?: string;
  division?: string;
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
  district: string;
  districtPh: string;
  division: string;
  divisionPh: string;
  note: string;
  notePh: string;
  optional: string;
  areaLabel: string;
  insideDhaka: string;
  outsideDhaka: string;
  free: string;
}

// Told to the buyer when their district and division arrived from their college
// record instead of being typed. Without saying so out loud, a student who meant
// to ship a book home has no reason to look twice at a district that is already
// filled in — and the parcel goes to the wrong end of the country.
export interface PrefillNotice {
  text: string;
  clearLabel: string;
  onClear: () => void;
}

// Presentational: the react-hook-form instance lives in CheckoutView so the
// "Confirm & Pay" button can gate the whole flow behind a valid address.
export function ShippingForm({
  register,
  errors,
  bn,
  S,
  area,
  onAreaChange,
  areaCharges,
  prefill,
  zoneNote,
}: {
  register: UseFormRegister<ShippingFormValues>;
  errors: FieldErrors<ShippingFormValues>;
  bn: string;
  S: Labels;
  // Courier zone lives outside the form because the price shown in the order
  // summary depends on it, and react-hook-form does not re-render the summary.
  area: DeliveryArea;
  onAreaChange: (a: DeliveryArea) => void;
  areaCharges?: Record<DeliveryArea, number>;
  // Present only while the address still holds the values we filled in for the
  // buyer; it disappears the moment they edit either of them.
  prefill?: PrefillNotice | null;
  // Shown when the picked zone disagrees with the district — the district is
  // what the server prices from, so the buyer needs to know which one wins.
  zoneNote?: string;
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

      {prefill && (
        <div
          className={cn(
            "mt-4 flex flex-wrap items-start gap-x-3 gap-y-2 rounded-xl border border-primary/25 bg-primary-soft/50 p-3.5",
            bn
          )}
        >
          <span className="mt-0.5 shrink-0 text-primary">
            <LuGraduationCap />
          </span>
          <p className="min-w-0 flex-1 text-sm text-foreground">{prefill.text}</p>
          <button
            type="button"
            onClick={prefill.onClear}
            className="shrink-0 rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            {prefill.clearLabel}
          </button>
        </div>
      )}

      {/* Courier zone first — it changes the delivery charge, so the buyer
          should set it before reading the total. */}
      <div className="mt-5">
        <span className={cn("mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground", bn)}>
          <span className="text-primary">
            <LuTruck />
          </span>
          {S.areaLabel}
        </span>
        <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label={S.areaLabel}>
          {(
            [
              { id: "inside-dhaka" as DeliveryArea, label: S.insideDhaka },
              { id: "outside-dhaka" as DeliveryArea, label: S.outsideDhaka },
            ]
          ).map((opt) => {
            const active = area === opt.id;
            const charge = areaCharges?.[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onAreaChange(opt.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all",
                  active
                    ? "border-primary bg-primary-soft/60 ring-2 ring-primary/25"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                <span className={cn("font-medium text-foreground", bn)}>{opt.label}</span>
                <span className="flex items-center gap-2">
                  {typeof charge === "number" && (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {charge === 0 ? S.free : formatTk(charge)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                  >
                    {active && <LuCheck className="text-xs" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {zoneNote && (
          <p className={cn("mt-2 flex items-start gap-1.5 text-xs text-muted-foreground", bn)}>
            <LuInfo className="mt-0.5 shrink-0 text-primary" />
            {zoneNote}
          </p>
        )}
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
        {/* District and division are free text with suggestions rather than a
            <select>: a closed list would silently drop a prefilled spelling we
            do not carry, and there is no version of "we lost your address" that
            is better than an unfamiliar one.

            No autoComplete on district: the browser's address-level2 token is
            already spoken for by City above, and pointing both at it makes the
            browser fill the two with the same string. */}
        <Field
          bn={bn}
          label={S.district}
          icon={<LuMapPin />}
          error={errors.district?.message}
          input={
            <Input
              placeholder={S.districtPh}
              list="bd-districts"
              aria-invalid={!!errors.district}
              {...register("district")}
            />
          }
        />
        <Field
          bn={bn}
          label={S.division}
          icon={<LuMap />}
          error={errors.division?.message}
          input={
            <Input
              placeholder={S.divisionPh}
              list="bd-divisions"
              autoComplete="address-level1"
              aria-invalid={!!errors.division}
              {...register("division")}
            />
          }
        />
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

        <datalist id="bd-districts">
          {BD_DISTRICTS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
        <datalist id="bd-divisions">
          {BD_DIVISIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
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

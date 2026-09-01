"use client";

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormRegisterReturn,
  UseFormSetValue,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import {
  LuTruck,
  LuUser,
  LuPhone,
  LuMapPin,
  LuNotebookPen,
  LuGraduationCap,
  LuMap,
  LuChevronDown,
} from "react-icons/lu";
import { Input, cn } from "@/components/ui";
import { GEO_DIVISIONS, districtsOf, upazilasOf } from "./bdGeoData";

// Shape of the shipping fields — kept in sync with the zod schema in CheckoutView.
// Geography is a guided cascade: division → district → upazila, each list drawn
// from the one above it. `city` is not a field any more — CheckoutView sets it
// to the upazila at submit, for the server's still-required city.
export interface ShippingFormValues {
  name: string;
  phone: string;
  address: string;
  // Always present as strings — a select's value is "" before a choice, never
  // undefined — and required-non-empty by the zod schema in CheckoutView.
  division: string;
  district: string;
  upazila: string;
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
  division: string;
  district: string;
  upazila: string;
  selectPh: string;
  pickDivisionFirst: string;
  pickDistrictFirst: string;
  note: string;
  notePh: string;
  optional: string;
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
  control,
  setValue,
  bn,
  S,
  prefill,
}: {
  register: UseFormRegister<ShippingFormValues>;
  errors: FieldErrors<ShippingFormValues>;
  // control + setValue drive the cascade: the district list follows the chosen
  // division, the upazila list follows the district, and picking a parent again
  // clears the children so a stale district can never sit under a new division.
  control: Control<ShippingFormValues>;
  setValue: UseFormSetValue<ShippingFormValues>;
  bn: string;
  S: Labels;
  // Present only while the address still holds the values we filled in for the
  // buyer; it disappears the moment they edit either of them.
  prefill?: PrefillNotice | null;
}) {
  // The two parents the child lists depend on. useWatch, not watch(), so this
  // component re-renders its selects when either changes without dragging the
  // whole form out of the React Compiler's reach.
  const division = (useWatch({ control, name: "division" }) ?? "").trim();
  const district = (useWatch({ control, name: "district" }) ?? "").trim();
  const upazila = (useWatch({ control, name: "upazila" }) ?? "").trim();
  const districtOptions = districtsOf(division);
  const upazilaOptions = upazilasOf(division, district);

  const divisionReg = register("division");
  const districtReg = register("district");
  const upazilaReg = register("upazila");

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
        {/* Division → district → upazila → house/road/village: big to small,
            which is the order the client asked for and the order an address is
            actually recalled in. The street line used to sit above these three,
            so it was being filled in before anyone had said which district it
            was in. Each list is drawn
            from the pick above it, and choosing a parent again clears its
            children so a district can never sit under the wrong division. The
            three cover all of Bangladesh, so a closed <select> loses nobody. */}
        <SelectField
          bn={bn}
          label={S.division}
          icon={<LuMap />}
          error={errors.division?.message}
          reg={divisionReg}
          value={division}
          placeholder={S.selectPh}
          options={GEO_DIVISIONS}
          onSelect={(e) => {
            void divisionReg.onChange(e);
            setValue("district", "");
            setValue("upazila", "");
          }}
        />
        <SelectField
          bn={bn}
          label={S.district}
          icon={<LuMapPin />}
          error={errors.district?.message}
          reg={districtReg}
          value={district}
          placeholder={division ? S.selectPh : S.pickDivisionFirst}
          disabled={!division}
          options={districtOptions}
          onSelect={(e) => {
            void districtReg.onChange(e);
            setValue("upazila", "");
          }}
        />
        <SelectField
          bn={bn}
          label={S.upazila}
          icon={<LuMapPin />}
          error={errors.upazila?.message}
          reg={upazilaReg}
          value={upazila}
          placeholder={district ? S.selectPh : S.pickDistrictFirst}
          disabled={!district}
          options={upazilaOptions}
          onSelect={upazilaReg.onChange}
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
        <div className="sm:col-span-2">
          <Field
            bn={bn}
            label={`${S.note} · ${S.optional}`}
            icon={<LuNotebookPen />}
            error={undefined}
            input={<Input placeholder={S.notePh} {...register("note")} />}
          />
        </div>
      </div>
    </div>
  );
}

// A cascade dropdown. Spreads the react-hook-form registration for name/ref/
// blur but takes its own onChange, so the parent can clear the child fields in
// the same tick the value changes.
function SelectField({
  label,
  icon,
  error,
  bn,
  reg,
  value,
  placeholder,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  bn: string;
  reg: UseFormRegisterReturn;
  // Controlled by the form's own value, so a select shows the right option the
  // moment its option list appears — which is what a prefilled district needs,
  // since its options only exist once the division above it is set.
  value: string;
  placeholder: string;
  options: readonly string[];
  onSelect: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className={cn("mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground", bn)}>
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <div className="relative">
        <select
          {...reg}
          value={value}
          onChange={onSelect}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border bg-background px-3.5 pr-9 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-muted-foreground",
            error ? "border-coral" : "border-border",
            bn
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <LuChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <span className={cn("mt-1 block text-xs text-coral", bn)}>{error}</span>}
    </label>
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

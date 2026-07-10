"use client";

import { forwardRef, useState } from "react";
import { LuLock, LuEye, LuEyeOff } from "react-icons/lu";
import { FormField } from "./FormField";
import type { FormFieldProps } from "./FormField";

type PasswordInputProps = Omit<FormFieldProps, "icon" | "rightSlot" | "type"> & {
  showToggleLabel?: { show: string; hide: string };
};

// Password field with a built-in show/hide toggle. Forwards ref for RHF.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggleLabel, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const labels = showToggleLabel || { show: "Show password", hide: "Hide password" };
    return (
      <FormField
        ref={ref}
        type={visible ? "text" : "password"}
        icon={<LuLock className="text-base" />}
        rightSlot={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? labels.hide : labels.show}
            title={visible ? labels.hide : labels.show}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {visible ? <LuEyeOff className="text-base" /> : <LuEye className="text-base" />}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;

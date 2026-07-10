"use client";

import { LuTriangleAlert } from "react-icons/lu";
import { Button } from "@/components/ui";
import { Modal } from "./Modal";
import { Spinner } from "./primitives";

// Confirmation prompt for destructive actions (delete). `loading` disables the
// buttons while the async action runs.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2 text-coral">
          <LuTriangleAlert /> {title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="bg-coral text-white hover:brightness-105"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        {message || "This action cannot be undone."}
      </p>
    </Modal>
  );
}

export default ConfirmDialog;

"use client";

import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Small yes/no dialog for destructive or irreversible-looking admin actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" sheet="auto">
      <div className="flex gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-status-reserved-fill text-status-reserved-text">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <p className="pt-2 text-[15px] leading-relaxed">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3 max-md:grid max-md:grid-cols-2 max-md:pb-[env(safe-area-inset-bottom)] max-md:[&>*]:h-12">
        <Button variant="ghost" onClick={onCancel} data-autofocus>
          Отмена
        </Button>
        <Button variant="dark" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

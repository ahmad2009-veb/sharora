"use client";

import { useTranslations } from "next-intl";

import { Modal } from "@/components/ui/Modal";

import { LeadForm } from "./LeadForm";

/** "Заказать звонок" — a lead without a specific apartment. */
export function CallbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("apartments");
  const tc = useTranslations("common");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("brokerTitle")}
      closeLabel={tc("close")}
      size="sm"
    >
      {open && <LeadForm unitId={null} onBack={onClose} />}
    </Modal>
  );
}

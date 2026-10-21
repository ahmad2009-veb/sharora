"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

import { useDialog } from "./useDialog";
import { useMounted } from "./useMounted";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  /** Extra controls rendered in the header next to the close button. */
  actions?: ReactNode;
  /** Removes the body padding (content manages its own layout). */
  flush?: boolean;
};

const widths = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-[1260px]",
  "2xl": "max-w-[1240px]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  closeLabel,
  size = "md",
  className,
  actions,
  flush = false,
}: Props) {
  const tc = useTranslations("common");
  const mounted = useMounted();
  const titleId = useId();
  const descId = useId();
  const ref = useDialog(open, onClose);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="tabbar-offset fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            data-dialog
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-panel bg-white shadow-deep outline-none sm:max-h-[92dvh] sm:rounded-panel",
              widths[size],
              className,
            )}
          >
            <span
              aria-hidden
              className="h-1 w-full shrink-0 bg-gradient-to-r from-on-gold via-gold to-on-gold"
            />
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-8 md:py-5">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-display text-xl font-extrabold tracking-tight md:text-2xl"
                >
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-muted">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {actions}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel ?? tc("close")}
                  className="ml-1 grid size-10 place-items-center rounded-full bg-sand text-ink transition-all hover:scale-105 hover:bg-sand-deep"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </header>
            <div
              data-lenis-prevent
              className={cn(
                "overflow-y-auto overscroll-contain",
                !flush && "px-5 py-5 md:px-8 md:py-6",
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

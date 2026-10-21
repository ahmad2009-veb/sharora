"use client";

import { AnimatePresence, m } from "framer-motion";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const tc = useTranslations("common");
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback(
    (id: number) => setItems((all) => all.filter((t) => t.id !== id)),
    [],
  );

  const push = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = Date.now() + Math.random();
      setItems((all) => [...all.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-4"
      >
        <AnimatePresence>
          {items.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-ink px-4 py-3.5 text-sm text-white shadow-deep ring-1 ring-gold/20"
            >
              {t.tone === "error" ? (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-status-sold-line" aria-hidden />
              ) : (
                <CircleCheck className={cn("mt-0.5 size-5 shrink-0 text-gold")} aria-hidden />
              )}
              <p className="flex-1">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label={tc("closeNotification")}
                className="-m-1 grid size-7 place-items-center rounded-full hover:bg-white/10"
              >
                <X className="size-4" aria-hidden />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

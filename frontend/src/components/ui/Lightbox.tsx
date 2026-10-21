"use client";

import { AnimatePresence, m, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { cn } from "@/lib/cn";

import { useDialog } from "./useDialog";
import { useMounted } from "./useMounted";
import { ZoomControls } from "./ZoomControls";

export type LightboxImage = { src: string; alt: string; width?: number; height?: number };

type Props = {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  title?: string;
  caption?: string;
  /** Enables zoom + pan (documents, drawings). Photos use swipe instead. */
  zoomable?: boolean;
  labels: {
    close: string;
    previous: string;
    next: string;
    zoomIn?: string;
    zoomOut?: string;
    reset?: string;
  };
};

export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
  title,
  caption,
  zoomable = false,
  labels,
}: Props) {
  const mounted = useMounted();
  const open = index !== null;
  const ref = useDialog(open, onClose);
  const titleId = useId();
  const [direction, setDirection] = useState(0);
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      if (index === null || count < 2) return;
      setDirection(delta);
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, open]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60) go(1);
    else if (info.offset.x > 60) go(-1);
  }

  if (!mounted) return null;
  const image = index !== null ? images[index] : null;

  const navBtn =
    "grid size-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20";

  return createPortal(
    <AnimatePresence>
      {open && image && (
        <m.div
          ref={ref}
          data-dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="fixed inset-0 z-[60] flex flex-col bg-ink/95 text-white outline-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <header className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate font-display text-base font-semibold md:text-lg">
                {title ?? image.alt}
              </h2>
              {caption && <p className="truncate text-sm text-white/60">{caption}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70 tabular-nums" aria-live="polite">
                {index! + 1} / {count}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={labels.close}
                data-autofocus
                className="grid size-11 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 md:px-20 md:pb-8">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <m.div
                key={image.src}
                custom={direction}
                className="relative h-full w-full"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                drag={zoomable || count < 2 ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={onDragEnd}
              >
                {zoomable ? (
                  <TransformWrapper minScale={1} maxScale={5} doubleClick={{ mode: "toggle" }}>
                    <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
                      <ZoomControls
                        tone="dark"
                        labels={{
                          zoomIn: labels.zoomIn ?? "+",
                          zoomOut: labels.zoomOut ?? "−",
                          reset: labels.reset ?? "Reset",
                        }}
                      />
                    </div>
                    <TransformComponent
                      wrapperStyle={{ width: "100%", height: "100%" }}
                      contentStyle={{ width: "100%", height: "100%" }}
                    >
                      <div className="relative h-full w-full">
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          sizes="100vw"
                          className="object-contain"
                        />
                      </div>
                    </TransformComponent>
                  </TransformWrapper>
                ) : (
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="100vw"
                    className="pointer-events-none object-contain select-none"
                    draggable={false}
                    priority
                  />
                )}
              </m.div>
            </AnimatePresence>

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={labels.previous}
                  className={cn(navBtn, "absolute top-1/2 left-3 -translate-y-1/2 max-md:hidden")}
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={labels.next}
                  className={cn(navBtn, "absolute top-1/2 right-3 -translate-y-1/2 max-md:hidden")}
                >
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="flex justify-center gap-2 pb-5 md:hidden">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className={navBtn}
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.next}
                className={navBtn}
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </div>
          )}
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

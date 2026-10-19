"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

import { hasFinePointer, prefersReducedMotion } from "@/lib/capabilities";
import { gsap } from "@/lib/gsap";

export const CURSOR_EVENT = "zarafshon:cursor";
/** Lets non-DOM targets (the 3D scene) drive the cursor: `setCursor("view")` / `setCursor(null)`. */
export function setCursor(mode: "view" | "hover" | null) {
  window.dispatchEvent(new CustomEvent(CURSOR_EVENT, { detail: mode }));
}

const LABEL = { ru: "Смотреть", tg: "Дидан" } as const;

/**
 * Desktop-only gold cursor: a dot that follows exactly and a ring that trails.
 * Grows over interactive elements; shows «Смотреть» over [data-cursor="view"].
 * Also powers magnetic buttons ([data-magnetic]).
 */
export function Cursor() {
  const locale = useLocale() as keyof typeof LABEL;
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion() || !dot.current || !ring.current) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const dotX = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
    const dotY = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
    const ringX = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });
    let external: "view" | "hover" | null = null;
    let magnet: HTMLElement | null = null;

    const setMode = (mode: string) => {
      ring.current!.dataset.mode = mode;
      dot.current!.dataset.mode = mode;
    };

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      root.dataset.cursorVisible = "1";

      const target = e.target as Element;
      if (!external) {
        const view = target.closest?.('[data-cursor="view"]');
        const interactive = target.closest?.('a, button, [role="button"], label, summary');
        setMode(view ? "view" : interactive ? "hover" : "default");
      }

      // Magnetic pull towards the pointer
      const m = target.closest?.("[data-magnetic]") as HTMLElement | null;
      if (magnet && magnet !== m) {
        gsap.to(magnet, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      }
      magnet = m;
      if (m) {
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(m, { x: dx * 0.25, y: dy * 0.3, duration: 0.4, ease: "power3.out" });
      }
    }
    function onLeave() {
      delete root.dataset.cursorVisible;
    }
    function onExternal(e: Event) {
      external = (e as CustomEvent<"view" | "hover" | null>).detail;
      setMode(external ?? "default");
    }
    function onDown() {
      ring.current?.animate([{ scale: "1" }, { scale: "0.8" }, { scale: "1" }], { duration: 250 });
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener(CURSOR_EVENT, onExternal);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener(CURSOR_EVENT, onExternal);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[110] hidden [html.has-cursor_&]:block"
    >
      <div
        ref={ring}
        data-mode="default"
        className="absolute top-0 left-0 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold/70 opacity-0 transition-[width,height,background-color,border-color,opacity] duration-300 ease-out-soft data-[mode=hover]:size-14 data-[mode=hover]:border-gold data-[mode=hover]:bg-gold/10 data-[mode=view]:size-24 data-[mode=view]:border-transparent data-[mode=view]:bg-gold [html[data-cursor-visible]_&]:opacity-100"
      >
        <span className="text-[11px] font-semibold tracking-[0.12em] text-ink uppercase opacity-0 transition-opacity duration-200 [[data-mode=view]>&]:opacity-100">
          {LABEL[locale] ?? LABEL.ru}
        </span>
      </div>
      <div
        ref={dot}
        data-mode="default"
        className="absolute top-0 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow-[0_0_12px_rgb(201_164_92/0.8)] transition-opacity data-[mode=view]:opacity-0 [html[data-cursor-visible]_&]:opacity-100"
      />
    </div>
  );
}

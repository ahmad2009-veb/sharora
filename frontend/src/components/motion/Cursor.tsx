"use client";

import { useEffect } from "react";

import { hasFinePointer, prefersReducedMotion } from "@/lib/capabilities";
import { gsap } from "@/lib/gsap";

/**
 * Lets non-DOM targets (the 3D scene) change the cursor: `setCursor("view")` shows the
 * normal pointer hand over a clickable block, `setCursor(null)` resets it.
 */
export function setCursor(mode: "view" | "hover" | null) {
  document.documentElement.style.cursor = mode ? "pointer" : "";
}

/**
 * The site uses the normal system cursor. This only powers magnetic buttons
 * ([data-magnetic]): on desktop they lean slightly towards the pointer.
 */
export function Cursor() {
  useEffect(() => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    let magnet: HTMLElement | null = null;

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const m = (e.target as Element).closest?.("[data-magnetic]") as HTMLElement | null;
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

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { hasFinePointer, prefersReducedMotion } from "@/lib/capabilities";
import { loadedGsap, loadGsap } from "@/lib/gsap";
import { getLenis, setLenis } from "@/lib/smooth-scroll";

/** Inertial scrolling (Lenis) driven by the GSAP ticker so ScrollTrigger stays in sync. */
export function SmoothScroll() {
  const pathname = usePathname();

  // Mouse / trackpad only: Lenis smooths the wheel, while touch scrolling stays native
  // anyway — on phones it would only add a per-frame loop (and its download).
  useEffect(() => {
    if (prefersReducedMotion() || !hasFinePointer()) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("lenis"), loadGsap()]).then(
      ([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
        if (cancelled) return;
        const lenis = new Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          anchors: { offset: -80 },
        });
        setLenis(lenis);
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time: number) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        cleanup = () => {
          gsap.ticker.remove(tick);
          lenis.destroy();
          setLenis(null);
        };
      },
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // New page → start at the top and re-measure every trigger.
  useEffect(() => {
    // Links like /#about: Next has already scrolled to the section — keep it.
    if (!window.location.hash) getLenis()?.scrollTo(0, { immediate: true, force: true });
    // GSAP not loaded yet = no ScrollTriggers yet (new ones measure themselves).
    const id = window.setTimeout(() => loadedGsap()?.ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}

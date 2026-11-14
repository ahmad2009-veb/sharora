"use client";

import {
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

import { useMounted } from "@/components/ui/useMounted";
import { hasFinePointer } from "@/lib/capabilities";
import { cn } from "@/lib/cn";

import { HeroBackground, SLIDE_COUNT, SLIDE_MS, useActiveSlide } from "./HeroBackground";

/** Max image shift, px, opposite to the cursor. The layer is oversized by 24px per side. */
const PARALLAX_PX = 18;

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** Particles are pure CSS (transform/opacity), but still skipped on weak or data-saving devices. */
function canShowMotes(): boolean {
  const nav = navigator as NavigatorExtras;
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  return true;
}

/** Deterministic pseudo-random motes so server and client markup never disagree. */
const MOTES = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 22 }, () => {
    const duration = 10 + rnd() * 9;
    return {
      left: `${(rnd() * 100).toFixed(2)}%`,
      top: `${(4 + rnd() * 50).toFixed(2)}%`,
      size: `${(2 + rnd() * 3.5).toFixed(1)}px`,
      dx: `${((rnd() - 0.5) * 70).toFixed(0)}px`,
      peak: (0.35 + rnd() * 0.5).toFixed(2),
      duration: `${duration.toFixed(1)}s`,
      // Negative delay: every mote is already mid-flight on first paint.
      delay: `${(-rnd() * duration).toFixed(1)}s`,
    };
  });
})();

/**
 * Hero backdrop: the photo slideshow (HeroBackground) with cursor parallax on desktop /
 * scroll parallax elsewhere, a periodic gold light sweep and drifting golden motes in the sky.
 * Everything animated is transform or opacity.
 */
export function HeroBackdrop({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const [motes, setMotes] = useState(false);

  const scrollY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "22%"]);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 40, damping: 18, mass: 0.6 });
  const y = useSpring(pointerY, { stiffness: 40, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    setMotes(canShowMotes());
    if (!hasFinePointer()) return;
    const onMove = (e: PointerEvent) => {
      if (window.scrollY > window.innerHeight) return;
      pointerX.set(-(e.clientX / window.innerWidth - 0.5) * 2 * PARALLAX_PX);
      pointerY.set(-(e.clientY / window.innerHeight - 0.5) * 2 * PARALLAX_PX);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, pointerX, pointerY]);

  return (
    <m.div aria-hidden className="absolute inset-0 -z-20" style={{ y: scrollY }}>
      <m.div className="absolute -inset-6" style={{ x, y }}>
        <HeroBackground />
      </m.div>

      {/* A periodic gold light sweep. (No soft-light glow layer: blending a full-screen layer
          over the moving photos every frame dropped ~40% of frames on desktop.) */}
      <div className="hero-sheen pointer-events-none absolute inset-0" />

      {motes && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {MOTES.map((m, i) => (
            <span
              key={i}
              className="hero-mote"
              style={
                {
                  left: m.left,
                  top: m.top,
                  width: m.size,
                  height: m.size,
                  "--dx": m.dx,
                  "--peak": m.peak,
                  animationDuration: m.duration,
                  animationDelay: m.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </m.div>
  );
}

/**
 * Slide counter and progress bars for the hero photos (desktop): a frosted, softly lit
 * capsule on the right edge. Decorative, so hidden from screen readers.
 */
export function HeroSlideIndicator() {
  const reduce = useReducedMotion();
  const active = useActiveSlide();
  // useReducedMotion is null on the server but true on the first client render: wait for
  // hydration before hiding, or reduced-motion visitors get a hydration mismatch.
  const mounted = useMounted();
  if ((mounted && reduce) || SLIDE_COUNT < 2) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div
      aria-hidden
      className="hero-indicator pointer-events-none absolute top-1/2 right-6 z-0 hidden -translate-y-1/2 flex-col items-center gap-4 rounded-full px-3 py-5 lg:flex xl:right-10"
    >
      <span
        key={active}
        className="hero-indicator-num text-gold-gradient font-display text-2xl font-extrabold tabular-nums"
      >
        {pad(active + 1)}
      </span>
      <span className="flex flex-col gap-2">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <span
            key={i}
            className="relative block h-9 w-[5px] overflow-hidden rounded-full bg-white/15 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]"
          >
            <span
              key={i === active ? `run-${active}` : "idle"}
              className={cn(
                "absolute inset-0 origin-top rounded-full bg-[linear-gradient(180deg,#fff3d6,#ffdea4_40%,#e8c176_75%,#b8913f)] shadow-[0_0_10px_rgb(255_222_164/0.75)]",
                i === active ? "hero-progress" : i < active ? "" : "scale-y-0",
              )}
              style={i === active ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
            />
          </span>
        ))}
      </span>
      <span className="text-[11px] font-bold tracking-[0.2em] text-white/55 tabular-nums">
        {pad(SLIDE_COUNT)}
      </span>
    </div>
  );
}

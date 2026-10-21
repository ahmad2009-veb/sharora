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
import { preload } from "react-dom";

import { site } from "@/content/site";
import { hasFinePointer } from "@/lib/capabilities";

const { base, widths, width, height, blurDataURL } = site.hero.image;
const SIZES = "100vw";
const srcSet = (ext: "avif" | "webp") => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");
const AVIF_SRCSET = srcSet("avif");
const WEBP_SRCSET = srcSet("webp");

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
 * Hero render with layered motion: blur-to-sharp entrance (the blurred placeholder sits
 * under the photo, which fades in), CSS Ken Burns, cursor parallax on desktop / scroll
 * parallax elsewhere, a periodic gold light sweep and drifting golden motes in the sky.
 * Everything animated is transform or opacity; reduced motion keeps only the fade.
 */
export function HeroBackdrop({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const [motes, setMotes] = useState(false);

  // Pre-built responsive set; the AVIF preload is skipped by browsers that cannot decode it.
  preload(`${base}-1920.avif`, {
    as: "image",
    imageSrcSet: AVIF_SRCSET,
    imageSizes: SIZES,
    type: "image/avif",
    fetchPriority: "high",
  });

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
        {/* Entrance in CSS (globals.css → .hero-backdrop-in): it runs from the first paint, so
            the photo — the page's largest element — does not wait for hydration. */}
        <div className="hero-backdrop-in absolute inset-0">
          <div className="hero-kenburns absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 scale-110 bg-cover bg-[58%_45%] blur-xl"
              style={{ backgroundImage: `url("${blurDataURL}")` }}
            />
            <picture>
              <source type="image/avif" srcSet={AVIF_SRCSET} sizes={SIZES} />
              <source type="image/webp" srcSet={WEBP_SRCSET} sizes={SIZES} />
              {/* Not next/image: it is unoptimized on Vercel, so AVIF/WebP + srcset are pre-built. */}
              <img
                src={`${base}-1920.webp`}
                alt=""
                width={width}
                height={height}
                fetchPriority="high"
                decoding="async"
                className="hero-img-in absolute inset-0 size-full object-cover object-[58%_45%]"
              />
            </picture>
          </div>
        </div>
      </m.div>

      {/* Facade lighting: warm glow breathing over the windows + a periodic gold sweep. */}
      <div className="hero-glow pointer-events-none absolute inset-0" />
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

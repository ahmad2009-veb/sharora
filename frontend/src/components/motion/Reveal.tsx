"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/capabilities";
import { cn } from "@/lib/cn";

type TextProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
  /** "lines": masked line rise (headings, paragraphs). "chars": per-letter (hero H1). */
  split?: "lines" | "chars";
  delay?: number;
  /** Start immediately instead of on scroll (above-the-fold text). */
  immediate?: boolean;
  stagger?: number;
};

/**
 * Text that rises out of a mask as it enters the viewport. SplitText adds aria-labels so
 * screen readers still get the whole sentence. Without JS / with reduced motion the text
 * is simply rendered.
 */
export function RevealText({
  as: Tag = "p",
  children,
  className,
  id,
  split = "lines",
  delay = 0,
  immediate = false,
  stagger,
}: TextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      SplitText.create(el, {
        type: split === "chars" ? "words,chars" : "lines",
        mask: split === "chars" ? "words" : "lines",
        autoSplit: true,
        onSplit(self) {
          const targets = split === "chars" ? self.chars : self.lines;
          return gsap.from(targets, {
            yPercent: 110,
            opacity: split === "chars" ? 0 : 1,
            duration: split === "chars" ? 0.9 : 1.05,
            ease: "expo.out",
            stagger: stagger ?? (split === "chars" ? 0.028 : 0.09),
            delay,
            scrollTrigger: immediate ? undefined : { trigger: el, start: "top 88%", once: true },
          });
        },
      });
    },
    { scope: ref, dependencies: [] },
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}

/** A thin gold rule that draws itself from left to right while scrolling past. */
export function GoldLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top 95%", end: "top 55%", scrub: 0.6 },
        },
      );
    },
    { scope: ref },
  );
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "h-px origin-left bg-gradient-to-r from-gold via-gold/60 to-transparent",
        className,
      )}
    />
  );
}

/** Animated counter; renders the final value on the server so no-JS/SEO see real numbers. */
export function CountUp({
  value,
  className,
  format = (n) => Math.round(n).toLocaleString("ru-RU"),
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const counter = { n: 0 };
      el.textContent = format(0);
      gsap.to(counter, {
        n: value,
        duration: 1.6,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
        onUpdate: () => {
          el.textContent = format(counter.n);
        },
      });
    },
    { scope: ref, dependencies: [value] },
  );
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(value)}
    </span>
  );
}

export { ScrollTrigger };

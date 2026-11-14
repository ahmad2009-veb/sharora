"use client";

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/capabilities";
import { loadGsap } from "@/lib/gsap";
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
 * Text that rises out of a mask as it enters the viewport. The animated copy is hidden
 * from screen readers and a visually hidden copy carries the sentence (an aria-label on
 * a <p> / <span> is not valid ARIA). Without JS / with reduced motion the text is simply
 * rendered.
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

  // Layout effect = the hydration commit, before paint: the text is hidden at the same moment
  // the split used to hide it, and the tween is timed from here, so the reveal looks the same
  // even though GSAP itself is fetched lazily (see lib/gsap.ts).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const start = performance.now();
    let cancelled = false;
    let revert: (() => void) | undefined;
    el.style.visibility = "hidden";
    loadGsap()
      .then(({ gsap, SplitText }) => {
        if (cancelled) return;
        // Above-the-fold text runs on the clock started at hydration; scroll reveals keep their
        // delay relative to the trigger. Fixed once, so a re-split (autoSplit) resumes in step.
        const wait = immediate ? Math.max(0, delay - (performance.now() - start) / 1000) : delay;
        const ctx = gsap.context(() => {
          SplitText.create(el, {
            type: split === "chars" ? "words,chars" : "lines",
            mask: split === "chars" ? "words" : "lines",
            aria: "none",
            autoSplit: true,
            onSplit(self) {
              // Chars are inline-blocks, so a word could otherwise break between letters when it
              // is wider than the space left on the line. Lines may only break between words.
              for (const word of self.words) (word as HTMLElement).style.whiteSpace = "nowrap";
              const targets = split === "chars" ? self.chars : self.lines;
              return gsap.from(targets, {
                yPercent: 110,
                opacity: split === "chars" ? 0 : 1,
                duration: split === "chars" ? 0.9 : 1.05,
                ease: "expo.out",
                stagger: stagger ?? (split === "chars" ? 0.028 : 0.09),
                delay: wait,
                scrollTrigger: immediate
                  ? undefined
                  : { trigger: el, start: "top 88%", once: true },
              });
            },
          });
        }, el);
        revert = () => ctx.revert();
        el.style.visibility = "";
      })
      .catch(() => {
        el.style.visibility = ""; // GSAP failed to load: just show the text
      });
    return () => {
      cancelled = true;
      revert?.();
      el.style.visibility = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, like the split it sets up
  }, []);

  return (
    <>
      <Tag ref={ref} id={id} className={className} aria-hidden>
        {children}
      </Tag>
      <Tag className="sr-only">{children}</Tag>
    </>
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
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const start = performance.now();
    let cancelled = false;
    let revert: (() => void) | undefined;
    el.textContent = format(0);
    loadGsap()
      .then(({ gsap }) => {
        if (cancelled) return;
        const ctx = gsap.context(() => {
          const counter = { n: 0 };
          const tween = gsap.to(counter, {
            n: value,
            duration: 1.6,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
            onUpdate: () => {
              el.textContent = format(counter.n);
            },
          });
          // Already in view: it would have started at hydration, so catch up to that clock.
          if (tween.isActive()) tween.time(Math.min(1.6, (performance.now() - start) / 1000));
        }, el);
        revert = () => ctx.revert();
      })
      .catch(() => {
        el.textContent = format(value);
      });
    return () => {
      cancelled = true;
      revert?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `format` is a fresh inline default
  }, [value]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(value)}
    </span>
  );
}

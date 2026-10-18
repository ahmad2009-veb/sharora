"use client";

import { useRouter, usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/capabilities";
import { gsap } from "@/lib/gsap";

type Navigate = (href: string) => void;
const TransitionContext = createContext<Navigate | null>(null);

const COVER = 0.5;
const REVEAL = 0.65;

/**
 * Ink curtain between pages: internal link clicks cover the screen, the route changes
 * underneath, and the curtain lifts once the new pathname renders.
 */
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtain = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  const navigate = useCallback<Navigate>(
    (href) => {
      const el = curtain.current;
      const target = new URL(href, window.location.href);
      const samePage = target.pathname === window.location.pathname;
      if (!el || samePage || prefersReducedMotion()) {
        router.push(href);
        return;
      }
      pending.current = true;
      gsap.killTweensOf(el);
      gsap.set(el, { display: "block", yPercent: 100 });
      gsap.to(el, {
        yPercent: 0,
        duration: COVER,
        ease: "power3.inOut",
        onComplete: () => router.push(href),
      });
    },
    [router],
  );

  // Lift the curtain after the new route is rendered.
  useEffect(() => {
    const el = curtain.current;
    if (!el || !pending.current) return;
    pending.current = false;
    gsap.to(el, {
      yPercent: -100,
      duration: REVEAL,
      delay: 0.1,
      ease: "power3.inOut",
      onComplete: () => gsap.set(el, { display: "none" }),
    });
  }, [pathname]);

  // Intercept same-origin link clicks (next-intl <Link> renders plain anchors).
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element).closest?.("a");
      if (!a || a.target || a.hasAttribute("download") || a.dataset.noTransition !== undefined)
        return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // hash / query on same page
      if (url.pathname.startsWith("/api") || url.pathname.startsWith("/media")) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  return (
    <TransitionContext.Provider value={navigate}>
      {children}
      <div
        ref={curtain}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[95] hidden bg-ink"
      >
        <div className="absolute inset-x-0 top-1/2 mx-auto h-px w-40 -translate-y-1/2 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </TransitionContext.Provider>
  );
}

/** Programmatic navigation with the page curtain (e.g. after the 3D camera fly-to). */
export function useTransitionNavigate(): Navigate {
  const ctx = useContext(TransitionContext);
  const router = useRouter();
  return ctx ?? ((href: string) => router.push(href));
}

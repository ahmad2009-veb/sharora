"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

import { prefersReducedMotion } from "@/lib/capabilities";
import { loadedGsap, loadGsap } from "@/lib/gsap";

type Navigate = (href: string) => void;

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
      const cover = ({ gsap }: Awaited<ReturnType<typeof loadGsap>>) => {
        gsap.killTweensOf(el);
        gsap.set(el, { display: "block", yPercent: 100 });
        gsap.to(el, {
          yPercent: 0,
          duration: COVER,
          ease: "power3.inOut",
          onComplete: () => router.push(href),
        });
      };
      // GSAP is prefetched on idle (below), so this is normally synchronous.
      const loaded = loadedGsap();
      if (loaded) cover(loaded);
      else
        loadGsap()
          .then(cover)
          .catch(() => {
            pending.current = false;
            router.push(href);
          });
    },
    [router],
  );

  // GSAP is not part of the first load; fetch it while the browser is idle so the first
  // link click can cover the screen straight away.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void loadGsap().catch(() => {}));
  }, []);

  // Lift the curtain after the new route is rendered.
  useEffect(() => {
    const el = curtain.current;
    const gsap = loadedGsap()?.gsap;
    if (!el || !gsap || !pending.current) return;
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
    <>
      {children}
      <div
        ref={curtain}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[95] hidden bg-ink"
      >
        <div className="absolute inset-x-0 top-1/2 mx-auto h-px w-40 -translate-y-1/2 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </>
  );
}

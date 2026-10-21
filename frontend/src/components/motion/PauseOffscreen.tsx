"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Marks page sections that are out of view with `data-offscreen`; globals.css pauses their
 * looping CSS animations (hero light, atmosphere grain, beacons), which otherwise keep
 * repainting the whole page while the visitor is reading something else.
 */
export function PauseOffscreen() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.toggleAttribute("data-offscreen", !e.isIntersecting);
        }
      },
      { rootMargin: "200px 0px" },
    );
    const targets = document.querySelectorAll("main section, footer");
    targets.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      targets.forEach((el) => el.removeAttribute("data-offscreen"));
    };
  }, [pathname]);

  return null;
}

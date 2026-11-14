"use client";

/**
 * GSAP is loaded on demand instead of being part of the first page load: nothing it animates
 * needs it before hydration (the hero entrance is CSS), and keeping its ~50 KB (gzip) of
 * core + ScrollTrigger + SplitText out of the initial <script> list lets the page paint and
 * hydrate sooner on phones. Callers hide what they will animate synchronously and start the
 * tween once `loadGsap()` resolves (it is usually already loaded by then).
 */
type GsapModules = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
};

let modules: GsapModules | null = null;
let pending: Promise<GsapModules> | null = null;

export function loadGsap(): Promise<GsapModules> {
  pending ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")])
    .then(([{ gsap }, { ScrollTrigger }, { SplitText }]) => {
      gsap.registerPlugin(ScrollTrigger, SplitText);
      modules = { gsap, ScrollTrigger, SplitText };
      return modules;
    })
    .catch((err: unknown) => {
      pending = null; // allow a retry (e.g. after a flaky connection)
      throw err;
    });
  return pending;
}

/** The modules if they have already been loaded, else null (no download is started). */
export function loadedGsap(): GsapModules | null {
  return modules;
}

import type Lenis from "lenis";

// Module-level handle to the single Lenis instance created by <SmoothScroll />.
let lenis: Lenis | null = null;
let locks = 0;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Freezes smooth scrolling while a dialog is open (ref-counted for nested dialogs). */
export function lockScroll() {
  locks += 1;
  lenis?.stop();
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1);
  if (locks === 0) lenis?.start();
}

/** Client-only feature detection used to decide how much motion / 3D to ship. */

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

/**
 * Whether the device should get the WebGL scenes. Phones, low-memory devices,
 * data-saver users and reduced-motion users get static images instead — this keeps
 * mobile Lighthouse scores high and batteries happy.
 */
export function canRender3D(): boolean {
  if (prefersReducedMotion()) return false;
  if (window.innerWidth < 1024 || !hasFinePointer()) return false;
  const nav = navigator as NavigatorExtras;
  if (nav.connection?.saveData) return false;
  if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4) return false;
  if ((nav.deviceMemory ?? 8) < 4) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

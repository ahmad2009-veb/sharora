"use client";

import { useSyncExternalStore } from "react";

// Same edge as Tailwind's `md` breakpoint: the admin's phone layout lives below it.
const QUERY = "(width < 48rem)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** True on phones, for the few places where CSS alone can't switch the layout. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

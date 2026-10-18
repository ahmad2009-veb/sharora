"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only on the client after hydration — guards portals. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

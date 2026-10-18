"use client";

import { useSyncExternalStore } from "react";

/**
 * The apartment currently open in the unit card, so the «Заявка» sheet can prefill
 * messenger texts with it. Set by UnitModal, read by the mobile tab bar.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setInterestUnit(label: string | null) {
  if (label === current) return;
  current = label;
  listeners.forEach((l) => l());
}

export function useInterestUnit(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}

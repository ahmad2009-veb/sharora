"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

export type ApartmentParams = {
  block: string | null;
  floor: number | null;
  apt: number | null;
  rooms: number | null;
  minArea: number | null;
  maxArea: number | null;
  free: boolean;
};

const KEYS = {
  block: "block",
  floor: "floor",
  apt: "apt",
  rooms: "rooms",
  minArea: "min_area",
  maxArea: "max_area",
  free: "free",
} as const satisfies Record<keyof ApartmentParams, string>;

function toInt(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Selection and filters live in the URL: ?block=1&floor=2&apt=3&rooms=2&min_area=42&free=1 */
export function useApartmentParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo<ApartmentParams>(
    () => ({
      block: searchParams.get(KEYS.block),
      floor: toInt(searchParams.get(KEYS.floor)),
      apt: toInt(searchParams.get(KEYS.apt)),
      rooms: toInt(searchParams.get(KEYS.rooms)),
      minArea: toInt(searchParams.get(KEYS.minArea)),
      maxArea: toInt(searchParams.get(KEYS.maxArea)),
      free: searchParams.get(KEYS.free) === "1",
    }),
    [searchParams],
  );

  const update = useCallback(
    (patch: Partial<ApartmentParams>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch) as [keyof ApartmentParams, unknown][]) {
        const name = KEYS[key];
        if (value === null || value === undefined || value === false || value === "")
          next.delete(name);
        else next.set(name, value === true ? "1" : String(value));
      }
      router.replace(
        { pathname, query: Object.fromEntries(next) } as Parameters<typeof router.replace>[0],
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  return [params, update] as const;
}

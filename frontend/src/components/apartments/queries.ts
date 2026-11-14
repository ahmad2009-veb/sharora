"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { api } from "@/lib/api";

const queryKeys = {
  stats: ["stats"] as const,
  blocks: ["blocks"] as const,
  floors: (letter: string) => ["floors", letter] as const,
  floor: (id: number) => ["floor", id] as const,
  unit: (id: number) => ["unit", id] as const,
  settings: ["settings"] as const,
};

export const useStats = () =>
  useQuery({ queryKey: queryKeys.stats, queryFn: api.stats, staleTime: 30_000 });
export const useBlocks = () => useQuery({ queryKey: queryKeys.blocks, queryFn: api.blocks });
export const useSettings = () => useQuery({ queryKey: queryKeys.settings, queryFn: api.settings });

export const useFloors = (letter: string | null) =>
  useQuery({
    queryKey: queryKeys.floors(letter ?? ""),
    queryFn: () => api.floors(letter!),
    enabled: !!letter,
  });

/**
 * Deep links (?block=…): starts the block's floors request alongside /api/blocks instead
 * of after it. Same key and fetcher as useFloors, so that hook just picks the result up.
 * Only while the blocks list is still loading; afterwards useFloors does the work.
 */
export function usePrefetchFloors(letter: string | null, blocksLoaded: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!letter || blocksLoaded) return;
    void client.prefetchQuery({
      queryKey: queryKeys.floors(letter),
      queryFn: () => api.floors(letter),
    });
  }, [client, letter, blocksLoaded]);
}

export const useFloorUnits = (floorId: number | null) =>
  useQuery({
    queryKey: queryKeys.floor(floorId ?? 0),
    queryFn: () => api.floorUnits(floorId!),
    enabled: floorId !== null,
  });

export const useUnit = (unitId: number | null) =>
  useQuery({
    queryKey: queryKeys.unit(unitId ?? 0),
    queryFn: () => api.unit(unitId!),
    enabled: unitId !== null,
  });

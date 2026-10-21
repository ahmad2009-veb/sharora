"use client";

import { useQuery } from "@tanstack/react-query";

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

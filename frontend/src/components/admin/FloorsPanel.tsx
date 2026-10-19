"use client";

import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

import { FloorPlanEditor } from "./FloorPlanEditor";

const pill =
  "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors";

/** «Этажи и схемы»: pick a block and floor, upload its plan and outline every unit on it. */
export function FloorsPanel() {
  const [pickedBlock, setBlock] = useState<string | null>(null);
  const [pickedFloor, setFloor] = useState<number | null>(null);

  const blocks = useQuery({ queryKey: ["blocks"], queryFn: api.blocks });
  const block = pickedBlock ?? blocks.data?.[0]?.letter ?? "";
  const floors = useQuery({
    queryKey: ["floors", block],
    queryFn: () => api.floors(block),
    enabled: !!block,
  });
  const floor =
    floors.data?.find((f) => f.number === pickedFloor) ??
    floors.data?.find((f) => f.kind === "residential") ??
    floors.data?.[0];

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-card bg-white p-4 shadow-soft md:p-5">
        <div role="group" aria-label="Блок" className="flex flex-wrap gap-1.5">
          {blocks.data?.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={b.letter === block}
              onClick={() => setBlock(b.letter)}
              className={cn(
                pill,
                b.letter === block ? "bg-ink text-gold" : "bg-sand text-ink hover:bg-sand-deep",
              )}
            >
              Блок {b.letter}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Этаж" className="flex flex-wrap gap-1.5">
          {floors.isPending
            ? Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))
            : floors.data?.map((f) => {
                const active = f.id === floor?.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFloor(f.number)}
                    className={cn(
                      pill,
                      active ? "bg-ink text-gold" : "bg-sand text-ink hover:bg-sand-deep",
                    )}
                  >
                    {f.kind === "commercial" && <Store className="size-3.5" aria-hidden />}
                    Этаж {f.number}
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        active ? "text-mist" : "text-muted",
                      )}
                    >
                      {f.total_count} пом.
                    </span>
                  </button>
                );
              })}
        </div>
        <p className="text-sm text-muted">
          Схема и контуры хранятся для каждого этажа отдельно. Добавить или удалить квартиру на
          этаже можно во вкладке «Фонд квартир» (выберите этаж в фильтре).
        </p>
      </div>

      {floor && <FloorPlanEditor key={floor.id} floorId={floor.id} />}
    </div>
  );
}

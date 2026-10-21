"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser, Loader2, Monitor, MousePointerClick, Save, Undo2 } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { statusVars } from "@/components/ui/status";
import { StatusLegend } from "@/components/ui/StatusLegend";
import { ZoomControls } from "@/components/ui/ZoomControls";
import { useToast } from "@/components/ui/Toast";
import { adminApi, api, ApiError, mediaUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { PolygonPoint } from "@/lib/types";

import { ImageUpload } from "./ImageUpload";

const round = (n: number) => Math.round(n * 100) / 100;

/** Upload a floor plan and draw each unit's polygon by clicking its corners on the plan. */
export function FloorPlanEditor({ floorId }: { floorId: number }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const floor = useQuery({ queryKey: ["floor", floorId], queryFn: () => api.floorUnits(floorId) });
  const [unitId, setUnitId] = useState<number | null>(null);
  const [points, setPoints] = useState<PolygonPoint[]>([]);
  const imgRef = useRef<HTMLDivElement>(null);

  const savePlan = useMutation({
    mutationFn: (url: string) => adminApi.updateFloor(floorId, { plan_image: url }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast("Схема этажа обновлена", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка", "error"),
  });

  const savePolygon = useMutation({
    mutationFn: () => adminApi.updateUnit(unitId!, { polygon: points.length >= 3 ? points : null }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast("Контур квартиры сохранён", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка", "error"),
  });

  if (floor.isPending) return <Skeleton className="aspect-[16/10] w-full rounded-card" />;
  if (!floor.data) return null;

  const units = floor.data.units;
  const plan = mediaUrl(floor.data.plan_image);

  function selectUnit(id: number) {
    setUnitId(id);
    setPoints(units.find((u) => u.id === id)?.polygon ?? []);
  }

  function addPoint(e: MouseEvent<HTMLDivElement>) {
    if (unitId === null || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = round(((e.clientX - rect.left) / rect.width) * 100);
    const y = round(((e.clientY - rect.top) / rect.height) * 100);
    setPoints((p) => [
      ...p,
      { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) },
    ]);
  }

  return (
    <section
      aria-labelledby="plan-editor"
      className="rounded-card bg-white p-5 shadow-soft max-md:rounded-[20px] max-md:p-4 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 max-md:gap-4">
        <div>
          <h2 id="plan-editor" className="font-display text-lg font-bold">
            Схема этажа · {floor.data.label}
            {floor.data.kind === "commercial" && " · Магазин"}
          </h2>
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-sand px-3 py-2.5 text-sm text-muted md:hidden">
            <Monitor className="mt-0.5 size-4 shrink-0" aria-hidden />
            Редактирование схемы доступно на компьютере
          </p>
          <p className="mt-1 max-w-xl text-sm text-muted max-md:hidden">
            Загрузите план этажа (JPG, PNG или WEBP), выберите помещение и кликайте по углам его
            контура. Координаты сохраняются в процентах, поэтому подходят для любого размера
            изображения.
          </p>
        </div>
        <ImageUpload
          label="Изображение схемы"
          subdir="floors"
          value={floor.data.plan_image}
          onUploaded={(url) => savePlan.mutate(url)}
        />
      </div>

      <div
        className="mt-5 flex flex-wrap gap-2 max-md:hidden"
        role="group"
        aria-label="Квартира для разметки"
      >
        {units.map((u) => (
          <button
            key={u.id}
            type="button"
            aria-pressed={unitId === u.id}
            onClick={() => selectUnit(u.id)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
              unitId === u.id ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40",
              !u.polygon?.length && unitId !== u.id && "border-dashed text-muted",
            )}
          >
            {u.name}
          </button>
        ))}
      </div>

      <StatusLegend
        className="mt-5"
        title="Обозначения"
        labels={{ sold: "Продано", free: "Свободно", reserved: "Забронировано" }}
      />

      {/* Phones: view only, fit to width with pinch-zoom. */}
      {plan && (
        <div className="relative mt-3 overflow-hidden rounded-control border border-line md:hidden">
          <TransformWrapper minScale={1} maxScale={5} doubleClick={{ mode: "zoomIn" }}>
            <div className="absolute right-2 bottom-2 z-10">
              <ZoomControls
                className="[&_button]:h-11 [&_button]:min-w-11"
                labels={{ zoomIn: "Приблизить", zoomOut: "Отдалить", reset: "Сбросить" }}
              />
            </div>
            <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element -- polygons are drawn in % of the rendered image */}
                <img
                  src={plan}
                  alt={`Схема: ${floor.data.label}`}
                  className="block h-auto w-full select-none"
                  draggable={false}
                />
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  {units
                    .filter((u) => u.polygon?.length)
                    .map((u) => (
                      <polygon
                        key={u.id}
                        points={u.polygon!.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill={statusVars[u.status].fill}
                        fillOpacity={0.6}
                        stroke={statusVars[u.status].line}
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                </svg>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>
      )}

      {plan ? (
        <div className="mt-3 overflow-hidden rounded-control border border-line max-md:hidden">
          <div
            ref={imgRef}
            onClick={addPoint}
            className={cn("relative", unitId !== null ? "cursor-crosshair" : "cursor-default")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- coordinates are measured against the rendered image */}
            <img
              src={plan}
              alt={`Схема: ${floor.data.label}`}
              className="block h-auto w-full select-none"
              draggable={false}
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {units
                .filter((u) => u.id !== unitId && u.polygon?.length)
                .map((u) => (
                  <polygon
                    key={u.id}
                    points={u.polygon!.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill={statusVars[u.status].fill}
                    fillOpacity={0.6}
                    stroke={statusVars[u.status].line}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              {points.length > 0 && (
                <polygon
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="var(--color-gold)"
                  fillOpacity={0.35}
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {points.map((p, i) => (
              <span
                key={i}
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-control bg-sand p-6 text-center text-sm text-muted">
          Сначала загрузите изображение схемы.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 max-md:hidden">
        {unitId === null ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <MousePointerClick className="size-4" aria-hidden />
            Выберите квартиру, чтобы начать разметку
          </p>
        ) : (
          <>
            <span className="mr-2 text-sm text-muted tabular-nums">Точек: {points.length}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPoints((p) => p.slice(0, -1))}
              disabled={!points.length}
            >
              <Undo2 className="size-4" aria-hidden />
              Отменить точку
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPoints([])}
              disabled={!points.length}
            >
              <Eraser className="size-4" aria-hidden />
              Очистить
            </Button>
            <Button
              size="sm"
              onClick={() => savePolygon.mutate()}
              disabled={savePolygon.isPending || (points.length > 0 && points.length < 3)}
            >
              {savePolygon.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Save className="size-4" aria-hidden />
              )}
              Сохранить контур
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

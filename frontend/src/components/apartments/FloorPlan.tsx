"use client";

import { Compass, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { statusVars } from "@/components/ui/status";
import { StatusLegend } from "@/components/ui/StatusLegend";
import { ZoomControls } from "@/components/ui/ZoomControls";
import { mediaUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatArea } from "@/lib/format";
import type { UnitListItem } from "@/lib/types";

type Props = {
  planImage: string | null;
  floorLabel: string;
  units: UnitListItem[];
  matches: (unit: UnitListItem) => boolean;
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (unit: UnitListItem) => void;
};

export function FloorPlan({
  planImage,
  floorLabel,
  units,
  matches,
  hoveredId,
  onHover,
  onSelect,
}: Props) {
  const t = useTranslations("apartments");
  const ts = useTranslations("status");
  const [fullscreen, setFullscreen] = useState(false);
  const src = mediaUrl(planImage);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  if (!src) {
    return (
      <div className="flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-white text-muted">
        <ImageOff className="size-8" aria-hidden />
        {t("noPlan")}
      </div>
    );
  }

  return (
    <figure
      className={cn(
        "relative overflow-hidden bg-white",
        fullscreen ? "fixed inset-0 z-50 flex flex-col" : "rounded-panel shadow-lift",
      )}
      aria-label={`${t("floorPlan")}: ${floorLabel}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
        <div>
          <p className="flex items-center gap-2.5 font-display text-lg font-extrabold md:text-xl">
            <Compass className="size-5 text-gold-deep" aria-hidden />
            {t("floorPlan")} · {floorLabel}
          </p>
          <p className="mt-0.5 text-sm text-muted">{t("planHint")}</p>
        </div>
        <StatusLegend
          title={t("legend")}
          labels={{ sold: ts("sold"), free: ts("free"), reserved: ts("reserved") }}
          className="rounded-full bg-sand px-4 py-2"
        />
      </div>
      <TransformWrapper
        minScale={1}
        maxScale={4}
        doubleClick={{ mode: "zoomIn" }}
        wheel={{ step: 0.15 }}
      >
        <div className="absolute right-4 bottom-4 z-10">
          <ZoomControls
            isFullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((v) => !v)}
            labels={{
              zoomIn: t("zoomIn"),
              zoomOut: t("zoomOut"),
              reset: t("zoomReset"),
              fullscreen: t("fullscreen"),
              exitFullscreen: t("exitFullscreen"),
            }}
          />
        </div>
        <TransformComponent
          wrapperClass={cn("!w-full bg-[#f7f6f2]", fullscreen && "!h-full flex-1")}
          contentClass={cn("!w-full", fullscreen && "!h-full items-center justify-center")}
        >
          <div
            className={cn(
              "relative w-full",
              fullscreen && "mx-auto max-h-full max-w-[min(100%,160vh)]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- plan must keep its intrinsic aspect so % polygons line up */}
            <img src={src} alt="" className="block h-auto w-full select-none" draggable={false} />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              role="group"
              aria-label={t("floorPlan")}
            >
              {units.map((u) => {
                if (!u.polygon?.length) return null;
                const match = matches(u);
                const hovered = hoveredId === u.id;
                const label = `${u.name}, ${formatArea(u.area)}, ${ts(u.status)}`;
                const colors = statusVars[u.status];
                return (
                  <polygon
                    key={u.id}
                    points={u.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                    role="button"
                    tabIndex={match ? 0 : -1}
                    aria-label={label}
                    aria-disabled={!match}
                    onMouseEnter={() => onHover(u.id)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(u.id)}
                    onBlur={() => onHover(null)}
                    onClick={() => match && onSelect(u)}
                    onKeyDown={(e) => {
                      if (match && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        onSelect(u);
                      }
                    }}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      fill: colors.fill,
                      // Pale fill stays translucent so the plan drawing remains readable.
                      fillOpacity: !match ? 0.15 : hovered ? 0.9 : 0.55,
                      stroke: colors.line,
                      strokeOpacity: match ? 1 : 0.35,
                      strokeWidth: hovered ? 3.5 : 2,
                      cursor: match ? "pointer" : "default",
                      transition: "fill-opacity .2s, stroke-width .2s",
                      outline: "none",
                    }}
                  >
                    <title>{label}</title>
                  </polygon>
                );
              })}
            </svg>
          </div>
        </TransformComponent>
      </TransformWrapper>
    </figure>
  );
}

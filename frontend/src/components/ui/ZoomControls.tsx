"use client";

import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { useControls, useTransformEffect } from "react-zoom-pan-pinch";

import { cn } from "@/lib/cn";

import { Tooltip } from "./Tooltip";

type Labels = {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  actualSize?: string;
  fullscreen?: string;
  exitFullscreen?: string;
};

/** Floating zoom toolbar for react-zoom-pan-pinch; must render inside a TransformWrapper. */
export function ZoomControls({
  labels,
  tone = "light",
  isFullscreen,
  onToggleFullscreen,
  className,
}: {
  labels: Labels;
  tone?: "light" | "dark";
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}) {
  const { zoomIn, zoomOut, resetTransform, centerView } = useControls();
  const [scale, setScale] = useState(1);
  useTransformEffect(({ state }) => setScale(state.scale));
  const btn = cn(
    "grid size-10 place-items-center rounded-full transition-colors",
    tone === "dark" ? "text-white hover:bg-white/15" : "text-ink hover:bg-sand",
  );
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full p-1 shadow-soft",
        tone === "dark" ? "bg-ink/70 backdrop-blur" : "bg-white",
        className,
      )}
    >
      <Tooltip label={labels.zoomOut}>
        <button type="button" className={btn} onClick={() => zoomOut()} aria-label={labels.zoomOut}>
          <ZoomOut className="size-[18px]" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label={labels.zoomIn}>
        <button type="button" className={btn} onClick={() => zoomIn()} aria-label={labels.zoomIn}>
          <ZoomIn className="size-[18px]" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip label={labels.actualSize ?? "100%"}>
        <button
          type="button"
          onClick={() => centerView(1)}
          aria-label={labels.actualSize ?? "100%"}
          className={cn(
            "h-10 min-w-14 rounded-full px-2 text-xs font-semibold tabular-nums transition-colors",
            tone === "dark" ? "text-white hover:bg-white/15" : "text-ink hover:bg-sand",
          )}
        >
          {Math.round(scale * 100)}%
        </button>
      </Tooltip>
      <Tooltip label={labels.reset}>
        <button
          type="button"
          className={btn}
          onClick={() => resetTransform()}
          aria-label={labels.reset}
        >
          <RotateCcw className="size-[18px]" aria-hidden />
        </button>
      </Tooltip>
      {onToggleFullscreen && labels.fullscreen && (
        <Tooltip label={isFullscreen ? labels.exitFullscreen! : labels.fullscreen}>
          <button
            type="button"
            className={btn}
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? labels.exitFullscreen : labels.fullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="size-[18px]" aria-hidden />
            ) : (
              <Maximize2 className="size-[18px]" aria-hidden />
            )}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

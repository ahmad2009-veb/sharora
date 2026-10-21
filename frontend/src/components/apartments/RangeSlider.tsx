"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

type Props = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  format?: (v: number) => string;
};

/** Dual-thumb range built from two native inputs — keyboard and screen-reader friendly. */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  format = String,
}: Props) {
  const tc = useTranslations("common");
  const id = useId();
  const [lo, hi] = value;
  const span = max - min || 1;
  const left = ((lo - min) / span) * 100;
  const right = 100 - ((hi - min) / span) * 100;
  const thumb =
    "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-gold [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-soft";

  return (
    <div role="group" aria-labelledby={id} className="min-w-[200px]">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={id} className="eyebrow text-muted">
          {label}
        </span>
        <span className="font-semibold text-ink tabular-nums">
          {format(lo)} – {format(hi)}
        </span>
      </div>
      <div className="relative mt-3 h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={tc("rangeFrom", { label })}
          aria-valuetext={format(lo)}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className={thumb}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={tc("rangeTo", { label })}
          aria-valuetext={format(hi)}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className={thumb}
        />
      </div>
    </div>
  );
}

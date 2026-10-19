"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Chip } from "@/components/ui/Chip";

import { RangeSlider } from "./RangeSlider";

type Props = {
  rooms: number | null;
  onRooms: (rooms: number | null) => void;
  area: [number, number];
  areaBounds: [number, number];
  onArea: (area: [number, number]) => void;
  onlyFree: boolean;
  onOnlyFree: (value: boolean) => void;
  onReset: () => void;
  active: boolean;
};

export function Filters({
  rooms,
  onRooms,
  area,
  areaBounds,
  onArea,
  onlyFree,
  onOnlyFree,
  onReset,
  active,
}: Props) {
  const t = useTranslations("apartments");

  return (
    <section
      aria-label={t("filters")}
      className="flex flex-col gap-5 rounded-card bg-white p-4 shadow-soft md:flex-row md:flex-wrap md:items-center md:gap-8 md:px-6 md:py-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="eyebrow text-muted">{t("rooms")}</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={rooms === null} onClick={() => onRooms(null)}>
            {t("roomsAny")}
          </Chip>
          {[1, 2, 3, 4].map((n) => (
            <Chip key={n} active={rooms === n} onClick={() => onRooms(rooms === n ? null : n)}>
              {t("roomsShort", { count: n })}
            </Chip>
          ))}
        </div>
      </div>

      <div className="md:w-64">
        <RangeSlider
          label={t("area")}
          min={areaBounds[0]}
          max={areaBounds[1]}
          value={area}
          onChange={onArea}
          format={(v) => `${v} м²`}
        />
      </div>

      <label className="flex h-10 cursor-pointer items-center gap-3 rounded-full bg-sand px-4 text-sm font-semibold select-none">
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={onlyFree}
            onChange={(e) => onOnlyFree(e.target.checked)}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
          <span className="absolute top-1 left-1 size-4 rounded-full bg-white shadow-soft transition-transform peer-checked:translate-x-5 peer-checked:bg-gold" />
        </span>
        {t("onlyFree")}
      </label>

      {active && (
        <button
          type="button"
          onClick={onReset}
          className="flex h-10 items-center gap-2 self-start text-sm font-medium text-muted transition-colors hover:text-ink md:ml-auto md:self-auto"
        >
          <RotateCcw className="size-4" aria-hidden />
          {t("resetFilters")}
        </button>
      )}
    </section>
  );
}

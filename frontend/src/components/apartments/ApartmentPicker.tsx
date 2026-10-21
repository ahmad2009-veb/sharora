"use client";

import { m } from "framer-motion";
import { Headset, Layers, SearchX } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { UnitListItem } from "@/lib/types";
import { useUnitName } from "@/lib/unit-names";

import { ApartmentsHeader } from "./ApartmentsHeader";
import { BlockSelector } from "./BlockSelector";
import { CalculatorModal } from "./CalculatorModal";
import { CallbackModal } from "./CallbackModal";
import { ErrorState } from "./ErrorState";
import { Filters } from "./Filters";
import { FloorList } from "./FloorList";
import { FloorPicker } from "./FloorPicker";
import { FloorPlan } from "./FloorPlan";
import { unitTotal } from "./price";
import { useBlocks, useFloors, useFloorUnits } from "./queries";
import { UnitCard } from "./UnitCard";
import { UnitModal } from "./UnitModal";
import { useApartmentParams } from "./useApartmentParams";

type Sort = "number" | "areaAsc" | "areaDesc" | "price";

const PHONE = "(width < 48rem)";
/** A swipe: mostly sideways and long enough not to be a tap or a scroll. */
const SWIPE_MIN = 56;

export function ApartmentPicker() {
  const t = useTranslations("apartments");
  const unitName = useUnitName();
  const [params, update] = useApartmentParams();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("number");
  // Phones: which way the floor content slides in (0 = no animation, e.g. desktop).
  const [slideDir, setSlideDir] = useState<-1 | 0 | 1>(0);
  const touch = useRef<{ x: number; y: number; multi: boolean } | null>(null);
  const searchParams = useSearchParams();

  // Deep link from the mobile «Ещё» menu: /apartments?calc=1 opens the calculator.
  useEffect(() => {
    if (searchParams.get("calc") !== "1") return;
    setCalcOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("calc");
    window.history.replaceState(null, "", url);
  }, [searchParams]);

  const blocks = useBlocks();
  const blockLetter =
    blocks.data?.find((b) => b.letter === params.block)?.letter ??
    blocks.data?.find((b) => b.free_count > 0)?.letter ??
    blocks.data?.[0]?.letter ??
    null;

  const floors = useFloors(blockLetter);
  const floor =
    floors.data?.find((f) => f.number === params.floor) ??
    floors.data?.find((f) => f.kind === "residential" && f.free_count > 0) ??
    floors.data?.[0] ??
    null;

  const blockName = blockLetter ? t("blockN", { n: blockLetter }) : "";
  const floorName = floor
    ? floor.kind === "commercial"
      ? `${t("floorN", { n: floor.number })} · ${t("shop")}`
      : t("floorN", { n: floor.number })
    : "";

  const floorUnits = useFloorUnits(floor?.id ?? null);
  const units = useMemo(() => floorUnits.data?.units ?? [], [floorUnits.data]);

  // Area slider bounds follow the current floor.
  const areaBounds = useMemo<[number, number]>(() => {
    if (!units.length) return [42, 103];
    const areas = units.map((u) => u.area);
    const lo = Math.floor(Math.min(...areas));
    const hi = Math.ceil(Math.max(...areas));
    return lo === hi ? [lo - 1, hi + 1] : [lo, hi];
  }, [units]);
  const area: [number, number] = [
    Math.max(areaBounds[0], Math.min(params.minArea ?? areaBounds[0], areaBounds[1])),
    Math.min(areaBounds[1], Math.max(params.maxArea ?? areaBounds[1], areaBounds[0])),
  ];
  const filtersActive =
    params.rooms !== null || params.minArea !== null || params.maxArea !== null || params.free;

  const matches = (u: UnitListItem) =>
    (!params.free || u.status === "free") &&
    (params.rooms === null || u.kind === "commercial" || u.rooms === params.rooms) &&
    u.area >= area[0] &&
    u.area <= area[1];
  const visible = units.filter(matches).sort((a, b) => {
    if (sort === "areaAsc") return a.area - b.area;
    if (sort === "areaDesc") return b.area - a.area;
    if (sort === "price")
      return (
        (unitTotal(a) ?? Number.POSITIVE_INFINITY) - (unitTotal(b) ?? Number.POSITIVE_INFINITY)
      );
    return a.number - b.number;
  });
  const counts = {
    free: units.filter((u) => u.status === "free").length,
    reserved: units.filter((u) => u.status === "reserved").length,
    sold: units.filter((u) => u.status === "sold").length,
  };

  const selectedUnit = units.find((u) => u.number === params.apt) ?? null;
  const resetFilters = () => update({ rooms: null, minArea: null, maxArea: null, free: false });
  const select = (u: UnitListItem) =>
    update({ block: blockLetter, floor: floor?.number, apt: u.number });

  const goFloor = (n: number, dir: -1 | 1) => {
    setSlideDir(dir);
    update({ block: blockLetter, floor: n, apt: null });
  };
  const stepFloor = (dir: -1 | 1) => {
    const ordered = [...(floors.data ?? [])].sort((a, b) => a.number - b.number);
    const next = ordered[ordered.findIndex((f) => f.id === floor?.id) + dir];
    if (next) goFloor(next.number, dir);
  };

  // Phones: swiping the cards / plan area sideways changes the floor (left = up).
  function onTouchStart(e: TouchEvent) {
    const p = e.touches[0];
    const zoomed = (e.target as Element).closest(".react-transform-component");
    const scaled =
      zoomed && !/^(none|matrix\(1, 0, 0, 1,)/.test(getComputedStyle(zoomed).transform);
    touch.current =
      window.matchMedia(PHONE).matches && !scaled
        ? { x: p.clientX, y: p.clientY, multi: e.touches.length > 1 }
        : null;
  }
  function onTouchMove(e: TouchEvent) {
    if (touch.current && e.touches.length > 1) touch.current.multi = true;
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || start.multi) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.6) stepFloor(dx < 0 ? 1 : -1);
  }

  return (
    <>
      <ApartmentsHeader
        selection={blockLetter && floor ? `${blockName} · ${floorName}` : undefined}
        onCalculator={() => setCalcOpen(true)}
        blockSelector={
          !blocks.isError && (
            <BlockSelector
              blocks={blocks.data}
              loading={blocks.isPending}
              value={blockLetter}
              onChange={(letter) => {
                setSlideDir(0);
                update({ block: letter, floor: null, apt: null });
              }}
            />
          )
        }
      />

      <div className="bg-sand">
        <div className="container-page py-8 md:py-10">
          {blocks.isError ? (
            <ErrorState onRetry={() => blocks.refetch()} />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[272px_minmax(0,1fr)]">
              <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
                {floors.isError ? (
                  <ErrorState onRetry={() => floors.refetch()} />
                ) : (
                  <>
                    <FloorPicker
                      floors={floors.data}
                      loading={floors.isPending}
                      value={floor?.number ?? null}
                      onChange={goFloor}
                    />
                    <div className="max-md:hidden">
                      <FloorList
                        floors={floors.data}
                        loading={floors.isPending}
                        value={floor?.number ?? null}
                        onChange={(n) => {
                          setSlideDir(0);
                          update({ block: blockLetter, floor: n, apt: null });
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="hidden overflow-hidden rounded-card bg-white p-4 shadow-soft lg:block">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-muted">{blockName}</span>
                    <Layers className="size-4 text-gold-deep" aria-hidden />
                  </div>
                  <div className="relative mt-3 h-52 overflow-hidden rounded-2xl bg-ink">
                    <Image
                      src="/renders/tower.jpg"
                      alt=""
                      fill
                      sizes="240px"
                      className="object-cover opacity-90"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent"
                    />
                    {floor && (
                      <span className="absolute right-2 bottom-2 left-2 rounded-xl px-3 py-2 text-[11px] font-bold tracking-wider text-gold uppercase glass-dark">
                        {t("selectedFloor")}: {floorName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden rounded-card bg-ink p-5 text-white shadow-soft lg:block">
                  <p className="flex items-center gap-2 font-display font-extrabold">
                    <Headset className="size-5 text-gold" aria-hidden />
                    {t("brokerTitle")}
                  </p>
                  <p className="mt-2 text-sm text-mist">{t("brokerText")}</p>
                  <Button className="mt-4 w-full" size="sm" onClick={() => setCallbackOpen(true)}>
                    {t("brokerCta")}
                  </Button>
                </div>
              </aside>

              <section aria-labelledby="units-title" className="min-w-0 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2
                      id="units-title"
                      className="font-display text-2xl font-extrabold tracking-tight md:text-3xl"
                    >
                      {!floor
                        ? t("stepUnit")
                        : floor.kind === "commercial"
                          ? `${t("commercial")} · ${floorName}`
                          : t("unitsOn", { floor: floorName })}
                    </h2>
                    {units.length > 0 && (
                      <p className="mt-1 text-[15px] text-muted">{t("floorSummary", counts)}</p>
                    )}
                  </div>
                  <label className="flex items-center gap-3 self-start md:self-auto">
                    <span className="eyebrow text-muted">{t("sort")}</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as Sort)}
                      className="h-10 cursor-pointer rounded-full bg-white px-4 text-sm font-semibold shadow-soft ring-1 ring-ink/[0.06] focus:ring-2 focus:ring-gold focus:outline-none"
                    >
                      <option value="number">{t("sortNumber")}</option>
                      <option value="areaAsc">{t("sortAreaAsc")}</option>
                      <option value="areaDesc">{t("sortAreaDesc")}</option>
                      <option value="price">{t("sortPrice")}</option>
                    </select>
                  </label>
                </div>

                {floor?.kind !== "commercial" && (
                  <Filters
                    rooms={params.rooms}
                    onRooms={(rooms) => update({ rooms })}
                    area={area}
                    areaBounds={areaBounds}
                    onArea={([lo, hi]) =>
                      update({
                        minArea: lo === areaBounds[0] ? null : lo,
                        maxArea: hi === areaBounds[1] ? null : hi,
                      })
                    }
                    onlyFree={params.free}
                    onOnlyFree={(free) => update({ free })}
                    onReset={resetFilters}
                    active={filtersActive}
                  />
                )}

                <m.div
                  // Desktop (no slide) keeps one instance, as before; phones remount per floor.
                  key={slideDir ? (floor?.id ?? "none") : "static"}
                  initial={slideDir ? { x: slideDir * 56, opacity: 0 } : false}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  // Phones: horizontal swipes here belong to the page (floor change), not to the
                  // browser's swipe-back navigation; vertical scroll and pinch stay native.
                  className="space-y-6 max-md:[touch-action:pan-y_pinch-zoom]"
                >
                  {floorUnits.isError ? (
                    <ErrorState onRetry={() => floorUnits.refetch()} />
                  ) : floorUnits.isPending || !floorUnits.data ? (
                    <div aria-busy="true" className="space-y-6">
                      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
                        {Array.from({ length: 7 }, (_, i) => (
                          <Skeleton key={i} className="h-[360px] rounded-card" />
                        ))}
                      </div>
                      <Skeleton className="aspect-[16/10] w-full rounded-card" />
                    </div>
                  ) : (
                    <>
                      {visible.length === 0 ? (
                        <div className="flex flex-col items-center rounded-card bg-white px-6 py-14 text-center shadow-soft">
                          <span className="grid size-14 place-items-center rounded-full bg-sand text-muted">
                            <SearchX className="size-7" aria-hidden />
                          </span>
                          <p className="mt-5 font-display text-xl font-extrabold">
                            {t("emptyTitle")}
                          </p>
                          <p className="mt-1 text-[15px] text-muted">{t("emptyText")}</p>
                          <Button variant="secondary" className="mt-6" onClick={resetFilters}>
                            {t("resetFilters")}
                          </Button>
                        </div>
                      ) : (
                        <ul className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
                          {visible.map((u) => (
                            <li key={u.id}>
                              <UnitCard
                                unit={u}
                                blockName={blockName}
                                hovered={hoveredId === u.id}
                                onHover={setHoveredId}
                                onSelect={select}
                              />
                            </li>
                          ))}
                        </ul>
                      )}

                      <FloorPlan
                        planImage={floorUnits.data.plan_image}
                        floorLabel={`${blockName} · ${floorName}`}
                        units={units}
                        matches={matches}
                        hoveredId={hoveredId}
                        onHover={setHoveredId}
                        onSelect={select}
                      />
                    </>
                  )}
                </m.div>
              </section>
            </div>
          )}
        </div>
      </div>

      <UnitModal
        unitId={selectedUnit?.id ?? null}
        onClose={() => update({ apt: null })}
        onCalculator={() => setCalcOpen(true)}
      />
      <CalculatorModal
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        initialArea={selectedUnit?.area}
        initialPrice={selectedUnit?.price_per_m2}
        unitId={selectedUnit?.id ?? null}
        unitLabel={
          selectedUnit && floor
            ? `${blockName} · ${t("floorN", { n: floor.number })} · ${unitName(selectedUnit.name)}`
            : null
        }
      />
      <CallbackModal open={callbackOpen} onClose={() => setCallbackOpen(false)} />
    </>
  );
}

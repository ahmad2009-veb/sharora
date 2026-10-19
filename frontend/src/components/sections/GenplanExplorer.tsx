"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Box } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { site, tr } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { api } from "@/lib/api";
import { canRender3D } from "@/lib/capabilities";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

/**
 * Block picker for the two blocks. Capable desktops get the interactive 3D model (click a
 * block); phones and devices without WebGL get the render with two block buttons. The side
 * panel shows live availability from the API (the page itself stays static — data loads
 * client-side and the panel degrades gracefully if the API is down).
 */
export function GenplanExplorer() {
  const locale = useLocale() as Locale;
  const t = useTranslations("home");
  const ta = useTranslations("apartments");
  const g = site.genplan;
  const blockWord = tr(g.blockLabel, locale);

  const [selected, setSelected] = useState<string>(g.blocks[0].letter);
  const [can3D, setCan3D] = useState(false);
  const [ready3D, setReady3D] = useState(false);
  const [inView, setInView] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCan3D(canRender3D()), []);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "200px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const blocks = useQuery({
    queryKey: ["blocks"],
    queryFn: api.blocks,
    enabled: inView,
    retry: 1,
    staleTime: 60_000,
  });
  const floors = useQuery({
    queryKey: ["floors", selected],
    queryFn: () => api.floors(selected),
    enabled: inView,
    retry: 0,
    staleTime: 60_000,
  });
  const units = useQuery({
    queryKey: ["block-units", selected],
    queryFn: () => api.blockUnits(selected),
    enabled: inView,
    retry: 0,
    staleTime: 60_000,
  });

  const block = blocks.data?.find((b) => b.letter === selected);
  const stats = useMemo(() => {
    const list = units.data;
    if (!list?.length) return null;
    const homes = list.filter((u) => u.kind === "apartment");
    const areas = (homes.length ? homes : list).map((u) => u.area);
    const prices = list
      .filter((u) => u.status === "free" && u.price_per_m2)
      .map((u) => u.area * u.price_per_m2!);
    return {
      minArea: Math.floor(Math.min(...areas)),
      maxArea: Math.ceil(Math.max(...areas)),
      minPrice: prices.length ? Math.min(...prices) : null,
      sold: list.filter((u) => u.status !== "free").length,
      total: list.length,
    };
  }, [units.data]);
  const floorCount = floors.data?.length;
  const freeOf = (letter: string) => blocks.data?.find((b) => b.letter === letter)?.free_count;
  const soldPct = stats ? Math.round((stats.sold / stats.total) * 100) : null;
  const soldOut = block ? block.free_count === 0 : false;

  const tooltip = (letter: string) => {
    const free = freeOf(letter);
    return free === undefined
      ? t("blockTooltipNoData", { block: `${blockWord} ${letter}` })
      : t("blockTooltip", { block: `${blockWord} ${letter}`, count: free });
  };

  return (
    <div className="mt-10 grid gap-6 md:mt-14 lg:grid-cols-12 lg:gap-8">
      {/* Canvas */}
      <div className="lg:col-span-8">
        <div
          ref={canvasRef}
          className="relative aspect-[4/3] overflow-hidden rounded-panel bg-night shadow-deep ring-1 ring-white/[0.06] md:aspect-[1208/695]"
        >
          {can3D ? (
            <>
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_100%,#5b3f2a_0%,#2a2c40_45%,#0a0f1c_80%)]"
              />
              <HeroScene
                active={inView}
                introDelay={0}
                sceneLabel={t("sceneLabel")}
                tooltip={tooltip}
                onBlockSelect={setSelected}
                onReady={() => setReady3D(true)}
              />
              {!ready3D && (
                <div
                  role="status"
                  className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_60%,#2a2c40,#0a0f1c)] text-sm text-mist"
                >
                  <span className="flex items-center gap-3">
                    <span className="relative h-px w-16 overflow-hidden bg-white/20">
                      <span className="absolute inset-y-0 left-0 w-1/2 animate-[loader_1.1s_ease-in-out_infinite] bg-gold" />
                    </span>
                    {t("loading3d")}
                  </span>
                </div>
              )}
              <div className="pointer-events-none absolute top-4 left-4 hidden items-center gap-3 rounded-2xl px-4 py-2.5 glass-dark sm:flex md:top-6 md:left-6">
                <Box className="size-5 text-gold" aria-hidden />
                <span className="eyebrow text-white/85">{tr(g.modelHint, locale)}</span>
              </div>
            </>
          ) : (
            <>
              <Image
                src={g.fallbackImage}
                alt={tr(g.fallbackAlt, locale)}
                fill
                sizes="(min-width: 1024px) 900px, 100vw"
                className="object-cover object-[58%_45%]"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent"
              />
              <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-3 md:inset-x-6 md:bottom-6 md:gap-4">
                {g.blocks.map((b) => {
                  const active = b.letter === selected;
                  return (
                    <button
                      key={b.letter}
                      type="button"
                      onClick={() => setSelected(b.letter)}
                      aria-pressed={active}
                      aria-label={tooltip(b.letter)}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-left backdrop-blur-md transition-all duration-300 md:px-6 md:py-4",
                        active
                          ? "bg-gold text-on-gold shadow-[0_0_28px_rgb(255_222_164/0.6)]"
                          : "bg-ink/70 text-white ring-1 ring-white/15 hover:bg-ink/90 hover:text-gold",
                      )}
                    >
                      <span className="block font-display text-xl font-extrabold md:text-3xl">
                        {blockWord} {b.letter}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-xs font-semibold md:text-sm",
                          active ? "text-on-gold/75" : "text-mist",
                        )}
                      >
                        {freeOf(b.letter) === undefined
                          ? tr(g.openBlock, locale)
                          : `${tr(g.freeLabel, locale)}: ${freeOf(b.letter)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4 lg:col-span-4">
        <div className="relative overflow-hidden rounded-panel bg-night p-6 shadow-deep ring-1 ring-white/[0.06] md:p-7">
          <div
            aria-hidden
            className="absolute -top-16 -right-16 size-48 rounded-full bg-gold/10 blur-3xl"
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
              aria-live="polite"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-gold">{tr(g.selected, locale)}</p>
                  <p className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white">
                    {blockWord} {selected}
                  </p>
                </div>
                {block && (
                  <span
                    className={cn(
                      "mt-1 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase",
                      soldOut
                        ? "bg-status-sold-line/15 text-[#fca5a5]"
                        : "bg-status-free-line/15 text-[#86efac]",
                    )}
                  >
                    {tr(soldOut ? g.soldOut : g.onSale, locale)}
                  </span>
                )}
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-3">
                <Metric
                  label={tr(g.freeLabel, locale)}
                  value={block ? `${block.free_count}` : "—"}
                  sub={block ? `/ ${block.total_count}` : undefined}
                  gold
                />
                <Metric
                  label={tr(g.floorsLabel, locale)}
                  value={floorCount ? String(floorCount) : "—"}
                  gold
                />
                <Metric
                  label={tr(g.areaLabel, locale)}
                  value={stats ? `${stats.minArea}–${stats.maxArea}` : "—"}
                  sub={stats ? "м²" : undefined}
                />
                <Metric
                  label={tr(g.soldLabel, locale)}
                  value={soldPct === null ? "—" : `${soldPct}%`}
                  bar={soldPct ?? undefined}
                />
              </dl>

              {stats?.minPrice && (
                <p className="mt-4 text-sm text-mist">
                  {ta("priceFrom")}{" "}
                  <span className="font-semibold text-white">{formatMoney(stats.minPrice)}</span>
                </p>
              )}
              {blocks.isError && <p className="mt-4 text-sm text-mist">{tr(g.noData, locale)}</p>}

              <Link
                href={{ pathname: "/apartments", query: { block: selected } }}
                className={buttonClasses("primary", "lg", "mt-6 w-full tracking-wider uppercase")}
              >
                {tr(g.openBlock, locale)} {selected}
                <ArrowRight className="size-[18px]" aria-hidden />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        <nav
          aria-label={tr(g.quickJump, locale)}
          className="rounded-panel bg-night/60 p-6 ring-1 ring-white/[0.06]"
        >
          <p className="mb-4 eyebrow text-mist">{tr(g.quickJump, locale)}</p>
          <div className="grid grid-cols-2 gap-2">
            {g.blocks.map((b) => {
              const active = b.letter === selected;
              const free = freeOf(b.letter);
              return (
                <button
                  key={b.letter}
                  type="button"
                  aria-pressed={active}
                  aria-label={tooltip(b.letter)}
                  onClick={() => setSelected(b.letter)}
                  className={cn(
                    "relative grid h-12 place-items-center rounded-xl font-display text-base font-extrabold transition-all",
                    active
                      ? "bg-gold text-on-gold shadow-glow"
                      : "bg-ink text-white ring-1 ring-white/[0.06] hover:bg-navy hover:text-gold",
                  )}
                >
                  {blockWord} {b.letter}
                  {free === 0 && (
                    <span
                      aria-hidden
                      className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-status-sold-line"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  gold,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  gold?: boolean;
  bar?: number;
}) {
  return (
    <div className="rounded-2xl bg-ink p-4 ring-1 ring-white/[0.05]">
      <dt className="eyebrow text-mist">{label}</dt>
      <dd className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display text-2xl font-extrabold tracking-tight tabular-nums",
            gold ? "text-gold" : "text-white",
          )}
        >
          {value}
        </span>
        {sub && <span className="text-sm text-mist">{sub}</span>}
      </dd>
      {bar !== undefined && (
        <dd aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-[width] duration-700"
            style={{ width: `${bar}%` }}
          />
        </dd>
      )}
    </div>
  );
}

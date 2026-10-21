"use client";

import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Download,
  ImageOff,
  Phone,
  Share2,
  Sparkles,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ZoomControls } from "@/components/ui/ZoomControls";
import { site } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { mediaUrl } from "@/lib/api";
import { setInterestUnit } from "@/lib/contact-context";
import { formatArea, formatMoney } from "@/lib/format";
import { useRoomName, useUnitName } from "@/lib/unit-names";

import { ErrorState } from "./ErrorState";
import { LeadForm } from "./LeadForm";
import { unitTotal } from "./price";
import { useUnit } from "./queries";

type View = "layout" | "blueprint" | "interior";
type Props = { unitId: number | null; onClose: () => void; onCalculator?: () => void };

export function UnitModal({ unitId, onClose, onCalculator }: Props) {
  const t = useTranslations("unit");
  const ta = useTranslations("apartments");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const toast = useToast();
  const unitName = useUnitName();
  const roomName = useRoomName();
  const [view, setView] = useState<View>("layout");
  // Keep showing the last unit while the modal animates out.
  const [shownId, setShownId] = useState(unitId);
  if (unitId !== null && unitId !== shownId) {
    setShownId(unitId);
    setView("layout");
  }
  const { data: unit, isPending, isError, refetch } = useUnit(shownId);

  // Lets the mobile «Заявка» sheet prefill messenger texts with this apartment.
  const interest =
    unitId !== null && unit
      ? `${unitName(unit.name)}, ${ta("blockN", { n: unit.block_letter })}, ${ta("floorN", { n: unit.floor_number })}, ${unit.area.toFixed(2)} м²`
      : null;
  useEffect(() => {
    setInterestUnit(interest);
    return () => setInterestUnit(null);
  }, [interest]);

  const image = unit
    ? view === "interior"
      ? null
      : mediaUrl(view === "layout" ? unit.layout_image : unit.blueprint_image)
    : null;
  const total = unit ? unitTotal(unit) : null;
  const sold = unit?.status === "sold";

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: unit ? unitName(unit.name) : undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast(t("linkCopied"), "success");
      }
    } catch {
      /* user cancelled the share sheet */
    }
  }

  const iconBtn =
    "grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink";
  const downloadHref = unit ? mediaUrl(unit.layout_image ?? unit.blueprint_image) : null;

  return (
    <Modal
      open={unitId !== null}
      onClose={onClose}
      title={
        unit ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {unitName(unit.name)}
            <span className="text-base font-semibold text-muted">
              {ta("blockN", { n: unit.block_letter })} · {ta("floorN", { n: unit.floor_number })}
            </span>
            <StatusBadge status={unit.status} label={ts(unit.status)} />
          </span>
        ) : (
          tc("loading")
        )
      }
      closeLabel={tc("close")}
      size="xl"
      flush
      actions={
        unit && (
          <>
            <button
              type="button"
              onClick={share}
              className={iconBtn}
              aria-label={t("share")}
              title={t("share")}
            >
              <Share2 className="size-[18px]" aria-hidden />
            </button>
            {downloadHref && (
              <a
                href={downloadHref}
                download
                target="_blank"
                rel="noopener"
                className={iconBtn}
                aria-label={t("download")}
                title={t("download")}
              >
                <Download className="size-[18px]" aria-hidden />
              </a>
            )}
          </>
        )
      }
    >
      {isError ? (
        <div className="p-6">
          <ErrorState onRetry={() => refetch()} className="shadow-none" />
        </div>
      ) : isPending || !unit ? (
        <div className="grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <Skeleton className="aspect-[7/5] w-full lg:col-span-7" />
          <div className="space-y-3 lg:col-span-5">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12">
          {/* Visuals */}
          <div className="flex min-w-0 flex-col gap-5 bg-sand p-5 md:p-8 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs
                label={t("layout")}
                size="sm"
                value={view}
                onChange={setView}
                className="bg-white shadow-soft"
                items={[
                  { value: "layout", label: t("layout") },
                  { value: "blueprint", label: t("blueprint") },
                  { value: "interior", label: t("interior") },
                ]}
              />
              <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-soft">
                {formatArea(unit.area)} ·{" "}
                {unit.kind === "commercial"
                  ? t("commercialSpace")
                  : ta("roomsShort", { count: unit.rooms ?? 0 })}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-card bg-white shadow-soft">
              {view === "interior" ? (
                <div className="relative aspect-[7/5]">
                  <Image
                    src="/renders/tour.jpg"
                    alt={t("interiorAlt")}
                    fill
                    sizes="(min-width: 1024px) 700px, 100vw"
                    className="object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent"
                  />
                  <p className="absolute right-5 bottom-5 left-5 flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="size-4 text-gold" aria-hidden />
                    {t("interiorNote")}
                  </p>
                </div>
              ) : image ? (
                <TransformWrapper
                  key={image}
                  minScale={1}
                  maxScale={5}
                  doubleClick={{ mode: "zoomIn" }}
                >
                  <div className="absolute right-3 bottom-3 z-10">
                    <ZoomControls
                      labels={{
                        zoomIn: ta("zoomIn"),
                        zoomOut: ta("zoomOut"),
                        reset: ta("zoomReset"),
                      }}
                    />
                  </div>
                  <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- zoomable drawing served by the API */}
                    <img
                      src={image}
                      alt={`${t(view)}: ${unitName(unit.name)}`}
                      className="block h-auto w-full"
                      draggable={false}
                    />
                  </TransformComponent>
                </TransformWrapper>
              ) : (
                <div className="flex aspect-[7/5] flex-col items-center justify-center gap-3 text-muted">
                  <ImageOff className="size-8" aria-hidden />
                  {t("imageMissing")}
                </div>
              )}
            </div>

            <Link
              href="/#interior"
              onClick={onClose}
              className="group flex items-center gap-4 rounded-card bg-white p-3 pr-5 shadow-soft transition-shadow hover:shadow-lift"
            >
              <span className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl">
                <Image src="/renders/show.jpg" alt="" fill sizes="128px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block eyebrow text-gold-deep">{t("showroom")}</span>
                <span className="mt-1 block font-display font-extrabold">{t("showroomText")}</span>
              </span>
              <ArrowRight
                className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-6 p-5 md:p-8 lg:col-span-5">
            {unit.rooms_detail && unit.rooms_detail.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="eyebrow text-muted">{t("explication")}</h3>
                  <span className="text-sm font-semibold">
                    {t("totalArea")}: {formatArea(unit.area)}
                  </span>
                </div>
                <ul className="mt-3 space-y-2 rounded-2xl bg-sand p-4 text-[15px]">
                  {unit.rooms_detail.map((r, i) => (
                    <li key={`${r.name}-${i}`} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 text-muted">
                        <span aria-hidden className="size-1.5 rounded-full bg-gold-soft" />
                        {roomName(r.name)}
                      </span>
                      <span className="font-semibold tabular-nums">{formatArea(r.area)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="relative overflow-hidden rounded-card bg-ink p-6 text-white shadow-lift">
              <div
                aria-hidden
                className="absolute -right-10 -bottom-10 size-36 rounded-full bg-gold/10 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-gold">{t("price")}</p>
                  <p className="mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums md:text-4xl">
                    {sold ? ts("sold") : total ? formatMoney(total) : ta("priceOnRequest")}
                  </p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-night text-gold">
                  <Wallet className="size-5" aria-hidden />
                </span>
              </div>
              <dl className="relative mt-4 space-y-1.5 text-sm">
                {total && !sold && (
                  <div className="flex justify-between gap-4 text-mist">
                    <dt>{t("pricePerSqm")}</dt>
                    <dd className="font-semibold text-white tabular-nums">
                      {formatMoney(unit.price_per_m2!)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 text-mist">
                  <dt>{t("floor")}</dt>
                  <dd className="font-semibold text-white">{unit.floor_number}</dd>
                </div>
              </dl>
              {!sold && onCalculator && (
                <button
                  type="button"
                  onClick={onCalculator}
                  className="relative mt-4 flex w-full items-center gap-2 rounded-xl bg-night/70 px-3.5 py-2.5 text-left text-sm font-semibold text-gold transition-colors hover:bg-night"
                >
                  <Calculator className="size-4 shrink-0" aria-hidden />
                  {t("installment")}
                  <ArrowRight className="ml-auto size-4" aria-hidden />
                </button>
              )}
            </div>

            {sold ? (
              <div className="space-y-4">
                <p className="rounded-2xl bg-sand p-4 text-sm text-muted">{t("soldNote")}</p>
                <a href={site.contact.phoneHref} className={buttonClasses("dark", "lg", "w-full")}>
                  <Phone className="size-4 text-gold" aria-hidden />
                  {t("call")}
                </a>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-extrabold">{t("bookTitle")}</h3>
                  <span className="eyebrow text-muted">{t("bookNote")}</span>
                </div>
                <LeadForm key={unit.id} unitId={unit.id} compact />
                <a
                  href={site.contact.phoneHref}
                  className={buttonClasses("ghost", "md", "mt-2 w-full")}
                >
                  <Phone className="size-4 text-gold-deep" aria-hidden />
                  {t("call")}
                </a>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-sm text-muted">
              <span className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-status-free-line" aria-hidden />
                {t("managerOnline")}
              </span>
              <span className="eyebrow">
                ID: SH-{unit.block_letter}-{unit.floor_number}-{unit.number}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

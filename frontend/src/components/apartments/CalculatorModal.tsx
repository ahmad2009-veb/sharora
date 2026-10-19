"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CircleCheck, Info, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, isValidTjPhone, maskTjPhone } from "@/lib/format";

import { ErrorState } from "./ErrorState";
import { useSettings } from "./queries";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Prefills from the selected apartment when available. */
  initialArea?: number;
  initialPrice?: number | null;
  unitId?: number | null;
  unitLabel?: string | null;
};

const TERM_PRESETS = [6, 12, 18, 24, 36, 48, 60];
// Apartments on sale are 42–103 m².
const AREA_PRESETS = [42, 60, 75, 90, 103];

const slider =
  "h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-[var(--color-ink)] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-ink [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-lift [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-gold";

function Card({
  eyebrow,
  title,
  aside,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-muted">{eyebrow}</p>
          <div className="mt-1 font-display text-lg font-extrabold">{title}</div>
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function fill(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min || 1)) * 100;
  return {
    background: `linear-gradient(90deg, var(--color-ink) ${pct}%, var(--color-line) ${pct}%)`,
  };
}

export function CalculatorModal({
  open,
  onClose,
  initialArea,
  initialPrice,
  unitId = null,
  unitLabel = null,
}: Props) {
  const t = useTranslations("calculator");
  const tl = useTranslations("lead");
  const tc = useTranslations("common");
  const toast = useToast();
  const { data: settings, isPending, isError, refetch } = useSettings();
  const ids = { area: useId(), price: useId(), down: useId(), phone: useId() };

  const [area, setArea] = useState(60);
  const [price, setPrice] = useState(0);
  const [down, setDown] = useState(30);
  const [term, setTerm] = useState(12);
  const [phone, setPhone] = useState("+992 ");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;
    setArea(initialArea ?? 60);
    setPrice(initialPrice ?? settings.default_price_per_m2);
    setDown(Math.max(settings.down_payment_min_percent, 30));
    setTerm(Math.min(12, settings.max_term_months));
  }, [open, settings, initialArea, initialPrice]);

  const total = area * price;
  const downAmount = (total * down) / 100;
  const monthly = term > 0 ? (total - downAmount) / term : 0;

  const lead = useMutation({
    mutationFn: () =>
      api.createLead({
        unit_id: unitId,
        name: t("leadName"),
        phone: phone.replace(/\s/g, ""),
        message: t("leadMessage", {
          area: area.toFixed(1),
          total: formatMoney(total),
          down: `${down}% (${formatMoney(downAmount)})`,
          term,
          monthly: formatMoney(monthly),
        }),
      }),
    onSuccess: () => toast(tl("success"), "success"),
    onError: (err) =>
      toast(err instanceof ApiError && err.status !== 500 ? err.message : tl("error"), "error"),
  });
  const phoneError = !isValidTjPhone(phone);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (phoneError || lead.isPending) return;
    lead.mutate();
  }

  const terms = settings
    ? Array.from(
        new Set([
          ...TERM_PRESETS.filter((m) => m <= settings.max_term_months),
          settings.max_term_months,
        ]),
      )
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("title")}
      description={unitLabel ?? t("subtitle")}
      closeLabel={tc("close")}
      size="2xl"
      flush
    >
      {isError ? (
        <div className="p-6">
          <ErrorState onRetry={() => refetch()} className="shadow-none" />
        </div>
      ) : isPending ? (
        <div className="grid gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="space-y-4 lg:col-span-7">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
          <Skeleton className="h-[480px] w-full lg:col-span-5" />
        </div>
      ) : (
        <>
          <div className="grid items-start gap-6 bg-sand p-5 md:p-8 lg:grid-cols-12 lg:gap-8">
            <div className="space-y-4 lg:col-span-7">
              <Card
                eyebrow={t("areaEyebrow")}
                title={<label htmlFor={ids.area}>{t("area")}</label>}
                aside={
                  <span className="flex items-baseline gap-1 rounded-xl bg-sand px-3 py-1.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={10}
                      max={2000}
                      step={0.1}
                      value={area}
                      aria-label={t("area")}
                      onChange={(e) => setArea(Math.max(0, Number(e.target.value)))}
                      className="w-20 bg-transparent text-right font-display text-xl font-extrabold tabular-nums focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-muted">м²</span>
                  </span>
                }
              >
                <input
                  id={ids.area}
                  type="range"
                  min={20}
                  max={200}
                  step={0.5}
                  value={Math.min(200, Math.max(20, area))}
                  onChange={(e) => setArea(Number(e.target.value))}
                  className={slider}
                  style={fill(area, 20, 200)}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {(initialArea ? [initialArea, ...AREA_PRESETS] : AREA_PRESETS).map((a, i) => (
                    <button
                      key={`${a}-${i}`}
                      type="button"
                      onClick={() => setArea(a)}
                      className={cn(
                        "h-9 rounded-xl px-3 text-xs font-bold tabular-nums transition-colors",
                        area === a ? "bg-ink text-gold" : "bg-sand text-ink hover:bg-sand-deep",
                      )}
                    >
                      {a} м²{initialArea && i === 0 ? ` · ${t("selected")}` : ""}
                    </button>
                  ))}
                </div>
              </Card>

              <Card
                eyebrow={t("priceEyebrow")}
                title={<label htmlFor={ids.price}>{t("pricePerSqm")}</label>}
                aside={
                  <span className="flex items-baseline gap-1 rounded-xl bg-sand px-3 py-1.5">
                    <input
                      id={ids.price}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={100}
                      value={price}
                      onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                      className="w-24 bg-transparent text-right font-display text-xl font-extrabold tabular-nums focus:outline-none"
                    />
                    <span className="text-sm font-semibold text-muted">смн</span>
                  </span>
                }
              >
                <p className="text-sm text-muted">
                  {initialPrice ? t("priceFromUnit") : t("priceDefault")}
                </p>
              </Card>

              <Card
                eyebrow={t("downEyebrow")}
                title={<label htmlFor={ids.down}>{t("downPayment")}</label>}
                aside={
                  <span className="text-right">
                    <span className="block font-display text-2xl font-extrabold tabular-nums">
                      {down}%
                    </span>
                    <span className="text-sm font-bold text-gold-deep tabular-nums">
                      {formatMoney(downAmount)}
                    </span>
                  </span>
                }
              >
                <input
                  id={ids.down}
                  type="range"
                  min={settings.down_payment_min_percent}
                  max={90}
                  step={5}
                  value={down}
                  onChange={(e) => setDown(Number(e.target.value))}
                  className={slider}
                  style={fill(down, settings.down_payment_min_percent, 90)}
                />
                <div className="mt-2 flex justify-between text-xs font-semibold text-muted">
                  <span>
                    {t("min")} {settings.down_payment_min_percent}%
                  </span>
                  <span>90%</span>
                </div>
              </Card>

              <Card
                eyebrow={t("termEyebrow")}
                title={t("term")}
                aside={
                  <span className="rounded-full bg-status-free-fill px-3 py-1 text-[11px] font-bold tracking-wider text-status-free-text uppercase">
                    {t("noOverpay")}
                  </span>
                }
              >
                <div
                  role="radiogroup"
                  aria-label={t("term")}
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                >
                  {terms.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={term === m}
                      onClick={() => setTerm(m)}
                      className={cn(
                        "rounded-2xl px-3 py-3 text-left transition-all",
                        term === m
                          ? "bg-ink text-white shadow-lift"
                          : "bg-sand text-ink hover:bg-sand-deep",
                      )}
                    >
                      <span
                        className={cn(
                          "block font-display text-lg font-extrabold",
                          term === m && "text-gold",
                        )}
                      >
                        {m}
                      </span>
                      <span className={cn("text-xs", term === m ? "text-mist" : "text-muted")}>
                        {t("monthsShort")}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Result */}
            <div
              className="relative overflow-hidden rounded-panel bg-ink p-7 text-white shadow-deep md:p-8 lg:sticky lg:top-0 lg:col-span-5"
              aria-live="polite"
            >
              <div
                aria-hidden
                className="absolute -top-20 -right-20 size-64 rounded-full bg-gold/10 blur-3xl"
              />
              <div className="relative flex items-center justify-between gap-3">
                <p className="eyebrow text-gold">{t("result")}</p>
                <span className="rounded-full bg-night px-3 py-1 text-[11px] font-bold text-gold tabular-nums">
                  {area.toFixed(1)} м²
                </span>
              </div>
              <p className="relative mt-5 eyebrow text-mist">{t("total")}</p>
              <p className="relative mt-1 font-display text-4xl font-extrabold tracking-tight whitespace-nowrap tabular-nums">
                {formatMoney(total)}
              </p>

              <dl className="relative mt-6 rounded-2xl bg-night/70 p-5">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <dt className="eyebrow text-mist">
                    {t("downAmount")} ({down}%)
                  </dt>
                  <dd className="font-display text-xl font-extrabold whitespace-nowrap text-gold tabular-nums">
                    {formatMoney(downAmount)}
                  </dd>
                </div>
                <div className="flex items-end justify-between gap-4 pt-4">
                  <dt className="eyebrow text-mist">{t("monthly")}</dt>
                  <dd className="text-right">
                    <span className="block font-display text-3xl font-extrabold whitespace-nowrap tabular-nums">
                      {formatMoney(monthly)}
                    </span>
                    <span className="text-xs text-mist">{t("months", { count: term })}</span>
                  </dd>
                </div>
              </dl>

              <p className="relative mt-4 flex items-start gap-3 rounded-2xl bg-on-gold p-4 text-sm text-gold">
                <BadgeCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
                {t("trust")}
              </p>

              {lead.isSuccess ? (
                <p
                  role="status"
                  className="relative mt-6 flex items-center gap-3 rounded-2xl bg-night p-4 text-sm"
                >
                  <CircleCheck className="size-5 shrink-0 text-gold" aria-hidden />
                  {tl("success")}
                </p>
              ) : (
                <form onSubmit={submit} noValidate className="relative mt-6">
                  <label htmlFor={ids.phone} className="eyebrow text-mist">
                    {t("leadLabel")}
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id={ids.phone}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(maskTjPhone(e.target.value))}
                      aria-invalid={touched && phoneError}
                      className="h-12 min-w-0 flex-1 rounded-full bg-white px-5 text-ink tabular-nums focus:ring-2 focus:ring-gold focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-sold-line"
                    />
                    <button
                      type="submit"
                      disabled={lead.isPending}
                      className="btn-shine flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gold px-5 text-[13px] font-bold tracking-wider text-on-gold uppercase transition-colors hover:bg-gold-soft disabled:opacity-60"
                    >
                      {lead.isPending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <ArrowRight className="size-4" aria-hidden />
                      )}
                      {t("leadSubmit")}
                    </button>
                  </div>
                  {touched && phoneError && (
                    <p className="mt-2 text-sm text-[#fca5a5]">{tl("phoneInvalid")}</p>
                  )}
                </form>
              )}
            </div>
          </div>
          <p className="flex items-start gap-2 border-t border-line bg-white px-5 py-4 text-xs text-muted md:px-8">
            <Info className="size-4 shrink-0" aria-hidden />
            {t("disclaimer")}
          </p>
        </>
      )}
    </Modal>
  );
}

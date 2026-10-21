"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  HandCoins,
  Phone,
  ReceiptText,
  Search,
  SlidersHorizontal,
  TableProperties,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useId, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, formatNumber, formatPhone } from "@/lib/format";
import type { Sale } from "@/lib/types";

import { BuyerInfoModal } from "./BuyerInfoModal";
import { PaymentScheduleModal } from "./PaymentScheduleModal";
import {
  chipClass,
  chipRowClass,
  inputClass,
  labelClass,
  sheetActionsClass,
  sheetContentClass,
} from "./ui";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** «Покупатели / Продажи»: every recorded sale with search and block / date filters. */
export function SalesPanel({ initialOverdue = false }: { initialOverdue?: boolean }) {
  const ids = { search: useId(), from: useId(), to: useId(), mFrom: useId(), mTo: useId() };
  const [search, setSearch] = useState("");
  const [block, setBlock] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [archived, setArchived] = useState(false);
  const [overdue, setOverdue] = useState(initialOverdue);
  const [open, setOpen] = useState<Sale | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const q = useDebounced(search.trim());

  const blocks = useQuery({ queryKey: ["blocks"], queryFn: api.blocks });
  const sales = useQuery({
    queryKey: ["admin", "sales", { q, block, dateFrom, dateTo, archived, overdue }],
    queryFn: () => adminApi.sales({ search: q, block, dateFrom, dateTo, archived, overdue }),
    placeholderData: keepPreviousData,
  });

  const list = sales.data ?? [];
  const paid = list.reduce((s, x) => s + x.paid_total, 0);
  const rest = list.reduce((s, x) => s + (x.remaining ?? 0), 0);
  const overdueCount = list.reduce((s, x) => s + x.overdue_count, 0);
  const overdueAmount = list.reduce((s, x) => s + x.overdue_amount, 0);
  const filtered = !!(q || block || dateFrom || dateTo || overdue);
  const resetFilters = () => {
    setSearch("");
    setBlock("");
    setDateFrom("");
    setDateTo("");
    setOverdue(false);
  };
  const blockOptions = [
    { letter: "", label: "Все блоки" },
    ...(blocks.data ?? []).map((b) => ({ letter: b.letter, label: b.letter })),
  ];
  const emptyState = (
    <>
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-sand text-muted">
        <ReceiptText className="size-6" aria-hidden />
      </span>
      <p className="mt-4 font-display text-lg font-extrabold">
        {filtered ? "Ничего не найдено" : archived ? "Архив пуст" : "Продаж пока нет"}
      </p>
      {!filtered && !archived && (
        <p className="mt-1 text-sm text-muted">
          Поставьте статус «Продано» в разделе «Фонд квартир» — откроется форма покупателя.
        </p>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 max-md:grid-cols-2 max-md:gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Сделок", value: formatNumber(list.length), Icon: ReceiptText, color: "" },
          {
            label: "Получено",
            value: formatMoney(paid),
            Icon: HandCoins,
            color: "var(--status-free-text)",
          },
          {
            label: "Остаток к оплате",
            value: formatMoney(rest),
            Icon: Wallet,
            color: "var(--color-gold-deep)",
          },
          {
            label: "Просроченные платежи",
            value: formatNumber(overdueCount),
            Icon: CalendarClock,
            color: overdueCount ? "var(--status-sold-text)" : "",
            sub: overdueCount ? `на ${formatMoney(overdueAmount)}` : undefined,
          },
        ].map(({ label, value, Icon, color, sub }) => (
          <div
            key={label}
            // --kpi tints the icon on phones.
            style={{ "--kpi": color || "var(--color-ink)" } as CSSProperties}
            className="rounded-card bg-white p-5 shadow-soft max-md:rounded-[20px] max-md:p-4 md:p-6"
          >
            <div className="flex items-center justify-between max-md:items-start max-md:gap-2">
              <span className="eyebrow text-muted max-md:text-sm max-md:leading-tight max-md:font-semibold max-md:tracking-normal max-md:normal-case">
                {label}
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-sand max-md:shrink-0 max-md:bg-[color-mix(in_oklab,var(--kpi)_12%,white)] max-md:text-[var(--kpi)]">
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
            <p
              className="mt-4 font-display text-3xl font-extrabold tracking-tight tabular-nums max-md:mt-2 max-md:text-xl"
              style={color ? { color } : undefined}
            >
              {value}
            </p>
            <p className="mt-1 text-sm text-muted">
              {sub ?? (archived ? "в архиве" : filtered ? "по фильтру" : "все активные продажи")}
            </p>
          </div>
        ))}
      </div>

      {/* Phones: search, filter chips and cards instead of the table. */}
      <section aria-label="Продажи" className="space-y-3 md:hidden">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Поиск"
            placeholder="ФИО, телефон или квартира…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(inputClass, "bg-white pl-12 shadow-soft")}
          />
        </div>
        <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-30 -mx-4 bg-sand/90 py-2 backdrop-blur-md">
          <div className={chipRowClass}>
            <button
              type="button"
              onClick={() => setDatesOpen(true)}
              className={cn(chipClass(!!(dateFrom || dateTo)), "pr-3")}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Даты
            </button>
            <button
              type="button"
              aria-pressed={overdue}
              onClick={() => setOverdue(!overdue)}
              className={
                overdue
                  ? "flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-status-sold-text px-4 text-sm font-bold whitespace-nowrap text-white"
                  : chipClass(false)
              }
            >
              <CalendarClock className="size-4" aria-hidden />
              Просроченные
            </button>
            {blockOptions.map((b) => (
              <button
                key={b.letter || "all"}
                type="button"
                aria-pressed={block === b.letter}
                onClick={() => setBlock(b.letter)}
                className={chipClass(block === b.letter)}
              >
                {b.letter ? `Блок ${b.letter}` : b.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={archived}
              onClick={() => setArchived(!archived)}
              className={chipClass(archived)}
            >
              <Archive className="size-4" aria-hidden />
              Архив
            </button>
          </div>
        </div>
        {filtered && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex h-11 items-center gap-1.5 text-sm font-semibold text-muted"
          >
            <X className="size-4" aria-hidden />
            Сбросить фильтры
          </button>
        )}

        {sales.isPending ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <Skeleton className="h-44 rounded-[20px]" />
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className="rounded-[20px] bg-white px-5 py-12 text-center shadow-soft">
            {emptyState}
          </div>
        ) : (
          <ul className={cn("space-y-3", sales.isPlaceholderData && "opacity-60")}>
            {list.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "relative rounded-[20px] bg-white p-4 shadow-soft ring-1",
                  s.overdue_count > 0 ? "ring-status-sold-line/50" : "ring-ink/5",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* The whole card opens the buyer; phone and «График» sit above it. */}
                    <button
                      type="button"
                      onClick={() => setOpen(s)}
                      className="text-left font-display text-[17px] leading-snug font-extrabold after:absolute after:inset-0 after:rounded-[20px] after:content-['']"
                    >
                      {s.buyer_name}
                    </button>
                    <p className="mt-0.5 text-sm text-muted">
                      {s.unit_name ?? "—"}
                      {s.block_letter && ` · Блок ${s.block_letter}`}
                      {s.floor_label && ` · ${s.floor_label}`}
                    </p>
                  </div>
                  {s.overdue_count > 0 && (
                    <span className="shrink-0 rounded-full bg-status-sold-text px-2.5 py-1 text-xs font-bold text-white">
                      Просрочка: {s.overdue_count}
                    </span>
                  )}
                </div>
                <a
                  href={`tel:${s.buyer_phone}`}
                  className="relative z-10 mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-sand px-4 text-[15px] font-semibold tabular-nums active:bg-sand-deep"
                >
                  <Phone className="size-4 text-gold-deep" aria-hidden />
                  {formatPhone(s.buyer_phone)}
                </a>
                <dl className="mt-3 grid grid-cols-2 gap-3 rounded-2xl bg-sand/60 p-3 text-sm">
                  <div>
                    <dt className="text-muted">Оплачено</dt>
                    <dd className="font-display text-base font-extrabold text-status-free-text tabular-nums">
                      {formatMoney(s.paid_total)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Остаток</dt>
                    <dd
                      className={cn(
                        "font-display text-base font-extrabold tabular-nums",
                        s.remaining ? "text-gold-deep" : "text-muted",
                      )}
                    >
                      {s.remaining === null ? "—" : formatMoney(s.remaining)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p
                    className={cn(
                      "text-sm",
                      s.overdue_count ? "font-semibold text-status-sold-text" : "text-muted",
                    )}
                  >
                    {s.next_payment_date ? (
                      <>
                        След. платёж:{" "}
                        <span className="whitespace-nowrap tabular-nums">
                          {dateFormat.format(new Date(`${s.next_payment_date}T00:00:00`))}
                        </span>
                      </>
                    ) : (
                      `Продажа: ${dateFormat.format(new Date(`${s.sale_date}T00:00:00`))}`
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setScheduleId(s.id)}
                    className="relative z-10 inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-white"
                  >
                    <TableProperties className="size-4" aria-hidden />
                    График
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-4 rounded-card bg-white p-4 shadow-soft max-md:hidden md:p-5">
        <div
          role="group"
          aria-label="Блок"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {[
            { letter: "", label: "Все блоки" },
            ...(blocks.data ?? []).map((b) => ({ letter: b.letter, label: b.letter })),
          ].map((b) => (
            <button
              key={b.letter || "all"}
              type="button"
              aria-pressed={block === b.letter}
              onClick={() => setBlock(b.letter)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors",
                block === b.letter ? "bg-ink text-gold" : "bg-sand text-ink hover:bg-sand-deep",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative min-w-60 flex-1">
            <label htmlFor={ids.search} className={labelClass}>
              Поиск
            </label>
            <Search
              className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-muted"
              aria-hidden
            />
            <input
              id={ids.search}
              type="search"
              placeholder="ФИО, телефон или квартира…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputClass, "pl-10")}
            />
          </div>
          <div className="w-44">
            <label htmlFor={ids.from} className={labelClass}>
              Дата с
            </label>
            <input
              id={ids.from}
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="w-44">
            <label htmlFor={ids.to} className={labelClass}>
              по
            </label>
            <input
              id={ids.to}
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
            />
          </div>
          <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-sand px-4 text-sm font-semibold select-none">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
              className="size-4 accent-[var(--color-ink)]"
            />
            <Archive className="size-4 text-muted" aria-hidden />
            Архив
          </label>
          <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-sand px-4 text-sm font-semibold select-none">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(e) => setOverdue(e.target.checked)}
              className="size-4 accent-[var(--color-ink)]"
            />
            <CalendarClock className="size-4 text-status-sold-text" aria-hidden />
            Только просроченные
          </label>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setBlock("");
                setDateFrom("");
                setDateTo("");
                setOverdue(false);
              }}
              className="flex h-11 items-center gap-1.5 px-2 text-sm font-medium text-muted hover:text-ink"
            >
              <X className="size-4" aria-hidden />
              Сбросить
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-card bg-white shadow-soft max-md:hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-[15px]">
            <caption className="sr-only">Продажи</caption>
            <thead>
              <tr className="bg-sand text-left text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                <th scope="col" className="px-4 py-4">
                  Квартира
                </th>
                <th scope="col" className="px-4 py-4">
                  Блок
                </th>
                <th scope="col" className="px-4 py-4">
                  Этаж
                </th>
                <th scope="col" className="px-4 py-4">
                  Покупатель
                </th>
                <th scope="col" className="px-4 py-4">
                  Телефон
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Оплачено
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Остаток долга
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  След. платёж
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Дата продажи
                </th>
                <th scope="col" className="px-4 py-4">
                  <span className="sr-only">График платежей</span>
                </th>
              </tr>
            </thead>
            <tbody className={cn(sales.isPlaceholderData && "opacity-60")}>
              {sales.isPending ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-line">
                    <td colSpan={10} className="px-4 py-3">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-sand text-muted">
                      <ReceiptText className="size-6" aria-hidden />
                    </span>
                    <p className="mt-4 font-display text-lg font-extrabold">
                      {filtered ? "Ничего не найдено" : archived ? "Архив пуст" : "Продаж пока нет"}
                    </p>
                    {!filtered && !archived && (
                      <p className="mt-1 text-sm text-muted">
                        Поставьте статус «Продано» в разделе «Фонд квартир» — откроется форма
                        покупателя.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                list.map((s) => (
                  <tr
                    key={s.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a, button")) return;
                      setOpen(s);
                    }}
                    className={cn(
                      "cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-sand/60",
                      s.overdue_count > 0 && "bg-status-sold-fill/40",
                    )}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setOpen(s)}
                        className="font-display font-extrabold hover:text-gold-deep"
                      >
                        {s.unit_name ?? "—"}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold">{s.block_letter ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{s.floor_label ?? "—"}</td>
                    <td className="max-w-56 truncate px-4 py-3 font-medium">{s.buyer_name}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${s.buyer_phone}`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums hover:text-gold-deep"
                      >
                        <Phone className="size-3.5 text-muted" aria-hidden />
                        {formatPhone(s.buyer_phone)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap text-status-free-text tabular-nums">
                      {formatMoney(s.paid_total)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right whitespace-nowrap tabular-nums",
                        s.remaining ? "font-semibold text-gold-deep" : "text-muted",
                      )}
                    >
                      {s.remaining === null ? "—" : formatMoney(s.remaining)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right whitespace-nowrap tabular-nums",
                        s.overdue_count ? "font-semibold text-status-sold-text" : "text-muted",
                      )}
                    >
                      {s.next_payment_date ? (
                        <>
                          {dateFormat.format(new Date(`${s.next_payment_date}T00:00:00`))}
                          {s.overdue_count > 0 && (
                            <span className="block text-xs">просрочено: {s.overdue_count}</span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-muted">
                      {dateFormat.format(new Date(`${s.sale_date}T00:00:00`))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setScheduleId(s.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sand px-3 text-sm font-semibold whitespace-nowrap hover:bg-sand-deep"
                      >
                        <TableProperties className="size-4" aria-hidden />
                        График
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={datesOpen} onClose={() => setDatesOpen(false)} title="Дата продажи" sheet>
        <div className={cn("space-y-5", sheetContentClass)}>
          <div>
            <label htmlFor={ids.mFrom} className={labelClass}>
              С
            </label>
            <input
              id={ids.mFrom}
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={ids.mTo} className={labelClass}>
              По
            </label>
            <input
              id={ids.mTo}
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className={sheetActionsClass}>
            <Button
              variant="ghost"
              disabled={!dateFrom && !dateTo}
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
            >
              Сбросить
            </Button>
            <Button variant="dark" onClick={() => setDatesOpen(false)}>
              Показать{sales.data ? `: ${list.length}` : ""}
            </Button>
          </div>
        </div>
      </Modal>
      <BuyerInfoModal target={open ? { sale: open } : null} onClose={() => setOpen(null)} />
      <PaymentScheduleModal saleId={scheduleId} onClose={() => setScheduleId(null)} />
    </div>
  );
}

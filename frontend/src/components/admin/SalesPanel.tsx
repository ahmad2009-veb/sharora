"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  HandCoins,
  Phone,
  ReceiptText,
  Search,
  TableProperties,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, formatNumber, formatPhone } from "@/lib/format";
import type { Sale } from "@/lib/types";

import { BuyerInfoModal } from "./BuyerInfoModal";
import { PaymentScheduleModal } from "./PaymentScheduleModal";
import { inputClass, labelClass } from "./ui";

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
  const ids = { search: useId(), from: useId(), to: useId() };
  const [search, setSearch] = useState("");
  const [block, setBlock] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [archived, setArchived] = useState(false);
  const [overdue, setOverdue] = useState(initialOverdue);
  const [open, setOpen] = useState<Sale | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          <div key={label} className="rounded-card bg-white p-5 shadow-soft md:p-6">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-muted">{label}</span>
              <span className="grid size-9 place-items-center rounded-full bg-sand">
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
            <p
              className="mt-4 font-display text-3xl font-extrabold tracking-tight tabular-nums"
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

      <div className="flex flex-col gap-4 rounded-card bg-white p-4 shadow-soft md:p-5">
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

      <div className="overflow-hidden rounded-card bg-white shadow-soft">
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

      <BuyerInfoModal target={open ? { sale: open } : null} onClose={() => setOpen(null)} />
      <PaymentScheduleModal saleId={scheduleId} onClose={() => setScheduleId(null)} />
    </div>
  );
}

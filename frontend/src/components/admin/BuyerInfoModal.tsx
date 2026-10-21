"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  CalendarClock,
  Check,
  Copy,
  Pencil,
  Phone,
  TableProperties,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, formatPhone } from "@/lib/format";
import { monthsLabel } from "@/lib/installments";
import type { Sale } from "@/lib/types";

import { PaymentScheduleModal } from "./PaymentScheduleModal";
import { SaleFormModal, unitSubtitle, type SaleUnit } from "./SaleFormModal";
import { sheetActionsBase, sheetContentClass } from "./ui";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" });
const dateTimeFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});
const utc = (iso: string) => new Date(iso + (/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? "" : "Z"));
const day = (iso: string) => new Date(`${iso}T00:00:00`);

export type BuyerTarget = { unit: SaleUnit; sale?: undefined } | { sale: Sale; unit?: undefined };

function unitFromSale(sale: Sale): SaleUnit {
  return {
    id: sale.unit_id ?? 0,
    name: sale.unit_name ?? "Помещение удалено",
    block_letter: sale.block_letter ?? "—",
    floor_label: sale.floor_label ?? "—",
    area: sale.area ?? 0,
    price_per_m2: null,
  };
}

/** Read-only «Информация о покупателе» with copy-phone and an edit form behind «Редактировать». */
export function BuyerInfoModal({
  target,
  onClose,
}: {
  target: BuyerTarget | null;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState<{ unit: SaleUnit; sale: Sale | null } | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const unitId = target?.unit?.id ?? null;

  const fetched = useQuery({
    queryKey: ["admin", "unit-sale", unitId],
    queryFn: () => adminApi.unitSale(unitId!),
    enabled: unitId !== null,
    retry: (count, e) => !(e instanceof ApiError && e.status === 404) && count < 2,
  });
  const sale = target?.sale ?? fetched.data ?? null;
  const unit = target?.unit ?? (target?.sale ? unitFromSale(target.sale) : null);
  const missing = fetched.error instanceof ApiError && fetched.error.status === 404;

  return (
    <>
      <Modal
        open={target !== null && editing === null && scheduleId === null}
        onClose={onClose}
        title="Информация о покупателе"
        description={unit ? unitSubtitle(unit) : undefined}
        size="md"
        sheet
      >
        {!sale && !missing && fetched.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : !sale ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-sand text-muted">
              <UserRound className="size-6" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-extrabold">Данные покупателя не внесены</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Квартира отмечена проданной до учёта покупателей. Добавьте данные, чтобы сделка
              появилась в разделе «Покупатели».
            </p>
            <div className="mt-6 flex gap-3 max-md:grid max-md:w-full max-md:grid-cols-[auto_1fr] max-md:[&>*]:h-12">
              <Button variant="ghost" onClick={onClose}>
                Закрыть
              </Button>
              {unit && (
                <Button onClick={() => setEditing({ unit, sale: null })}>
                  <UserPlus className="size-4" aria-hidden />
                  Добавить покупателя
                </Button>
              )}
            </div>
          </div>
        ) : (
          <SaleDetails
            sale={sale}
            onEdit={() => unit && setEditing({ unit, sale })}
            onSchedule={() => setScheduleId(sale.id)}
            onClose={onClose}
          />
        )}
      </Modal>

      <PaymentScheduleModal saleId={scheduleId} onClose={() => setScheduleId(null)} />

      <SaleFormModal
        unit={editing?.unit ?? null}
        sale={editing?.sale}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          // A record opened from the sales list is a snapshot — close so the list shows fresh data.
          if (target?.sale) onClose();
        }}
      />
    </>
  );
}

function SaleDetails({
  sale,
  onEdit,
  onSchedule,
  onClose,
}: {
  sale: Sale;
  onEdit: () => void;
  onSchedule: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // Against everything the buyer owes: price, or down payment + schedule (with markup).
  const owed =
    sale.payment_type === "installment"
      ? sale.down_payment + sale.financed_amount
      : sale.total_price;
  const paidPct = owed && owed > 0 ? Math.min(100, (sale.paid_total / owed) * 100) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(sale.buyer_phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className={cn("space-y-5", sheetContentClass)}>
      {sale.is_archived && (
        <p className="flex items-center gap-2 rounded-xl bg-sand px-4 py-2.5 text-sm font-medium text-muted">
          <Archive className="size-4" aria-hidden />
          Запись в архиве — квартира снята с продажи
        </p>
      )}

      <div className="flex items-center gap-4 rounded-2xl bg-ink p-5 text-white">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold font-display text-lg font-extrabold text-on-gold">
          {sale.buyer_name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-extrabold">{sale.buyer_name}</p>
          <div className="mt-1 flex items-center gap-2">
            <a
              href={`tel:${sale.buyer_phone}`}
              className="flex items-center gap-1.5 font-semibold text-gold tabular-nums hover:text-white max-md:h-11"
            >
              <Phone className="size-3.5" aria-hidden />
              {formatPhone(sale.buyer_phone)}
            </a>
            <button
              type="button"
              onClick={copy}
              aria-label="Скопировать номер"
              title="Скопировать номер"
              className="grid size-8 place-items-center rounded-full text-mist transition-colors hover:bg-white/10 hover:text-white max-md:size-11"
            >
              {copied ? (
                <Check className="size-4 text-[#86efac]" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </button>
            <span aria-live="polite" className="sr-only">
              {copied ? "Номер скопирован" : ""}
            </span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-line max-md:grid-cols-1">
        {[
          ["Оплачено", formatMoney(sale.paid_total), "text-status-free-text"],
          ["Стоимость", sale.total_price === null ? "—" : formatMoney(sale.total_price), ""],
          [
            "Остаток",
            sale.remaining === null ? "—" : formatMoney(sale.remaining),
            sale.remaining ? "text-gold-deep" : "",
          ],
        ].map(([k, v, cls]) => (
          <div
            key={k}
            className="bg-white px-4 py-3.5 max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4"
          >
            <dt className="eyebrow text-muted max-md:text-sm max-md:font-medium max-md:tracking-normal max-md:normal-case">
              {k}
            </dt>
            <dd
              className={cn(
                "mt-1.5 font-display font-extrabold tabular-nums max-md:mt-0 max-md:text-lg",
                cls,
              )}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
      {paidPct !== null && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-sand-deep">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold-deep"
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted max-md:text-sm">
            Оплачено {Math.round(paidPct)}%
          </p>
        </div>
      )}

      {sale.overdue_count > 0 && (
        <p className="flex items-center gap-2 rounded-xl bg-status-sold-fill px-4 py-2.5 text-sm font-semibold text-status-sold-text">
          <CalendarClock className="size-4" aria-hidden />
          Просрочено платежей: {sale.overdue_count} на {formatMoney(sale.overdue_amount)}
        </p>
      )}

      <dl className="space-y-2.5 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Дата продажи</dt>
          <dd className="font-semibold">{dateFormat.format(day(sale.sale_date))}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Способ оплаты</dt>
          <dd className="font-semibold">
            {sale.payment_type === "installment"
              ? `Рассрочка, ${monthsLabel(sale.term_months ?? 0)}`
              : "Полная оплата"}
          </dd>
        </div>
        {sale.monthly_payment !== null && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Ежемесячный платёж</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(sale.monthly_payment)}</dd>
          </div>
        )}
        {sale.next_payment_date && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Следующий платёж</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                sale.overdue_count > 0 && "text-status-sold-text",
              )}
            >
              {dateFormat.format(day(sale.next_payment_date))} ·{" "}
              {formatMoney(sale.next_payment_amount ?? 0)}
            </dd>
          </div>
        )}
        {sale.comment && (
          <div>
            <dt className="text-muted">Комментарий</dt>
            <dd className="mt-1 rounded-xl bg-sand px-4 py-3 whitespace-pre-line">
              {sale.comment}
            </dd>
          </div>
        )}
      </dl>

      <p className="border-t border-line pt-4 text-xs text-muted max-md:text-sm">
        Оформил: <span className="font-semibold text-ink">{sale.created_by_username ?? "—"}</span>
        {" · "}
        {dateTimeFormat.format(utc(sale.created_at))}
        {sale.updated_at !== sale.created_at && (
          <> · изменено {dateTimeFormat.format(utc(sale.updated_at))}</>
        )}
      </p>

      <div
        className={cn(
          "flex flex-wrap justify-end gap-3",
          sheetActionsBase,
          // Phones: «Закрыть» is the ✕ in the header.
          sale.is_archived ? "max-md:grid-cols-1" : "max-md:grid-cols-2",
        )}
      >
        <Button variant="ghost" onClick={onClose} className="max-md:hidden">
          Закрыть
        </Button>
        <Button variant="secondary" onClick={onSchedule}>
          <TableProperties className="size-4" aria-hidden />
          <span className="max-md:hidden">График платежей</span>
          <span className="md:hidden">График</span>
        </Button>
        {!sale.is_archived && (
          <Button variant="dark" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden />
            Редактировать
          </Button>
        )}
      </div>
    </div>
  );
}

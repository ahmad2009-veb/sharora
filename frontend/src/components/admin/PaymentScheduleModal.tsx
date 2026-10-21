"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  Undo2,
  X,
} from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Link } from "@/i18n/navigation";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { day, numericDate, PAYMENT_STATUS_LABELS, scheduleSummary } from "@/lib/schedule";
import type { Payment, PaymentStatus, Schedule } from "@/lib/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { MoneyInput, today } from "./SaleFormModal";
import { inputClass, sheetActionsBase } from "./ui";
import { useIsMobile } from "./useIsMobile";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-sand text-ink",
  paid: "bg-status-free-fill text-status-free-text",
  overdue: "bg-status-sold-fill text-status-sold-text",
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap max-md:text-sm",
        STATUS_STYLES[status],
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

/** «График платежей»: summary, the schedule with payment entry, downloads and print. */
export function PaymentScheduleModal({
  saleId,
  onClose,
}: {
  saleId: number | null;
  onClose: () => void;
}) {
  const schedule = useQuery({
    queryKey: ["admin", "schedule", saleId],
    queryFn: () => adminApi.schedule(saleId!),
    enabled: saleId !== null,
  });
  const data = schedule.data;

  return (
    <Modal
      open={saleId !== null}
      onClose={onClose}
      title="График платежей"
      description={data ? data.sale.buyer_name : undefined}
      size="xl"
      sheet
    >
      {!data ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 max-md:hidden">
            <a
              href={adminApi.exportUrl(data.sale.id, "xlsx")}
              download
              className={buttonClasses("secondary", "sm")}
            >
              <FileSpreadsheet className="size-4" aria-hidden />
              Скачать Excel
            </a>
            <a
              href={adminApi.exportUrl(data.sale.id, "docx")}
              download
              className={buttonClasses("secondary", "sm")}
            >
              <FileText className="size-4" aria-hidden />
              Скачать Word
            </a>
            <Link
              href={`/admin/schedule/${data.sale.id}?print=1`}
              target="_blank"
              className={buttonClasses("secondary", "sm")}
            >
              <Printer className="size-4" aria-hidden />
              Печать
            </Link>
          </div>

          <ScheduleSummaryGrid schedule={data} />
          {data.sale.payment_type === "installment" ? (
            <ScheduleTable schedule={data} />
          ) : (
            <p className="rounded-2xl bg-status-free-fill px-5 py-4 font-medium text-status-free-text">
              Квартира оплачена полностью — графика платежей нет.
            </p>
          )}
        </div>
      )}
      {data && (
        // Phones: downloads and print pinned to the bottom of the sheet.
        <div
          className={cn(
            "md:hidden",
            sheetActionsBase,
            "max-md:grid-cols-3 max-md:[&>*]:flex-col max-md:[&>*]:gap-0.5 max-md:[&>*]:px-1 max-md:[&>*]:text-sm",
          )}
        >
          <a
            href={adminApi.exportUrl(data.sale.id, "xlsx")}
            download
            className={buttonClasses("secondary", "md")}
          >
            <FileSpreadsheet className="size-5 text-status-free-text" aria-hidden />
            Excel
          </a>
          <a
            href={adminApi.exportUrl(data.sale.id, "docx")}
            download
            className={buttonClasses("secondary", "md")}
          >
            <FileText className="size-5 text-[#2b579a]" aria-hidden />
            Word
          </a>
          <Link
            href={`/admin/schedule/${data.sale.id}?print=1`}
            target="_blank"
            className={buttonClasses("secondary", "md")}
          >
            <Printer className="size-5" aria-hidden />
            Печать
          </Link>
        </div>
      )}
    </Modal>
  );
}

const summaryLabel =
  "eyebrow text-muted max-md:text-sm max-md:font-medium max-md:tracking-normal max-md:normal-case";

function ScheduleSummaryGrid({ schedule }: { schedule: Schedule }) {
  const { sale } = schedule;
  return (
    <div className="space-y-3">
      {sale.overdue_count > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-status-sold-fill px-4 py-3 text-sm font-semibold text-status-sold-text"
        >
          <CalendarClock className="size-4" aria-hidden />
          Просрочено платежей: {sale.overdue_count} на сумму {formatMoney(sale.overdue_amount)}
        </p>
      )}
      <dl className="grid gap-px overflow-hidden rounded-2xl bg-line max-md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {scheduleSummary(sale).map(([k, v]) => (
          <div key={k} className="bg-white px-4 py-3 max-md:px-3">
            <dt className={summaryLabel}>{k}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
        <div className="bg-white px-4 py-3 max-md:px-3">
          <dt className={summaryLabel}>Оплачено всего</dt>
          <dd className="mt-1 font-semibold text-status-free-text tabular-nums">
            {formatMoney(sale.paid_total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ScheduleTable({ schedule }: { schedule: Schedule }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState<number | null>(null);
  const [resetting, setResetting] = useState<Payment | null>(null);
  const { payments, sale } = schedule;

  const onUpdated = (next: Schedule) => {
    queryClient.setQueryData(["admin", "schedule", sale.id], next);
    // Lists, the buyer card and the overdue counter all depend on payments.
    queryClient.invalidateQueries({
      predicate: (q) => !(q.queryKey[1] === "schedule" && q.queryKey[2] === sale.id),
    });
  };

  const reset = useMutation({
    mutationFn: (p: Payment) => adminApi.resetInstallment(p.id),
    onSuccess: (next) => {
      onUpdated(next);
      toast("Оплата отменена", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка", "error"),
    onSettled: () => setResetting(null),
  });

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.paid_amount, 0);
  const isMobile = useIsMobile();
  const payingPayment = payments.find((p) => p.id === paying);

  return (
    <>
      {/* Phones: one card per payment instead of the wide table. */}
      <div className="md:hidden">
        <p className="mb-3 flex items-baseline justify-between gap-3 text-sm text-muted">
          <span>
            Платежей: <span className="font-semibold text-ink">{payments.length}</span>
          </span>
          <span>
            Осталось:{" "}
            <span className="font-semibold text-ink tabular-nums">
              {formatMoney(totalAmount - totalPaid)}
            </span>
          </span>
        </p>
        <ol className="space-y-2.5">
          {payments.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              disabled={sale.is_archived}
              onPay={() => setPaying(p.id)}
              onReset={() => setResetting(p)}
            />
          ))}
        </ol>
      </div>
      <Modal
        open={isMobile && !!payingPayment}
        onClose={() => setPaying(null)}
        title={payingPayment ? `Оплата · платёж №${payingPayment.number}` : ""}
        size="sm"
        sheet="auto"
      >
        {payingPayment && (
          <PayForm
            key={payingPayment.id}
            payment={payingPayment}
            onCancel={() => setPaying(null)}
            onPaid={(next) => {
              setPaying(null);
              onUpdated(next);
            }}
          />
        )}
      </Modal>

      <div className="overflow-hidden rounded-2xl ring-1 ring-line max-md:hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[15px]">
            <caption className="sr-only">График платежей</caption>
            <thead>
              <tr className="bg-sand text-left text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                <th scope="col" className="px-4 py-3">
                  №
                </th>
                <th scope="col" className="px-3 py-3">
                  Дата платежа
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Сумма платежа
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Оплачено
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  Остаток долга после платежа
                </th>
                <th scope="col" className="px-3 py-3">
                  Статус
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  disabled={sale.is_archived}
                  paying={!isMobile && paying === p.id}
                  onPay={() => setPaying(p.id)}
                  onCancelPay={() => setPaying(null)}
                  onPaid={(next) => {
                    setPaying(null);
                    onUpdated(next);
                  }}
                  onReset={() => setResetting(p)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-sand font-bold">
                <td className="px-4 py-3" colSpan={2}>
                  Итого
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatMoney(totalAmount)}</td>
                <td className="px-3 py-3 text-right text-status-free-text tabular-nums">
                  {formatMoney(totalPaid)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums" colSpan={1}>
                  {formatMoney(totalAmount - totalPaid)}
                  <span className="block text-xs font-medium text-muted">осталось</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        <ConfirmDialog
          open={resetting !== null}
          title="Отменить оплату?"
          message={
            resetting
              ? `Платёж №${resetting.number} снова станет неоплаченным (${formatMoney(resetting.paid_amount)}).`
              : ""
          }
          confirmLabel="Отменить оплату"
          busy={reset.isPending}
          onConfirm={() => resetting && reset.mutate(resetting)}
          onCancel={() => setResetting(null)}
        />
      </div>
    </>
  );
}

function PaymentCard({
  payment: p,
  disabled,
  onPay,
  onReset,
}: {
  payment: Payment;
  disabled: boolean;
  onPay: () => void;
  onReset: () => void;
}) {
  const overdue = p.status === "overdue";
  const outstanding = p.amount - p.paid_amount;
  return (
    <li
      className={cn(
        "rounded-2xl bg-white p-4 ring-1 ring-line",
        overdue && "bg-status-sold-fill/50 ring-status-sold-line/40",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold">№{p.number}</span>
          <span
            className={cn(
              "text-[15px] tabular-nums",
              overdue ? "font-semibold text-status-sold-text" : "text-muted",
            )}
          >
            {numericDate.format(day(p.due_date))}
          </span>
        </p>
        <span className="flex items-center gap-1.5">
          {p.status !== "paid" && p.paid_amount > 0 && (
            <span className="text-sm text-muted">частично</span>
          )}
          <PaymentStatusBadge status={p.status} />
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-muted">Сумма</dt>
          <dd className="font-display text-base font-extrabold tabular-nums">
            {formatMoney(p.amount)}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-muted">Остаток после</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(p.balance_after)}</dd>
        </div>
        {p.paid_amount > 0 && (
          <div className="col-span-2">
            <dt className="sr-only">Оплачено</dt>
            <dd className={cn("tabular-nums", p.status === "paid" && "text-status-free-text")}>
              Оплачено {formatMoney(p.paid_amount)}
              {p.paid_date && (
                <span className="text-muted"> · {numericDate.format(day(p.paid_date))}</span>
              )}
            </dd>
          </div>
        )}
      </dl>
      {!disabled && (outstanding > 0 || p.paid_amount > 0) && (
        <div className="mt-3 flex gap-2">
          {outstanding > 0 && (
            <Button
              variant={overdue ? "dark" : "secondary"}
              className="h-11 flex-1"
              onClick={onPay}
            >
              <Check className="size-4" aria-hidden />
              Внести оплату
            </Button>
          )}
          {p.paid_amount > 0 && (
            <Button
              variant="ghost"
              className={cn("h-11", outstanding > 0 ? "w-11 px-0" : "flex-1")}
              onClick={onReset}
              aria-label={`Отменить оплату платежа №${p.number}`}
            >
              <Undo2 className="size-4" aria-hidden />
              {outstanding <= 0 && "Отменить оплату"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function PaymentRow({
  payment: p,
  disabled,
  paying,
  onPay,
  onCancelPay,
  onPaid,
  onReset,
}: {
  payment: Payment;
  disabled: boolean;
  paying: boolean;
  onPay: () => void;
  onCancelPay: () => void;
  onPaid: (next: Schedule) => void;
  onReset: () => void;
}) {
  const overdue = p.status === "overdue";
  const outstanding = p.amount - p.paid_amount;
  return (
    <>
      <tr
        className={cn(
          "border-t border-line/70",
          overdue && "bg-status-sold-fill/60 text-status-sold-text",
        )}
      >
        <td className="px-4 py-2.5 font-semibold">{p.number}</td>
        <td className={cn("px-3 py-2.5 whitespace-nowrap", overdue && "font-semibold")}>
          {numericDate.format(day(p.due_date))}
        </td>
        <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
          {formatMoney(p.amount)}
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          {p.paid_amount ? (
            <>
              <span className={cn(p.status === "paid" && "text-status-free-text")}>
                {formatMoney(p.paid_amount)}
              </span>
              {p.paid_date && (
                <span className="block text-xs text-muted">
                  {numericDate.format(day(p.paid_date))}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatMoney(p.balance_after)}</td>
        <td className="px-3 py-2.5">
          <PaymentStatusBadge status={p.status} />
          {p.status !== "paid" && p.paid_amount > 0 && (
            <span className="mt-1 block text-xs text-muted">частично</span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right whitespace-nowrap">
          {!disabled && outstanding > 0 && !paying && (
            <Button size="sm" variant={overdue ? "dark" : "secondary"} onClick={onPay}>
              <Check className="size-4" aria-hidden />
              Внести оплату
            </Button>
          )}
          {!disabled && p.paid_amount > 0 && !paying && (
            <button
              type="button"
              onClick={onReset}
              aria-label={`Отменить оплату платежа №${p.number}`}
              title="Отменить оплату"
              className="ml-1 inline-grid size-9 place-items-center rounded-full align-middle text-muted hover:bg-ink/5 hover:text-ink"
            >
              <Undo2 className="size-4" aria-hidden />
            </button>
          )}
        </td>
      </tr>
      {paying && (
        <tr className="bg-sand/70">
          <td colSpan={7} className="px-4 py-3">
            <PayForm payment={p} onCancel={onCancelPay} onPaid={onPaid} />
          </td>
        </tr>
      )}
    </>
  );
}

function PayForm({
  payment,
  onCancel,
  onPaid,
}: {
  payment: Payment;
  onCancel: () => void;
  onPaid: (next: Schedule) => void;
}) {
  const toast = useToast();
  const id = useId();
  const outstanding = payment.amount - payment.paid_amount;
  const [amount, setAmount] = useState<number | null>(outstanding);
  const [date, setDate] = useState(today());
  const [touched, setTouched] = useState(false);

  const error =
    amount === null || amount <= 0
      ? "Укажите сумму больше нуля"
      : amount > outstanding
        ? `Сумма больше остатка по платежу (${formatMoney(outstanding)})`
        : !date
          ? "Укажите дату оплаты"
          : date > today()
            ? "Дата оплаты не может быть в будущем"
            : null;

  const pay = useMutation({
    mutationFn: () => adminApi.payInstallment(payment.id, { amount: amount!, paid_date: date }),
    onSuccess: (next) => {
      toast(
        amount === outstanding
          ? `Платёж №${payment.number} оплачен`
          : `Частичная оплата по платежу №${payment.number}: ${formatMoney(amount!)}`,
        "success",
      );
      onPaid(next);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка сохранения", "error"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (error || pay.isPending) return;
    pay.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-wrap items-end gap-3 max-md:grid max-md:grid-cols-[auto_1fr] max-md:gap-4"
    >
      <p className="w-full text-sm font-semibold max-md:col-span-2 max-md:text-[15px]">
        Оплата по платежу №{payment.number}
        <span className="font-normal text-muted"> · к оплате {formatMoney(outstanding)}</span>
      </p>
      <div className="w-48 max-md:col-span-2 max-md:w-full">
        <label
          htmlFor={`${id}-amount`}
          className="mb-1 block text-xs font-semibold text-muted max-md:text-sm"
        >
          Сумма
        </label>
        <MoneyInput
          id={`${id}-amount`}
          value={amount}
          onChange={setAmount}
          invalid={touched && !!error}
        />
      </div>
      <div className="w-44 max-md:col-span-2 max-md:w-full">
        <label
          htmlFor={`${id}-date`}
          className="mb-1 block text-xs font-semibold text-muted max-md:text-sm"
        >
          Дата оплаты
        </label>
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className={cn(inputClass, "bg-white")}
        />
      </div>
      <Button
        type="submit"
        size="md"
        disabled={pay.isPending}
        className="max-md:order-2 max-md:h-12"
      >
        {pay.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Check className="size-4" aria-hidden />
        )}
        Сохранить
      </Button>
      <Button variant="ghost" onClick={onCancel} className="max-md:order-1 max-md:h-12">
        <X className="size-4" aria-hidden />
        Отмена
      </Button>
      {touched && error && (
        <p role="alert" className="w-full text-sm text-status-sold-text max-md:col-span-2">
          {error}
        </p>
      )}
    </form>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, Phone, UserRound, Wallet } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatArea, formatMoney, formatNumber, isValidTjPhone, maskTjPhone } from "@/lib/format";
import {
  addMonths,
  buildSchedule,
  financedAmount,
  MAX_TERM_MONTHS,
  monthsLabel,
} from "@/lib/installments";
import type { PaymentType, Sale, SaleInput } from "@/lib/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { inputClass, labelClass } from "./ui";

export type SaleUnit = {
  id: number;
  name: string;
  block_letter: string;
  floor_label: string;
  area: number;
  price_per_m2: number | null;
};

export function unitSubtitle(u: Pick<SaleUnit, "name" | "block_letter" | "floor_label" | "area">) {
  return `${u.name} · Блок ${u.block_letter} · ${u.floor_label} · ${formatArea(u.area)}`;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const shortDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" });
export const isoDay = (iso: string) => new Date(`${iso}T00:00:00`);

const TERM_PRESETS = [6, 12, 24] as const;
const PREVIEW_HEAD = 4;

/** Whole somoni typed with spaces as thousands separators: "250 000" ⇄ 250000. */
export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  readOnly,
}: {
  id: string;
  value: number | null;
  onChange?: (v: number | null) => void;
  invalid?: boolean;
  describedBy?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        readOnly={readOnly}
        value={value === null ? "" : formatNumber(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
          onChange?.(digits ? Number(digits) : null);
        }}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(
          inputClass,
          "pr-16 tabular-nums",
          readOnly && "cursor-default bg-sand-deep/60 focus:bg-sand-deep/60",
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted">
        смн
      </span>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  errorId,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  errorId?: string;
  required?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {required && <span className="text-status-sold-text"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-status-sold-text">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

/**
 * «Продажа квартиры»: buyer data and payment terms are required before a unit becomes
 * «Продано». Closing the modal sends nothing, so the unit keeps its previous status.
 * With `sale` it edits an existing record instead.
 */
export function SaleFormModal({
  unit,
  sale,
  onClose,
  onSaved,
}: {
  unit: SaleUnit | null;
  sale?: Sale | null;
  onClose: () => void;
  onSaved?: (sale: Sale) => void;
}) {
  return (
    <Modal
      open={unit !== null}
      onClose={onClose}
      title={sale ? "Данные покупателя" : "Продажа квартиры"}
      description={unit ? unitSubtitle(unit) : undefined}
      size="lg"
    >
      {unit && (
        <SaleForm
          key={`${unit.id}-${sale?.id ?? "new"}`}
          unit={unit}
          sale={sale ?? null}
          onCancel={onClose}
          onSaved={(s) => {
            onSaved?.(s);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function SaleForm({
  unit,
  sale,
  onCancel,
  onSaved,
}: {
  unit: SaleUnit;
  sale: Sale | null;
  onCancel: () => void;
  onSaved: (sale: Sale) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const id = useId();
  const ids = {
    name: `${id}-name`,
    phone: `${id}-phone`,
    paid: `${id}-paid`,
    total: `${id}-total`,
    rest: `${id}-rest`,
    date: `${id}-date`,
    term: `${id}-term`,
    first: `${id}-first`,
    markup: `${id}-markup`,
    comment: `${id}-comment`,
  };
  const defaultTotal = unit.price_per_m2 ? Math.round(unit.area * unit.price_per_m2) : null;

  const [name, setName] = useState(sale?.buyer_name ?? "");
  const [phone, setPhone] = useState(sale ? maskTjPhone(sale.buyer_phone) : "+992 ");
  const [total, setTotal] = useState<number | null>(
    sale ? (sale.total_price === null ? null : Math.round(sale.total_price)) : defaultTotal,
  );
  const [paid, setPaid] = useState<number | null>(sale ? Math.round(sale.down_payment) : null);
  const [date, setDate] = useState(sale?.sale_date ?? today());
  const [type, setType] = useState<PaymentType>(sale?.payment_type ?? "installment");
  const [term, setTerm] = useState<number | null>(sale?.term_months ?? 12);
  const [customTerm, setCustomTerm] = useState(
    sale?.term_months != null && !TERM_PRESETS.includes(sale.term_months as 6),
  );
  // Follows the sale date (+1 month) until the admin picks a date by hand.
  const [firstDate, setFirstDate] = useState<string | null>(sale?.first_payment_date ?? null);
  const [markup, setMarkup] = useState(sale?.markup_percent ? String(sale.markup_percent) : "");
  const [comment, setComment] = useState(sale?.comment ?? "");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const installment = type === "installment";
  const first = firstDate ?? (date ? addMonths(date, 1) : "");
  const markupValue = markup.trim() ? Number(markup.replace(",", ".")) : 0;

  // Editing a schedule keeps rows that already have money on them; the preview does too.
  const existing = useQuery({
    queryKey: ["admin", "schedule", sale?.id],
    queryFn: () => adminApi.schedule(sale!.id),
    enabled: !!sale && sale.payment_type === "installment",
  });
  const paidRows = (existing.data?.payments ?? []).filter((p) => p.paid_amount > 0);

  const rest = total !== null && paid !== null ? total - paid : null;
  const debt =
    installment && rest !== null && rest > 0 && Number.isFinite(markupValue)
      ? financedAmount(total!, paid!, markupValue)
      : null;
  const preview =
    debt !== null && term !== null && first ? buildSchedule(debt, term, first, paidRows) : null;

  const errors = {
    name: name.trim().length < 2 ? "Укажите ФИО покупателя" : null,
    phone: !isValidTjPhone(phone) ? "Номер в формате +992 XX XXX XXXX (9 цифр после +992)" : null,
    total: total === null || total <= 0 ? "Укажите общую стоимость квартиры (больше нуля)" : null,
    paid:
      paid === null || paid <= 0
        ? "Первоначальный взнос должен быть больше нуля"
        : total !== null && paid > total
          ? "Первоначальный взнос не может превышать общую стоимость"
          : installment && total !== null && paid === total
            ? "Остаток равен нулю — выберите «Полная оплата»"
            : null,
    date: !date ? "Укажите дату продажи" : null,
    term:
      installment && (term === null || term < 1 || term > MAX_TERM_MONTHS)
        ? `Укажите срок рассрочки — от 1 до ${MAX_TERM_MONTHS} месяцев`
        : installment && term! < paidRows.length
          ? `Срок должен быть больше числа уже оплаченных платежей (${paidRows.length})`
          : null,
    first: !installment
      ? null
      : !first
        ? "Укажите дату первого платежа"
        : date && first < date
          ? "Дата первого платежа не может быть раньше даты продажи"
          : null,
    markup:
      installment && (!Number.isFinite(markupValue) || markupValue < 0 || markupValue > 100)
        ? "Наценка — число от 0 до 100%"
        : null,
    schedule:
      installment && debt !== null && term !== null && first && preview === null
        ? "Остаток слишком мал для такого срока рассрочки"
        : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : null);

  function body(): SaleInput {
    return {
      buyer_name: name.trim(),
      buyer_phone: phone.replace(/\s/g, ""),
      total_price: total!,
      down_payment: paid!,
      sale_date: date,
      comment: comment.trim() || null,
      payment_type: type,
      term_months: installment ? term : null,
      markup_percent: installment ? markupValue : 0,
      first_payment_date: installment ? first : null,
    };
  }

  // Confirmation is needed only when a saved schedule would be regenerated.
  const termsChanged =
    !!sale &&
    sale.payment_type === "installment" &&
    (sale.total_price !== total ||
      sale.down_payment !== paid ||
      sale.payment_type !== type ||
      (installment &&
        (sale.term_months !== term ||
          sale.markup_percent !== markupValue ||
          sale.first_payment_date !== first)));

  const save = useMutation({
    mutationFn: () =>
      sale ? adminApi.updateSale(sale.id, body()) : adminApi.sell(unit.id, body()),
    onSuccess: (saved) => {
      queryClient.invalidateQueries();
      toast(
        sale
          ? termsChanged
            ? "График платежей пересчитан"
            : "Данные покупателя обновлены"
          : `${unit.name} (блок ${unit.block_letter}) — продано`,
        "success",
      );
      onSaved(saved);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка сохранения", "error"),
    onSettled: () => setConfirming(false),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || save.isPending) return;
    if (termsChanged) setConfirming(true);
    else save.mutate();
  }

  function chooseType(next: PaymentType) {
    setType(next);
    if (next === "full") setPaid(total);
    else if (paid !== null && paid === total) setPaid(null);
  }

  const iconInput = (Icon: typeof Phone) => (
    <Icon
      className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
      aria-hidden
    />
  );
  const pill = (active: boolean) =>
    cn(
      "h-11 rounded-xl px-4 text-sm font-bold transition-colors",
      active ? "bg-ink text-gold" : "bg-sand text-ink hover:bg-sand-deep",
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="ФИО покупателя"
          htmlFor={ids.name}
          required
          error={show("name")}
          errorId={`${ids.name}-err`}
          className="sm:col-span-2"
        >
          <div className="relative">
            {iconInput(UserRound)}
            <input
              id={ids.name}
              data-autofocus
              autoComplete="off"
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!show("name")}
              aria-describedby={show("name") ? `${ids.name}-err` : undefined}
              className={cn(inputClass, "pl-10")}
            />
          </div>
        </Field>

        <Field
          label="Номер телефона"
          htmlFor={ids.phone}
          required
          error={show("phone")}
          errorId={`${ids.phone}-err`}
        >
          <div className="relative">
            {iconInput(Phone)}
            <input
              id={ids.phone}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => setPhone(maskTjPhone(e.target.value))}
              aria-invalid={!!show("phone")}
              aria-describedby={show("phone") ? `${ids.phone}-err` : undefined}
              className={cn(inputClass, "pl-10 tabular-nums")}
            />
          </div>
        </Field>

        <Field
          label="Дата продажи"
          htmlFor={ids.date}
          required
          error={show("date")}
          errorId={`${ids.date}-err`}
        >
          <div className="relative">
            {iconInput(CalendarDays)}
            <input
              id={ids.date}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={!!show("date")}
              className={cn(inputClass, "pl-10")}
            />
          </div>
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-2xl p-4 ring-1 ring-line sm:p-5">
        <legend className="px-1.5 eyebrow text-gold-deep">Оплата</legend>

        <div role="group" aria-label="Способ оплаты" className="grid grid-cols-2 gap-2">
          {(
            [
              ["full", "Полная оплата"],
              ["installment", "Рассрочка"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => chooseType(value)}
              className={pill(type === value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Общая стоимость квартиры, сомони"
            htmlFor={ids.total}
            required
            error={show("total")}
            errorId={`${ids.total}-err`}
            hint={
              defaultTotal !== null
                ? `По прайсу: ${formatArea(unit.area)} × ${formatMoney(unit.price_per_m2!)} = ${formatMoney(defaultTotal)}`
                : undefined
            }
          >
            <MoneyInput
              id={ids.total}
              value={total}
              onChange={(v) => {
                setTotal(v);
                if (!installment) setPaid(v);
              }}
              invalid={!!show("total")}
              describedBy={show("total") ? `${ids.total}-err` : undefined}
            />
          </Field>

          <Field
            label={installment ? "Первоначальный взнос, сомони" : "Оплачено сейчас, сомони"}
            htmlFor={ids.paid}
            required
            error={show("paid")}
            errorId={`${ids.paid}-err`}
            hint={
              installment ? "Сколько покупатель оплатил сейчас" : "Полная оплата — вся стоимость"
            }
          >
            <MoneyInput
              id={ids.paid}
              value={paid}
              onChange={setPaid}
              readOnly={!installment}
              invalid={!!show("paid")}
              describedBy={show("paid") ? `${ids.paid}-err` : undefined}
            />
          </Field>
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-2xl px-5 py-4",
            rest !== null && rest < 0 ? "bg-status-sold-fill" : "bg-ink text-white",
          )}
          aria-live="polite"
        >
          <span className="flex items-center gap-3">
            <Wallet
              className={cn(
                "size-5",
                rest !== null && rest < 0 ? "text-status-sold-text" : "text-gold",
              )}
              aria-hidden
            />
            <span id={ids.rest} className="eyebrow">
              Остаток
            </span>
          </span>
          <output
            htmlFor={`${ids.paid} ${ids.total}`}
            aria-labelledby={ids.rest}
            className={cn(
              "font-display text-2xl font-extrabold tabular-nums",
              rest !== null && rest < 0
                ? "text-status-sold-text"
                : rest === 0
                  ? "text-[#86efac]"
                  : "text-gold",
            )}
          >
            {rest === null ? "—" : formatMoney(rest)}
          </output>
        </div>

        {installment && (
          <>
            <Field
              label="Срок рассрочки"
              htmlFor={ids.term}
              required
              error={show("term")}
              errorId={`${ids.term}-err`}
            >
              <div className="flex flex-wrap gap-2">
                {TERM_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={!customTerm && term === n}
                    onClick={() => {
                      setCustomTerm(false);
                      setTerm(n);
                    }}
                    className={pill(!customTerm && term === n)}
                  >
                    {n} мес.
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={customTerm}
                  onClick={() => setCustomTerm(true)}
                  className={pill(customTerm)}
                >
                  Другой срок
                </button>
                {customTerm && (
                  <div className="relative w-36">
                    <input
                      id={ids.term}
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus
                      value={term ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
                        setTerm(digits ? Number(digits) : null);
                      }}
                      aria-invalid={!!show("term")}
                      aria-describedby={show("term") ? `${ids.term}-err` : undefined}
                      aria-label={`Срок в месяцах, от 1 до ${MAX_TERM_MONTHS}`}
                      className={cn(inputClass, "pr-14 tabular-nums")}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted">
                      мес.
                    </span>
                  </div>
                )}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Дата первого платежа"
                htmlFor={ids.first}
                required
                error={show("first")}
                errorId={`${ids.first}-err`}
                hint={firstDate === null ? "Через месяц после продажи" : undefined}
              >
                <div className="relative">
                  {iconInput(CalendarDays)}
                  <input
                    id={ids.first}
                    type="date"
                    value={first}
                    min={date || undefined}
                    onChange={(e) => setFirstDate(e.target.value || null)}
                    aria-invalid={!!show("first")}
                    className={cn(inputClass, "pl-10")}
                  />
                </div>
              </Field>

              <Field
                label="Наценка за рассрочку, %"
                htmlFor={ids.markup}
                error={show("markup")}
                errorId={`${ids.markup}-err`}
                hint="Необязательно, по умолчанию 0"
              >
                <div className="relative">
                  <input
                    id={ids.markup}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))}
                    aria-invalid={!!show("markup")}
                    className={cn(inputClass, "pr-10 tabular-nums")}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted">
                    %
                  </span>
                </div>
              </Field>
            </div>

            <SchedulePreview
              rows={preview}
              debt={debt}
              rest={rest}
              paidCount={paidRows.length}
              error={errors.schedule}
            />
          </>
        )}
      </fieldset>

      <Field label="Комментарий" htmlFor={ids.comment}>
        <textarea
          id={ids.comment}
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Номер договора, договорённости…"
          className={cn(inputClass, "h-auto py-3")}
        />
      </Field>

      {touched && hasErrors && (
        <p role="alert" className="text-sm font-medium text-status-sold-text">
          Проверьте отмеченные поля.
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {sale ? "Сохранить изменения" : "Сохранить продажу"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Пересчитать график?"
        message={
          paidRows.length > 0
            ? `Оплаченные платежи (${paidRows.length}) сохранятся, остальные будут сформированы заново по новым условиям.`
            : "Неоплаченные платежи будут сформированы заново по новым условиям."
        }
        confirmLabel="Пересчитать"
        busy={save.isPending}
        onConfirm={() => save.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}

/** Monthly payment and the first rows of the schedule, updated as the admin types. */
function SchedulePreview({
  rows,
  debt,
  rest,
  paidCount,
  error,
}: {
  rows: ReturnType<typeof buildSchedule>;
  debt: number | null;
  rest: number | null;
  paidCount: number;
  error: string | null;
}) {
  const fresh = rows?.slice(paidCount) ?? [];
  const head = fresh.slice(0, PREVIEW_HEAD);
  const tail = fresh.length > PREVIEW_HEAD ? fresh[fresh.length - 1] : null;
  const skipped = fresh.length - head.length - (tail ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-2xl bg-sand" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-4 pb-3">
        <div>
          <p className="eyebrow text-muted">Ежемесячный платёж</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-gold-deep tabular-nums">
            {fresh.length ? formatMoney(fresh[0].amount) : "—"}
          </p>
        </div>
        {debt !== null && rows && (
          <p className="text-right text-sm text-muted">
            {debt !== rest && (
              <>
                С наценкой: <span className="font-semibold text-ink">{formatMoney(debt)}</span>
                <br />
              </>
            )}
            {paidCount > 0 ? `Новых платежей: ${fresh.length}` : monthsLabel(rows.length)}
          </p>
        )}
      </div>
      {error ? (
        <p className="px-5 pb-4 text-sm text-status-sold-text">{error}</p>
      ) : fresh.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-muted">
          Заполните стоимость, взнос и срок — здесь появится график.
        </p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Первые платежи по графику</caption>
          <thead>
            <tr className="border-t border-line text-left text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
              <th scope="col" className="px-5 py-2">
                №
              </th>
              <th scope="col" className="px-2 py-2">
                Дата платежа
              </th>
              <th scope="col" className="px-5 py-2 text-right">
                Сумма
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {head.map((r) => (
              <PreviewLine key={r.number} row={r} />
            ))}
            {skipped > 0 && (
              <tr className="border-t border-line/70 text-muted">
                <td colSpan={3} className="px-5 py-1.5 text-center">
                  … ещё {skipped} …
                </td>
              </tr>
            )}
            {tail && <PreviewLine row={tail} />}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PreviewLine({ row }: { row: { number: number; due_date: string; amount: number } }) {
  return (
    <tr className="border-t border-line/70">
      <td className="px-5 py-2 font-semibold">{row.number}</td>
      <td className="px-2 py-2">{shortDate.format(isoDay(row.due_date))}</td>
      <td className="px-5 py-2 text-right font-semibold">{formatMoney(row.amount)}</td>
    </tr>
  );
}

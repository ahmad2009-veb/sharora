"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, Phone, UserRound, Wallet } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatArea, formatMoney, formatNumber, isValidTjPhone, maskTjPhone } from "@/lib/format";
import type { Sale, SaleInput } from "@/lib/types";

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

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Whole somoni typed with spaces as thousands separators: "250 000" ⇄ 250000. */
function MoneyInput({
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
        className={cn(inputClass, "pr-16 tabular-nums", readOnly && "cursor-default")}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted">
        смн
      </span>
    </div>
  );
}

function Field({
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
 * «Продажа квартиры»: buyer data is required before a unit becomes «Продано».
 * Closing the modal sends nothing, so the unit keeps its previous status.
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
    comment: `${id}-comment`,
  };
  const defaultTotal = unit.price_per_m2 ? Math.round(unit.area * unit.price_per_m2) : null;

  const [name, setName] = useState(sale?.buyer_name ?? "");
  const [phone, setPhone] = useState(sale ? maskTjPhone(sale.buyer_phone) : "+992 ");
  const [paid, setPaid] = useState<number | null>(sale ? Math.round(sale.amount_paid) : null);
  const [total, setTotal] = useState<number | null>(
    sale ? (sale.total_price === null ? null : Math.round(sale.total_price)) : defaultTotal,
  );
  const [date, setDate] = useState(sale?.sale_date ?? today());
  const [comment, setComment] = useState(sale?.comment ?? "");
  const [touched, setTouched] = useState(false);

  const errors = {
    name: name.trim().length < 2 ? "Укажите ФИО покупателя" : null,
    phone: !isValidTjPhone(phone) ? "Номер в формате +992 XX XXX XXXX (9 цифр после +992)" : null,
    paid:
      paid === null || paid <= 0
        ? "Укажите сумму оплаты больше нуля"
        : total !== null && paid > total
          ? "Сумма оплаты не может превышать общую стоимость"
          : null,
    total: total !== null && total <= 0 ? "Стоимость должна быть больше нуля" : null,
    date: !date ? "Укажите дату продажи" : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : null);
  const remaining = total !== null && paid !== null ? total - paid : null;

  const save = useMutation({
    mutationFn: () => {
      const body: SaleInput = {
        buyer_name: name.trim(),
        buyer_phone: phone.replace(/\s/g, ""),
        amount_paid: paid!,
        total_price: total,
        sale_date: date,
        comment: comment.trim() || null,
      };
      return sale ? adminApi.updateSale(sale.id, body) : adminApi.sell(unit.id, body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries();
      toast(
        sale ? "Данные покупателя обновлены" : `${unit.name} (блок ${unit.block_letter}) — продано`,
        "success",
      );
      onSaved(saved);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка сохранения", "error"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || save.isPending) return;
    save.mutate();
  }

  const iconInput = (Icon: typeof Phone) => (
    <Icon
      className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
      aria-hidden
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
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

        <Field
          label="Сумма оплаты, сомони"
          htmlFor={ids.paid}
          required
          error={show("paid")}
          errorId={`${ids.paid}-err`}
        >
          <MoneyInput
            id={ids.paid}
            value={paid}
            onChange={setPaid}
            invalid={!!show("paid")}
            describedBy={show("paid") ? `${ids.paid}-err` : undefined}
          />
        </Field>

        <Field
          label="Общая стоимость квартиры, сомони"
          htmlFor={ids.total}
          error={show("total")}
          errorId={`${ids.total}-err`}
          hint={
            defaultTotal !== null && !sale
              ? `По прайсу: ${formatArea(unit.area)} × ${formatMoney(unit.price_per_m2!)} = ${formatMoney(defaultTotal)}`
              : "Необязательно"
          }
        >
          <MoneyInput id={ids.total} value={total} onChange={setTotal} invalid={!!show("total")} />
        </Field>
      </div>

      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-2xl px-5 py-4",
          remaining !== null && remaining < 0 ? "bg-status-sold-fill" : "bg-ink text-white",
        )}
        aria-live="polite"
      >
        <span className="flex items-center gap-3">
          <Wallet
            className={cn(
              "size-5",
              remaining !== null && remaining < 0 ? "text-status-sold-text" : "text-gold",
            )}
            aria-hidden
          />
          <span id={ids.rest} className="eyebrow">
            Остаток к оплате
          </span>
        </span>
        <output
          htmlFor={`${ids.paid} ${ids.total}`}
          aria-labelledby={ids.rest}
          className={cn(
            "font-display text-2xl font-extrabold tabular-nums",
            remaining !== null && remaining < 0
              ? "text-status-sold-text"
              : remaining === 0
                ? "text-[#86efac]"
                : "text-gold",
          )}
        >
          {remaining === null ? "—" : formatMoney(remaining)}
        </output>
      </div>

      <Field label="Комментарий" htmlFor={ids.comment}>
        <textarea
          id={ids.comment}
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Условия рассрочки, номер договора…"
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
    </form>
  );
}

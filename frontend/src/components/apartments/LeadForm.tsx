"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleCheck, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isValidTjPhone, maskTjPhone } from "@/lib/format";

const inputClass =
  "h-12 w-full rounded-xl bg-sand px-4 text-base ring-1 ring-transparent transition-[box-shadow,background-color] placeholder:text-muted/70 hover:ring-line focus:bg-white focus:ring-2 focus:ring-gold-soft focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-600";

export function LeadForm({
  unitId,
  onBack,
  compact = false,
}: {
  unitId: number | null;
  onBack?: () => void;
  /** Inline variant (unit card): no intro text, no comment field, no autofocus. */
  compact?: boolean;
}) {
  const t = useTranslations("lead");
  const toast = useToast();
  const ids = {
    name: useId(),
    phone: useId(),
    message: useId(),
    nameErr: useId(),
    phoneErr: useId(),
  };
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+992 ");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);

  const nameError = name.trim().length < 2 ? t("nameInvalid") : null;
  const phoneError = !isValidTjPhone(phone) ? t("phoneInvalid") : null;

  const mutation = useMutation({
    mutationFn: () =>
      api.createLead({
        unit_id: unitId,
        name: name.trim(),
        phone: phone.replace(/\s/g, ""),
        message: message.trim() || null,
      }),
    onSuccess: () => toast(t("success"), "success"),
    onError: (err) =>
      toast(err instanceof ApiError && err.status !== 500 ? err.message : t("error"), "error"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError || phoneError || mutation.isPending) return;
    mutation.mutate();
  }

  if (mutation.isSuccess) {
    return (
      <div
        role="status"
        className="flex flex-col items-center rounded-card bg-sand px-4 py-8 text-center"
      >
        <span className="grid size-14 place-items-center rounded-full bg-gold text-on-gold shadow-glow">
          <CircleCheck className="size-7" aria-hidden />
        </span>
        <p className="mt-5 max-w-sm font-display text-lg font-bold">{t("success")}</p>
        {onBack && (
          <Button variant="secondary" className="mt-6" onClick={onBack}>
            {t("back")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && <p className="text-[15px] text-muted">{t("text")}</p>}
      <div>
        <label htmlFor={ids.name} className="mb-1.5 block eyebrow text-muted">
          {t("name")}
        </label>
        <input
          id={ids.name}
          autoFocus={!compact}
          autoComplete="name"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={touched && !!nameError}
          aria-describedby={touched && nameError ? ids.nameErr : undefined}
          className={inputClass}
        />
        {touched && nameError && (
          <p id={ids.nameErr} className="mt-1.5 text-sm text-red-700">
            {nameError}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={ids.phone} className="mb-1.5 block eyebrow text-muted">
          {t("phone")}
        </label>
        <input
          id={ids.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(maskTjPhone(e.target.value))}
          aria-invalid={touched && !!phoneError}
          aria-describedby={touched && phoneError ? ids.phoneErr : undefined}
          className={cn(inputClass, "tabular-nums")}
        />
        {touched && phoneError && (
          <p id={ids.phoneErr} className="mt-1.5 text-sm text-red-700">
            {phoneError}
          </p>
        )}
      </div>
      {!compact && (
        <div>
          <label htmlFor={ids.message} className="mb-1.5 block eyebrow text-muted">
            {t("message")}
          </label>
          <textarea
            id={ids.message}
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(inputClass, "h-auto py-3")}
          />
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            {t("back")}
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={mutation.isPending}
          className={cn("tracking-wider uppercase", compact && "w-full")}
        >
          {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mutation.isPending ? t("sending") : t("submit")}
        </Button>
      </div>
      <p className="text-center text-xs leading-snug text-muted">{t("consent")}</p>
    </form>
  );
}

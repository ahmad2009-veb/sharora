"use client";

import { CircleCheck, Loader2, Phone, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isValidTjPhone, maskTjPhone } from "@/lib/format";

const field =
  "h-14 w-full rounded-xl bg-ink pr-12 pl-5 text-[15px] text-white ring-1 ring-white/[0.06] transition-shadow placeholder:text-mist/70 focus:ring-2 focus:ring-gold focus:outline-none aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-sold-line";

/** Home-page consultation request: posts a lead (no unit) to the same API as the unit form. */
export function QuickLeadForm() {
  const locale = useLocale() as Locale;
  const t = useTranslations("lead");
  const toast = useToast();
  const cta = site.cta;
  const ids = { name: useId(), phone: useId(), nameErr: useId(), phoneErr: useId() };
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+992 ");
  const [rooms, setRooms] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const nameError = name.trim().length < 2 ? t("nameInvalid") : null;
  const phoneError = !isValidTjPhone(phone) ? t("phoneInvalid") : null;
  const roomLabel = cta.roomOptions.find((o) => o.value === rooms);

  // A plain request state instead of react-query's useMutation keeps that code out of the
  // home page's first load (this form is far below the fold).
  const [status, setStatus] = useState<"idle" | "pending" | "success">("idle");
  const mutation = { isPending: status === "pending", isSuccess: status === "success" };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameError || phoneError || mutation.isPending) return;
    setStatus("pending");
    api
      .createLead({
        unit_id: null,
        name: name.trim(),
        phone: phone.replace(/\s/g, ""),
        message: roomLabel ? `${cta.roomsLabel.ru}: ${roomLabel.label.ru}` : null,
      })
      .then(
        () => {
          setStatus("success");
          toast(t("success"), "success");
        },
        (err: unknown) => {
          setStatus("idle");
          toast(err instanceof ApiError && err.status !== 500 ? err.message : t("error"), "error");
        },
      );
  }

  return (
    <div className="relative rounded-panel bg-night p-7 shadow-deep ring-1 ring-white/[0.06] md:p-10">
      {mutation.isSuccess ? (
        <div role="status" className="flex flex-col items-center py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-gold text-on-gold shadow-glow">
            <CircleCheck className="size-8" aria-hidden />
          </span>
          <p className="mt-6 max-w-sm font-display text-2xl font-extrabold">{t("success")}</p>
          <a href={site.contact.phoneHref} className="mt-4 text-gold hover:text-white">
            {site.contact.phoneDisplay}
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div>
            <p className="font-display text-2xl font-extrabold">{tr(cta.formTitle, locale)}</p>
            <p className="mt-1 text-sm text-mist">{tr(cta.formText, locale)}</p>
          </div>
          <div>
            <label htmlFor={ids.name} className="mb-2 block eyebrow text-mist">
              {t("name")}
            </label>
            <div className="relative">
              <input
                id={ids.name}
                autoComplete="name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={touched && !!nameError}
                aria-describedby={touched && nameError ? ids.nameErr : undefined}
                className={field}
              />
              <User
                className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-mist"
                aria-hidden
              />
            </div>
            {touched && nameError && (
              <p id={ids.nameErr} className="mt-1.5 text-sm text-[#fca5a5]">
                {nameError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor={ids.phone} className="mb-2 block eyebrow text-mist">
              {t("phone")}
            </label>
            <div className="relative">
              <input
                id={ids.phone}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(maskTjPhone(e.target.value))}
                aria-invalid={touched && !!phoneError}
                aria-describedby={touched && phoneError ? ids.phoneErr : undefined}
                className={cn(field, "tabular-nums")}
              />
              <Phone
                className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-mist"
                aria-hidden
              />
            </div>
            {touched && phoneError && (
              <p id={ids.phoneErr} className="mt-1.5 text-sm text-[#fca5a5]">
                {phoneError}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 eyebrow text-mist">{tr(cta.roomsLabel, locale)}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cta.roomOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={rooms === o.value}
                  onClick={() => setRooms(rooms === o.value ? null : o.value)}
                  className={cn(
                    "h-11 rounded-xl text-[13px] font-bold transition-colors",
                    rooms === o.value
                      ? "bg-gold text-on-gold"
                      : "bg-ink text-mist ring-1 ring-white/[0.06] hover:text-white",
                  )}
                >
                  {tr(o.label, locale)}
                </button>
              ))}
            </div>
          </fieldset>
          <Button
            type="submit"
            size="lg"
            className="w-full tracking-wider uppercase max-md:tracking-wide max-md:whitespace-normal"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {mutation.isPending ? t("sending") : t("submit")}
          </Button>
          <p className="text-center text-xs text-mist">{t("consent")}</p>
        </form>
      )}
    </div>
  );
}

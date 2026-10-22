"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Circle,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AdminMe } from "@/lib/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { inputClass, labelClass } from "./ui";

// Same rules as backend/app/schemas/auth.py.
const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 8;

type T = ReturnType<typeof useTranslations<"adminAccount">>;
type Strength = "weak" | "medium" | "strong";

function passwordRules(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    letter: /\p{L}/u.test(password),
    digit: /\p{Nd}/u.test(password),
  };
}

/** Weak until the required rules pass; then length 12+, mixed case and symbols add up. */
function passwordStrength(password: string): Strength {
  const rules = passwordRules(password);
  if (!rules.length || !rules.letter || !rules.digit) return "weak";
  const bonus =
    Number(password.length >= 12) +
    Number(/\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)) +
    Number(/[^\p{L}\p{Nd}]/u.test(password));
  return bonus >= 2 ? "strong" : "medium";
}

const TG_MONTHS = [
  "январ",
  "феврал",
  "март",
  "апрел",
  "май",
  "июн",
  "июл",
  "август",
  "сентябр",
  "октябр",
  "ноябр",
  "декабр",
];

/** Browsers mostly ship no Tajik date names, so «22 октябр 2026, 14:05» is built by hand. */
function formatDate(iso: string, locale: string, withTime: boolean): string {
  const d = new Date(iso);
  if (locale !== "tg") {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "long",
      timeStyle: withTime ? "short" : undefined,
    }).format(d);
  }
  const day = `${d.getDate()} ${TG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return withTime ? `${day}, ${time}` : day;
}

/** 401 → back to the login page; other API errors are handled by the caller. */
function useSessionGuard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      queryClient.clear();
      router.replace("/admin-dashboard/login");
      return true;
    }
    return false;
  };
}

export function AccountPanel({ me }: { me: AdminMe }) {
  return (
    <div className="grid max-w-5xl items-start gap-6 max-md:gap-4 md:grid-cols-2">
      <AccountInfo me={me} />
      <UsernameForm me={me} />
      <PasswordForm />
      <SecurityCard />
    </div>
  );
}

function Card({
  title,
  hint,
  Icon,
  className,
  children,
}: {
  title: string;
  hint?: string;
  Icon: typeof UserRound;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-card bg-white p-6 shadow-soft max-md:rounded-[20px] max-md:p-4 md:p-8",
        className,
      )}
    >
      <div className="mb-6 flex items-start gap-3 max-md:mb-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-gold">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function AccountInfo({ me }: { me: AdminMe }) {
  const t = useTranslations("adminAccount");
  const locale = useLocale();
  const date = (iso: string) => formatDate(iso, locale, false);
  const dateTime = (iso: string) => formatDate(iso, locale, true);

  const items = [
    { label: t("info.username"), value: me.username, Icon: UserRound },
    { label: t("info.createdAt"), value: date(me.created_at), Icon: CalendarDays },
    {
      label: t("info.lastLogin"),
      value: me.last_login_at ? dateTime(me.last_login_at) : t("info.never"),
      Icon: Clock,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-card bg-ink p-6 text-white shadow-lift max-md:rounded-[20px] max-md:p-4 md:col-span-2 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-gold/10 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold font-display text-2xl font-extrabold text-on-gold max-md:size-12 max-md:text-xl">
          {me.username.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-gold">{t("info.title")}</p>
          <p className="mt-1 truncate font-display text-2xl font-extrabold max-md:text-xl">
            {me.username}
          </p>
        </div>
      </div>
      <dl className="relative mt-6 grid gap-3 max-md:mt-5 sm:grid-cols-3">
        {items.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
            <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-mist uppercase">
              <Icon className="size-4 text-gold" aria-hidden />
              {label}
            </dt>
            <dd className="mt-1.5 truncate text-[15px] font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FieldError({ id, children }: { id: string; children?: string | null }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-status-sold-text">
      {children}
    </p>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  error,
  describedBy,
  t,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: boolean;
  describedBy?: string;
  t: T;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        className={cn(inputClass, "pr-12", error && "ring-2 ring-status-sold-line")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("password.hide") : t("password.show")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted hover:text-ink"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden />
        ) : (
          <Eye className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

function UsernameForm({ me }: { me: AdminMe }) {
  const t = useTranslations("adminAccount");
  const toast = useToast();
  const queryClient = useQueryClient();
  const guard = useSessionGuard();
  const ids = {
    name: useId(),
    pass: useId(),
    nameErr: useId(),
    passErr: useId(),
    formErr: useId(),
  };
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  // Errors appear after the first submit, then follow the input. Showing them on blur would
  // push the button down between mousedown and click, and the click would miss it.
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<{ field: "name" | "password" | "form"; message: string }>();

  const trimmed = name.trim();
  const nameError = !trimmed
    ? t("errors.required")
    : !USERNAME_RE.test(trimmed)
      ? t("errors.usernameFormat")
      : trimmed === me.username
        ? t("errors.sameUsername")
        : null;
  const passwordError = password ? null : t("errors.required");
  const shownName = server?.field === "name" ? server.message : submitted ? nameError : null;
  const shownPassword =
    server?.field === "password" ? server.message : submitted ? passwordError : null;

  const save = useMutation({
    mutationFn: () => adminApi.changeUsername(trimmed, password),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "me"], data);
      toast(t("username.success"), "success");
      setName("");
      setPassword("");
      setSubmitted(false);
    },
    onError: (e) => {
      if (guard(e)) return;
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 400) setServer({ field: "password", message: t("errors.wrongPassword") });
      else if (status === 409) setServer({ field: "name", message: t("errors.taken") });
      else if (status === 422) setServer({ field: "name", message: t("errors.usernameFormat") });
      else if (status === 429) setServer({ field: "form", message: t("errors.tooMany") });
      else toast(t("errors.generic"), "error");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!nameError && !passwordError) save.mutate();
  }

  return (
    <Card title={t("username.title")} hint={t("username.hint")} Icon={UserRound}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor={ids.name} className={labelClass}>
            {t("username.newLabel")}
          </label>
          <input
            id={ids.name}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (server?.field !== "password") setServer(undefined);
            }}
            aria-invalid={!!shownName || undefined}
            aria-describedby={shownName ? ids.nameErr : undefined}
            className={cn(inputClass, shownName && "ring-2 ring-status-sold-line")}
          />
          <FieldError id={ids.nameErr}>{shownName}</FieldError>
        </div>
        <div>
          <label htmlFor={ids.pass} className={labelClass}>
            {t("username.currentPassword")}
          </label>
          <PasswordInput
            id={ids.pass}
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (server?.field !== "name") setServer(undefined);
            }}
            autoComplete="current-password"
            error={!!shownPassword}
            describedBy={shownPassword ? ids.passErr : undefined}
            t={t}
          />
          <FieldError id={ids.passErr}>{shownPassword}</FieldError>
        </div>
        <FieldError id={ids.formErr}>{server?.field === "form" ? server.message : null}</FieldError>
        <SubmitButton busy={save.isPending}>{t("username.submit")}</SubmitButton>
      </form>
    </Card>
  );
}

const STRENGTH_STYLE: Record<Strength, { bars: number; bar: string; text: string }> = {
  weak: { bars: 1, bar: "bg-status-sold-line", text: "text-status-sold-text" },
  medium: { bars: 2, bar: "bg-gold-soft", text: "text-gold-deep" },
  strong: { bars: 3, bar: "bg-status-free-line", text: "text-status-free-text" },
};

function PasswordForm() {
  const t = useTranslations("adminAccount");
  const toast = useToast();
  const queryClient = useQueryClient();
  const guard = useSessionGuard();
  const ids = {
    current: useId(),
    next: useId(),
    repeat: useId(),
    currentErr: useId(),
    nextErr: useId(),
    repeatErr: useId(),
    rules: useId(),
    formErr: useId(),
  };
  const empty = { current: "", next: "", repeat: "" };
  const [form, setForm] = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<{
    field: "current" | "next" | "form";
    message: string;
  }>();

  const rules = passwordRules(form.next);
  const rulesOk = rules.length && rules.letter && rules.digit;
  const different = !!form.next && form.next !== form.current;
  const matches = !!form.repeat && form.repeat === form.next;
  const strength = passwordStrength(form.next);

  const errors = {
    current: form.current ? null : t("errors.required"),
    next: !form.next
      ? t("errors.required")
      : !rulesOk
        ? t("errors.weak")
        : form.current && !different
          ? t("errors.samePassword")
          : null,
    repeat: !form.repeat ? t("errors.required") : !matches ? t("errors.mismatch") : null,
  };
  const shown = (field: keyof typeof errors) =>
    server?.field === field ? server.message : submitted ? errors[field] : null;

  const save = useMutation({
    mutationFn: () => adminApi.changePassword(form.current, form.next),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "me"], data);
      toast(t("password.success"), "success");
      setForm(empty);
      setSubmitted(false);
    },
    onError: (e) => {
      if (guard(e)) return;
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 400) setServer({ field: "current", message: t("errors.wrongPassword") });
      else if (status === 422)
        setServer({
          field: "next",
          message: different ? t("errors.weak") : t("errors.samePassword"),
        });
      else if (status === 429) setServer({ field: "form", message: t("errors.tooMany") });
      else toast(t("errors.generic"), "error");
    },
  });

  function update(field: keyof typeof empty, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (server?.field === "form" || server?.field === field || field === "current")
      setServer(undefined);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!errors.current && !errors.next && !errors.repeat) save.mutate();
  }

  const checklist = [
    { ok: rules.length, label: t("password.rules.length") },
    { ok: rules.letter, label: t("password.rules.letter") },
    { ok: rules.digit, label: t("password.rules.digit") },
    { ok: different, label: t("password.rules.different") },
    { ok: matches, label: t("password.rules.match") },
  ];
  const style = STRENGTH_STYLE[strength];

  return (
    <Card title={t("password.title")} hint={t("password.hint")} Icon={KeyRound}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor={ids.current} className={labelClass}>
            {t("password.current")}
          </label>
          <PasswordInput
            id={ids.current}
            value={form.current}
            onChange={(v) => update("current", v)}
            autoComplete="current-password"
            error={!!shown("current")}
            describedBy={shown("current") ? ids.currentErr : undefined}
            t={t}
          />
          <FieldError id={ids.currentErr}>{shown("current")}</FieldError>
        </div>
        <div>
          <label htmlFor={ids.next} className={labelClass}>
            {t("password.new")}
          </label>
          <PasswordInput
            id={ids.next}
            value={form.next}
            onChange={(v) => update("next", v)}
            autoComplete="new-password"
            error={!!shown("next")}
            describedBy={cn(ids.rules, shown("next") && ids.nextErr)}
            t={t}
          />
          <FieldError id={ids.nextErr}>{shown("next")}</FieldError>
          {form.next && (
            <div className="mt-3" aria-live="polite">
              <div className="flex gap-1.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i < style.bars ? style.bar : "bg-sand-deep",
                    )}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-sm text-muted">
                {t("password.strength")}:{" "}
                <span className={cn("font-semibold", style.text)}>{t(`password.${strength}`)}</span>
              </p>
            </div>
          )}
        </div>
        <div>
          <label htmlFor={ids.repeat} className={labelClass}>
            {t("password.repeat")}
          </label>
          <PasswordInput
            id={ids.repeat}
            value={form.repeat}
            onChange={(v) => update("repeat", v)}
            autoComplete="new-password"
            error={!!shown("repeat")}
            describedBy={shown("repeat") ? ids.repeatErr : undefined}
            t={t}
          />
          <FieldError id={ids.repeatErr}>{shown("repeat")}</FieldError>
        </div>
        <ul id={ids.rules} className="grid gap-1.5 rounded-2xl bg-sand p-4 text-sm">
          {checklist.map(({ ok, label }) => (
            <li
              key={label}
              className={cn("flex items-center gap-2", ok ? "text-status-free-text" : "text-muted")}
            >
              {ok ? (
                <Check className="size-4 shrink-0" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 opacity-50" aria-hidden />
              )}
              {label}
            </li>
          ))}
        </ul>
        <FieldError id={ids.formErr}>{server?.field === "form" ? server.message : null}</FieldError>
        <SubmitButton busy={save.isPending}>{t("password.submit")}</SubmitButton>
      </form>
    </Card>
  );
}

function SecurityCard() {
  const t = useTranslations("adminAccount");
  const toast = useToast();
  const guard = useSessionGuard();
  const [confirm, setConfirm] = useState(false);

  const logoutAll = useMutation({
    mutationFn: adminApi.logoutAll,
    onSuccess: () => {
      setConfirm(false);
      toast(t("security.success"), "success");
    },
    onError: (e) => {
      setConfirm(false);
      if (!guard(e)) toast(t("errors.generic"), "error");
    },
  });

  return (
    <Card
      title={t("security.title")}
      hint={t("security.text")}
      Icon={ShieldCheck}
      className="md:col-span-2"
    >
      <Button
        variant="dark"
        size="lg"
        onClick={() => setConfirm(true)}
        disabled={logoutAll.isPending}
        className="w-full sm:w-auto"
      >
        {logoutAll.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <LogOut className="size-4" aria-hidden />
        )}
        {t("security.button")}
      </Button>
      <ConfirmDialog
        open={confirm}
        title={t("security.confirmTitle")}
        message={t("security.confirmText")}
        confirmLabel={t("security.confirm")}
        cancelLabel={t("security.cancel")}
        busy={logoutAll.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => logoutAll.mutate()}
      />
    </Card>
  );
}

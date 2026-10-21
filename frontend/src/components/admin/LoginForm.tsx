"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, LockKeyhole } from "lucide-react";
import Image from "next/image";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Link, useRouter } from "@/i18n/navigation";
import { adminApi, ApiError } from "@/lib/api";

import { inputClass, labelClass } from "./ui";

export function LoginForm() {
  const router = useRouter();
  const ids = { user: useId(), pass: useId(), err: useId() };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => adminApi.login(username.trim(), password),
    onSuccess: () => router.replace("/admin"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (username && password) login.mutate();
  }

  const error = login.error
    ? login.error instanceof ApiError && login.error.status === 401
      ? "Неверный логин или пароль"
      : "Сервер недоступен. Попробуйте позже."
    : null;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-[14px] bg-white shadow-soft ring-1 ring-gold/30">
          <Image src="/logo.png" alt="" width={38} height={38} unoptimized />
        </span>
        <div>
          <p className="font-display text-lg font-extrabold tracking-[0.16em] uppercase">
            Зарафшон
          </p>
          <p className="eyebrow text-muted">Кабинет менеджера</p>
        </div>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-panel bg-white p-7 shadow-lift md:p-9"
        noValidate
      >
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold">
            <span className="grid size-10 place-items-center rounded-full bg-ink text-gold">
              <LockKeyhole className="size-5" aria-hidden />
            </span>
            Вход в панель
          </h1>
          <p className="mt-2 text-sm text-muted">Фонд квартир, заявки и настройки калькулятора.</p>
        </div>
        <div>
          <label htmlFor={ids.user} className={labelClass}>
            Логин
          </label>
          <input
            id={ids.user}
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            aria-describedby={error ? ids.err : undefined}
          />
        </div>
        <div>
          <label htmlFor={ids.pass} className={labelClass}>
            Пароль
          </label>
          <input
            id={ids.pass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-describedby={error ? ids.err : undefined}
          />
        </div>
        {error && (
          <p id={ids.err} role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full tracking-wider uppercase"
          disabled={login.isPending || !username || !password}
        >
          {login.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Войти
        </Button>
      </form>
      <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-ink">
        ← Вернуться на сайт
      </Link>
    </div>
  );
}

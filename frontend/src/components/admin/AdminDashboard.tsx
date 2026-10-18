"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ExternalLink,
  HandCoins,
  Inbox,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { Skeleton } from "@/components/ui/Skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { adminApi, api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

import { LeadsPanel } from "./LeadsPanel";
import { SalesPanel } from "./SalesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { UnitsPanel } from "./UnitsPanel";

type Tab = "units" | "sales" | "leads" | "settings";

const TABS: {
  value: Tab;
  label: string;
  title: string;
  eyebrow: string;
  Icon: typeof Building2;
}[] = [
  {
    value: "units",
    label: "Фонд квартир",
    title: "Фонд квартир",
    eyebrow: "База помещений",
    Icon: Building2,
  },
  {
    value: "sales",
    label: "Покупатели",
    title: "Покупатели и продажи",
    eyebrow: "Сделки",
    Icon: HandCoins,
  },
  { value: "leads", label: "Заявки", title: "Заявки и брони", eyebrow: "Клиенты", Icon: Inbox },
  {
    value: "settings",
    label: "Калькулятор",
    title: "Настройки калькулятора",
    eyebrow: "Рассрочка",
    Icon: Settings,
  },
];

export function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("units");
  const me = useQuery({ queryKey: ["admin", "me"], queryFn: adminApi.me, retry: false });
  const newLeads = useQuery({
    queryKey: ["admin", "leads", false],
    queryFn: () => adminApi.leads(false),
    enabled: me.isSuccess,
  });
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats, enabled: me.isSuccess });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) router.replace("/admin/login");
  }, [me.error, router]);

  const logout = useMutation({
    mutationFn: adminApi.logout,
    onSettled: () => {
      queryClient.clear();
      router.replace("/admin/login");
    },
  });

  if (!me.isSuccess) {
    return (
      <div className="flex min-h-[100svh]">
        <div className="hidden w-72 bg-ink lg:block" />
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-card" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      </div>
    );
  }

  const current = TABS.find((x) => x.value === tab)!;
  const inWork = stats.data ? stats.data.sold + stats.data.reserved : 0;
  const progress = stats.data?.total ? (inWork / stats.data.total) * 100 : 0;

  return (
    <div className="min-h-[100svh] lg:pl-72">
      <aside className="z-40 flex flex-col bg-ink text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-7 lg:pt-7 lg:pb-8">
          <Logo />
          <p className="mt-2 hidden eyebrow text-mist lg:block">Панель управления</p>
          <button
            type="button"
            onClick={() => logout.mutate()}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-mist hover:bg-white/10 hover:text-white lg:hidden"
          >
            <LogOut className="size-4" aria-hidden />
            Выйти
          </button>
        </div>

        <nav
          aria-label="Разделы админки"
          className="flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0"
        >
          {TABS.map(({ value, label, Icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(value)}
                className={cn(
                  "flex h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-all",
                  active
                    ? "bg-night text-gold ring-1 ring-gold/20"
                    : "text-mist hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
                {value === "leads" && !!newLeads.data?.length && (
                  <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-on-gold tabular-nums">
                    {newLeads.data.length}
                  </span>
                )}
              </button>
            );
          })}
          <Link
            href="/"
            className="flex h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-semibold whitespace-nowrap text-mist transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ExternalLink className="size-5" aria-hidden />
            Открыть сайт
          </Link>
        </nav>

        <div className="hidden space-y-4 p-5 lg:block">
          <div className="rounded-2xl bg-night p-4 ring-1 ring-gold/15">
            <p className="eyebrow text-gold">Статус проекта</p>
            <p className="mt-2 text-sm text-mist">
              {stats.data ? (
                <>
                  <span className="font-semibold text-white">{formatNumber(inWork)}</span> из{" "}
                  {formatNumber(stats.data.total)} помещений в работе
                </>
              ) : (
                "—"
              )}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-9 place-items-center rounded-full bg-night text-gold">
              <UserRound className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {me.data.username}
            </span>
            <button
              type="button"
              onClick={() => logout.mutate()}
              aria-label="Выйти"
              title="Выйти"
              className="grid size-9 place-items-center rounded-full text-mist hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <main className="px-4 py-8 md:px-8 lg:py-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-8">
            <p className="flex items-center gap-2 eyebrow text-gold-deep">
              <span className="size-1.5 animate-pulse rounded-full bg-gold-deep" />
              Консоль · {current.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-[2.75rem]">
              {current.title}
            </h1>
          </div>
          {tab === "units" && <UnitsPanel newLeads={newLeads.data?.length} />}
          {tab === "sales" && <SalesPanel />}
          {tab === "leads" && <LeadsPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronRight,
  Ellipsis,
  ExternalLink,
  HandCoins,
  Inbox,
  LayoutGrid,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { adminApi, api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

import { ConfirmDialog } from "./ConfirmDialog";
import { FloorsPanel } from "./FloorsPanel";
import { LeadsPanel } from "./LeadsPanel";
import { SalesPanel } from "./SalesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { UnitsPanel } from "./UnitsPanel";

type Tab = "units" | "floors" | "sales" | "leads" | "settings";

const TABS: {
  value: Tab;
  label: string;
  title: string;
  /** Phone top bar and bottom navigation. */
  short: string;
  eyebrow: string;
  Icon: typeof Building2;
}[] = [
  {
    value: "units",
    label: "Фонд квартир",
    title: "Фонд квартир",
    short: "Квартиры",
    eyebrow: "База помещений",
    Icon: Building2,
  },
  {
    value: "floors",
    label: "Этажи и схемы",
    title: "Этажи и схемы",
    short: "Этажи и схемы",
    eyebrow: "Планировки",
    Icon: LayoutGrid,
  },
  {
    value: "sales",
    label: "Покупатели",
    title: "Покупатели и продажи",
    short: "Продажи",
    eyebrow: "Сделки",
    Icon: HandCoins,
  },
  {
    value: "leads",
    label: "Заявки",
    title: "Заявки и брони",
    short: "Заявки",
    eyebrow: "Клиенты",
    Icon: Inbox,
  },
  {
    value: "settings",
    label: "Калькулятор",
    title: "Настройки калькулятора",
    short: "Настройки",
    eyebrow: "Рассрочка",
    Icon: Settings,
  },
];

// Phones: three sections in the bottom bar, the rest behind «Ещё».
const BOTTOM_TABS: Tab[] = ["units", "sales", "leads"];
const MORE_TABS: Tab[] = ["floors", "settings"];

function CountBadge({ count, tone }: { count?: number; tone: "red" | "gold" }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
        tone === "red" ? "bg-status-sold-text text-white" : "bg-gold text-on-gold",
      )}
    >
      {count}
    </span>
  );
}

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
  const overdue = useQuery({
    queryKey: ["admin", "overdue"],
    queryFn: adminApi.overdue,
    enabled: me.isSuccess,
  });
  // «Просроченные платежи» on the dashboard opens the sales list pre-filtered.
  const [salesOverdue, setSalesOverdue] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) router.replace("/admin-dashboard/login");
  }, [me.error, router]);

  const logout = useMutation({
    mutationFn: adminApi.logout,
    onSettled: () => {
      queryClient.clear();
      router.replace("/admin-dashboard/login");
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
  const openTab = (value: Tab) => {
    setSalesOverdue(false);
    setTab(value);
    window.scrollTo({ top: 0 });
  };
  const badge = (value: Tab) =>
    value === "sales" ? (
      <CountBadge count={overdue.data?.count} tone="red" />
    ) : value === "leads" ? (
      <CountBadge count={newLeads.data?.length} tone="gold" />
    ) : null;
  const inWork = stats.data ? stats.data.sold + stats.data.reserved : 0;
  const progress = stats.data?.total ? (inWork / stats.data.total) * 100 : 0;

  return (
    <div className="min-h-[100svh] lg:pl-72">
      <MobileTopBar
        title={current.short}
        onLogout={() => setConfirmLogout(true)}
        username={me.data.username}
      />
      <aside className="z-40 flex flex-col bg-ink text-white max-md:hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72">
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
                onClick={() => {
                  setSalesOverdue(false);
                  setTab(value);
                }}
                className={cn(
                  "flex h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-all",
                  active
                    ? "bg-night text-gold ring-1 ring-gold/20"
                    : "text-mist hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
                {value === "sales" && !!overdue.data?.count && (
                  <span
                    title="Просроченные платежи"
                    className="ml-auto rounded-full bg-status-sold-text px-2 py-0.5 text-xs font-bold text-white tabular-nums"
                  >
                    {overdue.data.count}
                  </span>
                )}
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

      <main className="px-4 py-8 max-md:pt-4 max-md:pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 lg:py-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-8 max-md:hidden">
            <p className="flex items-center gap-2 eyebrow text-gold-deep">
              <span className="size-1.5 animate-pulse rounded-full bg-gold-deep" />
              Консоль · {current.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-[2.75rem]">
              {current.title}
            </h1>
          </div>
          {tab === "units" && (
            <UnitsPanel
              newLeads={newLeads.data?.length}
              overdue={overdue.data}
              onOverdueClick={() => {
                setSalesOverdue(true);
                setTab("sales");
              }}
            />
          )}
          {tab === "floors" && <FloorsPanel />}
          {tab === "sales" && (
            <SalesPanel key={String(salesOverdue)} initialOverdue={salesOverdue} />
          )}
          {tab === "leads" && <LeadsPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </main>

      <nav
        aria-label="Разделы админки"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-white/80 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(19_27_46/0.08)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
      >
        <ul className="grid grid-cols-4">
          {BOTTOM_TABS.map((value) => {
            const t = TABS.find((x) => x.value === value)!;
            return (
              <li key={value}>
                <BottomNavButton
                  label={t.short}
                  Icon={t.Icon}
                  active={tab === value}
                  onClick={() => openTab(value)}
                  badge={badge(value)}
                />
              </li>
            );
          })}
          <li>
            <BottomNavButton
              label="Ещё"
              Icon={Ellipsis}
              active={MORE_TABS.includes(tab)}
              onClick={() => setMoreOpen(true)}
              expanded={moreOpen}
            />
          </li>
        </ul>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Ещё"
        sheet="auto"
        description={me.data.username}
      >
        <ul className="-mx-2 space-y-1">
          {MORE_TABS.map((value) => {
            const t = TABS.find((x) => x.value === value)!;
            return (
              <li key={value}>
                <MoreItem
                  Icon={t.Icon}
                  active={tab === value}
                  onClick={() => {
                    setMoreOpen(false);
                    openTab(value);
                  }}
                >
                  {t.short}
                </MoreItem>
              </li>
            );
          })}
          <li>
            <Link
              href="/"
              className="flex h-14 items-center gap-4 rounded-2xl px-3 text-base font-semibold text-ink active:bg-sand"
            >
              <span className="grid size-10 place-items-center rounded-full bg-sand">
                <ExternalLink className="size-5" aria-hidden />
              </span>
              Открыть сайт
              <ChevronRight className="ml-auto size-5 text-muted" aria-hidden />
            </Link>
          </li>
          <li className="border-t border-line pt-1">
            <MoreItem
              Icon={LogOut}
              danger
              onClick={() => {
                setMoreOpen(false);
                setConfirmLogout(true);
              }}
            >
              Выход
            </MoreItem>
          </li>
        </ul>
      </Modal>

      <ConfirmDialog
        open={confirmLogout}
        title="Выйти из панели?"
        message="Чтобы вернуться, понадобится снова ввести логин и пароль."
        confirmLabel="Выйти"
        busy={logout.isPending}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => logout.mutate()}
      />
    </div>
  );
}

/** Phones only: sticky navy bar with the logo mark, section title and the user / logout button. */
function MobileTopBar({
  title,
  username,
  onLogout,
}: {
  title: string;
  username: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 bg-ink/95 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-white shadow-[0_8px_24px_rgb(10_15_28/0.25)] backdrop-blur-xl md:hidden">
      <Link
        href="/"
        aria-label="Открыть сайт"
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-gold/40"
      >
        <Image src="/logo.png" alt="" width={30} height={30} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-[0.18em] text-gold uppercase">Зарафшон</p>
        <h1 className="truncate font-display text-lg leading-tight font-extrabold">{title}</h1>
      </div>
      <button
        type="button"
        onClick={onLogout}
        aria-label={`Выйти (${username})`}
        className="flex h-11 items-center gap-2 rounded-full bg-white/10 pr-3 pl-1.5 text-sm font-semibold text-white ring-1 ring-white/15 active:bg-white/20"
      >
        <span className="grid size-8 place-items-center rounded-full bg-gold font-display font-extrabold text-on-gold">
          {username.trim().charAt(0).toUpperCase() || <UserRound className="size-4" aria-hidden />}
        </span>
        <LogOut className="size-4 text-mist" aria-hidden />
      </button>
    </header>
  );
}

function BottomNavButton({
  label,
  Icon,
  active,
  onClick,
  badge,
  expanded,
}: {
  label: string;
  Icon: typeof Building2;
  active: boolean;
  onClick: () => void;
  badge?: ReactNode;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-expanded={expanded}
      className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold"
    >
      <span
        className={cn(
          "relative grid h-8 w-14 place-items-center rounded-full transition-colors",
          active ? "bg-ink text-gold" : "text-muted",
        )}
      >
        <Icon className="size-5" aria-hidden />
        {badge && <span className="absolute -top-1 right-0.5">{badge}</span>}
      </span>
      <span className={active ? "text-ink" : "text-muted"}>{label}</span>
    </button>
  );
}

function MoreItem({
  Icon,
  active,
  danger,
  onClick,
  children,
}: {
  Icon: typeof Building2;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-14 w-full items-center gap-4 rounded-2xl px-3 text-left text-base font-semibold active:bg-sand",
        danger ? "text-status-sold-text" : "text-ink",
        active && "bg-sand",
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full",
          danger ? "bg-status-sold-fill" : active ? "bg-ink text-gold" : "bg-sand",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      {children}
      {!danger && <ChevronRight className="ml-auto size-5 text-muted" aria-hidden />}
    </button>
  );
}

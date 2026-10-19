"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleDollarSign,
  Clock,
  KeyRound,
  Pencil,
  PhoneCall,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useId, useState } from "react";

import { Skeleton } from "@/components/ui/Skeleton";
import { statusClasses } from "@/components/ui/status";
import { useToast } from "@/components/ui/Toast";
import { adminApi, api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Floor, UnitDetail, UnitStatus, UnitUpdate } from "@/lib/types";

import { BuyerInfoModal, type BuyerTarget } from "./BuyerInfoModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { SaleFormModal, type SaleUnit } from "./SaleFormModal";
import { UnitEditor } from "./UnitEditor";
import { inputClass, labelClass, STATUS_LABELS } from "./ui";

function NumberCell({
  value,
  label,
  onSave,
  step = 1,
}: {
  value: number | null;
  label: string;
  onSave: (v: number | null) => void;
  step?: number;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value === null ? "" : String(value));
  }
  function commit() {
    const next = draft === "" ? null : Number(draft);
    if (next !== value && (next === null || next > 0)) onSave(next);
    else setDraft(value === null ? "" : String(value));
  }
  return (
    <input
      type="number"
      step={step}
      min={0}
      aria-label={label}
      value={draft}
      placeholder="—"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-9 w-24 rounded-lg bg-sand px-2 text-right font-medium tabular-nums ring-1 ring-transparent hover:ring-line focus:bg-white focus:ring-2 focus:ring-gold-soft focus:outline-none"
    />
  );
}

/** "Этаж 1 · Магазин" for the commercial floor, "Этаж 5" otherwise. */
function floorName(f: Pick<Floor, "number" | "kind">) {
  return f.kind === "commercial" ? `Этаж ${f.number} · Магазин` : `Этаж ${f.number}`;
}

// Rooms filter: a room count, or "commercial" for shops.
type RoomsFilter = "" | "1" | "2" | "3" | "4" | "commercial";

function Kpi({
  label,
  value,
  sub,
  color,
  Icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  Icon: typeof KeyRound;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft transition-shadow hover:shadow-lift md:p-6">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-muted">{label}</span>
        <span className="grid size-9 place-items-center rounded-full bg-sand">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p
        className="mt-4 font-display text-4xl font-extrabold tracking-tight tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

export function UnitsPanel({ newLeads }: { newLeads?: number }) {
  const ids = {
    block: useId(),
    floor: useId(),
    status: useId(),
    rooms: useId(),
    search: useId(),
  };
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pickedBlock, setBlock] = useState<string | null>(null);
  const [floorNumber, setFloorNumber] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<UnitStatus | undefined>(undefined);
  const [roomsFilter, setRoomsFilter] = useState<RoomsFilter>("");
  const [removing, setRemoving] = useState<UnitDetail | null>(null);
  const [editing, setEditing] = useState<UnitDetail | null>(null);
  // Selling needs buyer data first; un-selling needs a confirmation (the sale is archived).
  const [selling, setSelling] = useState<SaleUnit | null>(null);
  const [unselling, setUnselling] = useState<{ unit: UnitDetail; status: UnitStatus } | null>(null);
  const [buyer, setBuyer] = useState<BuyerTarget | null>(null);

  function changeStatus(u: UnitDetail, next: UnitStatus) {
    if (next === u.status) return;
    if (next === "sold") setSelling(u);
    else if (u.status === "sold") setUnselling({ unit: u, status: next });
    else update.mutate({ id: u.id, patch: { status: next } });
  }
  const [search, setSearch] = useState("");
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats });

  const blocks = useQuery({ queryKey: ["blocks"], queryFn: api.blocks });
  // Until the manager picks one, show the first block.
  const block = pickedBlock ?? blocks.data?.[0]?.letter ?? "";
  const floors = useQuery({
    queryKey: ["floors", block],
    queryFn: () => api.floors(block),
    enabled: !!block,
  });
  const units = useQuery({
    queryKey: ["admin", "units", block, floorNumber, status],
    queryFn: () => adminApi.units({ block, floor: floorNumber, status }),
  });
  const selectedFloor = floors.data?.find((f) => f.number === floorNumber);
  const q = search.trim().toLowerCase();
  const rows = units.data?.filter(
    (u) =>
      (!q || `${u.name} ${u.floor_label}`.toLowerCase().includes(q)) &&
      (roomsFilter === "" ||
        (roomsFilter === "commercial"
          ? u.kind === "commercial"
          : u.kind === "apartment" && u.rooms === Number(roomsFilter))),
  );
  const soldValue = units.data
    ?.filter((u) => u.status === "sold" && u.price_per_m2)
    .reduce((sum, u) => sum + u.area * u.price_per_m2!, 0);

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: UnitUpdate }) =>
      patch.status && Object.keys(patch).length === 1
        ? adminApi.setStatus(id, patch.status)
        : adminApi.updateUnit(id, patch),
    onSuccess: (unit) => {
      queryClient.invalidateQueries();
      toast(`${unit.name} (блок ${unit.block_letter}, ${unit.floor_label}) — сохранено`, "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка сохранения", "error"),
  });

  // A floor with a different layout: add a unit (then edit it) or remove one.
  const create = useMutation({
    mutationFn: (floor: Floor) => {
      const onFloor = units.data?.filter((u) => u.floor_id === floor.id) ?? [];
      const number = Math.max(0, ...onFloor.map((u) => u.number)) + 1;
      const commercial = floor.kind === "commercial";
      return adminApi.createUnit({
        floor_id: floor.id,
        number,
        name: commercial ? `Мағоза ${number}` : `Хонаи ${number}`,
        kind: commercial ? "commercial" : "apartment",
        rooms: commercial ? null : 1,
        area: commercial ? 100 : 42,
        price_per_m2: commercial
          ? null
          : (onFloor.find((u) => u.price_per_m2)?.price_per_m2 ?? null),
      });
    },
    onSuccess: (unit) => {
      queryClient.invalidateQueries();
      toast(`${unit.name} добавлено — укажите площадь и комнаты`, "success");
      setEditing(unit);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка добавления", "error"),
  });
  const remove = useMutation({
    mutationFn: (u: UnitDetail) => adminApi.deleteUnit(u.id),
    onSuccess: (_, u) => {
      queryClient.invalidateQueries();
      toast(`${u.name} (${u.floor_label}) удалено`, "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка удаления", "error"),
    onSettled: () => setRemoving(null),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Свободно к продаже"
          value={stats.data ? formatNumber(stats.data.free) : "—"}
          sub="во всех блоках"
          color="var(--status-free-text)"
          Icon={KeyRound}
        />
        <Kpi
          label="В брони"
          value={stats.data ? formatNumber(stats.data.reserved) : "—"}
          sub="ожидают оплаты"
          color="var(--status-reserved-text)"
          Icon={Clock}
        />
        <Kpi
          label="Продано"
          value={stats.data ? formatNumber(stats.data.sold) : "—"}
          sub={
            soldValue
              ? `блок ${block}: ${formatMoney(soldValue)}`
              : `из ${stats.data ? formatNumber(stats.data.total) : "—"}`
          }
          color="var(--status-sold-text)"
          Icon={CircleDollarSign}
        />
        <Kpi
          label="Новые заявки"
          value={newLeads === undefined ? "—" : String(newLeads)}
          sub="требуют обратного звонка"
          color="var(--color-gold-deep)"
          Icon={PhoneCall}
        />
      </div>

      <div className="flex flex-col gap-4 rounded-card bg-white p-4 shadow-soft md:p-5">
        <div
          role="group"
          aria-label="Блок"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {blocks.data?.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={b.letter === block}
              onClick={() => {
                setBlock(b.letter);
                setFloorNumber(undefined);
              }}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                b.letter === block ? "bg-ink text-gold" : "bg-sand text-ink hover:bg-sand-deep",
              )}
            >
              Блок {b.letter}
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  b.letter === block ? "text-mist" : "text-muted",
                )}
              >
                {b.free_count} своб.
              </span>
            </button>
          ))}
          <select
            id={ids.block}
            aria-label="Блок"
            className="sr-only"
            value={block}
            onChange={(e) => {
              setBlock(e.target.value);
              setFloorNumber(undefined);
            }}
          >
            {blocks.data?.map((b) => (
              <option key={b.id} value={b.letter}>
                Блок {b.letter}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <label htmlFor={ids.floor} className={labelClass}>
              Этаж
            </label>
            <select
              id={ids.floor}
              className={inputClass}
              value={floorNumber ?? ""}
              onChange={(e) =>
                setFloorNumber(e.target.value === "" ? undefined : Number(e.target.value))
              }
            >
              <option value="">Все этажи</option>
              {floors.data?.map((f) => (
                <option key={f.id} value={f.number}>
                  {floorName(f)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label htmlFor={ids.status} className={labelClass}>
              Статус
            </label>
            <select
              id={ids.status}
              className={inputClass}
              value={status ?? ""}
              onChange={(e) => setStatus((e.target.value || undefined) as UnitStatus | undefined)}
            >
              <option value="">Все</option>
              {(Object.keys(STATUS_LABELS) as UnitStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label htmlFor={ids.rooms} className={labelClass}>
              Комнаты
            </label>
            <select
              id={ids.rooms}
              className={inputClass}
              value={roomsFilter}
              onChange={(e) => setRoomsFilter(e.target.value as RoomsFilter)}
            >
              <option value="">Все</option>
              {["1", "2", "3", "4"].map((n) => (
                <option key={n} value={n}>
                  {n}-комн.
                </option>
              ))}
              <option value="commercial">Магазин</option>
            </select>
          </div>
          <div className="relative min-w-56 flex-1">
            <label htmlFor={ids.search} className={labelClass}>
              Поиск
            </label>
            <Search
              className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-muted"
              aria-hidden
            />
            <input
              id={ids.search}
              type="search"
              placeholder="Номер квартиры или этаж…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputClass, "pl-10")}
            />
          </div>
          <p className="text-sm text-muted md:ml-auto">
            {rows ? `Найдено: ${rows.length}` : ""}
            {!floorNumber && " · выберите этаж, чтобы добавить или удалить помещение"}
          </p>
          {selectedFloor && (
            <button
              type="button"
              onClick={() => create.mutate(selectedFloor)}
              disabled={create.isPending}
              className="flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white transition-colors hover:bg-gold hover:text-on-gold disabled:opacity-60"
            >
              <Plus className="size-4" aria-hidden />
              {selectedFloor.kind === "commercial" ? "Добавить магазин" : "Добавить квартиру"}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-card bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[15px]">
            <caption className="sr-only">Квартиры блока {block}</caption>
            <thead>
              <tr className="bg-sand text-left text-[11px] font-bold tracking-[0.12em] text-muted uppercase">
                <th scope="col" className="px-4 py-4">
                  Этаж
                </th>
                <th scope="col" className="px-4 py-4">
                  Помещение
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Комн.
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Площадь, м²
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Цена за м²
                </th>
                <th scope="col" className="px-4 py-4 text-right">
                  Стоимость
                </th>
                <th scope="col" className="px-4 py-4">
                  Статус
                </th>
                <th scope="col" className="px-4 py-4">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {units.isPending
                ? Array.from({ length: 7 }, (_, i) => (
                    <tr key={i} className="border-b border-line">
                      <td colSpan={8} className="px-4 py-4">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : rows?.map((u) => (
                    <tr
                      key={u.id}
                      onClick={(e) => {
                        // Clicking a sold row opens its buyer — but not when using a control in it.
                        if (u.status !== "sold") return;
                        if ((e.target as HTMLElement).closest("button, select, input, a")) return;
                        setBuyer({ unit: u });
                      }}
                      className={cn(
                        "group border-b border-line/70 transition-colors last:border-0",
                        u.status === "sold"
                          ? "cursor-pointer bg-status-sold-fill/70 shadow-[inset_3px_0_0_var(--status-sold-line)] hover:bg-status-sold-fill"
                          : "hover:bg-sand/60",
                      )}
                    >
                      <td className="px-4 py-2 text-muted">
                        {u.kind === "commercial" ? `${u.floor_label} · Магазин` : u.floor_label}
                      </td>
                      <td className="px-4 py-2 font-display font-extrabold">{u.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{u.rooms ?? "—"}</td>
                      <td className="px-2 py-1 text-right">
                        <NumberCell
                          value={u.area}
                          step={0.01}
                          label={`Площадь: ${u.name}`}
                          onSave={(v) => v && update.mutate({ id: u.id, patch: { area: v } })}
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <NumberCell
                          value={u.price_per_m2}
                          step={10}
                          label={`Цена за м²: ${u.name}`}
                          onSave={(v) => update.mutate({ id: u.id, patch: { price_per_m2: v } })}
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-muted tabular-nums">
                        {u.price_per_m2 ? formatMoney(u.area * u.price_per_m2) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          aria-label={`Статус: ${u.name}, ${u.floor_label}`}
                          value={u.status}
                          onChange={(e) => changeStatus(u, e.target.value as UnitStatus)}
                          className={cn(
                            "h-9 rounded-full border-2 px-3 text-sm font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-gold",
                            statusClasses[u.status].surface,
                            statusClasses[u.status].text,
                          )}
                        >
                          {(Object.keys(STATUS_LABELS) as UnitStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {u.status === "sold" && (
                            <button
                              type="button"
                              onClick={() => setBuyer({ unit: u })}
                              aria-label={`Покупатель: ${u.name}, ${u.floor_label}`}
                              className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-status-sold-text shadow-soft transition-colors hover:bg-ink hover:text-gold"
                            >
                              <UserRound className="size-3.5" aria-hidden />
                              Покупатель
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing(u)}
                            aria-label={`Редактировать: ${u.name}, ${u.floor_label}`}
                            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-ink hover:text-gold"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          {u.status !== "sold" && (
                            <button
                              type="button"
                              onClick={() => setRemoving(u)}
                              aria-label={`Удалить: ${u.name}, ${u.floor_label}`}
                              className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-status-sold-fill hover:text-status-sold-text"
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line bg-sand/60 px-5 py-3 text-sm text-muted">
          Блок {block}
          {selectedFloor && `, ${floorName(selectedFloor)}`} · показано{" "}
          <span className="font-semibold text-ink">{rows?.length ?? 0}</span> из{" "}
          <span className="font-semibold text-ink">{units.data?.length ?? 0}</span>
        </p>
      </div>

      <UnitEditor
        unit={editing}
        onClose={() => setEditing(null)}
        onRequestSell={(u) => {
          setEditing(null);
          setSelling(u);
        }}
      />
      <SaleFormModal unit={selling} onClose={() => setSelling(null)} />
      <BuyerInfoModal target={buyer} onClose={() => setBuyer(null)} />
      <ConfirmDialog
        open={removing !== null}
        title={removing ? `Удалить ${removing.name} · ${removing.floor_label}?` : ""}
        message="Помещение исчезнет с сайта. Заявки по нему сохранятся без привязки к квартире."
        confirmLabel="Удалить"
        busy={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
      />
      <ConfirmDialog
        open={unselling !== null}
        title={unselling ? `${unselling.unit.name} · снять с продажи` : ""}
        message="Данные покупателя будут перенесены в архив. Продолжить?"
        confirmLabel="Перенести в архив"
        busy={update.isPending}
        onCancel={() => setUnselling(null)}
        onConfirm={() => {
          if (!unselling) return;
          update.mutate({ id: unselling.unit.id, patch: { status: unselling.status } });
          setUnselling(null);
        }}
      />
    </div>
  );
}

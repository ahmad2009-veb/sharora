"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { adminApi, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { RoomDetail, UnitDetail, UnitStatus } from "@/lib/types";
import { statusClasses } from "@/components/ui/status";

import { ConfirmDialog } from "./ConfirmDialog";
import { ImageUpload } from "./ImageUpload";
import { inputClass, labelClass, sheetActionsClass, sheetContentClass, STATUS_LABELS } from "./ui";

type ExtraActions = {
  /** Phones: the card list has no row buttons, so delete / buyer live in the editor. */
  onRequestDelete?: (unit: UnitDetail) => void;
  onShowBuyer?: (unit: UnitDetail) => void;
};

export function UnitEditor({
  unit,
  onClose,
  onRequestSell,
  ...extra
}: {
  unit: UnitDetail | null;
  onClose: () => void;
  /** Called after the other fields are saved when «Продано» was chosen: buyer data comes next. */
  onRequestSell: (unit: UnitDetail) => void;
} & ExtraActions) {
  return (
    <Modal
      open={unit !== null}
      onClose={onClose}
      title={unit ? `${unit.name}` : ""}
      description={unit ? `Блок ${unit.block_letter} · ${unit.floor_label}` : undefined}
      size="lg"
      sheet
    >
      {unit && (
        <UnitEditorForm
          key={unit.id}
          unit={unit}
          onDone={onClose}
          onRequestSell={onRequestSell}
          {...extra}
        />
      )}
    </Modal>
  );
}

function UnitEditorForm({
  unit,
  onDone,
  onRequestSell,
  onRequestDelete,
  onShowBuyer,
}: {
  unit: UnitDetail;
  onDone: () => void;
  onRequestSell: (unit: UnitDetail) => void;
} & ExtraActions) {
  const ids = { name: useId(), rooms: useId(), area: useId(), price: useId(), status: useId() };
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: unit.name,
    rooms: unit.rooms === null ? "" : String(unit.rooms),
    area: String(unit.area),
    price: unit.price_per_m2 === null ? "" : String(unit.price_per_m2),
    status: unit.status,
    layout_image: unit.layout_image,
    blueprint_image: unit.blueprint_image,
  });
  const [rooms, setRooms] = useState<RoomDetail[]>(unit.rooms_detail ?? []);
  const [confirmUnsell, setConfirmUnsell] = useState(false);
  const becomingSold = form.status === "sold" && unit.status !== "sold";
  const leavingSold = unit.status === "sold" && form.status !== "sold";

  const save = useMutation({
    mutationFn: () =>
      adminApi.updateUnit(unit.id, {
        name: form.name.trim(),
        rooms: form.rooms === "" ? null : Number(form.rooms),
        area: Number(form.area),
        price_per_m2: form.price === "" ? null : Number(form.price),
        // «Продано» is set by the sale form (buyer data required), not by this save.
        ...(becomingSold ? {} : { status: form.status }),
        layout_image: form.layout_image,
        blueprint_image: form.blueprint_image,
        rooms_detail: rooms.filter((r) => r.name.trim() && r.area > 0),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries();
      if (becomingSold) {
        onRequestSell(updated);
        return;
      }
      toast("Изменения сохранены", "success");
      onDone();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка сохранения", "error"),
  });

  const roomsSum = rooms.reduce((s, r) => s + (Number(r.area) || 0), 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (leavingSold) setConfirmUnsell(true);
    else save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", sheetContentClass)}>
      {/* Phones: a large status selector first — the most frequent change. */}
      <fieldset className="md:hidden">
        <legend className={labelClass}>Статус</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(STATUS_LABELS) as UnitStatus[]).map((s) => {
            const active = form.status === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setForm({ ...form, status: s })}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-[15px] font-bold transition-colors",
                  active
                    ? cn(statusClasses[s].surface, statusClasses[s].text)
                    : "border-transparent bg-sand text-muted",
                )}
              >
                <span className={cn("size-2 rounded-full", statusClasses[s].dot)} aria-hidden />
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
        {becomingSold && (
          <p className="mt-2 text-sm text-muted">
            После сохранения откроется форма продажи с данными покупателя.
          </p>
        )}
        {leavingSold && (
          <p className="mt-2 text-sm text-status-reserved-text">
            Данные покупателя будут перенесены в архив.
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 max-md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor={ids.name} className={labelClass}>
            Название
          </label>
          <input
            id={ids.name}
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor={ids.rooms} className={labelClass}>
            Комнат
          </label>
          <input
            id={ids.rooms}
            type="number"
            inputMode="numeric"
            min={0}
            max={10}
            className={inputClass}
            value={form.rooms}
            onChange={(e) => setForm({ ...form, rooms: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={ids.area} className={labelClass}>
            Площадь, м²
          </label>
          <input
            id={ids.area}
            type="number"
            inputMode="decimal"
            min={1}
            step={0.01}
            className={inputClass}
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            required
          />
        </div>
        <div>
          <label htmlFor={ids.price} className={labelClass}>
            Цена за м²
          </label>
          <input
            id={ids.price}
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            placeholder="по запросу"
            className={inputClass}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
      </div>

      <div className="max-w-xs max-md:hidden">
        <label htmlFor={ids.status} className={labelClass}>
          Статус
        </label>
        <select
          id={ids.status}
          className={inputClass}
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as UnitStatus })}
        >
          {(Object.keys(STATUS_LABELS) as UnitStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {becomingSold && (
          <p className="mt-1.5 text-xs text-muted">
            После сохранения откроется форма продажи с данными покупателя.
          </p>
        )}
        {leavingSold && (
          <p className="mt-1.5 text-xs text-status-reserved-text">
            Данные покупателя будут перенесены в архив.
          </p>
        )}
      </div>

      <div className="grid gap-6 max-md:grid-cols-1 sm:grid-cols-2">
        <ImageUpload
          label="Планировка"
          subdir="units"
          value={form.layout_image}
          onUploaded={(url) => setForm({ ...form, layout_image: url })}
        />
        <ImageUpload
          label="Строительный чертёж"
          subdir="units"
          value={form.blueprint_image}
          onUploaded={(url) => setForm({ ...form, blueprint_image: url })}
        />
      </div>

      <fieldset>
        <legend className="flex w-full items-baseline justify-between text-sm font-medium">
          Экспликация помещений
          <span className="text-xs font-normal text-muted tabular-nums max-md:text-sm">
            Сумма: {roomsSum.toFixed(2)} м²
          </span>
        </legend>
        <ul className="mt-2 space-y-2">
          {rooms.map((r, i) => (
            <li key={i} className="flex gap-2">
              <input
                aria-label={`Помещение ${i + 1}: название`}
                className={inputClass}
                value={r.name}
                onChange={(e) =>
                  setRooms(rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <input
                aria-label={`Помещение ${i + 1}: площадь`}
                type="number"
                inputMode="decimal"
                step={0.1}
                min={0}
                className={`${inputClass} w-28 shrink-0 max-md:w-24`}
                value={r.area}
                onChange={(e) =>
                  setRooms(
                    rooms.map((x, j) => (j === i ? { ...x, area: Number(e.target.value) } : x)),
                  )
                }
              />
              <button
                type="button"
                onClick={() => setRooms(rooms.filter((_, j) => j !== i))}
                aria-label={`Удалить помещение ${i + 1}`}
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 max-md:h-11"
          onClick={() => setRooms([...rooms, { name: "", area: 0 }])}
        >
          <Plus className="size-4" aria-hidden />
          Добавить помещение
        </Button>
      </fieldset>

      <div className="space-y-2 md:hidden">
        {unit.status === "sold" && onShowBuyer && (
          <Button variant="secondary" className="h-12 w-full" onClick={() => onShowBuyer(unit)}>
            <UserRound className="size-4" aria-hidden />
            Покупатель и график платежей
          </Button>
        )}
        {unit.status !== "sold" && onRequestDelete && (
          <Button
            variant="ghost"
            className="h-12 w-full text-status-sold-text"
            onClick={() => onRequestDelete(unit)}
          >
            <Trash2 className="size-4" aria-hidden />
            {unit.kind === "commercial" ? "Удалить магазин" : "Удалить квартиру"}
          </Button>
        )}
      </div>

      <div className={cn("flex justify-end gap-3 border-t border-line pt-5", sheetActionsClass)}>
        <Button variant="ghost" onClick={onDone}>
          Отмена
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {becomingSold ? "Далее: данные покупателя" : "Сохранить"}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmUnsell}
        title={`${unit.name} · снять с продажи`}
        message="Данные покупателя будут перенесены в архив. Продолжить?"
        confirmLabel="Перенести в архив"
        onCancel={() => setConfirmUnsell(false)}
        onConfirm={() => {
          setConfirmUnsell(false);
          save.mutate();
        }}
      />
    </form>
  );
}

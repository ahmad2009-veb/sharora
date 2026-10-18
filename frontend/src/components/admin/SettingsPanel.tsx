"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { adminApi, api, ApiError } from "@/lib/api";
import type { CalculatorSettings } from "@/lib/types";

import { inputClass, labelClass } from "./ui";

export function SettingsPanel() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  if (!settings.data) return <Skeleton className="h-72 max-w-xl rounded-card" />;
  return <SettingsForm initial={settings.data} />;
}

function SettingsForm({ initial }: { initial: CalculatorSettings }) {
  const ids = { price: useId(), down: useId(), term: useId() };
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);

  const save = useMutation({
    mutationFn: () => adminApi.updateSettings(form),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      toast("Настройки калькулятора сохранены", "success");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Ошибка сохранения", "error"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-5 overflow-hidden rounded-card bg-white p-6 shadow-soft md:p-8"
    >
      <div>
        <h2 className="font-display text-xl font-extrabold">Калькулятор рассрочки</h2>
        <p className="mt-1 text-sm text-muted">
          Значения по умолчанию для калькулятора на странице квартир.
        </p>
      </div>
      <div>
        <label htmlFor={ids.price} className={labelClass}>
          Цена за м² по умолчанию, смн
        </label>
        <input
          id={ids.price}
          type="number"
          min={1}
          step={10}
          required
          className={inputClass}
          value={form.default_price_per_m2}
          onChange={(e) => setForm({ ...form, default_price_per_m2: Number(e.target.value) })}
        />
      </div>
      <div>
        <label htmlFor={ids.down} className={labelClass}>
          Минимальный первоначальный взнос, %
        </label>
        <input
          id={ids.down}
          type="number"
          min={0}
          max={100}
          required
          className={inputClass}
          value={form.down_payment_min_percent}
          onChange={(e) => setForm({ ...form, down_payment_min_percent: Number(e.target.value) })}
        />
      </div>
      <div>
        <label htmlFor={ids.term} className={labelClass}>
          Максимальный срок рассрочки, мес.
        </label>
        <input
          id={ids.term}
          type="number"
          min={1}
          max={360}
          required
          className={inputClass}
          value={form.max_term_months}
          onChange={(e) => setForm({ ...form, max_term_months: Number(e.target.value) })}
        />
      </div>
      <Button type="submit" size="lg" disabled={save.isPending}>
        {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Сохранить
      </Button>
    </form>
  );
}

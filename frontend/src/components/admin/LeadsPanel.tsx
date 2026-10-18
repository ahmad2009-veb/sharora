"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Phone, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";

type Filter = "new" | "processed" | "all";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });

export function LeadsPanel() {
  const [filter, setFilter] = useState<Filter>("new");
  const queryClient = useQueryClient();
  const processed = filter === "all" ? undefined : filter === "processed";
  const leads = useQuery({
    queryKey: ["admin", "leads", processed],
    queryFn: () => adminApi.leads(processed),
  });
  const toggle = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) => adminApi.updateLead(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });

  return (
    <div className="space-y-6">
      <Tabs
        label="Фильтр заявок"
        className="bg-white shadow-soft"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "new", label: "Новые" },
          { value: "processed", label: "Обработанные" },
          { value: "all", label: "Все" },
        ]}
      />
      {leads.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : !leads.data?.length ? (
        <div className="flex flex-col items-center rounded-card bg-white px-6 py-16 text-center shadow-soft">
          <span className="grid size-16 place-items-center rounded-full bg-sand">
            <Inbox className="size-7 text-muted" aria-hidden />
          </span>
          <p className="mt-5 font-display text-xl font-extrabold">Заявок нет</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.data.map((lead) => (
            <li
              key={lead.id}
              className={cn(
                "relative flex flex-col gap-4 overflow-hidden rounded-card bg-white p-5 pl-7 shadow-soft transition-shadow hover:shadow-lift md:flex-row md:items-center",
                lead.processed && "opacity-70",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 w-1.5",
                  lead.processed ? "bg-line" : "bg-gradient-to-b from-gold to-gold-soft",
                )}
              />
              <span className="hidden size-12 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-extrabold text-gold md:grid">
                {lead.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-display text-lg font-extrabold">{lead.name}</span>
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-0.5 text-sm font-semibold text-ink tabular-nums hover:bg-ink hover:text-gold"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {formatPhone(lead.phone)}
                  </a>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {dateFormat.format(
                    new Date(lead.created_at + (lead.created_at.endsWith("Z") ? "" : "Z")),
                  )}
                  {lead.unit_label && ` · ${lead.unit_label}`}
                </p>
                {lead.message && (
                  <p className="mt-3 rounded-xl bg-sand px-4 py-2.5 text-[15px]">{lead.message}</p>
                )}
              </div>
              <Button
                variant={lead.processed ? "ghost" : "dark"}
                size="sm"
                onClick={() => toggle.mutate({ id: lead.id, value: !lead.processed })}
              >
                {lead.processed ? (
                  <RotateCcw className="size-4" aria-hidden />
                ) : (
                  <Check className="size-4" aria-hidden />
                )}
                {lead.processed ? "Вернуть в новые" : "Обработана"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

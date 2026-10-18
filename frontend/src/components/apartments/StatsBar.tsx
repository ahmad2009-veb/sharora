"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/Skeleton";
import { StatBadge } from "@/components/ui/StatBadge";

import { useStats } from "./queries";

export function StatsBar() {
  const t = useTranslations("status");
  const { data, isPending, isError } = useStats();

  if (isError) return null;
  if (isPending) {
    return (
      <div className="flex gap-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-36 rounded-full bg-white/10" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 xl:flex-nowrap">
      <StatBadge value={data.free} label={t("free")} status="free" />
      <StatBadge value={data.reserved} label={t("reserved")} status="reserved" />
      <StatBadge value={data.sold} label={t("sold")} status="sold" />
    </div>
  );
}

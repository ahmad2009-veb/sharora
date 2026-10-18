import type { UnitStatus } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

import { StatusDot } from "./StatusDot";

/** A large counter with a status dot — used for the free / reserved / sold summary. */
export function StatBadge({
  value,
  label,
  status,
  className,
}: {
  value: number;
  label: string;
  status: UnitStatus;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-full bg-white/[0.06] pr-4 pl-3.5 ring-1 ring-white/10",
        className,
      )}
    >
      <StatusDot status={status} className={cn("size-2.5", status === "free" && "animate-pulse")} />
      <span className="font-display text-lg font-extrabold text-white tabular-nums">
        {formatNumber(value)}
      </span>
      <span className="text-xs font-semibold tracking-wider text-mist uppercase">{label}</span>
    </div>
  );
}

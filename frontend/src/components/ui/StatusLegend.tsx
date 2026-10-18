import { cn } from "@/lib/cn";
import type { UnitStatus } from "@/lib/types";

import { STATUS_ORDER, statusClasses } from "./status";

/** "Продано / Свободно / Забронировано" swatches matching the plan polygons. */
export function StatusLegend({
  labels,
  title,
  className,
}: {
  labels: Record<UnitStatus, string>;
  title?: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={title}
      className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}
    >
      {STATUS_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-4 rounded-[5px] border-2", statusClasses[s].surface)}
          />
          <span className={cn("font-medium", statusClasses[s].text)}>{labels[s]}</span>
        </li>
      ))}
    </ul>
  );
}

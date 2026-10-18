import { cn } from "@/lib/cn";
import type { UnitStatus } from "@/lib/types";

import { statusClasses } from "./status";

/** Status pill: 2px status-coloured border, pale fill, dark status text. */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: UnitStatus;
  label: string;
  className?: string;
}) {
  const s = statusClasses[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        s.surface,
        s.text,
        className,
      )}
    >
      {label}
    </span>
  );
}

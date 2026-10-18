import { cn } from "@/lib/cn";
import type { UnitStatus } from "@/lib/types";

import { statusClasses } from "./status";

export function StatusDot({ status, className }: { status: UnitStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 rounded-full", statusClasses[status].dot, className)}
    />
  );
}

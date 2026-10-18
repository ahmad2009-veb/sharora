import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** CSS-only tooltip shown on hover and keyboard focus of the wrapped control. */
export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left";
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-20 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-soft transition-opacity duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100",
          side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
          side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
          side === "left" && "top-1/2 right-full mr-2 -translate-y-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}

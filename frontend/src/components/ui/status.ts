import type { UnitStatus } from "@/lib/types";

/** Legend / display order. */
export const STATUS_ORDER: UnitStatus[] = ["sold", "free", "reserved"];

/** CSS variables for SVG (floor plan polygons). Defined in globals.css. */
export const statusVars: Record<UnitStatus, { line: string; fill: string; text: string }> = {
  free: {
    line: "var(--status-free-line)",
    fill: "var(--status-free-fill)",
    text: "var(--status-free-text)",
  },
  reserved: {
    line: "var(--status-reserved-line)",
    fill: "var(--status-reserved-fill)",
    text: "var(--status-reserved-text)",
  },
  sold: {
    line: "var(--status-sold-line)",
    fill: "var(--status-sold-fill)",
    text: "var(--status-sold-text)",
  },
};

// Full literal class names so Tailwind can detect them.
export const statusClasses: Record<
  UnitStatus,
  { dot: string; text: string; surface: string; hoverBorder: string }
> = {
  free: {
    dot: "bg-status-free-line",
    text: "text-status-free-text",
    surface: "border-status-free-line bg-status-free-fill",
    hoverBorder: "hover:border-status-free-text",
  },
  reserved: {
    dot: "bg-status-reserved-line",
    text: "text-status-reserved-text",
    surface: "border-status-reserved-line bg-status-reserved-fill",
    hoverBorder: "hover:border-status-reserved-text",
  },
  sold: {
    dot: "bg-status-sold-line",
    text: "text-status-sold-text",
    surface: "border-status-sold-line bg-status-sold-fill",
    hoverBorder: "hover:border-status-sold-text",
  },
};

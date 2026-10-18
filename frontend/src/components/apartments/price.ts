import type { UnitListItem } from "@/lib/types";

/** Total price when the unit has its own price per m²; otherwise null ("по запросу"). */
export function unitTotal(unit: Pick<UnitListItem, "area" | "price_per_m2">): number | null {
  return unit.price_per_m2 ? unit.area * unit.price_per_m2 : null;
}

// Mirrors the Pydantic schemas in backend/app/schemas.

export type UnitStatus = "free" | "reserved" | "sold";
export type UnitKind = "apartment" | "commercial";
export type FloorKind = "commercial" | "residential";

export interface Stats {
  free: number;
  reserved: number;
  sold: number;
  total: number;
}

export interface Block {
  id: number;
  letter: string;
  name: string;
  sort_order: number;
  cover_image: string | null;
  free_count: number;
  reserved_count: number;
  sold_count: number;
  total_count: number;
}

export interface Floor {
  id: number;
  label: string;
  number: number;
  kind: FloorKind;
  plan_image: string | null;
  free_count: number;
  total_count: number;
}

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface RoomDetail {
  name: string;
  area: number;
}

export interface UnitListItem {
  id: number;
  name: string;
  number: number;
  kind: UnitKind;
  rooms: number | null;
  area: number;
  price_per_m2: number | null;
  status: UnitStatus;
  layout_image: string | null;
  polygon: PolygonPoint[] | null;
}

export interface FloorWithUnits extends Floor {
  units: UnitListItem[];
}

export interface UnitDetail extends UnitListItem {
  floor_id: number;
  blueprint_image: string | null;
  rooms_detail: RoomDetail[] | null;
  block_letter: string;
  block_name: string;
  floor_label: string;
  floor_number: number;
}

export interface CalculatorSettings {
  default_price_per_m2: number;
  down_payment_min_percent: number;
  max_term_months: number;
}

export interface LeadCreate {
  unit_id?: number | null;
  name: string;
  phone: string;
  message?: string | null;
}

export interface Lead {
  id: number;
  unit_id: number | null;
  unit_label: string | null;
  name: string;
  phone: string;
  message: string | null;
  created_at: string;
  processed: boolean;
}

/** Buyer data of a sold unit — admin API only. */
export interface Sale {
  id: number;
  unit_id: number | null;
  unit_name: string | null;
  block_letter: string | null;
  floor_label: string | null;
  area: number | null;
  buyer_name: string;
  buyer_phone: string;
  amount_paid: number;
  total_price: number | null;
  remaining: number | null;
  sale_date: string;
  comment: string | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface SaleInput {
  buyer_name: string;
  buyer_phone: string;
  amount_paid: number;
  total_price: number | null;
  sale_date: string;
  comment: string | null;
}

export interface AdminMe {
  id: number;
  username: string;
}

export type UnitCreate = Pick<UnitDetail, "floor_id" | "name" | "number" | "kind" | "area"> &
  Partial<Pick<UnitDetail, "rooms" | "price_per_m2" | "polygon">>;

export type UnitUpdate = Partial<
  Pick<
    UnitDetail,
    | "name"
    | "rooms"
    | "area"
    | "price_per_m2"
    | "status"
    | "layout_image"
    | "blueprint_image"
    | "polygon"
    | "rooms_detail"
  >
>;

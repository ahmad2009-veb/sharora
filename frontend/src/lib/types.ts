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
export type PaymentType = "full" | "installment";
export type PaymentStatus = "pending" | "paid" | "overdue";

export interface Sale {
  id: number;
  unit_id: number | null;
  unit_name: string | null;
  block_letter: string | null;
  floor_label: string | null;
  floor_number: number | null;
  area: number | null;
  buyer_name: string;
  buyer_phone: string;
  total_price: number | null;
  down_payment: number;
  payment_type: PaymentType;
  term_months: number | null;
  markup_percent: number;
  first_payment_date: string | null;
  /** Sum of the schedule (rest + markup); 0 for full payment. */
  financed_amount: number;
  monthly_payment: number | null;
  /** Down payment plus everything received on the schedule. */
  paid_total: number;
  /** Debt still to be received; null for legacy sales without a total price. */
  remaining: number | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  overdue_count: number;
  overdue_amount: number;
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
  total_price: number;
  down_payment: number;
  sale_date: string;
  comment: string | null;
  payment_type: PaymentType;
  term_months: number | null;
  markup_percent: number;
  first_payment_date: string | null;
}

export interface Payment {
  id: number;
  number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  paid_date: string | null;
  status: PaymentStatus;
  /** Planned debt after this payment, as in a bank schedule. */
  balance_after: number;
}

export interface Schedule {
  sale: Sale;
  payments: Payment[];
}

export interface OverdueSummary {
  count: number;
  amount: number;
  sales: number;
}

export interface AdminMe {
  id: number;
  username: string;
  /** ISO 8601, UTC. */
  created_at: string;
  last_login_at: string | null;
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

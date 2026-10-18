/**
 * FastAPI client — used only by /apartments and /admin. The home page is static.
 * By default requests go to the same origin and are proxied by Next rewrites
 * (see next.config.ts); set NEXT_PUBLIC_API_URL to call the API directly.
 */
import type {
  AdminMe,
  Block,
  CalculatorSettings,
  Floor,
  FloorWithUnits,
  Lead,
  LeadCreate,
  Sale,
  SaleInput,
  Stats,
  UnitDetail,
  UnitStatus,
  UnitUpdate,
} from "./types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg).replace(/^Value error, /, "");
    }
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: isForm ? init.headers : { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorMessage(body, res.statusText));
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (body: unknown) => JSON.stringify(body);

/** Resolves a media path returned by the API ("/media/...") to a URL the browser can load. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export const api = {
  stats: () => request<Stats>("/api/stats"),
  blocks: () => request<Block[]>("/api/blocks"),
  floors: (letter: string) => request<Floor[]>(`/api/blocks/${encodeURIComponent(letter)}/floors`),
  floorUnits: (floorId: number) => request<FloorWithUnits>(`/api/floors/${floorId}/units`),
  unit: (id: number) => request<UnitDetail>(`/api/units/${id}`),
  blockUnits: (letter: string) =>
    request<UnitDetail[]>(`/api/units?block=${encodeURIComponent(letter)}`),
  settings: () => request<CalculatorSettings>("/api/settings"),
  createLead: (lead: LeadCreate) =>
    request<Lead>("/api/leads", { method: "POST", body: json(lead) }),
};

export const adminApi = {
  login: (username: string, password: string) =>
    request<AdminMe>("/api/admin/login", { method: "POST", body: json({ username, password }) }),
  logout: () => request<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
  me: () => request<AdminMe>("/api/admin/me"),
  units: (params: { block?: string; floor?: number; status?: UnitStatus }) => {
    const qs = new URLSearchParams();
    if (params.block) qs.set("block", params.block);
    if (params.floor !== undefined) qs.set("floor", String(params.floor));
    if (params.status) qs.set("status", params.status);
    return request<UnitDetail[]>(`/api/admin/units?${qs}`);
  },
  updateUnit: (id: number, patch: UnitUpdate) =>
    request<UnitDetail>(`/api/admin/units/${id}`, { method: "PATCH", body: json(patch) }),
  setStatus: (id: number, status: UnitStatus) =>
    request<UnitDetail>(`/api/admin/units/${id}/status`, {
      method: "PATCH",
      body: json({ status }),
    }),
  sell: (unitId: number, sale: SaleInput) =>
    request<Sale>(`/api/admin/units/${unitId}/sell`, { method: "POST", body: json(sale) }),
  unitSale: (unitId: number) => request<Sale>(`/api/admin/units/${unitId}/sale`),
  updateSale: (saleId: number, patch: Partial<SaleInput>) =>
    request<Sale>(`/api/admin/sales/${saleId}`, { method: "PATCH", body: json(patch) }),
  sales: (params: {
    search?: string;
    block?: string;
    dateFrom?: string;
    dateTo?: string;
    archived?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.block) qs.set("block", params.block);
    if (params.dateFrom) qs.set("date_from", params.dateFrom);
    if (params.dateTo) qs.set("date_to", params.dateTo);
    if (params.archived) qs.set("archived", "true");
    return request<Sale[]>(`/api/admin/sales?${qs}`);
  },
  updateFloor: (id: number, patch: { plan_image?: string | null; label?: string }) =>
    request<Floor>(`/api/admin/floors/${id}`, { method: "PATCH", body: json(patch) }),
  upload: (file: File, subdir: "floors" | "units" | "blocks") => {
    const body = new FormData();
    body.append("file", file);
    return request<{ url: string }>(`/api/admin/upload?subdir=${subdir}`, {
      method: "POST",
      body,
    });
  },
  leads: (processed?: boolean) =>
    request<Lead[]>(`/api/admin/leads${processed === undefined ? "" : `?processed=${processed}`}`),
  updateLead: (id: number, processed: boolean) =>
    request<Lead>(`/api/admin/leads/${id}`, { method: "PATCH", body: json({ processed }) }),
  updateSettings: (patch: Partial<CalculatorSettings>) =>
    request<CalculatorSettings>("/api/admin/settings", { method: "PATCH", body: json(patch) }),
};

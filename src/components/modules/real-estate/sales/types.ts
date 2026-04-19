/* ================= COMMON TYPES ================= */

export interface DropdownOption {
  value: number;
  label: string;
  [key: string]: any; // allow extra dropdown metadata
}

/* ================= SALE ITEM ================= */

export interface SaleItem {
  id?: number;
  type: "UNIT_PRICE" | "PARKING" | "CUSTOM";
  title: string;
  effect: "+" | "-";
  linkedTo?: {
    kind: "unit" | "parking";
    unitId?: number;
    parkingId?: number;
    label?: string;
  } | null;
  amount: number;
  note?: string;
  editMode?: "LOCKED" | "EDITABLE";
}

/* ================= API PAYLOAD ================= */

export interface SalePricingPayload {
  customer: DropdownOption | null;
  unit: DropdownOption | null;
  parking?: DropdownOption | null;
  items: SaleItem[];
  total: number;
}

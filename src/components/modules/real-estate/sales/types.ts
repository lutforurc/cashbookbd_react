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

/* ================= SOLD UNIT (CUSTOMER WISE) REPORT ================= */

export interface SoldUnitLine {
  type: "UNIT_PRICE" | "PARKING" | "CUSTOM" | string;
  caption: string;
  place: string;
  amount: number;
}

/** One confirmed booking receipt against a sale. */
export interface SoldUnitReceipt {
  receipt_no: string | null;
  payment_date: string | null;
  amount: number;
}

export interface SoldUnitRow {
  serial_no: number;
  lines: SoldUnitLine[];
  sale_id: number;
  sale_date: string | null;
  project_id: number | null;
  project_name: string | null;
  building_id: number | null;
  building_name: string | null;
  floor_no: number | null;
  floor_name: string | null;
  is_parking_only: boolean;
  unit_id: number | null;
  unit_no: string | null;
  unit_size: number | null;
  unit_price_amount: number;
  parking_id: number | null;
  parking_no: string | null;
  parking_size: number | null;
  parking_amount: number;
  other_amount: number;
  receipt_no: string | null;
  /** The booking receipts, in the order the money came in. */
  receipts: SoldUnitReceipt[];
  /** How many allotment letters have been issued — one L-n button each. */
  letter_count?: number;
  /** Whether the scanned deed is on file. The path itself never leaves the server. */
  has_document?: boolean;
  total_amount: number;
  booking_amount: number;
  downpayment_amount: number;
  received_amount: number;
  due_amount: number;
}

export interface SoldUnitCustomer {
  customer_id: number;
  customer_name: string;
  customer_mobile: string | null;
  customer_address: string | null;
  customer_father: string | null;
  ledger_page: string | null;
  units: SoldUnitRow[];
  unit_count: number;
  parking_count: number;
  unit_price_amount: number;
  parking_amount: number;
  total_amount: number;
  received_amount: number;
  due_amount: number;
}

export interface SoldUnitTotals {
  customer_count: number;
  unit_count: number;
  parking_count: number;
  unit_price_amount: number;
  parking_amount: number;
  total_amount: number;
  received_amount: number;
  due_amount: number;
}

export interface SoldUnitsResult {
  data: SoldUnitCustomer[];
  totals: SoldUnitTotals;
}

export interface SoldUnitsFilters {
  branch_id?: number;
  project_id?: number;
  building_id?: number;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  q?: string;
  due_only?: boolean;
}

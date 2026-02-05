export interface UnitItem {
  id?: number;
  flat_id: number;
  customer_id?: number | null;
  unit_no: string;
  size_sqft: number;
  allocated_cost: number;
  sale_price?: number | null;
  sale_date?: string | null;
  status: number;
  notes?: string | null;
  unit_type: "unit" | "parking";
}

/* ---- Unit Charge Type ---- */
export interface UnitChargeTypeItem {
  id: number;
  name: string;
  effect: "+" | "-";
  sort_order: number;
}
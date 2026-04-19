export interface FlatItem {
  id?: number;

  company_id?: number;
  branch_id?: number;

  building_id: number | null;

  customer_id?: number | null;

  floor_no: number;
  flat_name: string;   // ✅ changed

  total_units: number;

  allocated_cost: number;

  sale_price?: number | null;
  sale_date?: string | null;

  status: number;

  notes?: string | null;

  created_by?: number;
  updated_by?: number;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

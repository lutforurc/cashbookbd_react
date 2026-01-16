export interface FlatItem {
  id: number;

  company_id: number;
  branch_id: number;
  building_id: number;

  customer_id?: number | null;

  floor_no: number;
  flat_no: string;

  total_units: number;
  allocated_cost: number;

  sale_price?: number | null;
  sale_date?: string | null;

  status: number; // 0=Inactive,1=Active,2=UnderDev,3=Completed,4=Sold
  notes?: string | null;

  created_by: number;
  updated_by?: number | null;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

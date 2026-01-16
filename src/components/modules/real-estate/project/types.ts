// types.ts
export interface ProjectItem {
  id?: number | string;
  branch_id: number | string;
  area_id: number | string;
  customer_id?: number | string | null;

  name: string;
  location_details?: string;
  area_sqft: string | number;
  purchase_price: string | number;
  purchase_date: string;
  sale_price?: string | number | null;
  sale_date?: string | null;

  notes?: string;
  status: string | number;
}

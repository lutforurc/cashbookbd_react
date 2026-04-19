export interface BuildingItem {
  id?: number;
  project_id: number | null;
  customer_id?: number | null;

  name: string;
  floors_count: number;

  construction_cost: number | string;
  total_cost: number | string;

  start_date: string;
  completion_date?: string;
  sale_price?: number | string;
  sale_date?: string;

  status: number;
  notes?: string;
}

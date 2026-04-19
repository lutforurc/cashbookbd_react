import { BuildingItem } from "./types";


export const getInitialBuilding = (projectId?: string) => ({
  project_id: projectId ? Number(projectId) : null,
  customer_id: null,
  name: "",
  floors_count: 0,
  construction_cost: 0,
  total_cost: 0,
  start_date: "",
  completion_date: "",
  sale_price: "",
  sale_date: "",
  status: 1,
  notes: "",
} as BuildingItem);

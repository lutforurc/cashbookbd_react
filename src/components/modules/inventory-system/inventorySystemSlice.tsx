import httpService from '../../services/httpService';
import { API_ADMIN_INVENTORY_SYSTEMS_URL } from '../../services/apiRoutes';

export type InventorySystem = {
  id: number;
  name: string;
  slug: string;
  status: number;
  description: string | null;
  // Core systems the routing depends on: editable, but never deleted, slug frozen.
  is_core?: boolean;
};

export type InventorySystemPayload = {
  name: string;
  slug?: string;
  status?: number;
  description?: string | null;
};

// The list CRUD is plain httpService calls (like the admin notifications
// screen); the page owns its own state, so no reducer is needed here.

export const fetchInventorySystems = async (): Promise<InventorySystem[]> => {
  const response = await httpService.get(API_ADMIN_INVENTORY_SYSTEMS_URL);
  const rows = response?.data?.data?.data?.inventory_systems;
  return Array.isArray(rows) ? rows : [];
};

export const createInventorySystem = (payload: InventorySystemPayload) =>
  httpService.post(API_ADMIN_INVENTORY_SYSTEMS_URL, payload);

export const updateInventorySystem = (id: number, payload: InventorySystemPayload) =>
  httpService.put(`${API_ADMIN_INVENTORY_SYSTEMS_URL}/${id}`, payload);

export const deleteInventorySystem = (id: number) =>
  httpService.delete(`${API_ADMIN_INVENTORY_SYSTEMS_URL}/${id}`);

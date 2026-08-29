import httpService from '../../services/httpService';
import { API_ADMIN_BUSINESS_TYPES_URL } from '../../services/apiRoutes';

export type BusinessType = {
  id: number;
  name: string;
  status: number;
  description: string | null;
  /** How many branches run on this trade. Decides what disabling it costs. */
  branches_count?: number;
};

export type BusinessTypePayload = {
  name: string;
  status?: number;
  description?: string | null;
};

// Plain httpService calls, like the inventory systems screen beside it: the
// page owns its own state, so there is no reducer to add here.

export const fetchBusinessTypes = async (): Promise<BusinessType[]> => {
  const response = await httpService.get(API_ADMIN_BUSINESS_TYPES_URL);
  const rows = response?.data?.data?.data?.business_types;

  return Array.isArray(rows) ? rows : [];
};

export const createBusinessType = (payload: BusinessTypePayload) =>
  httpService.post(API_ADMIN_BUSINESS_TYPES_URL, payload);

export const updateBusinessType = (id: number, payload: BusinessTypePayload) =>
  httpService.put(`${API_ADMIN_BUSINESS_TYPES_URL}/${id}`, payload);

/**
 * Enable or disable one. The status is sent rather than left to the server to
 * flip, so two quick presses settle on what was asked for instead of on
 * whichever request happened to land last.
 */
export const toggleBusinessType = (id: number, status: number) =>
  httpService.patch(`${API_ADMIN_BUSINESS_TYPES_URL}/${id}/toggle`, { status });

// There is no delete. A branch stores the id, so removing a row would free its
// number for the next trade created -- see the controller header.

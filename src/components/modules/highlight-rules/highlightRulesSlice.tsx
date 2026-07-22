import httpService from '../../services/httpService';
import { API_ADMIN_HIGHLIGHT_RULES_URL } from '../../services/apiRoutes';

export type HighlightRuleRow = {
  id: number;
  phrase: string;
  color: string;
  priority: number;
  status: number;
  description: string | null;
};

export type HighlightRulePayload = {
  phrase: string;
  color: string;
  priority: number;
  status: number;
  description: string | null;
};

// Plain httpService CRUD (like the inventory-system screen); the page owns its
// own state, so no reducer is needed here.

export const fetchHighlightRules = async (): Promise<HighlightRuleRow[]> => {
  const response = await httpService.get(API_ADMIN_HIGHLIGHT_RULES_URL);
  const rows = response?.data?.data?.data?.highlight_rules;
  return Array.isArray(rows) ? rows : [];
};

export const createHighlightRule = (payload: HighlightRulePayload) =>
  httpService.post(API_ADMIN_HIGHLIGHT_RULES_URL, payload);

export const updateHighlightRule = (id: number, payload: HighlightRulePayload) =>
  httpService.put(`${API_ADMIN_HIGHLIGHT_RULES_URL}/${id}`, payload);

export const deleteHighlightRule = (id: number) =>
  httpService.delete(`${API_ADMIN_HIGHLIGHT_RULES_URL}/${id}`);

import { endpoints } from '../config/api';
import { apiRequest } from './http';

export type DashboardData = Record<string, unknown>;

type DashboardResponse = {
  success?: boolean;
  data?: {
    data?: DashboardData;
  };
  message?: string;
  error?: {
    message?: string;
  };
};

export const dashboardService = {
  async getDashboard() {
    const response = await apiRequest<DashboardResponse>(endpoints.dashboard);

    if (response?.success) {
      return response.data?.data || {};
    }

    throw new Error(response?.error?.message || response?.message || 'Dashboard load failed.');
  },
};

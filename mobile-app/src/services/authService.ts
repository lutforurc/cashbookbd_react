import { API_CSRF_COOKIES, endpoints } from '../config/api';
import { apiRequest } from './http';

export type User = {
  id?: number;
  name?: string;
  email?: string;
  company_id?: number;
  [key: string]: unknown;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: User;
  };
};

export const authService = {
  async login(loginId: string, password: string) {
    try {
      await apiRequest(API_CSRF_COOKIES, { method: 'GET', auth: false });
    } catch {
      // Mobile bearer login can still succeed when Sanctum cookie setup is not needed.
    }

    const response = await apiRequest<LoginResponse>(endpoints.login, {
      method: 'POST',
      auth: false,
      body: JSON.stringify({
        email: loginId,
        phone: loginId,
        mobile: loginId,
        password,
      }),
    });

    if (!response?.success || !response?.data?.token) {
      throw new Error(response?.message || 'Invalid username or password.');
    }

    return {
      token: response.data.token,
      user: response.data.user || {},
    };
  },

  async me() {
    return apiRequest<User>(endpoints.me);
  },
};

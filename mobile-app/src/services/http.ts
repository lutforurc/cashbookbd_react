import { tokenStorage } from './tokenStorage';

type RequestOptions = RequestInit & {
  auth?: boolean;
};

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const readResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiRequest = async <T>(url: string, options: RequestOptions = {}) => {
  const headers: Record<string, string> = {
    ...jsonHeaders,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.auth !== false) {
    const token = await tokenStorage.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed.';
    throw new ApiError(
      `${message}. Check API URL, CORS, and whether the phone can reach the server.`,
    );
  }

  const data = await readResponse(response);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      response.statusText ||
      'Request failed.';
    throw new ApiError(message, response.status);
  }

  return data as T;
};

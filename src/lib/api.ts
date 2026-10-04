import { useAuthStore } from '@/stores/auth';
import { ADMIN_LOGIN_PATH, PLATFORM_ADMIN_PATH } from '@/lib/admin-routes';

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.NEXT_PUBLIC_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api/v1' : 'https://dashboard-backend-pi-ten.vercel.app/api/v1');

interface ApiOptions extends RequestInit {
  token?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { token, ...fetchOptions } = options;
    const accessToken = token || this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      });

      if (response.status === 401 && accessToken) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${localStorage.getItem('accessToken')}`;
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
            credentials: 'include',
          });
          return retryResponse.json();
        }
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          const { pathname } = window.location;
          const loginPath = pathname.startsWith(PLATFORM_ADMIN_PATH) ? ADMIN_LOGIN_PATH : '/login';
          if (pathname !== loginPath) window.location.href = loginPath;
        }
      }

      return response.json();
    } catch {
      return { success: false, error: { message: 'Cannot reach the server. Check that the API is running and try again.' } };
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const storedRefresh = localStorage.getItem('refreshToken');
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storedRefresh ? { refreshToken: storedRefresh } : {}),
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data.data?.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /** Resolves to `data`, throwing the API error message so react-query / toasts can surface it. */
  async data<T>(endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET', body?: unknown): Promise<T> {
    const res = await this.request<T>(endpoint, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.success) throw new Error(res.error?.message || 'Request failed');
    return res.data as T;
  }

  /** Like `data` but keeps pagination for list endpoints. */
  async list<T>(endpoint: string): Promise<{ data: T[]; pagination?: ApiResponse<T>['pagination'] }> {
    const res = await this.request<T[]>(endpoint);
    if (!res.success) throw new Error(res.error?.message || 'Request failed');
    return { data: res.data || [], pagination: res.pagination };
  }

  /** Unauthenticated call for public pages (portal, careers, referrals). */
  async publicData<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!json.success) throw new Error(json.error?.message || 'Request failed');
    return json.data as T;
  }

  /** Downloads an authenticated binary endpoint as a file. */
  async download(endpoint: string, fileName: string) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}${endpoint}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
    if (!res.ok) throw new Error('Download failed');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  get baseUrl() {
    return API_URL;
  }

  async upload<T>(endpoint: string, formData: FormData) {
    const accessToken = this.getToken();
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    return response.json() as Promise<ApiResponse<T>>;
  }
}

export const api = new ApiClient();

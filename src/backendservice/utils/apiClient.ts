
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

type UnauthorizedCallback = () => void;

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onUnauthorized: UnauthorizedCallback | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("admin_token");
  }

  setUnauthorizedCallback(callback: UnauthorizedCallback | null) {
    this.onUnauthorized = callback;
  }

  private handleUnauthorizedResponse(status: number, endpoint: string) {
    const isAdminEndpoint = endpoint.includes('/admin') ||
                           endpoint.includes('/api/pdf') ||
                           endpoint.includes('/api/email') ||
                           endpoint.includes('/api/upload');

    if ((status === 401 || status === 403) && isAdminEndpoint && this.onUnauthorized) {
      console.log(`🔒 [API CLIENT] ${status} error on ${endpoint} - triggering auto-logout`);
      this.onUnauthorized();
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("admin_token", token);
    } else {
      localStorage.removeItem("admin_token");
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private getHeaders(contentType: string = "application/json"): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": contentType,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleUnauthorizedResponse(response.status, endpoint);

        return {
          error: data.message || "Request failed",
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async post<T, D = any>(endpoint: string, body: D): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleUnauthorizedResponse(response.status, endpoint);

        return {
          error: data.message || "Request failed",
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async put<T, D = any>(endpoint: string, body: D): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleUnauthorizedResponse(response.status, endpoint);

        return {
          error: data.message || "Request failed",
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async delete<T>(
    endpoint: string,
    options?: { body?: any; headers?: HeadersInit }
  ): Promise<ApiResponse<T>> {
    try {
      const requestHeaders = {
        ...this.getHeaders(),
        ...options?.headers
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE",
        headers: requestHeaders,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleUnauthorizedResponse(response.status, endpoint);

        return {
          error: data.message || "Request failed",
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async patch<T, D = any>(endpoint: string, body: D): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PATCH",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        this.handleUnauthorizedResponse(response.status, endpoint);

        return {
          error: data.message || "Request failed",
          status: response.status,
        };
      }

      return {
        data,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error",
        status: 0,
      };
    }
  }

  async downloadBlob(endpoint: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        ...this.getHeaders(),
        "Accept": "application/pdf, application/octet-stream"
      },
    });

    if (!response.ok) {
      this.handleUnauthorizedResponse(response.status, endpoint);
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

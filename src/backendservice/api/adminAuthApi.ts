
import { apiClient } from "../utils/apiClient";
import { storage } from "../utils/storage";
import type { LoginPayload, LoginResponse, AdminUser } from "../types/api.types";

export const adminAuthApi = {
  async login(credentials: LoginPayload) {
    const response = await apiClient.post<LoginResponse>("/api/admin/login", credentials);

    if (response.data) {
      apiClient.setToken(response.data.token);
      storage.setToken(response.data.token);
      storage.setAdminUser(response.data.admin);
    }

    return response;
  },

  async getProfile() {
    return apiClient.get<AdminUser>("/api/admin/me");
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiClient.put("/api/admin/change-password", payload);
  },

  async createAdmin(payload: { username: string; password: string }) {
    return apiClient.post("/api/admin/create", payload);
  },

  logout() {
    apiClient.setToken(null);
    storage.clearAuth();
  },

  isAuthenticated(): boolean {
    return !!storage.getToken();
  },

  getStoredAdminUser(): AdminUser | null {
    return storage.getAdminUser();
  },
};

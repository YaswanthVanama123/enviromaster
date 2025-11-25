// src/backendservice/api/adminAuthApi.ts

import { apiClient } from "../utils/apiClient";
import { storage } from "../utils/storage";
import type { LoginPayload, LoginResponse, AdminUser } from "../types/api.types";

export const adminAuthApi = {
  /**
   * Login admin user
   */
  async login(credentials: LoginPayload) {
    const response = await apiClient.post<LoginResponse>("/api/admin/login", credentials);

    if (response.data) {
      // Store token and user info
      apiClient.setToken(response.data.token);
      storage.setToken(response.data.token);
      storage.setAdminUser(response.data.admin);
    }

    return response;
  },

  /**
   * Get current admin profile
   */
  async getProfile() {
    return apiClient.get<AdminUser>("/api/admin/me");
  },

  /**
   * Change admin password
   */
  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiClient.put("/api/admin/change-password", payload);
  },

  /**
   * Create new admin user (admin only)
   */
  async createAdmin(payload: { username: string; password: string }) {
    return apiClient.post("/api/admin/create", payload);
  },

  /**
   * Logout
   */
  logout() {
    apiClient.setToken(null);
    storage.clearAuth();
  },

  /**
   * Check if user is logged in
   */
  isAuthenticated(): boolean {
    return !!storage.getToken();
  },

  /**
   * Get stored admin user
   */
  getStoredAdminUser(): AdminUser | null {
    return storage.getAdminUser();
  },
};

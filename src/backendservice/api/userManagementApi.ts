import { apiClient } from '../utils/apiClient';
import type {
  UserListItem,
  UserListResponse,
  CreateAdminPayload,
  CreateEmployeePayload,
  UpdateUserPayload,
  ResetPasswordPayload,
  UserRole,
} from '../types/api.types';

const BASE_URL = '/api/users';

/**
 * User Management API (Admin only)
 */
export const userManagementApi = {
  /**
   * List all users (admins + employees)
   */
  async listUsers(params?: {
    role?: UserRole;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.set('role', params.role);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    const response = await apiClient.get<UserListResponse>(url);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch users');
    }
    return response.data;
  },

  /**
   * Create a new admin user
   */
  async createAdmin(data: CreateAdminPayload): Promise<{ success: boolean; user: UserListItem }> {
    const response = await apiClient.post<{ success: boolean; user: UserListItem }>(`${BASE_URL}/admin`, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create admin');
    }
    return response.data;
  },

  /**
   * Create a new employee user
   */
  async createEmployee(data: CreateEmployeePayload): Promise<{ success: boolean; user: UserListItem }> {
    const response = await apiClient.post<{ success: boolean; user: UserListItem }>(`${BASE_URL}/employee`, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create employee');
    }
    return response.data;
  },

  /**
   * Update a user
   */
  async updateUser(
    type: UserRole,
    id: string,
    data: UpdateUserPayload
  ): Promise<{ success: boolean; user: UserListItem }> {
    const response = await apiClient.put<{ success: boolean; user: UserListItem }>(`${BASE_URL}/${type}/${id}`, data);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update user');
    }
    return response.data;
  },

  /**
   * Toggle user active status
   */
  async toggleUserStatus(
    type: UserRole,
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; isActive: boolean; message: string }> {
    const response = await apiClient.patch<{ success: boolean; isActive: boolean; message: string }>(
      `${BASE_URL}/${type}/${id}/status`,
      { isActive }
    );
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to toggle user status');
    }
    return response.data;
  },

  /**
   * Reset user password
   */
  async resetPassword(
    type: UserRole,
    id: string,
    data: ResetPasswordPayload
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.patch<{ success: boolean; message: string }>(
      `${BASE_URL}/${type}/${id}/reset-password`,
      data
    );
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to reset password');
    }
    return response.data;
  },

  /**
   * Delete a user
   */
  async deleteUser(
    type: UserRole,
    id: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`${BASE_URL}/${type}/${id}`);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to delete user');
    }
    return response.data;
  },
};

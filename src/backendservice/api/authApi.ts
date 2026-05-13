import { apiClient } from '../utils/apiClient';
import { storage } from '../utils/storage';
import type {
  LoginPayload,
  LoginResponse,
  AuthUser,
  UserRole,
} from '../types/api.types';

const ENDPOINTS = {
  admin: {
    login: '/api/admin/login',
    profile: '/api/admin/me',
    changePassword: '/api/admin/change-password',
  },
  employee: {
    login: '/api/employee/login',
    profile: '/api/employee/me',
    changePassword: '/api/employee/change-password',
  },
};

/**
 * Unified authentication API for both admin and employee users
 */
export const authApi = {
  /**
   * Login user (admin or employee)
   */
  async login(credentials: LoginPayload, userType: UserRole): Promise<AuthUser> {
    const endpoint = userType === 'admin'
      ? ENDPOINTS.admin.login
      : ENDPOINTS.employee.login;

    const response = await apiClient.post<LoginResponse>(endpoint, credentials);

    // Check for error response
    if (response.error || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    const responseData = response.data;

    // Handle response based on user type
    let user: AuthUser;

    if (userType === 'admin') {
      // Admin login returns { token, admin } format
      const adminData = responseData.admin || responseData.user;
      if (!adminData) {
        throw new Error('Invalid response from server');
      }
      user = {
        id: adminData.id,
        username: adminData.username,
        fullName: adminData.username, // Admin doesn't have fullName
        isActive: adminData.isActive ?? true,
        lastLoginAt: adminData.lastLoginAt,
        role: 'admin',
      };
    } else {
      // Employee login returns { token, user, role } format
      if (!responseData.user) {
        throw new Error('Invalid response from server');
      }
      user = {
        id: responseData.user.id,
        username: responseData.user.username,
        fullName: responseData.user.fullName,
        email: responseData.user.email,
        isActive: responseData.user.isActive ?? true,
        lastLoginAt: responseData.user.lastLoginAt,
        role: 'employee',
      };
    }

    // Store auth data
    storage.setToken(responseData.token);
    storage.setUser(user);
    storage.setRole(user.role);

    // Set token in API client
    apiClient.setToken(responseData.token);

    return user;
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthUser | null> {
    const role = storage.getRole();
    if (!role) return null;

    const endpoint = role === 'admin'
      ? ENDPOINTS.admin.profile
      : ENDPOINTS.employee.profile;

    try {
      const response = await apiClient.get<{ admin?: AuthUser; user?: AuthUser; role?: UserRole }>(endpoint);

      if (response.error || !response.data) {
        return null;
      }

      const responseData = response.data;
      let user: AuthUser;

      if (role === 'admin' && responseData.admin) {
        user = {
          ...responseData.admin,
          fullName: responseData.admin.username,
          role: 'admin',
        };
      } else if (responseData.user) {
        user = {
          ...responseData.user,
          role: responseData.role || 'employee',
        };
      } else {
        return null;
      }

      storage.setUser(user);
      return user;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  },

  /**
   * Change password for current user
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    const role = storage.getRole();
    if (!role) throw new Error('Not authenticated');

    const endpoint = role === 'admin'
      ? ENDPOINTS.admin.changePassword
      : ENDPOINTS.employee.changePassword;

    const response = await apiClient.post(endpoint, { oldPassword, newPassword });
    if (response.error) {
      throw new Error(response.error);
    }
    return true;
  },

  /**
   * Logout current user
   */
  logout(): void {
    storage.clearAuth();
    apiClient.setToken(null);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return storage.isAuthenticated();
  },

  /**
   * Get stored user
   */
  getStoredUser(): AuthUser | null {
    return storage.getUser();
  },

  /**
   * Get stored role
   */
  getStoredRole(): UserRole | null {
    return storage.getRole();
  },

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return storage.getRole() === 'admin';
  },

  /**
   * Initialize auth from storage (call on app load)
   */
  initializeAuth(): { user: AuthUser | null; isAuthenticated: boolean } {
    const token = storage.getToken();
    const user = storage.getUser();

    if (token && user) {
      apiClient.setToken(token);
      return { user, isAuthenticated: true };
    }

    return { user: null, isAuthenticated: false };
  },
};

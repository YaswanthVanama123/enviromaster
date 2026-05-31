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

export const authApi = {
  
  async login(credentials: LoginPayload, userType: UserRole): Promise<AuthUser> {
    const endpoint = userType === 'admin'
      ? ENDPOINTS.admin.login
      : ENDPOINTS.employee.login;

    const response = await apiClient.post<LoginResponse>(endpoint, credentials);

    if (response.error || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    const responseData = response.data;

    let user: AuthUser;

    if (userType === 'admin') {
      
      const adminData = responseData.admin || responseData.user;
      if (!adminData) {
        throw new Error('Invalid response from server');
      }
      user = {
        id: adminData.id,
        username: adminData.username,
        fullName: adminData.username, 
        isActive: adminData.isActive ?? true,
        lastLoginAt: adminData.lastLoginAt,
        role: 'admin',
      };
    } else {
      
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

    storage.setToken(responseData.token);
    storage.setUser(user);
    storage.setRole(user.role);

    apiClient.setToken(responseData.token);

    return user;
  },

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

  logout(): void {
    storage.clearAuth();
    apiClient.setToken(null);
  },

  isAuthenticated(): boolean {
    return storage.isAuthenticated();
  },

  getStoredUser(): AuthUser | null {
    return storage.getUser();
  },

  getStoredRole(): UserRole | null {
    return storage.getRole();
  },

  isAdmin(): boolean {
    return storage.getRole() === 'admin';
  },

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

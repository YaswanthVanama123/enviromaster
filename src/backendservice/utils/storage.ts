import type { AuthUser, UserRole } from '../types/api.types';

const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  AUTH_USER: "auth_user",
  USER_ROLE: "user_role",
  
  ADMIN_TOKEN: "admin_token",
  ADMIN_USER: "admin_user",
} as const;

export const storage = {
  getToken(): string | null {
    
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
           localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
  },

  removeToken(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  getUser(): AuthUser | null {
    const user = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (user) {
      return JSON.parse(user);
    }
    
    const adminUser = localStorage.getItem(STORAGE_KEYS.ADMIN_USER);
    if (adminUser) {
      const parsed = JSON.parse(adminUser);
      return { ...parsed, role: 'admin' as UserRole };
    }
    return null;
  },

  setUser(user: AuthUser): void {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    
    if (user.role === 'admin') {
      localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user));
    }
  },

  removeUser(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
  },

  getRole(): UserRole | null {
    const role = localStorage.getItem(STORAGE_KEYS.USER_ROLE) as UserRole | null;
    if (role) return role;
    
    const user = this.getUser();
    return user?.role || null;
  },

  setRole(role: UserRole): void {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  },

  removeRole(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
  },

  getAdminUser(): AuthUser | null {
    return this.getUser();
  },

  setAdminUser(user: any): void {
    const authUser: AuthUser = {
      ...user,
      role: 'admin' as UserRole,
    };
    this.setUser(authUser);
  },

  removeAdminUser(): void {
    this.removeUser();
  },

  clearAuth(): void {
    this.removeToken();
    this.removeUser();
    this.removeRole();
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  },
};

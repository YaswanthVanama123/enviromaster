
const STORAGE_KEYS = {
  ADMIN_TOKEN: "admin_token",
  ADMIN_USER: "admin_user",
} as const;

export const storage = {
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
  },

  removeToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  getAdminUser(): any {
    const user = localStorage.getItem(STORAGE_KEYS.ADMIN_USER);
    return user ? JSON.parse(user) : null;
  },

  setAdminUser(user: any): void {
    localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user));
  },

  removeAdminUser(): void {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
  },

  clearAuth(): void {
    this.removeToken();
    this.removeAdminUser();
  },
};

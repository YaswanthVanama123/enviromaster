// src/backendservice/hooks/useAdminAuth.ts

import { useState, useEffect, useCallback } from "react";
import { adminAuthApi } from "../api";
import type { LoginPayload, AdminUser } from "../types/api.types";

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = adminAuthApi.getStoredAdminUser();
    const authenticated = adminAuthApi.isAuthenticated();

    if (storedUser && authenticated) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (credentials: LoginPayload) => {
    setLoading(true);
    setError(null);

    const response = await adminAuthApi.login(credentials);

    if (response.error) {
      setError(response.error);
      setLoading(false);
      return { success: false, error: response.error };
    }

    if (response.data) {
      setUser(response.data.admin);
      setIsAuthenticated(true);
    }

    setLoading(false);
    return { success: true, data: response.data };
  };

  const logout = useCallback(() => {
    adminAuthApi.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    const response = await adminAuthApi.getProfile();

    if (response.error) {
      setError(response.error);
      // If unauthorized, logout
      if (response.status === 401) {
        logout();
      }
    } else if (response.data) {
      setUser(response.data);
    }

    setLoading(false);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    fetchProfile,
  };
}

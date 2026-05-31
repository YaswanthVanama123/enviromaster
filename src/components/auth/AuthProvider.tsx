import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../../backendservice/api/authApi';
import type { AuthUser, UserRole, LoginPayload } from '../../backendservice/types/api.types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  login: (credentials: LoginPayload, userType: UserRole) => Promise<AuthUser>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = () => {
      const { user: storedUser, isAuthenticated: isAuth } = authApi.initializeAuth();
      setUser(storedUser);
      setIsAuthenticated(isAuth);
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginPayload, userType: UserRole): Promise<AuthUser> => {
    setLoading(true);
    try {
      const loggedInUser = await authApi.login(credentials, userType);
      setUser(loggedInUser);
      setIsAuthenticated(true);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authApi.isAuthenticated()) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const profile = await authApi.getProfile();
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      logout();
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

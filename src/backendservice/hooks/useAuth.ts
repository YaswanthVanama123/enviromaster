import { useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/authApi';
import type { AuthUser, UserRole, LoginPayload } from '../types/api.types';

interface UseAuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
}

interface UseAuthReturn extends UseAuthState {
  login: (credentials: LoginPayload, userType: UserRole) => Promise<AuthUser>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  isAdmin: boolean;
}

function getInitialState(): UseAuthState {
  const { user, isAuthenticated } = authApi.initializeAuth();
  return {
    user,
    loading: false,
    error: null,
    isAuthenticated,
    role: user?.role || null,
  };
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<UseAuthState>(getInitialState);

  const login = useCallback(async (credentials: LoginPayload, userType: UserRole): Promise<AuthUser> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const user = await authApi.login(credentials, userType);
      setState({
        user,
        loading: false,
        error: null,
        isAuthenticated: true,
        role: user.role,
      });
      return user;
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Login failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isAuthenticated: false,
      }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      role: null,
    });
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!authApi.isAuthenticated()) {
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const user = await authApi.getProfile();
      if (user) {
        setState(prev => ({
          ...prev,
          user,
          loading: false,
          isAuthenticated: true,
          role: user.role,
        }));
      } else {
        
        authApi.logout();
        setState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
          role: null,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      
      authApi.logout();
      setState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        role: null,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && !state.user) {
      fetchProfile();
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    fetchProfile,
    clearError,
    isAdmin: state.role === 'admin',
  };
}

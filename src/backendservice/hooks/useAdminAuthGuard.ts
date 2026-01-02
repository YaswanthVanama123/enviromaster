// src/backendservice/hooks/useAdminAuthGuard.ts

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { apiClient } from '../utils/apiClient';

/**
 * Custom hook to set up automatic logout on 401/403 errors for admin panel
 *
 * This hook:
 * 1. Sets up an unauthorized callback on apiClient when component mounts
 * 2. On 401/403 from admin endpoints, automatically logs out and redirects to login
 * 3. Cleans up the callback when component unmounts
 *
 * Usage: Call this hook in AdminPanel or any top-level admin component
 */
export function useAdminAuthGuard() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ Set up unauthorized callback
    const handleUnauthorized = () => {
      console.log('🔒 [AUTH-GUARD] Unauthorized access detected - logging out');

      // Clear auth state and tokens
      logout();

      // Navigate to login page
      navigate('/admin-login', {
        replace: true,
        state: {
          message: 'Your session has expired. Please login again.',
          reason: 'unauthorized'
        }
      });
    };

    // Register the callback with apiClient
    apiClient.setUnauthorizedCallback(handleUnauthorized);
    console.log('✅ [AUTH-GUARD] Unauthorized callback registered for admin panel');

    // Cleanup: Remove callback when component unmounts
    return () => {
      apiClient.setUnauthorizedCallback(null);
      console.log('🧹 [AUTH-GUARD] Unauthorized callback removed');
    };
  }, [logout, navigate]);
}

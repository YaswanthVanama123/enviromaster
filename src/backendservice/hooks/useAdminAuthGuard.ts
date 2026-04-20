
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { apiClient } from '../utils/apiClient';

export function useAdminAuthGuard() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('🔒 [AUTH-GUARD] Unauthorized access detected - logging out');

      logout();

      navigate('/admin-login', {
        replace: true,
        state: {
          message: 'Your session has expired. Please login again.',
          reason: 'unauthorized'
        }
      });
    };

    apiClient.setUnauthorizedCallback(handleUnauthorized);
    console.log('✅ [AUTH-GUARD] Unauthorized callback registered for admin panel');

    return () => {
      apiClient.setUnauthorizedCallback(null);
      console.log('🧹 [AUTH-GUARD] Unauthorized callback removed');
    };
  }, [logout, navigate]);
}

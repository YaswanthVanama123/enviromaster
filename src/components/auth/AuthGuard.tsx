import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';

interface AuthGuardProps {
  requireAdmin?: boolean;
  children?: React.ReactNode;
}

export function AuthGuard({ requireAdmin = false, children }: AuthGuardProps) {
  const { isAuthenticated, isAdmin, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, message: 'Please log in to continue', reason: 'unauthorized' }}
        replace
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <Navigate
        to="/"
        state={{ message: 'Admin access required' }}
        replace
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#c00000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
};

if (!document.getElementById('auth-guard-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'auth-guard-styles';
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default AuthGuard;

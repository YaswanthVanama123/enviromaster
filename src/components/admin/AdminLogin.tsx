// src/components/admin/AdminLogin.tsx

import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAdminAuth } from "../../backendservice/hooks";

interface AdminLoginProps {
  onLoginSuccess?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const { login, loading, error } = useAdminAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // ✅ NEW: Show session expired message if redirected from auth guard
  useEffect(() => {
    const state = location.state as { message?: string; reason?: string } | undefined;
    if (state?.message && state?.reason === 'unauthorized') {
      setSessionMessage(state.message);
      // Clear message after 10 seconds
      const timer = setTimeout(() => setSessionMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login({ username, password });
    if (result.success && onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Admin Login</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter username"
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter password"
              required
            />
          </div>
          {sessionMessage && (
            <div style={styles.sessionWarning}>
              {sessionMessage}
            </div>
          )}
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "24px",
    textAlign: "center",
    color: "#333",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "8px",
  },
  error: {
    padding: "10px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    fontSize: "14px",
  },
  sessionWarning: {
    padding: "10px",
    backgroundColor: "#fef3c7",
    color: "#b45309",
    borderRadius: "8px",
    fontSize: "14px",
    border: "1px solid #fbbf24",
  },
};

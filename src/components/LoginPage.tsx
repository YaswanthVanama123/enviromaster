import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "./auth";
import type { UserRole } from "../backendservice/types/api.types";
import logo from "../assets/em-logo.png";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, isAuthenticated } = useAuthContext();

  const [activeTab, setActiveTab] = useState<UserRole>("employee");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasNavigated) {
      setHasNavigated(true);
      const from = (location.state as any)?.from?.pathname || "/home";
      
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 0);
    }
  }, [isAuthenticated, hasNavigated, navigate, location.state]);

  useEffect(() => {
    setLoginError(null);
    setUsername("");
    setPassword("");
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoginError(null);
    try {
      await login({ username, password }, activeTab);
      
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img src={logo} alt="EnviroMaster" style={styles.logo} />
          </div>
          <h1 style={styles.title}>EnviroMaster</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {}
        <div style={styles.tabContainer}>
          <button
            type="button"
            style={{
              ...styles.tab,
              ...(activeTab === "employee" ? styles.tabActive : styles.tabInactive),
            }}
            onClick={() => setActiveTab("employee")}
          >
            Employee
          </button>
          <button
            type="button"
            style={{
              ...styles.tab,
              ...(activeTab === "admin" ? styles.tabActive : styles.tabInactive),
            }}
            onClick={() => setActiveTab("admin")}
          >
            Admin
          </button>
        </div>

        {}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {loginError && <div style={styles.error}>{loginError}</div>}

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.buttonContent}>
                <span style={styles.spinner}></span>
                Signing in...
              </span>
            ) : (
              `Sign in as ${activeTab === "admin" ? "Admin" : "Employee"}`
            )}
          </button>
        </form>

        {}
        <p style={styles.infoText}>
          {activeTab === "admin"
            ? "Admin accounts have full system access including user management."
            : "Employee accounts can create and manage service agreements."}
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: "20px",
    zIndex: 9999,
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "40px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "420px",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  logoContainer: {
    width: "80px",
    height: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  logo: {
    width: "100%",
    height: "auto",
    objectFit: "contain",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  tabContainer: {
    display: "flex",
    backgroundColor: "#f1f1f1",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "24px",
  },
  tab: {
    flex: 1,
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tabActive: {
    backgroundColor: "#c00000",
    color: "white",
    boxShadow: "0 2px 4px rgba(192,0,0,0.2)",
  },
  tabInactive: {
    backgroundColor: "transparent",
    color: "#666",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  passwordContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  passwordInput: {
    width: "100%",
    padding: "12px 44px 12px 14px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  eyeButton: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    padding: "14px",
    backgroundColor: "#c00000",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    marginTop: "8px",
  },
  buttonDisabled: {
    backgroundColor: "#e57373",
    cursor: "not-allowed",
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  error: {
    padding: "12px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "10px",
    fontSize: "14px",
    border: "1px solid #fecaca",
  },
  infoText: {
    marginTop: "24px",
    fontSize: "13px",
    color: "#888",
    textAlign: "center",
    lineHeight: "1.5",
  },
};

if (!document.getElementById("login-page-styles")) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "login-page-styles";
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-input:focus {
      border-color: #c00000 !important;
      box-shadow: 0 0 0 3px rgba(192,0,0,0.1) !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default LoginPage;

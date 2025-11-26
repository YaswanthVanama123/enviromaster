import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, error, isAuthenticated } = useAdminAuth();
  const hasRedirected = useRef(false);

  // If already authenticated, redirect to admin panel
  useEffect(() => {
    if (isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/admin-panel", { replace: true });
    }
    // Reset redirect flag if not authenticated
    if (!isAuthenticated) {
      hasRedirected.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const result = await login({ username, password });

    if (result.success) {
      // On success, navigate to /admin-panel
      navigate("/admin-panel", { replace: true });
    }

    setLoading(false);
  };

  return (
    <section className="admin">
      <div className="admin__hero">Admin Login</div>

      <div className="admin__card">
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin} className="admin__form">
          <label>
            Username
            <input
              type="text"
              value={username}
              placeholder="Enter username"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Enter password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="toggle password"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {error && <p className="error">{error}</p>}

          <button
            type="submit"
            className="signin-btn"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <button type="button" className="forgot-btn">
            Forgot password?
          </button>
        </form>
      </div>
    </section>
  );
}

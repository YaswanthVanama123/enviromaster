import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // If admintoken already exists, force redirect to /admin-panel
  useEffect(() => {
    if (typeof window === "undefined") return;

    const existingToken = localStorage.getItem("admintoken");
    if (existingToken) {
      navigate("/admin-panel", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }

        console.log("Admin login 200 response:", data);

        // Try to pick token from common keys
        const token = data?.token ?? data?.adminToken ?? null;

        if (token) {
          localStorage.setItem("admintoken", token);
        }

        // On success always navigate to /admin-panel
        navigate("/admin-panel", { replace: true });
      } else {
        let message = "Invalid username or password";

        try {
          const errJson = await res.json();
          if (
            errJson &&
            typeof errJson === "object" &&
            "message" in errJson
          ) {
            message = (errJson as { message: string }).message;
          }
        } catch {
          // ignore JSON parse errors, keep default message
        }

        setError(message);
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
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

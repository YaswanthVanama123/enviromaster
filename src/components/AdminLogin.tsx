import { useState } from "react";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Dummy login data
  const dummyAdmin = {
    username: "admin",
    password: "12345"
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === dummyAdmin.username && password === dummyAdmin.password) {
      alert("Login successful ✅");
      setError("");
      // Later you can navigate to dashboard here
      // navigate("/admin/dashboard");
    } else {
      setError("Invalid username or password");
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

          <button type="submit" className="signin-btn">Sign in</button>
          <button type="button" className="forgot-btn">Forgot password?</button>
        </form>
      </div>
    </section>
  );
}

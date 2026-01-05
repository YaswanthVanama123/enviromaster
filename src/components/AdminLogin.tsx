import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'developer' | 'reset'>('developer');
  const [developerName, setDeveloperName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigate = useNavigate();
  const { login, error, isAuthenticated } = useAdminAuth();
  const isNavigatingRef = useRef(false);

  // If authenticated, redirect to admin panel
  useEffect(() => {
    if (isAuthenticated && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      navigate("/admin-panel", { replace: true });
    } else if (!isAuthenticated) {
      // Reset navigation flag when not authenticated
      isNavigatingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated, navigate is stable

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    await login({ username, password });
    // Navigation will be handled by useEffect when isAuthenticated changes

    setLoading(false);
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPasswordModal(true);
    setForgotPasswordStep('developer');
    setDeveloperName("");
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess(false);
  };

  const handleDeveloperSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (developerName.trim().toLowerCase() === "hanitha") {
      setForgotPasswordStep('reset');
    } else {
      setResetError("Access denied. Only authorized developers can reset passwords.");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);

    // Validation
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      setResetLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      setResetLoading(false);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developerName: developerName,
          newPassword: newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        setTimeout(() => {
          setShowForgotPasswordModal(false);
          setForgotPasswordStep('developer');
          setDeveloperName("");
          setNewPassword("");
          setConfirmPassword("");
          setResetSuccess(false);
        }, 2000);
      } else {
        setResetError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordStep('developer');
    setDeveloperName("");
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
    setResetSuccess(false);
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
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
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
          <button type="button" className="forgot-btn" onClick={handleForgotPasswordClick}>
            Forgot password?
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="forgot-password-overlay" onClick={closeForgotPasswordModal}>
          <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            {forgotPasswordStep === 'developer' ? (
              <>
                <div className="modal-header">
                  <h3>
                    <FontAwesomeIcon icon={faLock} style={{ marginRight: '8px' }} />
                    Developer Verification
                  </h3>
                  <button className="modal-close" onClick={closeForgotPasswordModal}>×</button>
                </div>
                <form onSubmit={handleDeveloperSubmit} className="modal-form">
                  <p className="modal-description">
                    Enter the developer name to proceed with password reset:
                  </p>
                  <label>
                    Developer Name
                    <div className="input-with-icon">
                      <FontAwesomeIcon icon={faUser} className="input-icon" />
                      <input
                        type="text"
                        value={developerName}
                        placeholder="Enter developer name"
                        onChange={(e) => setDeveloperName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </label>
                  {resetError && <p className="error">{resetError}</p>}
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeForgotPasswordModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Continue
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <h3>
                    <FontAwesomeIcon icon={faLock} style={{ marginRight: '8px' }} />
                    Reset Password
                  </h3>
                  <button className="modal-close" onClick={closeForgotPasswordModal}>×</button>
                </div>
                <form onSubmit={handlePasswordReset} className="modal-form">
                  <p className="modal-description">
                    Welcome, {developerName}! Set a new admin password:
                  </p>

                  <label>
                    New Password
                    <div className="password-wrap">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        placeholder="Enter new password"
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label="toggle new password"
                      >
                        <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                  </label>

                  <label>
                    Confirm Password
                    <div className="password-wrap">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        placeholder="Confirm new password"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="toggle confirm password"
                      >
                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                      </button>
                    </div>
                  </label>

                  {resetError && <p className="error">{resetError}</p>}
                  {resetSuccess && <p className="success">Password reset successfully!</p>}

                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeForgotPasswordModal} disabled={resetLoading}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={resetLoading}>
                      {resetLoading ? "Resetting..." : "Reset Password"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

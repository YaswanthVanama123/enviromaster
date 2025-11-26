import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import "./AdminPanel.css";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAdminAuth();
  const isNavigatingRef = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      navigate("/admin-login", { replace: true });
    } else if (isAuthenticated) {
      // Reset navigation flag when authenticated
      isNavigatingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated, navigate is stable

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Show loading or nothing while checking auth
  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="admin-panel">
      <div className="admin-header">
        <div>Admin Panel</div>
        {user && <div className="admin-username">Welcome, {user.username}</div>}
      </div>

      <div className="admin-options">
        <div
          className="admin-card"
          onClick={() => handleNavigation("/pricing-tables")}
        >
          <div className="icon">📊</div>
          <div className="label">Pricing Tables</div>
        </div>

        <div
          className="admin-card"
          onClick={() => handleNavigation("/approval-documents")}
        >
          <div className="icon">📋</div>
          <div className="label">Approval Documents</div>
        </div>

        <div
          className="admin-card"
          onClick={() => handleNavigation("/form-templates")}
        >
          <div className="icon">📄</div>
          <div className="label">Form Templates</div>
        </div>

        <div
          className="admin-card"
          onClick={() => handleNavigation("/price-changes")}
        >
          <div className="icon">💲</div>
          <div className="label">Price Changes</div>
        </div>
      </div>
    </section>
  );
}

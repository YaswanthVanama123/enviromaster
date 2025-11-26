import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import "./AdminPanel.css";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAdminAuth();
  const hasRedirected = useRef(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/admin-login", { replace: true });
    }
    // Reset redirect flag if authenticated
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

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

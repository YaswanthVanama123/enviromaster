import React from "react";
import "./AdminPanel.css";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <section className="admin-panel">
      <div className="admin-header">Admin Panel</div>

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

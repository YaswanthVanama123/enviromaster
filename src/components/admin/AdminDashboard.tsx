// src/components/admin/AdminDashboard.tsx

import React, { useState } from "react";
import { useAdminAuth } from "../../backendservice/hooks";
import { AdminLogin } from "./AdminLogin";
import { PricingTablesView } from "./PricingTablesView";
import { ServiceConfigManager } from "./ServiceConfigManager";
import { ProductCatalogManager } from "./ProductCatalogManager";

type TabType = "pricing" | "services" | "products";

export const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>("pricing");

  if (!isAuthenticated || !user) {
    return <AdminLogin />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <h1 style={styles.logo}>Enviro-Master Admin</h1>
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user.username}</span>
          </div>
        </div>
        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </div>

      <div style={styles.navigation}>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "pricing" ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab("pricing")}
        >
          📊 Pricing Tables
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "services" ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab("services")}
        >
          ⚙️ Service Configs
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "products" ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab("products")}
        >
          📦 Product Catalog
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === "pricing" && <PricingTablesView />}
        {activeTab === "services" && <ServiceConfigManager />}
        {activeTab === "products" && <ProductCatalogManager />}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "white",
    borderBottom: "1px solid #e5e5e5",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  logo: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111",
    margin: 0,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  userName: {
    fontSize: "14px",
    color: "#666",
  },
  logoutButton: {
    padding: "8px 16px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  navigation: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
    backgroundColor: "white",
    borderBottom: "1px solid #e5e5e5",
    overflowX: "auto",
  },
  navButton: {
    padding: "10px 20px",
    border: "none",
    backgroundColor: "transparent",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    color: "#666",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  navButtonActive: {
    backgroundColor: "#2563eb",
    color: "white",
  },
  content: {
    padding: "0",
  },
};

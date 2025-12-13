// src/components/admin/AdminDashboard.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../backendservice/hooks";
import { PricingTablesView } from "./PricingTablesView";
import { ServiceConfigManager } from "./ServiceConfigManager";
import { ProductCatalogManager } from "./ProductCatalogManager";
import { PricingBackupManager } from "./PricingBackupManager";
import { MdAttachMoney, MdSettings, MdInventory, MdBackup } from "react-icons/md";

type TabType = "pricing" | "services" | "products" | "backup";

interface AdminDashboardProps {
  isEmbedded?: boolean;
  parentPath?: string;
  initialSubtab?: string;
  modalType?: string;
  itemId?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isEmbedded = false,
  parentPath,
  initialSubtab,
  modalType: propModalType,
  itemId: propItemId
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subtab, modalType, itemId } = useParams<{ subtab: string; modalType: string; itemId: string }>();
  const { user, isAuthenticated, logout } = useAdminAuth();

  // Use props when embedded, URL params when standalone
  const currentSubtab = isEmbedded ? initialSubtab : subtab;
  const currentModalType = isEmbedded ? propModalType : modalType;
  const currentItemId = isEmbedded ? propItemId : itemId;

  // Determine active tab from URL parameter with fallback to pricing
  const getActiveTabFromUrl = (): TabType => {
    const path = window.location.pathname;

    if (isEmbedded) {
      // When embedded in admin panel, check URL path first
      if (path.includes('/admin-panel/') && (path.includes('/services') || path.includes('/services/'))) {
        return "services";
      }
      if (path.includes('/admin-panel/') && (path.includes('/products') || path.includes('/products/'))) {
        return "products";
      }
      if (path.includes('/admin-panel/') && (path.includes('/backup') || path.includes('/backup/'))) {
        return "backup";
      }

      // Then use currentSubtab as fallback
      if (!currentSubtab) return "pricing";
      const validTabs: TabType[] = ["pricing", "services", "products", "backup"];
      return validTabs.includes(currentSubtab as TabType) ? (currentSubtab as TabType) : "pricing";
    }

    // Check if URL is /pricing-tables/services or /pricing-tables/products or /pricing-tables/backup
    if (path.includes('/pricing-tables/services')) {
      return "services";
    }
    if (path.includes('/pricing-tables/products')) {
      return "products";
    }
    if (path.includes('/pricing-tables/backup')) {
      return "backup";
    }

    if (!currentSubtab) return "pricing";
    const validTabs: TabType[] = ["pricing", "services", "products", "backup"];
    return validTabs.includes(currentSubtab as TabType) ? (currentSubtab as TabType) : "pricing";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromUrl());

  // Update active tab when URL parameter changes
  useEffect(() => {
    const urlTab = getActiveTabFromUrl();
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [currentSubtab, isEmbedded, location.pathname]);

  // Update URL when tab changes
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);

    if (isEmbedded && parentPath) {
      // When embedded, use admin panel URL structure
      navigate(`${parentPath}/${newTab}`, { replace: true });
    } else {
      // When standalone, use pricing-tables URL structure
      navigate(`/pricing-tables/${newTab}`, { replace: true });
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin-login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Show nothing while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div style={styles.container}>
      {!isEmbedded && (
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
      )}

      <div style={styles.navigation}>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "pricing" ? styles.navButtonActive : {}),
          }}
          onClick={() => handleTabChange("pricing")}
        >
          <MdAttachMoney size={20} style={{ marginRight: "8px" }} /> Pricing Tables
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "services" ? styles.navButtonActive : {}),
          }}
          onClick={() => handleTabChange("services")}
        >
          <MdSettings size={20} style={{ marginRight: "8px" }} /> Service Configs
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "products" ? styles.navButtonActive : {}),
          }}
          onClick={() => handleTabChange("products")}
        >
          <MdInventory size={20} style={{ marginRight: "8px" }} /> Product Catalog
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === "backup" ? styles.navButtonActive : {}),
          }}
          onClick={() => handleTabChange("backup")}
        >
          <MdBackup size={20} style={{ marginRight: "8px" }} /> Backup Management
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === "pricing" && <PricingTablesView />}
        {activeTab === "services" && (
          <ServiceConfigManager
            modalType={currentModalType}
            itemId={currentItemId}
            isEmbedded={isEmbedded}
            parentPath={parentPath}
          />
        )}
        {activeTab === "products" && (
          <ProductCatalogManager
            modalType={currentModalType}
            itemId={currentItemId}
            isEmbedded={isEmbedded}
            parentPath={parentPath}
          />
        )}
        {activeTab === "backup" && (
          <PricingBackupManager
            isEmbedded={isEmbedded}
            parentPath={parentPath ? `${parentPath}/backup` : '/pricing-tables/backup'}
          />
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100%",
    backgroundColor: "transparent",
    width: "100%",
    maxWidth: "100%",
    borderRadius:"20px",
    overflow: "hidden"
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
    display: "flex",
    alignItems: "center",
  },
  navButtonActive: {
    backgroundColor: "#2563eb",
    color: "white",
  },
  content: {
    padding: "0",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
};

// src/components/admin/AdminPricingManager.tsx

import React, { useState } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import { ServicePricingEditor } from "./ServicePricingEditor";

// Import all service forms
import { SanicleanForm } from "../services/saniclean/SanicleanForm";
import { SanipodForm } from "../services/sanipod/SanipodForm";
import { SaniscrubForm } from "../services/saniscrub/SaniscrubForm";
import { FoamingDrainForm } from "../services/foamingDrain/FoamingDrainForm";
import { GreaseTrapForm } from "../services/greaseTrap/GreaseTrapForm";
import { MicrofiberMoppingForm } from "../services/microfiberMopping/MicrofiberMoppingForm";
import { RpmWindowsForm } from "../services/rpmWindows/RpmWindowsForm";
import { CarpetForm } from "../services/carpetCleaning/CarpetForm";
import { JanitorialForm } from "../services/purejanitorial/JanitorialForm";
import { StripWaxForm } from "../services/stripWax/StripWaxForm";
import { RefreshPowerScrubForm } from "../services/refreshPowerScrub/RefreshPowerScrubForm";
import { ElectrostaticSprayForm } from "../services/electrostaticSpray/ElectrostaticSprayForm";

type ViewMode = "list" | "service" | "products" | "editConfig";

export const AdminPricingManager: React.FC = () => {
  const { configs, loading, error, updateConfig } = useServiceConfigs();
  const { catalog, loading: catalogLoading } = useActiveProductCatalog();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleViewService = (config: ServiceConfig) => {
    setSelectedService(config);
    setViewMode("service");
  };

  const handleEditConfig = (config: ServiceConfig) => {
    setSelectedService(config);
    setViewMode("editConfig");
  };

  const handleSaveConfig = async (editedConfig: Record<string, any>) => {
    if (!selectedService?._id) return;

    const result = await updateConfig(selectedService._id, {
      config: editedConfig,
    });

    if (result.success) {
      setSuccessMessage("Configuration saved successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        setViewMode("list");
      }, 2000);
    }
  };

  const handleCancelEdit = () => {
    setViewMode("list");
    setSelectedService(null);
  };

  const renderServiceForm = (config: ServiceConfig) => {
    const serviceId = config.serviceId;
    const initialData = config.defaultFormState || {};

    const serviceComponents: Record<string, React.ReactElement> = {
      saniclean: <SanicleanForm initialData={initialData} />,
      sanipod: <SanipodForm initialData={initialData} />,
      saniscrub: <SaniscrubForm initialData={initialData} />,
      foamingDrain: <FoamingDrainForm initialData={initialData} />,
      greaseTrap: <GreaseTrapForm initialData={initialData} />,
      microfiberMopping: <MicrofiberMoppingForm initialData={initialData} />,
      rpmWindows: <RpmWindowsForm initialData={initialData} />,
      carpetCleaning: <CarpetForm initialData={initialData} />,
      pureJanitorial: <JanitorialForm initialData={initialData} />,
      stripWax: <StripWaxForm initialData={initialData} />,
      refreshPowerScrub: <RefreshPowerScrubForm initialData={initialData} />,
      electrostaticSpray: <ElectrostaticSprayForm initialData={initialData} />,
    };

    return serviceComponents[serviceId] || (
      <div style={styles.noForm}>No form available for this service</div>
    );
  };

  if (loading || catalogLoading) {
    return <div style={styles.loading}>Loading pricing data...</div>;
  }

  // LIST VIEW - Show all services
  if (viewMode === "list") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Pricing Management</h2>
          <p style={styles.subtitle}>View and edit service pricing configurations</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={styles.success}>{successMessage}</div>}

        <div style={styles.topActions}>
          <button
            style={styles.viewButton}
            onClick={() => setViewMode("products")}
          >
            📦 View Product Catalog
          </button>
        </div>

        <div style={styles.grid}>
          {configs.map((config) => (
            <div key={config._id} style={styles.serviceCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{config.label}</h3>
                {config.isActive && <span style={styles.activeBadge}>Active</span>}
              </div>

              <p style={styles.cardDescription}>{config.description}</p>

              <div style={styles.cardMeta}>
                <span style={styles.metaItem}>Version: {config.version}</span>
                <span style={styles.metaItem}>ID: {config.serviceId}</span>
              </div>

              <div style={styles.cardActions}>
                <button
                  style={styles.viewFormButton}
                  onClick={() => handleViewService(config)}
                >
                  View Pricing Form
                </button>
                <button
                  style={styles.editConfigButton}
                  onClick={() => handleEditConfig(config)}
                >
                  Edit Config
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // SERVICE VIEW - Show service form
  if (viewMode === "service" && selectedService) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <button style={styles.backButton} onClick={() => setViewMode("list")}>
              ← Back to Services
            </button>
            <h2 style={styles.title}>{selectedService.label}</h2>
            <p style={styles.subtitle}>{selectedService.description}</p>
          </div>
          <button
            style={styles.editConfigButton}
            onClick={() => handleEditConfig(selectedService)}
          >
            Edit Configuration
          </button>
        </div>

        <div style={styles.formContainer}>
          <div style={styles.formWrapper}>
            {renderServiceForm(selectedService)}
          </div>

          <div style={styles.configPanel}>
            <h3 style={styles.panelTitle}>Current Configuration</h3>
            <div style={styles.configInfo}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Version:</span>
                <span style={styles.infoValue}>{selectedService.version}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Service ID:</span>
                <code style={styles.code}>{selectedService.serviceId}</code>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Status:</span>
                <span style={selectedService.isActive ? styles.statusActive : styles.statusInactive}>
                  {selectedService.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <h4 style={styles.sectionTitle}>Configuration JSON</h4>
            <pre style={styles.codeBlock}>
              {JSON.stringify(selectedService.config, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // EDIT CONFIG VIEW
  if (viewMode === "editConfig" && selectedService) {
    return (
      <ServicePricingEditor
        config={selectedService}
        onSave={handleSaveConfig}
        onCancel={handleCancelEdit}
      />
    );
  }

  // PRODUCTS VIEW
  if (viewMode === "products" && catalog) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <button style={styles.backButton} onClick={() => setViewMode("list")}>
              ← Back to Services
            </button>
            <h2 style={styles.title}>Product Catalog</h2>
            <p style={styles.subtitle}>
              Version: {catalog.version} | Currency: {catalog.currency}
            </p>
          </div>
        </div>

        <div style={styles.productGrid}>
          {catalog.families.map((family) => (
            <div key={family.key} style={styles.familySection}>
              <h3 style={styles.familyTitle}>
                {family.label} ({family.products.length} products)
              </h3>

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>UOM</th>
                      <th style={styles.th}>Warranty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.products.map((product) => (
                      <tr key={product.key} style={styles.tableRow}>
                        <td style={styles.td}>{product.name}</td>
                        <td style={styles.td}>
                          {product.basePrice
                            ? `$${product.basePrice.amount}`
                            : "—"}
                        </td>
                        <td style={styles.td}>{product.basePrice?.uom || "—"}</td>
                        <td style={styles.td}>
                          {product.warrantyPricePerUnit
                            ? `$${product.warrantyPricePerUnit.amount}/${product.warrantyPricePerUnit.billingPeriod}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px",
    maxWidth: "1600px",
    margin: "0 auto",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
  },
  header: {
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#111",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: 0,
  },
  loading: {
    textAlign: "center",
    padding: "60px 20px",
    fontSize: "16px",
    color: "#666",
  },
  error: {
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  success: {
    padding: "12px 16px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  topActions: {
    marginBottom: "24px",
  },
  viewButton: {
    padding: "10px 20px",
    backgroundColor: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "20px",
  },
  serviceCard: {
    padding: "24px",
    backgroundColor: "white",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111",
    margin: 0,
  },
  activeBadge: {
    padding: "4px 10px",
    backgroundColor: "#10b981",
    color: "white",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "16px",
    lineHeight: "1.5",
  },
  cardMeta: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
    fontSize: "13px",
    color: "#888",
  },
  metaItem: {},
  cardActions: {
    display: "flex",
    gap: "8px",
  },
  viewFormButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  editConfigButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#64748b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  backButton: {
    padding: "8px 16px",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    cursor: "pointer",
    marginBottom: "12px",
  },
  formContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 400px",
    gap: "24px",
  },
  formWrapper: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e5e7eb",
  },
  configPanel: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e5e7eb",
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
  },
  panelTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#111",
  },
  configInfo: {
    marginBottom: "24px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  infoLabel: {
    fontSize: "13px",
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: "13px",
    color: "#111",
  },
  code: {
    backgroundColor: "#f0f0f0",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  statusActive: {
    color: "#10b981",
    fontWeight: "600",
  },
  statusInactive: {
    color: "#ef4444",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginTop: "20px",
    marginBottom: "12px",
    color: "#111",
  },
  codeBlock: {
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    padding: "16px",
    borderRadius: "8px",
    fontSize: "12px",
    lineHeight: "1.6",
    overflow: "auto",
    maxHeight: "400px",
  },
  editorContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e5e7eb",
  },
  editorInfo: {
    padding: "12px 16px",
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  infoText: {
    fontSize: "14px",
    color: "#92400e",
    margin: 0,
  },
  jsonEditor: {
    width: "100%",
    padding: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "13px",
    fontFamily: "monospace",
    lineHeight: "1.6",
    resize: "vertical",
    outline: "none",
  },
  editorActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "16px",
  },
  cancelButton: {
    padding: "10px 20px",
    border: "1px solid #d1d5db",
    backgroundColor: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  saveButton: {
    padding: "10px 24px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  noForm: {
    padding: "40px",
    textAlign: "center",
    color: "#666",
  },
  productGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
  familySection: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #e5e7eb",
  },
  familyTitle: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#111",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeaderRow: {
    backgroundColor: "#f9fafb",
  },
  th: {
    padding: "12px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    color: "#111",
    borderBottom: "2px solid #e5e7eb",
  },
  tableRow: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "12px",
    fontSize: "14px",
    color: "#333",
  },
};

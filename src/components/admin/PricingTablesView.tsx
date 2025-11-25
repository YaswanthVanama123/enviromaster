// src/components/admin/PricingTablesView.tsx

import React, { useState, useEffect } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import type { Product } from "../../backendservice/types/productCatalog.types";

type ViewMode = "services" | "products";

interface EditField {
  serviceId: string;
  path: string[];
  label: string;
  value: number;
}

export const PricingTablesView: React.FC = () => {
  const { configs, loading: servicesLoading, error: servicesError, updateConfig } = useServiceConfigs();
  const { catalog, loading: catalogLoading, error: catalogError, updateCatalog } = useActiveProductCatalog();

  const [viewMode, setViewMode] = useState<ViewMode>("services");
  const [editingField, setEditingField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const extractPricingFields = (config: any, serviceId: string): Array<{ label: string; value: number; path: string[] }> => {
    const fields: Array<{ label: string; value: number; path: string[] }> = [];

    // Geographic Pricing
    if (config.geographicPricing) {
      if (config.geographicPricing.insideBeltway) {
        const ib = config.geographicPricing.insideBeltway;
        if (ib.ratePerFixture !== undefined) {
          fields.push({ label: "Inside Beltway - Rate/Fixture", value: ib.ratePerFixture, path: ["geographicPricing", "insideBeltway", "ratePerFixture"] });
        }
        if (ib.weeklyMinimum !== undefined) {
          fields.push({ label: "Inside Beltway - Weekly Minimum", value: ib.weeklyMinimum, path: ["geographicPricing", "insideBeltway", "weeklyMinimum"] });
        }
      }
      if (config.geographicPricing.outsideBeltway) {
        const ob = config.geographicPricing.outsideBeltway;
        if (ob.ratePerFixture !== undefined) {
          fields.push({ label: "Outside Beltway - Rate/Fixture", value: ob.ratePerFixture, path: ["geographicPricing", "outsideBeltway", "ratePerFixture"] });
        }
        if (ob.weeklyMinimum !== undefined) {
          fields.push({ label: "Outside Beltway - Weekly Minimum", value: ob.weeklyMinimum, path: ["geographicPricing", "outsideBeltway", "weeklyMinimum"] });
        }
      }
    }

    // All-Inclusive Package
    if (config.allInclusivePackage?.weeklyRatePerFixture !== undefined) {
      fields.push({ label: "All-Inclusive Weekly Rate/Fixture", value: config.allInclusivePackage.weeklyRatePerFixture, path: ["allInclusivePackage", "weeklyRatePerFixture"] });
    }

    // Warranty Fees
    if (config.warrantyFeePerDispenser !== undefined) {
      fields.push({ label: "Warranty Fee/Dispenser", value: config.warrantyFeePerDispenser, path: ["warrantyFeePerDispenser"] });
    }

    // Soap Upgrades
    if (config.soapUpgrades?.standardToLuxury !== undefined) {
      fields.push({ label: "Soap Upgrade - Standard to Luxury", value: config.soapUpgrades.standardToLuxury, path: ["soapUpgrades", "standardToLuxury"] });
    }

    // Service-specific rates
    if (config.ratePerTrap !== undefined) {
      fields.push({ label: "Rate per Trap", value: config.ratePerTrap, path: ["ratePerTrap"] });
    }
    if (config.ratePerGallon !== undefined) {
      fields.push({ label: "Rate per Gallon", value: config.ratePerGallon, path: ["ratePerGallon"] });
    }
    if (config.weeklyRatePerBathroom !== undefined) {
      fields.push({ label: "Weekly Rate per Bathroom", value: config.weeklyRatePerBathroom, path: ["weeklyRatePerBathroom"] });
    }
    if (config.monthlyRatePerSqFt !== undefined) {
      fields.push({ label: "Monthly Rate per Sq Ft", value: config.monthlyRatePerSqFt, path: ["monthlyRatePerSqFt"] });
    }

    return fields;
  };

  const handleEditField = (service: ServiceConfig, field: { label: string; value: number; path: string[] }) => {
    setEditingField({
      serviceId: service._id,
      path: field.path,
      label: field.label,
      value: field.value,
    });
    setEditValue(field.value.toString());
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    const service = configs.find(c => c._id === editingField.serviceId);
    if (!service) return;

    setSaving(true);

    // Create updated config
    const newConfig = JSON.parse(JSON.stringify(service.config));
    let current: any = newConfig;

    // Navigate to parent
    for (let i = 0; i < editingField.path.length - 1; i++) {
      current = current[editingField.path[i]];
    }

    // Update value
    current[editingField.path[editingField.path.length - 1]] = parseFloat(editValue) || 0;

    const result = await updateConfig(editingField.serviceId, { config: newConfig });

    if (result.success) {
      setSuccessMessage("✓ Price updated successfully!");
      setEditingField(null);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const renderServicesView = () => {
    if (servicesLoading) {
      return (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading service pricing...</p>
        </div>
      );
    }

    if (servicesError) {
      return <div style={styles.errorBox}>⚠️ {servicesError}</div>;
    }

    return (
      <div style={styles.servicesGrid}>
        {configs.map((service) => {
          const pricingFields = extractPricingFields(service.config, service.serviceId);

          return (
            <div key={service._id} style={styles.serviceCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.serviceName}>{service.label}</h3>
                  <p style={styles.serviceDescription}>{service.description}</p>
                </div>
                {service.isActive ? (
                  <span style={styles.badgeActive}>● Active</span>
                ) : (
                  <span style={styles.badgeInactive}>● Inactive</span>
                )}
              </div>

              <div style={styles.metaInfo}>
                <span style={styles.metaTag}>
                  <strong>ID:</strong> {service.serviceId}
                </span>
                <span style={styles.metaTag}>
                  <strong>Ver:</strong> {service.version}
                </span>
              </div>

              <div style={styles.pricingSection}>
                <h4 style={styles.pricingSectionTitle}>💰 Pricing Details</h4>

                {pricingFields.length === 0 ? (
                  <p style={styles.noPricing}>No pricing data available</p>
                ) : (
                  <div style={styles.priceGrid}>
                    {pricingFields.map((field, idx) => {
                      const isEditing = editingField?.serviceId === service._id &&
                                       editingField?.path.join(".") === field.path.join(".");

                      return (
                        <div key={idx} style={styles.priceRow}>
                          <div style={styles.priceLabel}>{field.label}</div>
                          <div style={styles.priceValueContainer}>
                            {isEditing ? (
                              <div style={styles.editContainer}>
                                <input
                                  type="number"
                                  style={styles.priceInput}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                  step="0.01"
                                />
                                <button
                                  style={styles.saveBtn}
                                  onClick={handleSaveField}
                                  disabled={saving}
                                >
                                  {saving ? "..." : "✓"}
                                </button>
                                <button style={styles.cancelBtn} onClick={handleCancelEdit}>
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                <span style={styles.priceValue}>${field.value.toFixed(2)}</span>
                                <button
                                  style={styles.editBtn}
                                  onClick={() => handleEditField(service, field)}
                                >
                                  Edit
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProductsView = () => {
    if (catalogLoading) {
      return (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading product catalog...</p>
        </div>
      );
    }

    if (catalogError) {
      return <div style={styles.errorBox}>⚠️ {catalogError}</div>;
    }

    if (!catalog) {
      return <div style={styles.errorBox}>No product catalog found</div>;
    }

    return (
      <div style={styles.productsContainer}>
        <div style={styles.catalogHeader}>
          <h2 style={styles.catalogTitle}>Product Catalog</h2>
          <div style={styles.catalogMeta}>
            <span style={styles.catalogBadge}>Version: {catalog.version}</span>
            <span style={styles.catalogBadge}>Currency: {catalog.currency}</span>
          </div>
        </div>

        {catalog.families.map((family) => (
          <div key={family.key} style={styles.familyCard}>
            <div style={styles.familyHeader}>
              <h3 style={styles.familyTitle}>{family.label}</h3>
              <span style={styles.productCount}>{family.products.length} products</span>
            </div>

            <div style={styles.productsGrid}>
              {family.products.map((product) => (
                <div key={product.key} style={styles.productCard}>
                  <div style={styles.productHeader}>
                    <h4 style={styles.productName}>{product.name}</h4>
                    <code style={styles.productKey}>{product.key}</code>
                  </div>

                  <div style={styles.productPricing}>
                    <div style={styles.priceItem}>
                      <span style={styles.priceItemLabel}>Base Price:</span>
                      <span style={styles.priceItemValue}>
                        {product.basePrice ? `$${product.basePrice.amount}` : "—"}
                      </span>
                    </div>
                    {product.basePrice?.uom && (
                      <div style={styles.priceItem}>
                        <span style={styles.priceItemLabel}>UOM:</span>
                        <span style={styles.priceItemValue}>{product.basePrice.uom}</span>
                      </div>
                    )}
                    {product.warrantyPricePerUnit && (
                      <>
                        <div style={styles.priceItem}>
                          <span style={styles.priceItemLabel}>Warranty:</span>
                          <span style={styles.priceItemValue}>
                            ${product.warrantyPricePerUnit.amount}/{product.warrantyPricePerUnit.billingPeriod}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {successMessage && (
        <div style={styles.successBanner}>
          {successMessage}
        </div>
      )}

      <div style={styles.topBar}>
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(viewMode === "services" ? styles.tabActive : {}),
            }}
            onClick={() => setViewMode("services")}
          >
            <span style={styles.tabIcon}>🛠️</span>
            <span>Services</span>
            <span style={styles.tabBadge}>{configs.length}</span>
          </button>
          <button
            style={{
              ...styles.tab,
              ...(viewMode === "products" ? styles.tabActive : {}),
            }}
            onClick={() => setViewMode("products")}
          >
            <span style={styles.tabIcon}>📦</span>
            <span>Products</span>
            <span style={styles.tabBadge}>
              {catalog?.families.reduce((acc, f) => acc + f.products.length, 0) || 0}
            </span>
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {viewMode === "services" && renderServicesView()}
        {viewMode === "products" && renderProductsView()}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  },
  successBanner: {
    padding: "16px 24px",
    backgroundColor: "#10b981",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
  },
  topBar: {
    backgroundColor: "white",
    borderBottom: "2px solid #e2e8f0",
    padding: "0 24px",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  tabContainer: {
    display: "flex",
    gap: "8px",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "16px 24px",
    border: "none",
    backgroundColor: "transparent",
    color: "#64748b",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    borderBottom: "3px solid transparent",
    transition: "all 0.2s",
  },
  tabActive: {
    color: "#2563eb",
    borderBottomColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  tabIcon: {
    fontSize: "18px",
  },
  tabBadge: {
    padding: "2px 8px",
    backgroundColor: "#e2e8f0",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "600",
  },
  content: {
    padding: "32px 24px",
  },

  // Services Grid
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
    gap: "24px",
  },
  serviceCard: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f1f5f9",
  },
  serviceName: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  serviceDescription: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  badgeActive: {
    padding: "6px 12px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },
  badgeInactive: {
    padding: "6px 12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },
  metaInfo: {
    display: "flex",
    gap: "16px",
    marginBottom: "20px",
  },
  metaTag: {
    fontSize: "13px",
    color: "#64748b",
  },
  pricingSection: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
  },
  pricingSectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 16px 0",
  },
  noPricing: {
    fontSize: "14px",
    color: "#94a3b8",
    fontStyle: "italic",
    margin: 0,
  },
  priceGrid: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  priceLabel: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: "500",
    flex: 1,
  },
  priceValueContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  priceValue: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#059669",
    minWidth: "80px",
    textAlign: "right" as const,
  },
  editBtn: {
    padding: "6px 14px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  editContainer: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  priceInput: {
    width: "100px",
    padding: "6px 10px",
    border: "2px solid #2563eb",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },
  saveBtn: {
    padding: "6px 12px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "6px 12px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  // Products
  productsContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "24px",
  },
  catalogHeader: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  catalogTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 12px 0",
  },
  catalogMeta: {
    display: "flex",
    gap: "12px",
  },
  catalogBadge: {
    padding: "6px 14px",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
  },
  familyCard: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  familyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "2px solid #f1f5f9",
  },
  familyTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  productCount: {
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "600",
  },
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
  },
  productCard: {
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  productHeader: {
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0",
  },
  productName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    margin: "0 0 6px 0",
  },
  productKey: {
    fontSize: "11px",
    padding: "3px 8px",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    borderRadius: "6px",
    fontFamily: "monospace",
  },
  productPricing: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  priceItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceItemLabel: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },
  priceItemValue: {
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "700",
  },

  // Loading & Error
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 20px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e2e8f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    marginTop: "16px",
    fontSize: "15px",
    color: "#64748b",
    fontWeight: "500",
  },
  errorBox: {
    padding: "20px 24px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: "12px",
    border: "1px solid #fecaca",
    fontSize: "15px",
    fontWeight: "500",
  },
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

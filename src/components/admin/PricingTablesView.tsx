// src/components/admin/PricingTablesView.tsx

import React, { useState, useEffect } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import type { Product } from "../../backendservice/types/productCatalog.types";

export const PricingTablesView: React.FC = () => {
  const { configs, loading: servicesLoading, updateConfig } = useServiceConfigs();
  const { catalog, loading: catalogLoading, updateCatalog } = useActiveProductCatalog();

  // Product state
  const [selectedProductFamily, setSelectedProductFamily] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<{ familyKey: string; productKey: string; field: "basePrice" | "warrantyPrice"; value: string } | null>(null);

  // Service state
  const [selectedService, setSelectedService] = useState<string>("");
  const [editingServiceField, setEditingServiceField] = useState<{ serviceId: string; path: string[]; value: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Set initial selections
  useEffect(() => {
    if (catalog && catalog.families.length > 0 && !selectedProductFamily) {
      setSelectedProductFamily(catalog.families[0].key);
    }
  }, [catalog, selectedProductFamily]);

  useEffect(() => {
    if (configs.length > 0 && !selectedService) {
      setSelectedService(configs[0].serviceId);
    }
  }, [configs, selectedService]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Extract pricing fields from service config
  const extractServicePricing = (config: any) => {
    const fields: Array<{ label: string; value: number; path: string[] }> = [];

    if (config.geographicPricing?.insideBeltway) {
      const ib = config.geographicPricing.insideBeltway;
      if (ib.ratePerFixture !== undefined) fields.push({ label: "Inside Beltway - Rate per Fixture", value: ib.ratePerFixture, path: ["geographicPricing", "insideBeltway", "ratePerFixture"] });
      if (ib.weeklyMinimum !== undefined) fields.push({ label: "Inside Beltway - Weekly Minimum", value: ib.weeklyMinimum, path: ["geographicPricing", "insideBeltway", "weeklyMinimum"] });
      if (ib.tripCharge !== undefined) fields.push({ label: "Inside Beltway - Trip Charge", value: ib.tripCharge, path: ["geographicPricing", "insideBeltway", "tripCharge"] });
    }

    if (config.geographicPricing?.outsideBeltway) {
      const ob = config.geographicPricing.outsideBeltway;
      if (ob.ratePerFixture !== undefined) fields.push({ label: "Outside Beltway - Rate per Fixture", value: ob.ratePerFixture, path: ["geographicPricing", "outsideBeltway", "ratePerFixture"] });
      if (ob.weeklyMinimum !== undefined) fields.push({ label: "Outside Beltway - Weekly Minimum", value: ob.weeklyMinimum, path: ["geographicPricing", "outsideBeltway", "weeklyMinimum"] });
      if (ob.tripCharge !== undefined) fields.push({ label: "Outside Beltway - Trip Charge", value: ob.tripCharge, path: ["geographicPricing", "outsideBeltway", "tripCharge"] });
    }

    if (config.allInclusivePackage?.weeklyRatePerFixture !== undefined) {
      fields.push({ label: "All-Inclusive - Weekly Rate per Fixture", value: config.allInclusivePackage.weeklyRatePerFixture, path: ["allInclusivePackage", "weeklyRatePerFixture"] });
    }

    if (config.warrantyFeePerDispenser !== undefined) fields.push({ label: "Warranty Fee per Dispenser", value: config.warrantyFeePerDispenser, path: ["warrantyFeePerDispenser"] });
    if (config.soapUpgrades?.standardToLuxury !== undefined) fields.push({ label: "Soap Upgrade (Standard to Luxury)", value: config.soapUpgrades.standardToLuxury, path: ["soapUpgrades", "standardToLuxury"] });
    if (config.ratePerTrap !== undefined) fields.push({ label: "Rate per Trap", value: config.ratePerTrap, path: ["ratePerTrap"] });
    if (config.ratePerGallon !== undefined) fields.push({ label: "Rate per Gallon", value: config.ratePerGallon, path: ["ratePerGallon"] });
    if (config.weeklyRatePerBathroom !== undefined) fields.push({ label: "Weekly Rate per Bathroom", value: config.weeklyRatePerBathroom, path: ["weeklyRatePerBathroom"] });
    if (config.monthlyRatePerSqFt !== undefined) fields.push({ label: "Monthly Rate per Sq Ft", value: config.monthlyRatePerSqFt, path: ["monthlyRatePerSqFt"] });
    if (config.basePrice !== undefined) fields.push({ label: "Base Price", value: config.basePrice, path: ["basePrice"] });
    if (config.pricePerWindow !== undefined) fields.push({ label: "Price per Window", value: config.pricePerWindow, path: ["pricePerWindow"] });

    return fields;
  };

  // Product handlers
  const handleEditProduct = (familyKey: string, productKey: string, field: "basePrice" | "warrantyPrice", currentValue: number) => {
    setEditingProduct({ familyKey, productKey, field, value: currentValue.toString() });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !catalog) return;

    setSaving(true);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    const family = updatedCatalog.families.find((f: any) => f.key === editingProduct.familyKey);

    if (family) {
      const product = family.products.find((p: any) => p.key === editingProduct.productKey);

      if (product) {
        if (editingProduct.field === "basePrice" && product.basePrice) {
          product.basePrice.amount = parseFloat(editingProduct.value) || 0;
        } else if (editingProduct.field === "warrantyPrice" && product.warrantyPricePerUnit) {
          product.warrantyPricePerUnit.amount = parseFloat(editingProduct.value) || 0;
        }
      }
    }

    const result = await updateCatalog(catalog._id, { families: updatedCatalog.families });

    if (result.success) {
      setSuccessMessage("✓ Product price updated successfully!");
      setEditingProduct(null);
    }
    setSaving(false);
  };

  // Service handlers
  const handleEditServiceField = (serviceId: string, path: string[], currentValue: number) => {
    setEditingServiceField({ serviceId, path, value: currentValue.toString() });
  };

  const handleSaveServiceField = async () => {
    if (!editingServiceField) return;

    const service = configs.find(c => c.serviceId === editingServiceField.serviceId);
    if (!service) return;

    setSaving(true);
    const newConfig = JSON.parse(JSON.stringify(service.config));
    let current: any = newConfig;

    for (let i = 0; i < editingServiceField.path.length - 1; i++) {
      current = current[editingServiceField.path[i]];
    }

    current[editingServiceField.path[editingServiceField.path.length - 1]] = parseFloat(editingServiceField.value) || 0;

    const result = await updateConfig(service._id, { config: newConfig });

    if (result.success) {
      setSuccessMessage("✓ Service price updated successfully!");
      setEditingServiceField(null);
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditingServiceField(null);
  };

  if (catalogLoading || servicesLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading pricing data...</p>
      </div>
    );
  }

  const selectedFamily = catalog?.families.find(f => f.key === selectedProductFamily);
  const selectedServiceData = configs.find(s => s.serviceId === selectedService);

  return (
    <div style={styles.container}>
      {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

      {/* PRODUCTS SECTION */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📦 PRODUCT CATALOG</h2>

        <div style={styles.tabBar}>
          {catalog?.families.map((family) => (
            <button
              key={family.key}
              style={{
                ...styles.tab,
                ...(selectedProductFamily === family.key ? styles.tabActive : {}),
              }}
              onClick={() => setSelectedProductFamily(family.key)}
            >
              {family.label}
            </button>
          ))}
        </div>

        {selectedFamily && (
          <div style={styles.tableContainer}>
            <h3 style={styles.tableTitle}>{selectedFamily.label} ({selectedFamily.products.length} products)</h3>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product Name</th>
                    <th style={styles.th}>Product Key</th>
                    <th style={styles.th}>Base Price</th>
                    <th style={styles.th}>UOM</th>
                    <th style={styles.th}>Warranty Price</th>
                    <th style={styles.th}>Billing Period</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFamily.products.map((product) => {
                    const isEditingBase = editingProduct?.familyKey === selectedFamily.key &&
                                         editingProduct?.productKey === product.key &&
                                         editingProduct?.field === "basePrice";
                    const isEditingWarranty = editingProduct?.familyKey === selectedFamily.key &&
                                             editingProduct?.productKey === product.key &&
                                             editingProduct?.field === "warrantyPrice";

                    return (
                      <tr key={product.key} style={styles.tr}>
                        <td style={styles.td}>{product.name}</td>
                        <td style={styles.td}><code style={styles.code}>{product.key}</code></td>
                        <td style={styles.td}>
                          {isEditingBase ? (
                            <input
                              type="number"
                              style={styles.input}
                              value={editingProduct.value}
                              onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span style={styles.price}>${product.basePrice?.amount || "—"}</span>
                          )}
                        </td>
                        <td style={styles.td}>{product.basePrice?.uom || "—"}</td>
                        <td style={styles.td}>
                          {isEditingWarranty ? (
                            <input
                              type="number"
                              style={styles.input}
                              value={editingProduct.value}
                              onChange={(e) => setEditingProduct({ ...editingProduct, value: e.target.value })}
                              autoFocus
                            />
                          ) : (
                            <span style={styles.price}>${product.warrantyPricePerUnit?.amount || "—"}</span>
                          )}
                        </td>
                        <td style={styles.td}>{product.warrantyPricePerUnit?.billingPeriod || "—"}</td>
                        <td style={styles.td}>
                          {isEditingBase || isEditingWarranty ? (
                            <div style={styles.actionButtons}>
                              <button style={styles.saveBtn} onClick={handleSaveProduct} disabled={saving}>
                                {saving ? "..." : "Save"}
                              </button>
                              <button style={styles.cancelBtn} onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons}>
                              {product.basePrice && (
                                <button
                                  style={styles.editBtn}
                                  onClick={() => handleEditProduct(selectedFamily.key, product.key, "basePrice", product.basePrice!.amount)}
                                >
                                  Edit Base
                                </button>
                              )}
                              {product.warrantyPricePerUnit && (
                                <button
                                  style={styles.editBtn}
                                  onClick={() => handleEditProduct(selectedFamily.key, product.key, "warrantyPrice", product.warrantyPricePerUnit!.amount)}
                                >
                                  Edit Warranty
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SERVICES SECTION */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🛠️ SERVICES PRICING</h2>

        <div style={styles.tabBar}>
          {configs.map((service) => (
            <button
              key={service.serviceId}
              style={{
                ...styles.tab,
                ...(selectedService === service.serviceId ? styles.tabActive : {}),
              }}
              onClick={() => setSelectedService(service.serviceId)}
            >
              {service.label}
            </button>
          ))}
        </div>

        {selectedServiceData && (
          <div style={styles.tableContainer}>
            <h3 style={styles.tableTitle}>
              {selectedServiceData.label}
              <span style={selectedServiceData.isActive ? styles.badgeActive : styles.badgeInactive}>
                {selectedServiceData.isActive ? "● Active" : "● Inactive"}
              </span>
            </h3>
            <p style={styles.tableSubtitle}>{selectedServiceData.description}</p>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Pricing Field</th>
                    <th style={styles.th}>Current Value</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractServicePricing(selectedServiceData.config).map((field, idx) => {
                    const isEditing = editingServiceField?.serviceId === selectedServiceData.serviceId &&
                                     editingServiceField?.path.join(".") === field.path.join(".");

                    return (
                      <tr key={idx} style={styles.tr}>
                        <td style={styles.td}><strong>{field.label}</strong></td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="number"
                              style={styles.input}
                              value={editingServiceField.value}
                              onChange={(e) => setEditingServiceField({ ...editingServiceField, value: e.target.value })}
                              autoFocus
                              step="0.01"
                            />
                          ) : (
                            <span style={styles.priceValue}>${field.value.toFixed(2)}</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <div style={styles.actionButtons}>
                              <button style={styles.saveBtn} onClick={handleSaveServiceField} disabled={saving}>
                                {saving ? "..." : "Save"}
                              </button>
                              <button style={styles.cancelBtn} onClick={handleCancelEdit}>Cancel</button>
                            </div>
                          ) : (
                            <button
                              style={styles.editBtn}
                              onClick={() => handleEditServiceField(selectedServiceData.serviceId, field.path, field.value)}
                            >
                              Edit Price
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f7fa",
    padding: "20px",
  },
  successBanner: {
    padding: "16px",
    backgroundColor: "#10b981",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "center",
    borderRadius: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
  },
  section: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "20px",
    borderBottom: "3px solid #3b82f6",
    paddingBottom: "12px",
  },
  tabBar: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap",
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: "8px",
  },
  tab: {
    padding: "12px 20px",
    border: "none",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
    borderRadius: "8px 8px 0 0",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  tabActive: {
    backgroundColor: "#3b82f6",
    color: "white",
    boxShadow: "0 -2px 8px rgba(59, 130, 246, 0.3)",
  },
  tableContainer: {
    width: "100%",
  },
  tableTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  tableSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "16px",
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    backgroundColor: "#f9fafb",
    padding: "14px 16px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
    borderBottom: "2px solid #e5e7eb",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
    transition: "background-color 0.2s",
  },
  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#1f2937",
  },
  code: {
    backgroundColor: "#f3f4f6",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#3b82f6",
  },
  price: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#059669",
  },
  priceValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#059669",
  },
  input: {
    width: "120px",
    padding: "8px 12px",
    border: "2px solid #3b82f6",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    outline: "none",
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  editBtn: {
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  saveBtn: {
    padding: "8px 16px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "8px 16px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },
  badgeActive: {
    padding: "6px 12px",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
  },
  badgeInactive: {
    padding: "6px 12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    marginTop: "16px",
    fontSize: "16px",
    color: "#6b7280",
    fontWeight: "500",
  },
};

// Add spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @media (max-width: 768px) {
    table { font-size: 12px; }
    th, td { padding: 10px 8px !important; }
  }
`;
document.head.appendChild(styleSheet);

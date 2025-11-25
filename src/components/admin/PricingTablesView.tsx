// src/components/admin/PricingTablesView.tsx

import React, { useState, useEffect } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import type { ProductFamily, Product } from "../../backendservice/types/productCatalog.types";

type ViewMode = "services" | "products";

interface EditingService {
  id: string;
  config: any;
}

interface EditingProduct {
  familyKey: string;
  productKey: string;
  basePrice?: number;
  warrantyPrice?: number;
}

export const PricingTablesView: React.FC = () => {
  const { configs, loading: servicesLoading, error: servicesError, updateConfig } = useServiceConfigs();
  const { catalog, loading: catalogLoading, error: catalogError, updateCatalog } = useActiveProductCatalog();

  const [viewMode, setViewMode] = useState<ViewMode>("services");
  const [editingService, setEditingService] = useState<EditingService | null>(null);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleEditService = (service: ServiceConfig) => {
    setEditingService({
      id: service._id,
      config: JSON.parse(JSON.stringify(service.config)), // Deep clone
    });
  };

  const handleSaveService = async () => {
    if (!editingService) return;

    setSaving(true);
    const result = await updateConfig(editingService.id, {
      config: editingService.config,
    });

    if (result.success) {
      setSuccessMessage("Service pricing updated successfully!");
      setEditingService(null);
    }
    setSaving(false);
  };

  const handleCancelServiceEdit = () => {
    setEditingService(null);
  };

  const handleServiceConfigChange = (path: string[], value: any) => {
    if (!editingService) return;

    const newConfig = { ...editingService.config };
    let current: any = newConfig;

    // Navigate to the parent of the field we want to change
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }

    // Set the value
    current[path[path.length - 1]] = value;

    setEditingService({ ...editingService, config: newConfig });
  };

  const handleEditProduct = (familyKey: string, product: Product) => {
    setEditingProduct({
      familyKey,
      productKey: product.key,
      basePrice: product.basePrice?.amount,
      warrantyPrice: product.warrantyPricePerUnit?.amount,
    });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || !catalog) return;

    setSaving(true);

    // Create updated catalog
    const updatedCatalog = { ...catalog };
    const familyIndex = updatedCatalog.families.findIndex(
      (f) => f.key === editingProduct.familyKey
    );

    if (familyIndex !== -1) {
      const productIndex = updatedCatalog.families[familyIndex].products.findIndex(
        (p) => p.key === editingProduct.productKey
      );

      if (productIndex !== -1) {
        const product = updatedCatalog.families[familyIndex].products[productIndex];

        if (editingProduct.basePrice !== undefined && product.basePrice) {
          product.basePrice.amount = editingProduct.basePrice;
        }

        if (editingProduct.warrantyPrice !== undefined && product.warrantyPricePerUnit) {
          product.warrantyPricePerUnit.amount = editingProduct.warrantyPrice;
        }
      }
    }

    const result = await updateCatalog(catalog._id, {
      families: updatedCatalog.families,
    });

    if (result.success) {
      setSuccessMessage("Product pricing updated successfully!");
      setEditingProduct(null);
    }
    setSaving(false);
  };

  const handleCancelProductEdit = () => {
    setEditingProduct(null);
  };

  const renderServicePricingFields = (service: ServiceConfig) => {
    const isEditing = editingService?.id === service._id;
    const config = isEditing ? editingService.config : service.config;

    // Extract common pricing fields
    const geoPricing = config?.geographicPricing?.insideBeltway || {};
    const allInclusive = config?.allInclusivePackage || {};

    if (!isEditing) {
      return (
        <div style={styles.pricingFields}>
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Rate/Fixture:</span>
            <span style={styles.fieldValue}>${geoPricing.ratePerFixture || "N/A"}</span>
          </div>
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Weekly Minimum:</span>
            <span style={styles.fieldValue}>${geoPricing.weeklyMinimum || "N/A"}</span>
          </div>
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>All-Inclusive Rate:</span>
            <span style={styles.fieldValue}>${allInclusive.weeklyRatePerFixture || "N/A"}</span>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.editingFields}>
        <div style={styles.editRow}>
          <label style={styles.editLabel}>Rate/Fixture ($):</label>
          <input
            type="number"
            style={styles.input}
            value={geoPricing.ratePerFixture || ""}
            onChange={(e) =>
              handleServiceConfigChange(
                ["geographicPricing", "insideBeltway", "ratePerFixture"],
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div style={styles.editRow}>
          <label style={styles.editLabel}>Weekly Minimum ($):</label>
          <input
            type="number"
            style={styles.input}
            value={geoPricing.weeklyMinimum || ""}
            onChange={(e) =>
              handleServiceConfigChange(
                ["geographicPricing", "insideBeltway", "weeklyMinimum"],
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div style={styles.editRow}>
          <label style={styles.editLabel}>All-Inclusive Rate ($):</label>
          <input
            type="number"
            style={styles.input}
            value={allInclusive.weeklyRatePerFixture || ""}
            onChange={(e) =>
              handleServiceConfigChange(
                ["allInclusivePackage", "weeklyRatePerFixture"],
                parseFloat(e.target.value) || 0
              )
            }
          />
        </div>
        <div style={styles.editActions}>
          <button style={styles.cancelButton} onClick={handleCancelServiceEdit}>
            Cancel
          </button>
          <button
            style={styles.saveButton}
            onClick={handleSaveService}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    );
  };

  const renderServicesTable = () => {
    if (servicesLoading) {
      return <div style={styles.loading}>Loading services...</div>;
    }

    if (servicesError) {
      return <div style={styles.error}>Error: {servicesError}</div>;
    }

    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <h2 style={styles.tableTitle}>Service Pricing Configuration</h2>
          <p style={styles.tableSubtitle}>
            {configs.length} services available • Edit pricing directly
          </p>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Service Name</th>
                <th style={styles.th}>Service ID</th>
                <th style={styles.th}>Version</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Pricing Details</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((service) => (
                <tr
                  key={service._id}
                  style={{
                    ...styles.tableRow,
                    ...(editingService?.id === service._id ? styles.editingRow : {}),
                  }}
                >
                  <td style={styles.td}>
                    <div style={styles.serviceName}>{service.label}</div>
                    <div style={styles.serviceDescription}>{service.description}</div>
                  </td>
                  <td style={styles.td}>
                    <code style={styles.code}>{service.serviceId}</code>
                  </td>
                  <td style={styles.td}>{service.version}</td>
                  <td style={styles.td}>
                    {service.isActive ? (
                      <span style={styles.activeBadge}>Active</span>
                    ) : (
                      <span style={styles.inactiveBadge}>Inactive</span>
                    )}
                  </td>
                  <td style={styles.td}>{renderServicePricingFields(service)}</td>
                  <td style={styles.td}>
                    {editingService?.id !== service._id && (
                      <button
                        style={styles.editButton}
                        onClick={() => handleEditService(service)}
                      >
                        Edit Pricing
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProductsTable = () => {
    if (catalogLoading) {
      return <div style={styles.loading}>Loading products...</div>;
    }

    if (catalogError) {
      return <div style={styles.error}>Error: {catalogError}</div>;
    }

    if (!catalog) {
      return <div style={styles.error}>No product catalog found</div>;
    }

    return (
      <div style={styles.tableContainer}>
        <div style={styles.tableHeader}>
          <h2 style={styles.tableTitle}>Product Catalog Pricing</h2>
          <p style={styles.tableSubtitle}>
            Version: {catalog.version} • Currency: {catalog.currency} • Edit pricing directly
          </p>
        </div>

        {catalog.families.map((family) => (
          <div key={family.key} style={styles.familySection}>
            <h3 style={styles.familyTitle}>
              {family.label} <span style={styles.productCount}>({family.products.length} products)</span>
            </h3>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
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
                  {family.products.map((product) => {
                    const isEditing =
                      editingProduct?.familyKey === family.key &&
                      editingProduct?.productKey === product.key;

                    return (
                      <tr
                        key={product.key}
                        style={{
                          ...styles.tableRow,
                          ...(isEditing ? styles.editingRow : {}),
                        }}
                      >
                        <td style={styles.td}>
                          <div style={styles.productName}>{product.name}</div>
                        </td>
                        <td style={styles.td}>
                          <code style={styles.code}>{product.key}</code>
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="number"
                              style={styles.inlineInput}
                              value={editingProduct.basePrice || ""}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  basePrice: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          ) : (
                            <span style={styles.priceValue}>
                              ${product.basePrice?.amount || "—"}
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>{product.basePrice?.uom || "—"}</td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <input
                              type="number"
                              style={styles.inlineInput}
                              value={editingProduct.warrantyPrice || ""}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  warrantyPrice: parseFloat(e.target.value) || 0,
                                })
                              }
                            />
                          ) : (
                            <span style={styles.priceValue}>
                              ${product.warrantyPricePerUnit?.amount || "—"}
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {product.warrantyPricePerUnit?.billingPeriod || "—"}
                        </td>
                        <td style={styles.td}>
                          {isEditing ? (
                            <div style={styles.inlineActions}>
                              <button
                                style={styles.cancelButtonSmall}
                                onClick={handleCancelProductEdit}
                              >
                                Cancel
                              </button>
                              <button
                                style={styles.saveButtonSmall}
                                onClick={handleSaveProduct}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                            </div>
                          ) : (
                            <button
                              style={styles.editButton}
                              onClick={() => handleEditProduct(family.key, product)}
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
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

      <div style={styles.navigation}>
        <button
          style={{
            ...styles.navButton,
            ...(viewMode === "services" ? styles.navButtonActive : {}),
          }}
          onClick={() => setViewMode("services")}
        >
          📊 Service Pricing ({configs.length})
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(viewMode === "products" ? styles.navButtonActive : {}),
          }}
          onClick={() => setViewMode("products")}
        >
          📦 Product Pricing ({catalog?.families.reduce((acc, f) => acc + f.products.length, 0) || 0})
        </button>
      </div>

      <div style={styles.content}>
        {viewMode === "services" && renderServicesTable()}
        {viewMode === "products" && renderProductsTable()}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
  },
  successBanner: {
    padding: "16px 24px",
    backgroundColor: "#10b981",
    color: "white",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center",
  },
  navigation: {
    display: "flex",
    gap: "8px",
    padding: "20px 24px",
    backgroundColor: "white",
    borderBottom: "2px solid #e5e7eb",
  },
  navButton: {
    padding: "12px 24px",
    border: "none",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    color: "#374151",
    transition: "all 0.2s",
  },
  navButtonActive: {
    backgroundColor: "#2563eb",
    color: "white",
  },
  content: {
    padding: "24px",
  },
  tableContainer: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  tableHeader: {
    marginBottom: "24px",
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: "16px",
  },
  tableTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111",
    marginBottom: "8px",
  },
  tableSubtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  tableWrapper: {
    overflowX: "auto",
    marginTop: "16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  headerRow: {
    backgroundColor: "#f9fafb",
    borderBottom: "2px solid #e5e7eb",
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tableRow: {
    borderBottom: "1px solid #f3f4f6",
    transition: "background-color 0.2s",
  },
  editingRow: {
    backgroundColor: "#fef3c7",
  },
  td: {
    padding: "16px",
    fontSize: "14px",
    color: "#374151",
    verticalAlign: "top",
  },
  serviceName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#111",
    marginBottom: "4px",
  },
  serviceDescription: {
    fontSize: "13px",
    color: "#6b7280",
  },
  productName: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111",
  },
  code: {
    backgroundColor: "#f3f4f6",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#6366f1",
  },
  activeBadge: {
    padding: "4px 12px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  inactiveBadge: {
    padding: "4px 12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  pricingFields: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
  },
  fieldLabel: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: "14px",
    color: "#111",
    fontWeight: "600",
  },
  editingFields: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    backgroundColor: "#fffbeb",
    borderRadius: "8px",
  },
  editRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  editLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
    minWidth: "150px",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  inlineInput: {
    width: "100px",
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  priceValue: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#059669",
  },
  editActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  inlineActions: {
    display: "flex",
    gap: "8px",
  },
  editButton: {
    padding: "8px 16px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  cancelButton: {
    padding: "8px 16px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  cancelButtonSmall: {
    padding: "6px 12px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
  },
  saveButton: {
    padding: "8px 16px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  saveButtonSmall: {
    padding: "6px 12px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
  },
  loading: {
    textAlign: "center",
    padding: "60px 20px",
    fontSize: "16px",
    color: "#6b7280",
  },
  error: {
    padding: "16px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    fontSize: "14px",
  },
  familySection: {
    marginBottom: "32px",
  },
  familyTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111",
    marginBottom: "12px",
  },
  productCount: {
    fontSize: "14px",
    fontWeight: "400",
    color: "#6b7280",
  },
};

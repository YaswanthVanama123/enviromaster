// src/components/admin/PricingTables.tsx

import React, { useState } from "react";
import { useServiceConfigs, useActiveProductCatalog } from "../../backendservice/hooks";

export const PricingTables: React.FC = () => {
  const { configs, loading: configsLoading, error: configsError } = useServiceConfigs();
  const { catalog, loading: catalogLoading, error: catalogError } = useActiveProductCatalog();
  const [activeTab, setActiveTab] = useState<"services" | "products">("services");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  if (configsLoading || catalogLoading) {
    return <div style={styles.loading}>Loading pricing data...</div>;
  }

  const selectedServiceConfig = configs.find((c) => c.serviceId === selectedService);
  const selectedProductFamily = catalog?.families.find((f) => f.key === selectedFamily);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Pricing Tables</h1>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "services" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("services")}
          >
            Service Configs ({configs.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "products" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("products")}
          >
            Product Catalog
          </button>
        </div>
      </div>

      {activeTab === "services" && (
        <div style={styles.content}>
          {configsError && <div style={styles.error}>{configsError}</div>}

          <div style={styles.grid}>
            {configs.map((config) => (
              <div
                key={config._id}
                style={{
                  ...styles.card,
                  ...(selectedService === config.serviceId ? styles.cardActive : {}),
                }}
                onClick={() => setSelectedService(config.serviceId)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{config.label}</h3>
                  {config.isActive && <span style={styles.badge}>Active</span>}
                </div>
                <p style={styles.cardDescription}>{config.description}</p>
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>v{config.version}</span>
                  <span style={styles.metaItem}>{config.serviceId}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedServiceConfig && (
            <div style={styles.detailPanel}>
              <div style={styles.detailHeader}>
                <h2>{selectedServiceConfig.label}</h2>
                <button
                  style={styles.closeButton}
                  onClick={() => setSelectedService(null)}
                >
                  ✕
                </button>
              </div>
              <div style={styles.detailContent}>
                <div style={styles.detailSection}>
                  <h4 style={styles.sectionTitle}>Configuration</h4>
                  <pre style={styles.codeBlock}>
                    {JSON.stringify(selectedServiceConfig.config, null, 2)}
                  </pre>
                </div>
                {selectedServiceConfig.defaultFormState && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.sectionTitle}>Default Form State</h4>
                    <pre style={styles.codeBlock}>
                      {JSON.stringify(selectedServiceConfig.defaultFormState, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedServiceConfig.tags && selectedServiceConfig.tags.length > 0 && (
                  <div style={styles.detailSection}>
                    <h4 style={styles.sectionTitle}>Tags</h4>
                    <div style={styles.tagList}>
                      {selectedServiceConfig.tags.map((tag) => (
                        <span key={tag} style={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div style={styles.content}>
          {catalogError && <div style={styles.error}>{catalogError}</div>}

          {catalog && (
            <>
              <div style={styles.catalogInfo}>
                <div>
                  <h3>Version: {catalog.version}</h3>
                  <p style={styles.catalogMeta}>
                    Last Updated: {catalog.lastUpdated} | Currency: {catalog.currency}
                  </p>
                </div>
                {catalog.isActive && <span style={styles.badge}>Active</span>}
              </div>

              <div style={styles.grid}>
                {catalog.families.map((family) => (
                  <div
                    key={family.key}
                    style={{
                      ...styles.card,
                      ...(selectedFamily === family.key ? styles.cardActive : {}),
                    }}
                    onClick={() => setSelectedFamily(family.key)}
                  >
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{family.label}</h3>
                      <span style={styles.badge}>{family.products.length} items</span>
                    </div>
                    <p style={styles.cardDescription}>Product family: {family.key}</p>
                    <div style={styles.cardMeta}>
                      <span style={styles.metaItem}>Sort order: {family.sortOrder}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedProductFamily && (
                <div style={styles.detailPanel}>
                  <div style={styles.detailHeader}>
                    <h2>{selectedProductFamily.label}</h2>
                    <button
                      style={styles.closeButton}
                      onClick={() => setSelectedFamily(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={styles.detailContent}>
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={styles.tableHeader}>Product Name</th>
                            <th style={styles.tableHeader}>Key</th>
                            <th style={styles.tableHeader}>Kind</th>
                            <th style={styles.tableHeader}>Price</th>
                            <th style={styles.tableHeader}>UOM</th>
                            <th style={styles.tableHeader}>Warranty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProductFamily.products.map((product) => (
                            <tr key={product.key} style={styles.tableRow}>
                              <td style={styles.tableCell}>{product.name}</td>
                              <td style={styles.tableCell}>
                                <code style={styles.code}>{product.key}</code>
                              </td>
                              <td style={styles.tableCell}>{product.kind || "—"}</td>
                              <td style={styles.tableCell}>
                                {product.basePrice
                                  ? `${product.basePrice.currency} $${product.basePrice.amount}`
                                  : "—"}
                              </td>
                              <td style={styles.tableCell}>
                                {product.basePrice?.uom || "—"}
                              </td>
                              <td style={styles.tableCell}>
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
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#111",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    borderBottom: "2px solid #e5e5e5",
  },
  tab: {
    padding: "12px 24px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#666",
    borderBottom: "2px solid transparent",
    marginBottom: "-2px",
    transition: "all 0.2s",
  },
  tabActive: {
    color: "#2563eb",
    borderBottomColor: "#2563eb",
  },
  content: {
    position: "relative",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "16px",
    color: "#666",
  },
  error: {
    padding: "12px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    padding: "20px",
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "white",
  },
  cardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111",
    margin: 0,
  },
  cardDescription: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "12px",
  },
  cardMeta: {
    display: "flex",
    gap: "12px",
    fontSize: "12px",
    color: "#999",
  },
  metaItem: {
    display: "inline-block",
  },
  badge: {
    padding: "4px 8px",
    backgroundColor: "#10b981",
    color: "white",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
  },
  catalogInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  catalogMeta: {
    fontSize: "14px",
    color: "#666",
    margin: "4px 0 0 0",
  },
  detailPanel: {
    position: "fixed",
    top: "0",
    right: "0",
    width: "50%",
    height: "100vh",
    backgroundColor: "white",
    boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
    zIndex: 1000,
    overflowY: "auto",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e5e5e5",
    position: "sticky",
    top: 0,
    backgroundColor: "white",
  },
  closeButton: {
    padding: "8px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "20px",
    color: "#666",
  },
  detailContent: {
    padding: "24px",
  },
  detailSection: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "12px",
    color: "#111",
  },
  codeBlock: {
    backgroundColor: "#f9fafb",
    padding: "16px",
    borderRadius: "8px",
    overflow: "auto",
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#333",
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  tag: {
    padding: "4px 12px",
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    borderRadius: "12px",
    fontSize: "12px",
  },
  tableContainer: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  tableHeaderRow: {
    backgroundColor: "#f9fafb",
  },
  tableHeader: {
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
    color: "#111",
    borderBottom: "2px solid #e5e5e5",
  },
  tableRow: {
    borderBottom: "1px solid #f0f0f0",
  },
  tableCell: {
    padding: "12px",
    color: "#333",
  },
  code: {
    backgroundColor: "#f0f0f0",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
  },
};

// Media query handling (add to a global CSS file or use CSS-in-JS library for production)

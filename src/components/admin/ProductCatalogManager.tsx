// src/components/admin/ProductCatalogManager.tsx

import React, { useState } from "react";
import { useActiveProductCatalog } from "../../backendservice/hooks";
import type { Product, ProductFamily } from "../../backendservice/types/productCatalog.types";

export const ProductCatalogManager: React.FC = () => {
  const { catalog, loading, error } = useActiveProductCatalog();
  const [selectedFamily, setSelectedFamily] = useState<ProductFamily | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const filteredFamilies = catalog?.families.filter((family) =>
    family.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    family.products.some((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return <div style={styles.loading}>Loading product catalog...</div>;
  }

  if (!catalog) {
    return <div style={styles.error}>No active product catalog found.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Product Catalog Manager</h2>
          <p style={styles.subtitle}>
            Version: {catalog.version} | Last Updated: {catalog.lastUpdated}
          </p>
        </div>
        {catalog.isActive && <span style={styles.activeBadge}>Active Catalog</span>}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search products or families..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.familyGrid}>
        {filteredFamilies?.map((family) => (
          <div
            key={family.key}
            style={{
              ...styles.familyCard,
              ...(selectedFamily?.key === family.key ? styles.familyCardActive : {}),
            }}
            onClick={() => setSelectedFamily(family)}
          >
            <div style={styles.familyHeader}>
              <h3 style={styles.familyTitle}>{family.label}</h3>
              <span style={styles.productCount}>{family.products.length} products</span>
            </div>
            <p style={styles.familyKey}>{family.key}</p>
          </div>
        ))}
      </div>

      {selectedFamily && (
        <div style={styles.productSection}>
          <div style={styles.productHeader}>
            <h3>{selectedFamily.label} - Products</h3>
            <button style={styles.closeButton} onClick={() => setSelectedFamily(null)}>
              Close
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Product Name</th>
                  <th style={styles.th}>Key</th>
                  <th style={styles.th}>Kind</th>
                  <th style={styles.th}>Base Price</th>
                  <th style={styles.th}>UOM</th>
                  <th style={styles.th}>Warranty</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedFamily.products.map((product) => (
                  <tr key={product.key} style={styles.tableRow}>
                    <td style={styles.td}>{product.name}</td>
                    <td style={styles.td}>
                      <code style={styles.code}>{product.key}</code>
                    </td>
                    <td style={styles.td}>{product.kind || "—"}</td>
                    <td style={styles.td}>
                      {product.basePrice
                        ? `${product.basePrice.currency} $${product.basePrice.amount}`
                        : "—"}
                    </td>
                    <td style={styles.td}>{product.basePrice?.uom || "—"}</td>
                    <td style={styles.td}>
                      {product.warrantyPricePerUnit
                        ? `$${product.warrantyPricePerUnit.amount}/${product.warrantyPricePerUnit.billingPeriod}`
                        : "—"}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.viewButton}
                        onClick={() => handleEditProduct(product)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingProduct && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Product Details</h3>
              <button
                style={styles.modalCloseButton}
                onClick={() => setEditingProduct(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.detailGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Name:</span>
                <span style={styles.detailValue}>{editingProduct.name}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Key:</span>
                <code style={styles.code}>{editingProduct.key}</code>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Family:</span>
                <span style={styles.detailValue}>{editingProduct.familyKey}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Kind:</span>
                <span style={styles.detailValue}>{editingProduct.kind || "—"}</span>
              </div>

              {editingProduct.basePrice && (
                <>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Base Price:</span>
                    <span style={styles.detailValue}>
                      {editingProduct.basePrice.currency} ${editingProduct.basePrice.amount}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>UOM:</span>
                    <span style={styles.detailValue}>{editingProduct.basePrice.uom}</span>
                  </div>
                  {editingProduct.basePrice.unitSizeLabel && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Unit Size:</span>
                      <span style={styles.detailValue}>
                        {editingProduct.basePrice.unitSizeLabel}
                      </span>
                    </div>
                  )}
                </>
              )}

              {editingProduct.warrantyPricePerUnit && (
                <>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Warranty Price:</span>
                    <span style={styles.detailValue}>
                      ${editingProduct.warrantyPricePerUnit.amount}/
                      {editingProduct.warrantyPricePerUnit.billingPeriod}
                    </span>
                  </div>
                </>
              )}

              {editingProduct.effectivePerRollPriceInternal && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Internal Roll Price:</span>
                  <span style={styles.detailValue}>
                    ${editingProduct.effectivePerRollPriceInternal}
                  </span>
                </div>
              )}

              {editingProduct.suggestedCustomerRollPrice && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Suggested Customer Price:</span>
                  <span style={styles.detailValue}>
                    ${editingProduct.suggestedCustomerRollPrice}
                  </span>
                </div>
              )}

              {editingProduct.quantityPerCase && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Quantity Per Case:</span>
                  <span style={styles.detailValue}>
                    {editingProduct.quantityPerCase} ({editingProduct.quantityPerCaseLabel})
                  </span>
                </div>
              )}
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.modalCancelButton}
                onClick={() => setEditingProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#111",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666",
  },
  activeBadge: {
    padding: "8px 16px",
    backgroundColor: "#10b981",
    color: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
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
  searchContainer: {
    marginBottom: "24px",
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  familyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  familyCard: {
    padding: "16px",
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "white",
  },
  familyCardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
  },
  familyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  familyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111",
    margin: 0,
  },
  productCount: {
    padding: "4px 8px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#666",
  },
  familyKey: {
    fontSize: "12px",
    color: "#999",
    fontFamily: "monospace",
    margin: 0,
  },
  productSection: {
    marginTop: "32px",
  },
  productHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  closeButton: {
    padding: "8px 16px",
    backgroundColor: "#f0f0f0",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  tableWrapper: {
    overflowX: "auto",
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1px solid #e5e5e5",
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
    fontWeight: "600",
    fontSize: "13px",
    color: "#111",
    borderBottom: "2px solid #e5e5e5",
  },
  tableRow: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "12px",
    fontSize: "13px",
    color: "#333",
  },
  code: {
    backgroundColor: "#f0f0f0",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  viewButton: {
    padding: "6px 12px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    width: "90%",
    maxWidth: "700px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  modalCloseButton: {
    border: "none",
    background: "transparent",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  detailLabel: {
    fontSize: "12px",
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: "14px",
    color: "#111",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  modalCancelButton: {
    padding: "10px 20px",
    border: "1px solid #ddd",
    backgroundColor: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
};

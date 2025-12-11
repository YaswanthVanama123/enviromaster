// src/components/admin/ProductCatalogManager.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveProductCatalog } from "../../backendservice/hooks";
import type { Product, ProductFamily } from "../../backendservice/types/productCatalog.types";
import { Toast } from "./Toast";

// Utility function to truncate text
const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Utility function to validate and sanitize product key
const validateProductKey = (key: string): string => {
  // Remove spaces, slashes, and other invalid characters
  // Allow only letters, numbers, hyphens, and underscores
  return key.replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();
};

interface ProductCatalogManagerProps {
  modalType?: string;
  itemId?: string;
  isEmbedded?: boolean;
  parentPath?: string;
}

export const ProductCatalogManager: React.FC<ProductCatalogManagerProps> = ({
  modalType,
  itemId,
  isEmbedded = false,
  parentPath
}) => {
  const navigate = useNavigate();
  const { catalog, loading, error, updateCatalog } = useActiveProductCatalog();
  const [selectedFamily, setSelectedFamily] = useState<ProductFamily | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState<ProductFamily | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    key: "",
    name: "",
    familyKey: "",
    kind: "",
    basePrice: { amount: 0, currency: "USD", uom: "" },
    warrantyPricePerUnit: { amount: 0, currency: "USD", billingPeriod: "monthly" },
    frequency: "",
    description: "",
    displayByAdmin: true,
  });

  // URL-based modal management
  useEffect(() => {
    if (!catalog || catalog.families.length === 0) return;

    if (modalType === 'edit' && itemId) {
      // Find product by key across all families
      let foundProduct: Product | null = null;
      for (const family of catalog.families) {
        const product = family.products.find(p => p.key === itemId);
        if (product) {
          foundProduct = product;
          break;
        }
      }
      if (foundProduct) {
        handleEditProduct(foundProduct);
      }
    } else if (modalType === 'create' && itemId) {
      // Find family by key
      const family = catalog.families.find(f => f.key === itemId);
      if (family) {
        handleAddProduct(family);
      }
    } else if (modalType === 'delete' && itemId) {
      // Find product for deletion
      let foundProduct: Product | null = null;
      for (const family of catalog.families) {
        const product = family.products.find(p => p.key === itemId);
        if (product) {
          foundProduct = product;
          break;
        }
      }
      if (foundProduct) {
        setDeletingProduct(foundProduct);
      }
    } else if (!modalType) {
      // Close all modals
      setEditingProduct(null);
      setCreatingProduct(null);
      setDeletingProduct(null);
      setIsEditMode(false);
    }
  }, [modalType, itemId, catalog]);

  // URL navigation helpers
  const openEditModal = (product: Product) => {
    if (isEmbedded && parentPath) {
      navigate(`${parentPath}/products/edit/${product.key}`, { replace: true });
    } else {
      navigate(`/pricing-tables/products/edit/${product.key}`, { replace: true });
    }
  };

  const openCreateModal = (family: ProductFamily) => {
    if (isEmbedded && parentPath) {
      navigate(`${parentPath}/products/create/${family.key}`, { replace: true });
    } else {
      navigate(`/pricing-tables/products/create/${family.key}`, { replace: true });
    }
  };

  const openDeleteModal = (product: Product) => {
    if (isEmbedded && parentPath) {
      navigate(`${parentPath}/products/delete/${product.key}`, { replace: true });
    } else {
      navigate(`/pricing-tables/products/delete/${product.key}`, { replace: true });
    }
  };

  const closeModal = () => {
    if (isEmbedded && parentPath) {
      navigate(`${parentPath}/products`, { replace: true });
    } else {
      navigate('/pricing-tables/products', { replace: true });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditMode(false);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleSaveExistingProduct = async () => {
    if (!editingProduct || !catalog) return;

    setSaving(true);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    const family = updatedCatalog.families.find((f: ProductFamily) => f.key === editingProduct.familyKey);

    if (family) {
      const productIndex = family.products.findIndex((p: Product) => p.key === editingProduct.key);
      if (productIndex !== -1) {
        family.products[productIndex] = editingProduct;
      }
    }

    const result = await updateCatalog(catalog._id!, {
      families: updatedCatalog.families,
      version: catalog.version
    });

    if (result.success) {
      setSuccessMessage("✓ Product updated successfully!");
      setIsEditMode(false);
      closeModal();

      // Update the selectedFamily state to reflect changes in the table immediately
      if (selectedFamily) {
        const updatedFamily = updatedCatalog.families.find((f: ProductFamily) => f.key === selectedFamily.key);
        if (updatedFamily) {
          setSelectedFamily(updatedFamily);
        }
      }
    } else {
      setErrorMessage("Failed to update product: " + result.error);
    }

    setSaving(false);
  };

  const handleAddProduct = (family: ProductFamily) => {
    setCreatingProduct(family);
    setNewProduct({
      key: "",
      name: "",
      familyKey: family.key,
      kind: "",
      basePrice: { amount: 0, currency: "USD", uom: "" },
      warrantyPricePerUnit: { amount: 0, currency: "USD", billingPeriod: "monthly" },
      displayByAdmin: true,
    });
  };

  const handleSaveNewProduct = async () => {
    if (!creatingProduct || !catalog || !newProduct.key || !newProduct.name) {
      setWarningMessage("⚠ Please fill in required fields: Key and Name");
      return;
    }

    setSaving(true);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    const family = updatedCatalog.families.find((f: ProductFamily) => f.key === creatingProduct.key);

    if (family) {
      family.products.push(newProduct as Product);
    }

    const result = await updateCatalog(catalog._id!, {
      families: updatedCatalog.families,
      version: catalog.version
    });

    if (result.success) {
      setSuccessMessage("✓ Product added successfully!");
      closeModal();

      // Update the selectedFamily to show the new product immediately
      if (selectedFamily && selectedFamily.key === creatingProduct.key) {
        const updatedFamily = updatedCatalog.families.find((f: ProductFamily) => f.key === creatingProduct.key);
        if (updatedFamily) {
          setSelectedFamily(updatedFamily);
        }
      }
    } else {
      setErrorMessage("Failed to add product: " + result.error);
    }

    setSaving(false);
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct || !catalog) return;

    setSaving(true);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    const family = updatedCatalog.families.find((f: ProductFamily) => f.key === deletingProduct.familyKey);

    if (family) {
      // Remove the product from the family
      family.products = family.products.filter((p: Product) => p.key !== deletingProduct.key);
    }

    const result = await updateCatalog(catalog._id!, {
      families: updatedCatalog.families,
      version: catalog.version
    });

    if (result.success) {
      setSuccessMessage(`✓ Product "${deletingProduct.name}" deleted successfully!`);
      closeModal();

      // Update the selectedFamily to remove the deleted product immediately
      if (selectedFamily && selectedFamily.key === deletingProduct.familyKey) {
        const updatedFamily = updatedCatalog.families.find((f: ProductFamily) => f.key === deletingProduct.familyKey);
        if (updatedFamily) {
          setSelectedFamily(updatedFamily);
        }
      }
    } else {
      setErrorMessage("Failed to delete product: " + result.error);
    }

    setSaving(false);
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
        {/* {catalog.isActive && <span style={styles.activeBadge}>Active Catalog</span>} */}
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {successMessage && <div style={styles.success}>{successMessage}</div>}

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
          >
            <div style={styles.familyHeader} onClick={() => setSelectedFamily(family)}>
              <h3 style={styles.familyTitle}>{family.label}</h3>
              <span style={styles.productCount}>{family.products.length} products</span>
            </div>
            <p style={styles.familyKey}>{family.key}</p>
            <button
              style={styles.addProductBtn}
              onClick={(e) => {
                e.stopPropagation();
                openCreateModal(family);
              }}
            >
              + Add Product
            </button>
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
                  <th style={styles.th}>Display</th>
                  <th style={styles.th}>Description</th>
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
                      {product.displayByAdmin !== false ? (
                        <span style={styles.activeTag}>Yes</span>
                      ) : (
                        <span style={styles.inactiveTag}>No</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span title={product.description || "No description"}>
                        {truncateText(product.description, 50)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.viewButton}
                        onClick={() => openEditModal(product)}
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
              <h3>{isEditMode ? "Edit Product" : "Product Details"}</h3>
              <button
                style={styles.modalCloseButton}
                onClick={() => {
                  closeModal();
                  setIsEditMode(false);
                }}
              >
                ✕
              </button>
            </div>

            {!isEditMode ? (
              <>
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

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Display in Admin:</span>
                    <span style={styles.detailValue}>
                      {editingProduct.displayByAdmin !== false ? (
                        <span style={styles.yesLabel}>Yes</span>
                      ) : (
                        <span style={styles.noLabel}>No</span>
                      )}
                    </span>
                  </div>

                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Description:</span>
                    <span style={styles.detailValue}>
                      {editingProduct.description || "No description available"}
                    </span>
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.deleteButton}
                    onClick={() => setDeletingProduct(editingProduct)}
                  >
                    🗑️ Delete Product
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <button
                    style={styles.editButton}
                    onClick={handleToggleEditMode}
                  >
                    Edit Product
                  </button>
                  <button
                    style={styles.modalCancelButton}
                    onClick={() => closeModal()}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Product Name</label>
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Kind</label>
                    <input
                      type="text"
                      value={editingProduct.kind || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, kind: e.target.value })}
                      style={styles.formInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Base Price ($)</label>
                    <input
                      type="number"
                      value={editingProduct.basePrice?.amount || 0}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        basePrice: { ...editingProduct.basePrice!, amount: parseFloat(e.target.value) || 0 }
                      })}
                      style={styles.formInput}
                      step="0.01"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Unit of Measure</label>
                    <input
                      type="text"
                      value={editingProduct.basePrice?.uom || ""}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        basePrice: { ...editingProduct.basePrice!, uom: e.target.value }
                      })}
                      style={styles.formInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Warranty Price ($)</label>
                    <input
                      type="number"
                      value={editingProduct.warrantyPricePerUnit?.amount || 0}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        warrantyPricePerUnit: { ...editingProduct.warrantyPricePerUnit!, amount: parseFloat(e.target.value) || 0 }
                      })}
                      style={styles.formInput}
                      step="0.01"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Billing Period</label>
                    <select
                      value={editingProduct.warrantyPricePerUnit?.billingPeriod || "monthly"}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        warrantyPricePerUnit: { ...editingProduct.warrantyPricePerUnit!, billingPeriod: e.target.value }
                      })}
                      style={styles.formInput}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingProduct.displayByAdmin !== false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, displayByAdmin: e.target.checked })}
                        style={styles.checkbox}
                      />
                      <span>Display in Admin Panel</span>
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Description</label>
                    <textarea
                      value={editingProduct.description || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      style={{...styles.formInput, minHeight: "100px", resize: "vertical"}}
                      placeholder="Enter product description..."
                      rows={4}
                    />
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button
                    style={styles.modalCancelButton}
                    onClick={() => setIsEditMode(false)}
                  >
                    Cancel
                  </button>
                  <button
                    style={styles.modalSaveButton}
                    onClick={handleSaveExistingProduct}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {creatingProduct && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Add New Product to {creatingProduct.label}</h3>
              <button
                style={styles.modalCloseButton}
                onClick={() => closeModal()}
              >
                ✕
              </button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Product Key *</label>
                <input
                  type="text"
                  value={newProduct.key}
                  onChange={(e) => setNewProduct({ ...newProduct, key: validateProductKey(e.target.value) })}
                  style={styles.formInput}
                  placeholder="e.g., soap-standard-1000ml"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Only letters, numbers, hyphens, and underscores allowed. Automatically converted to lowercase.
                </small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Product Name *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  style={styles.formInput}
                  placeholder="e.g., Standard Hand Soap 1000ml"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Kind</label>
                <input
                  type="text"
                  value={newProduct.kind || ""}
                  onChange={(e) => setNewProduct({ ...newProduct, kind: e.target.value })}
                  style={styles.formInput}
                  placeholder="e.g., liquid, foam, gel"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Base Price ($)</label>
                <input
                  type="number"
                  value={newProduct.basePrice?.amount || 0}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    basePrice: { ...newProduct.basePrice!, amount: parseFloat(e.target.value) || 0 }
                  })}
                  style={styles.formInput}
                  step="0.01"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Unit of Measure</label>
                <input
                  type="text"
                  value={newProduct.basePrice?.uom || ""}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    basePrice: { ...newProduct.basePrice!, uom: e.target.value }
                  })}
                  style={styles.formInput}
                  placeholder="e.g., per unit, per case"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Warranty Price ($)</label>
                <input
                  type="number"
                  value={newProduct.warrantyPricePerUnit?.amount || 0}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    warrantyPricePerUnit: { ...newProduct.warrantyPricePerUnit!, amount: parseFloat(e.target.value) || 0 }
                  })}
                  style={styles.formInput}
                  step="0.01"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Billing Period</label>
                <select
                  value={newProduct.warrantyPricePerUnit?.billingPeriod || "monthly"}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    warrantyPricePerUnit: { ...newProduct.warrantyPricePerUnit!, billingPeriod: e.target.value }
                  })}
                  style={styles.formInput}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newProduct.displayByAdmin ?? true}
                    onChange={(e) => setNewProduct({ ...newProduct, displayByAdmin: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <span>Display in Admin Panel</span>
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Description</label>
                <textarea
                  value={newProduct.description || ""}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  style={{...styles.formInput, minHeight: "100px", resize: "vertical"}}
                  placeholder="Enter product description..."
                  rows={4}
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.modalCancelButton}
                onClick={() => closeModal()}
              >
                Cancel
              </button>
              <button
                style={styles.modalSaveButton}
                onClick={handleSaveNewProduct}
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div style={styles.modal}>
          <div style={styles.confirmationModal}>
            <div style={styles.confirmationHeader}>
              <h3 style={styles.confirmationTitle}>⚠️ Confirm Delete</h3>
            </div>

            <div style={styles.confirmationBody}>
              <p style={styles.confirmationText}>
                Are you sure you want to delete this product?
              </p>
              <div style={styles.productInfoBox}>
                <div style={styles.productInfoRow}>
                  <strong>Product Name:</strong> {deletingProduct.name}
                </div>
                <div style={styles.productInfoRow}>
                  <strong>Product Key:</strong> <code style={styles.code}>{deletingProduct.key}</code>
                </div>
                <div style={styles.productInfoRow}>
                  <strong>Family:</strong> {deletingProduct.familyKey}
                </div>
              </div>
              <p style={styles.warningText}>
                ⚠️ This action cannot be undone!
              </p>
            </div>

            <div style={styles.confirmationActions}>
              <button
                style={styles.confirmCancelButton}
                onClick={() => closeModal()}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                style={styles.confirmDeleteButton}
                onClick={handleDeleteProduct}
                disabled={saving}
              >
                {saving ? "Deleting..." : "Yes, Delete Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {successMessage && (
        <Toast
          message={successMessage}
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}
      {errorMessage && (
        <Toast
          message={errorMessage}
          type="error"
          onClose={() => setErrorMessage(null)}
        />
      )}
      {warningMessage && (
        <Toast
          message={warningMessage}
          type="warning"
          onClose={() => setWarningMessage(null)}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px",
    width: "100%",
    maxWidth: "100%",
    minHeight: "100vh",
    backgroundColor: "#f5f7fa",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    width: "100%",
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
    width: "100%",
  },
  error: {
    padding: "12px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    borderRadius: "8px",
    marginBottom: "16px",
    width: "100%",
  },
  success: {
    padding: "12px",
    backgroundColor: "#f0fdf4",
    color: "#15803d",
    borderRadius: "8px",
    marginBottom: "16px",
    width: "100%",
  },
  searchContainer: {
    marginBottom: "24px",
    width: "100%",
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
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    marginBottom: "32px",
    width: "100%",
    maxWidth: "100%",
  },
  familyCard: {
    padding: "16px",
    border: "1px solid #e5e5e5",
    borderRadius: "10px",
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
    cursor: "pointer",
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
    marginBottom: "12px",
  },
  addProductBtn: {
    width: "100%",
    padding: "8px 16px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  productSection: {
    marginTop: "32px",
    width: "100%",
  },
  productHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    width: "100%",
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
    width: "100%",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "100%",
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
  modalSaveButton: {
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#333",
  },
  formInput: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  yesLabel: {
    padding: "4px 12px",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "600",
  },
  noLabel: {
    padding: "4px 12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "600",
  },
  editButton: {
    padding: "10px 20px",
    backgroundColor: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  activeTag: {
    padding: "4px 8px",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
  },
  inactiveTag: {
    padding: "4px 8px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
  },
  deleteButton: {
    padding: "10px 20px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  confirmationModal: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "0",
    width: "90%",
    maxWidth: "500px",
    overflow: "hidden",
  },
  confirmationHeader: {
    padding: "20px 24px",
    backgroundColor: "#fef2f2",
    borderBottom: "2px solid #fecaca",
  },
  confirmationTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "600",
    color: "#991b1b",
  },
  confirmationBody: {
    padding: "24px",
  },
  confirmationText: {
    fontSize: "16px",
    color: "#333",
    marginBottom: "20px",
    fontWeight: "500",
  },
  productInfoBox: {
    backgroundColor: "#f9fafb",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "16px",
    border: "1px solid #e5e7eb",
  },
  productInfoRow: {
    fontSize: "14px",
    color: "#374151",
    marginBottom: "8px",
  },
  warningText: {
    fontSize: "14px",
    color: "#dc2626",
    fontWeight: "600",
    margin: 0,
    textAlign: "center",
  },
  confirmationActions: {
    display: "flex",
    gap: "12px",
    padding: "20px 24px",
    backgroundColor: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
    justifyContent: "flex-end",
  },
  confirmCancelButton: {
    padding: "10px 20px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  confirmDeleteButton: {
    padding: "10px 20px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};

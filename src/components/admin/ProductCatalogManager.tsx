// src/components/admin/ProductCatalogManager.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveProductCatalog } from "../../backendservice/hooks";
import type { Product, ProductFamily } from "../../backendservice/types/productCatalog.types";
import { Toast } from "./Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faExclamationTriangle, faTrash, faLightbulb, faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import "./ProductCatalogManager.css";

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

// ✅ NEW: Utility function to generate product key from product name
const generateProductKeyFromName = (name: string): string => {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
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
  const [customKindSelected, setCustomKindSelected] = useState(false); // Track if custom kind is selected
  const [customUomSelected, setCustomUomSelected] = useState(false); // Track if custom UOM is selected

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
      let family = catalog.families.find(f => f.key === itemId);

      // ✅ FIX: If not found and itemId is 'miscellaneous', use the placeholder
      if (!family && itemId === 'miscellaneous') {
        family = {
          key: 'miscellaneous',
          label: 'Miscellaneous',
          sortOrder: 9999,
          products: []
        } as ProductFamily;
      }

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
      setSuccessMessage("Product updated successfully!");
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
    setCustomKindSelected(false); // Reset custom kind selection
    setCustomUomSelected(false); // Reset custom UOM selection
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
      setWarningMessage("Please fill in required fields: Key and Name");
      return;
    }

    setSaving(true);
    const updatedCatalog = JSON.parse(JSON.stringify(catalog));
    let family = updatedCatalog.families.find((f: ProductFamily) => f.key === creatingProduct.key);

    // If miscellaneous family doesn't exist yet, create it
    if (!family && creatingProduct.key === 'miscellaneous') {
      const newMiscFamily: ProductFamily = {
        key: 'miscellaneous',
        label: 'Miscellaneous',
        sortOrder: 9999,
        products: []
      };
      updatedCatalog.families.push(newMiscFamily);
      family = newMiscFamily;
    }

    if (family) {
      family.products.push(newProduct as Product);
    }

    const result = await updateCatalog(catalog._id!, {
      families: updatedCatalog.families,
      version: catalog.version
    });

    if (result.success) {
      setSuccessMessage("Product added successfully!");
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
      setSuccessMessage(`Product "${deletingProduct.name}" deleted successfully!`);
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

  // ✅ NEW: Ensure Miscellaneous category always exists
  const ensureMiscellaneousFamily = () => {
    if (!catalog) return null;

    const miscFamily = catalog.families.find(f => f.key === 'miscellaneous');
    if (miscFamily) {
      return null; // Already exists
    }

    // Return a placeholder miscellaneous family
    return {
      key: 'miscellaneous',
      label: 'Miscellaneous',
      sortOrder: 9999, // Ensure it appears last
      products: []
    } as ProductFamily;
  };

  const miscellaneousFamily = ensureMiscellaneousFamily();

  // ✅ NEW: Add miscellaneous family to filtered families if it doesn't exist and matches search
  const displayFamilies = React.useMemo(() => {
    if (!filteredFamilies) return [];

    const families = [...filteredFamilies];

    // Add miscellaneous if it's a placeholder and matches search criteria
    if (miscellaneousFamily && !families.find(f => f.key === 'miscellaneous')) {
      const matchesSearch = searchTerm === '' ||
        miscellaneousFamily.label.toLowerCase().includes(searchTerm.toLowerCase());

      if (matchesSearch) {
        families.push(miscellaneousFamily);
      }
    }

    return families.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [filteredFamilies, miscellaneousFamily, searchTerm]);

  // Extract all unique kinds from all products in the catalog for the dropdown
  const allKinds = React.useMemo(() => {
    if (!catalog) return [];

    const kindsSet = new Set<string>();
    catalog.families.forEach(family => {
      family.products.forEach(product => {
        if (product.kind && product.kind.trim() !== '') {
          kindsSet.add(product.kind.trim());
        }
      });
    });

    return Array.from(kindsSet).sort(); // Return sorted array of unique kinds
  }, [catalog]);

  // Extract all unique UOMs from all products in the catalog for the dropdown
  const allUoms = React.useMemo(() => {
    if (!catalog) return [];

    const uomsSet = new Set<string>();
    catalog.families.forEach(family => {
      family.products.forEach(product => {
        if (product.basePrice?.uom && product.basePrice.uom.trim() !== '') {
          uomsSet.add(product.basePrice.uom.trim());
        }
      });
    });

    return Array.from(uomsSet).sort(); // Return sorted array of unique UOMs
  }, [catalog]);

  if (loading) {
    return (
      <div className="pcm-container" style={styles.container}>
        <div className="pcm-header" style={styles.header}>
          <div>
            <h2 className="pcm-title" style={styles.title}>Product Catalog Manager</h2>
            <p className="pcm-subtitle" style={styles.subtitle}>Loading catalog information...</p>
          </div>
        </div>

        <div className="pcm-loading-state">
          <div className="pcm-spinner-inline">
            <span className="pcm-sr-only">Loading product catalog…</span>
          </div>
          <p className="pcm-loading-text">Loading product catalog...</p>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return <div className="pcm-error" style={styles.error}>No active product catalog found.</div>;
  }

  return (
    <div className="pcm-container" style={styles.container}>
      <div className="pcm-header" style={styles.header}>
        <div>
          <h2 className="pcm-title" style={styles.title}>Product Catalog Manager</h2>
          <p className="pcm-subtitle" style={styles.subtitle}>
            Version: {catalog.version} | Last Updated: {catalog.lastUpdated}
          </p>
        </div>
        {/* {catalog.isActive && <span style={styles.activeBadge}>Active Catalog</span>} */}
      </div>

      {error && <div className="pcm-error" style={styles.error}>{error}</div>}
      {successMessage && <div className="pcm-success" style={styles.success}>{successMessage}</div>}

      <div className="pcm-search-container" style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search products or families..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pcm-search-input"
          style={styles.searchInput}
        />
      </div>

      <div className="pcm-family-grid" style={styles.familyGrid}>
        {displayFamilies?.map((family) => (
          <div
            key={family.key}
            className={`pcm-family-card ${selectedFamily?.key === family.key ? 'pcm-family-card-active' : ''}`}
            style={{
              ...styles.familyCard,
              ...(selectedFamily?.key === family.key ? styles.familyCardActive : {}),
            }}
          >
            <div className="pcm-family-header" style={styles.familyHeader} onClick={() => setSelectedFamily(family)}>
              <h3 className="pcm-family-title" style={styles.familyTitle}>{family.label}</h3>
              <span className="pcm-product-count" style={styles.productCount}>{family.products.length} products</span>
            </div>
            <p className="pcm-family-key" style={styles.familyKey}>{family.key}</p>
            <button
              className="pcm-add-product-btn"
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
        <div className="pcm-product-section" style={styles.productSection}>
          <div className="pcm-product-header" style={styles.productHeader}>
            <h3>{selectedFamily.label} - Products</h3>
            <button className="pcm-close-button" style={styles.closeButton} onClick={() => setSelectedFamily(null)}>
              Close
            </button>
          </div>

          <div className="pcm-table-wrapper" style={styles.tableWrapper}>
            <table className="pcm-table" style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th className="pcm-th" style={styles.th}>Product Name</th>
                  <th className="pcm-th" style={styles.th}>Key</th>
                  <th className="pcm-th" style={styles.th}>Kind</th>
                  <th className="pcm-th" style={styles.th}>Base Price</th>
                  <th className="pcm-th" style={styles.th}>UOM</th>
                  <th className="pcm-th" style={styles.th}>Warranty</th>
                  <th className="pcm-th" style={styles.th}>Display</th>
                  <th className="pcm-th" style={styles.th}>Description</th>
                  <th className="pcm-th" style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedFamily.products.map((product) => (
                  <tr key={product.key} style={styles.tableRow}>
                    <td className="pcm-td" style={styles.td}>{product.name}</td>
                    <td className="pcm-td" style={styles.td}>
                      <code className="pcm-code" style={styles.code}>{product.key}</code>
                    </td>
                    <td className="pcm-td" style={styles.td}>{product.kind || "—"}</td>
                    <td className="pcm-td" style={styles.td}>
                      {product.basePrice
                        ? `${product.basePrice.currency} $${product.basePrice.amount}`
                        : "—"}
                    </td>
                    <td className="pcm-td" style={styles.td}>{product.basePrice?.uom || "—"}</td>
                    <td className="pcm-td" style={styles.td}>
                      {product.warrantyPricePerUnit
                        ? `$${product.warrantyPricePerUnit.amount}/${product.warrantyPricePerUnit.billingPeriod}`
                        : "—"}
                    </td>
                    <td className="pcm-td" style={styles.td}>
                      {product.displayByAdmin !== false ? (
                        <span className="pcm-active-tag" style={styles.activeTag}>Yes</span>
                      ) : (
                        <span className="pcm-inactive-tag" style={styles.inactiveTag}>No</span>
                      )}
                    </td>
                    <td className="pcm-td" style={styles.td}>
                      <span title={product.description || "No description"}>
                        {truncateText(product.description, 50)}
                      </span>
                    </td>
                    <td className="pcm-td" style={styles.td}>
                      <button
                        className="pcm-view-button"
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
        <div className="pcm-modal" style={styles.modal}>
          <div className="pcm-modal-content" style={styles.modalContent}>
            <div className="pcm-modal-header" style={styles.modalHeader}>
              <h3>{isEditMode ? "Edit Product" : "Product Details"}</h3>
              <button
                className="pcm-modal-close-button"
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
                <div className="pcm-detail-grid" style={styles.detailGrid}>
                  <div className="pcm-detail-item" style={styles.detailItem}>
                    <span className="pcm-detail-label" style={styles.detailLabel}>Name:</span>
                    <span className="pcm-detail-value" style={styles.detailValue}>{editingProduct.name}</span>
                  </div>
                  <div className="pcm-detail-item" style={styles.detailItem}>
                    <span className="pcm-detail-label" style={styles.detailLabel}>Key:</span>
                    <code className="pcm-code" style={styles.code}>{editingProduct.key}</code>
                  </div>
                  <div className="pcm-detail-item" style={styles.detailItem}>
                    <span className="pcm-detail-label" style={styles.detailLabel}>Family:</span>
                    <span className="pcm-detail-value" style={styles.detailValue}>{editingProduct.familyKey}</span>
                  </div>
                  <div className="pcm-detail-item" style={styles.detailItem}>
                    <span className="pcm-detail-label" style={styles.detailLabel}>Kind:</span>
                    <span className="pcm-detail-value" style={styles.detailValue}>{editingProduct.kind || "—"}</span>
                  </div>

                  {editingProduct.basePrice && (
                    <>
                      <div className="pcm-detail-item" style={styles.detailItem}>
                        <span className="pcm-detail-label" style={styles.detailLabel}>Base Price:</span>
                        <span className="pcm-detail-value" style={styles.detailValue}>
                          {editingProduct.basePrice.currency} ${editingProduct.basePrice.amount}
                        </span>
                      </div>
                      <div className="pcm-detail-item" style={styles.detailItem}>
                        <span className="pcm-detail-label" style={styles.detailLabel}>UOM:</span>
                        <span className="pcm-detail-value" style={styles.detailValue}>{editingProduct.basePrice.uom}</span>
                      </div>
                      {editingProduct.basePrice.unitSizeLabel && (
                        <div className="pcm-detail-item" style={styles.detailItem}>
                          <span className="pcm-detail-label" style={styles.detailLabel}>Unit Size:</span>
                          <span className="pcm-detail-value" style={styles.detailValue}>
                            {editingProduct.basePrice.unitSizeLabel}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {editingProduct.warrantyPricePerUnit && (
                    <>
                      <div className="pcm-detail-item" style={styles.detailItem}>
                        <span className="pcm-detail-label" style={styles.detailLabel}>Warranty Price:</span>
                        <span className="pcm-detail-value" style={styles.detailValue}>
                          ${editingProduct.warrantyPricePerUnit.amount}/
                          {editingProduct.warrantyPricePerUnit.billingPeriod}
                        </span>
                      </div>
                    </>
                  )}

                  {editingProduct.effectivePerRollPriceInternal && (
                    <div className="pcm-detail-item" style={styles.detailItem}>
                      <span className="pcm-detail-label" style={styles.detailLabel}>Internal Roll Price:</span>
                      <span className="pcm-detail-value" style={styles.detailValue}>
                        ${editingProduct.effectivePerRollPriceInternal}
                      </span>
                    </div>
                  )}

                  {editingProduct.suggestedCustomerRollPrice && (
                    <div className="pcm-detail-item" style={styles.detailItem}>
                      <span className="pcm-detail-label" style={styles.detailLabel}>Suggested Customer Price:</span>
                      <span className="pcm-detail-value" style={styles.detailValue}>
                        ${editingProduct.suggestedCustomerRollPrice}
                      </span>
                    </div>
                  )}

                  {editingProduct.quantityPerCase && (
                    <div className="pcm-detail-item" style={styles.detailItem}>
                      <span className="pcm-detail-label" style={styles.detailLabel}>Quantity Per Case:</span>
                      <span className="pcm-detail-value" style={styles.detailValue}>
                        {editingProduct.quantityPerCase} ({editingProduct.quantityPerCaseLabel})
                      </span>
                    </div>
                  )}

                  <div className="pcm-detail-item" style={styles.detailItem}>
                    <span className="pcm-detail-label" style={styles.detailLabel}>Display in Admin:</span>
                    <span className="pcm-detail-value" style={styles.detailValue}>
                      {editingProduct.displayByAdmin !== false ? (
                        <span className="pcm-yes-label" style={styles.yesLabel}>Yes</span>
                      ) : (
                        <span className="pcm-no-label" style={styles.noLabel}>No</span>
                      )}
                    </span>
                  </div>

                  <div className="pcm-detail-item" style={styles.detailItem}>
                    <span className="pcm-detail-label" style={styles.detailLabel}>Description:</span>
                    <span className="pcm-detail-value" style={styles.detailValue}>
                      {editingProduct.description || "No description available"}
                    </span>
                  </div>
                </div>

                <div className="pcm-modal-actions" style={styles.modalActions}>
                  <button
                    className="pcm-delete-button"
                    style={styles.deleteButton}
                    onClick={() => setDeletingProduct(editingProduct)}
                  >
                    <FontAwesomeIcon icon={faTrash} /> Delete Product
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <button
                    className="pcm-edit-button"
                    style={styles.editButton}
                    onClick={handleToggleEditMode}
                  >
                    Edit Product
                  </button>
                  <button
                    className="pcm-modal-cancel-button"
                    style={styles.modalCancelButton}
                    onClick={() => closeModal()}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="pcm-form-grid" style={styles.formGrid}>
                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Product Name</label>
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="pcm-form-input"
                      style={styles.formInput}
                    />
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Kind</label>
                    <input
                      type="text"
                      value={editingProduct.kind || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, kind: e.target.value })}
                      className="pcm-form-input"
                      style={styles.formInput}
                    />
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Base Price ($)</label>
                    <input
                      type="number"
                      value={editingProduct.basePrice?.amount || 0}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        basePrice: { ...editingProduct.basePrice!, amount: parseFloat(e.target.value) || 0 }
                      })}
                      className="pcm-form-input"
                      style={styles.formInput}
                      step="0.01"
                    />
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Unit of Measure</label>
                    <input
                      type="text"
                      value={editingProduct.basePrice?.uom || ""}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        basePrice: { ...editingProduct.basePrice!, uom: e.target.value }
                      })}
                      className="pcm-form-input"
                      style={styles.formInput}
                    />
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Warranty Price ($)</label>
                    <input
                      type="number"
                      value={editingProduct.warrantyPricePerUnit?.amount || 0}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        warrantyPricePerUnit: { ...editingProduct.warrantyPricePerUnit!, amount: parseFloat(e.target.value) || 0 }
                      })}
                      className="pcm-form-input"
                      style={styles.formInput}
                      step="0.01"
                    />
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Billing Period</label>
                    <select
                      value={editingProduct.warrantyPricePerUnit?.billingPeriod || "monthly"}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        warrantyPricePerUnit: { ...editingProduct.warrantyPricePerUnit!, billingPeriod: e.target.value }
                      })}
                      className="pcm-form-input"
                      style={styles.formInput}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-checkbox-label" style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editingProduct.displayByAdmin !== false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, displayByAdmin: e.target.checked })}
                        className="pcm-checkbox"
                        style={styles.checkbox}
                      />
                      <span>Display in Admin Panel</span>
                    </label>
                  </div>

                  <div className="pcm-form-group" style={styles.formGroup}>
                    <label className="pcm-form-label" style={styles.formLabel}>Description</label>
                    <textarea
                      value={editingProduct.description || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="pcm-form-input"
                      style={{...styles.formInput, minHeight: "100px", resize: "vertical"}}
                      placeholder="Enter product description..."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="pcm-modal-actions" style={styles.modalActions}>
                  <button
                    className="pcm-modal-cancel-button"
                    style={styles.modalCancelButton}
                    onClick={() => setIsEditMode(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="pcm-modal-save-button"
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
        <div className="pcm-modal" style={styles.modal}>
          <div className="pcm-modal-content" style={styles.modalContent}>
            <div className="pcm-modal-header" style={styles.modalHeader}>
              <h3>Add New Product to {creatingProduct.label}</h3>
              <button
                className="pcm-modal-close-button"
                style={styles.modalCloseButton}
                onClick={() => closeModal()}
              >
                ✕
              </button>
            </div>

            <div className="pcm-form-grid" style={styles.formGrid}>
              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Product Key *</label>
                <input
                  type="text"
                  value={newProduct.key}
                  onChange={(e) => setNewProduct({ ...newProduct, key: validateProductKey(e.target.value) })}
                  className="pcm-form-input"
                  style={styles.formInput}
                  placeholder="e.g., soap-standard-1000ml"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Only letters, numbers, hyphens, and underscores allowed. Automatically converted to lowercase.
                </small>
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Product Name *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    // ✅ AUTO-FILL: Generate product key from name
                    const generatedKey = generateProductKeyFromName(name);
                    setNewProduct({ ...newProduct, name, key: generatedKey });
                  }}
                  className="pcm-form-input"
                  style={styles.formInput}
                  placeholder="e.g., Standard Hand Soap 1000ml"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  <FontAwesomeIcon icon={faLightbulb} /> Product key will be automatically generated from the name
                </small>
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Kind</label>
                <select
                  value={customKindSelected ? 'CUSTOM' : (newProduct.kind || '')}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setCustomKindSelected(true);
                      setNewProduct({ ...newProduct, kind: '' });
                    } else {
                      setCustomKindSelected(false);
                      setNewProduct({ ...newProduct, kind: e.target.value });
                    }
                  }}
                  className="pcm-form-input"
                  style={styles.formInput}
                >
                  <option value="">Select kind...</option>
                  {allKinds.map(kind => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                  <option value="CUSTOM">Custom (Enter manually)</option>
                </select>
                {customKindSelected && (
                  <>
                    <input
                      type="text"
                      value={newProduct.kind || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, kind: e.target.value })}
                      className="pcm-form-input"
                      style={{...styles.formInput, marginTop: '8px'}}
                      placeholder="Enter custom kind (e.g., liquid, foam, gel)"
                      autoFocus
                    />
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      <FontAwesomeIcon icon={faLightbulb} /> Enter a custom kind for this product
                    </small>
                  </>
                )}
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Base Price ($)</label>
                <input
                  type="number"
                  value={newProduct.basePrice?.amount || 0}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    basePrice: { ...newProduct.basePrice!, amount: parseFloat(e.target.value) || 0 }
                  })}
                  className="pcm-form-input"
                  style={styles.formInput}
                  step="0.01"
                />
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Unit of Measure</label>
                <select
                  value={customUomSelected ? 'CUSTOM' : (newProduct.basePrice?.uom || '')}
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setCustomUomSelected(true);
                      setNewProduct({
                        ...newProduct,
                        basePrice: { ...newProduct.basePrice!, uom: '' }
                      });
                    } else {
                      setCustomUomSelected(false);
                      setNewProduct({
                        ...newProduct,
                        basePrice: { ...newProduct.basePrice!, uom: e.target.value }
                      });
                    }
                  }}
                  className="pcm-form-input"
                  style={styles.formInput}
                >
                  <option value="">Select UOM...</option>
                  {allUoms.map(uom => (
                    <option key={uom} value={uom}>{uom}</option>
                  ))}
                  <option value="CUSTOM">Custom (Enter manually)</option>
                </select>
                {customUomSelected && (
                  <>
                    <input
                      type="text"
                      value={newProduct.basePrice?.uom || ""}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        basePrice: { ...newProduct.basePrice!, uom: e.target.value }
                      })}
                      className="pcm-form-input"
                      style={{...styles.formInput, marginTop: '8px'}}
                      placeholder="e.g., per unit, per case, per gallon"
                      autoFocus
                    />
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      <FontAwesomeIcon icon={faLightbulb} /> Enter a custom unit of measure
                    </small>
                  </>
                )}
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Warranty Price ($)</label>
                <input
                  type="number"
                  value={newProduct.warrantyPricePerUnit?.amount || 0}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    warrantyPricePerUnit: { ...newProduct.warrantyPricePerUnit!, amount: parseFloat(e.target.value) || 0 }
                  })}
                  className="pcm-form-input"
                  style={styles.formInput}
                  step="0.01"
                />
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Billing Period</label>
                <select
                  value={newProduct.warrantyPricePerUnit?.billingPeriod || "monthly"}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    warrantyPricePerUnit: { ...newProduct.warrantyPricePerUnit!, billingPeriod: e.target.value }
                  })}
                  className="pcm-form-input"
                  style={styles.formInput}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-checkbox-label" style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newProduct.displayByAdmin ?? true}
                    onChange={(e) => setNewProduct({ ...newProduct, displayByAdmin: e.target.checked })}
                    className="pcm-checkbox"
                    style={styles.checkbox}
                  />
                  <span>Display in Admin Panel</span>
                </label>
              </div>

              <div className="pcm-form-group" style={styles.formGroup}>
                <label className="pcm-form-label" style={styles.formLabel}>Description</label>
                <textarea
                  value={newProduct.description || ""}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="pcm-form-input"
                  style={{...styles.formInput, minHeight: "100px", resize: "vertical"}}
                  placeholder="Enter product description..."
                  rows={4}
                />
              </div>
            </div>

            <div className="pcm-modal-actions" style={styles.modalActions}>
              <button
                className="pcm-modal-cancel-button"
                style={styles.modalCancelButton}
                onClick={() => closeModal()}
              >
                Cancel
              </button>
              <button
                className="pcm-modal-save-button"
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
        <div className="pcm-modal" style={styles.modal}>
          <div className="pcm-confirmation-modal" style={styles.confirmationModal}>
            <div className="pcm-confirmation-header" style={styles.confirmationHeader}>
              <h3 className="pcm-confirmation-title" style={styles.confirmationTitle}><FontAwesomeIcon icon={faExclamationTriangle} /> Confirm Delete</h3>
            </div>

            <div className="pcm-confirmation-body" style={styles.confirmationBody}>
              <p className="pcm-confirmation-text" style={styles.confirmationText}>
                Are you sure you want to delete this product?
              </p>
              <div className="pcm-product-info-box" style={styles.productInfoBox}>
                <div className="pcm-product-info-row" style={styles.productInfoRow}>
                  <strong>Product Name:</strong> {deletingProduct.name}
                </div>
                <div className="pcm-product-info-row" style={styles.productInfoRow}>
                  <strong>Product Key:</strong> <code className="pcm-code" style={styles.code}>{deletingProduct.key}</code>
                </div>
                <div className="pcm-product-info-row" style={styles.productInfoRow}>
                  <strong>Family:</strong> {deletingProduct.familyKey}
                </div>
              </div>
              <p className="pcm-warning-text" style={styles.warningText}>
                <FontAwesomeIcon icon={faExclamationTriangle} /> This action cannot be undone!
              </p>
            </div>

            <div className="pcm-confirmation-actions" style={styles.confirmationActions}>
              <button
                className="pcm-confirm-cancel-button"
                style={styles.confirmCancelButton}
                onClick={() => closeModal()}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="pcm-confirm-delete-button"
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

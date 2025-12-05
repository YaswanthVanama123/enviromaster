// src/components/admin/ServiceConfigManager.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useServiceConfigs } from "../../backendservice/hooks";
import type { ServiceConfig, UpdateServiceConfigPayload } from "../../backendservice/types/serviceConfig.types";
import { Toast } from "./Toast";
import type { ToastType } from "./Toast";

interface ServiceConfigManagerProps {
  modalType?: string;
  itemId?: string;
  isEmbedded?: boolean;
  parentPath?: string;
}

export const ServiceConfigManager: React.FC<ServiceConfigManagerProps> = ({
  modalType,
  itemId,
  isEmbedded = false,
  parentPath
}) => {
  const navigate = useNavigate();
  const { configs, loading, error, updateConfig } = useServiceConfigs();
  const [editingConfig, setEditingConfig] = useState<ServiceConfig | null>(null);
  const [formData, setFormData] = useState<UpdateServiceConfigPayload>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // URL-based modal management
  useEffect(() => {
    if (modalType === 'edit' && itemId && configs.length > 0) {
      const config = configs.find(c => c._id === itemId);
      if (config) {
        handleEdit(config);
      }
    } else if (!modalType) {
      setEditingConfig(null);
    }
  }, [modalType, itemId, configs]);

  // Update URL when modal opens/closes
  const openEditModal = (config: ServiceConfig) => {
    if (isEmbedded && parentPath) {
      navigate(`${parentPath}/services/edit/${config._id}`, { replace: true });
    } else {
      navigate(`/pricing-tables/services/edit/${config._id}`, { replace: true });
    }
  };

  const closeModal = () => {
    if (isEmbedded && parentPath) {
      navigate(`${parentPath}/services`, { replace: true });
    } else {
      navigate('/pricing-tables/services', { replace: true });
    }
  };

  const handleEdit = (config: ServiceConfig) => {
    setEditingConfig(config);
    setFormData({
      label: config.label,
      description: config.description,
      version: config.version,
      isActive: config.isActive,
      tags: config.tags,
    });
  };

  const handleSave = async () => {
    if (!editingConfig?._id) return;

    setSaving(true);

    const result = await updateConfig(editingConfig._id, formData);

    if (result.success) {
      setToastMessage({ message: "Service config updated successfully!", type: "success" });
      closeModal();
    } else {
      setToastMessage({ message: "Failed to update service config. Please try again.", type: "error" });
    }

    setSaving(false);
  };

  const handleCancel = () => {
    closeModal();
    setFormData({});
  };

  if (loading) {
    return <div style={styles.loading}>Loading service configs...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Service Config Manager</h2>
        <p style={styles.subtitle}>Manage pricing configurations for all services</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.grid}>
        {configs.map((config) => (
          <div key={config._id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>{config.label}</h3>
                <p style={styles.cardServiceId}>{config.serviceId}</p>
              </div>
              <div style={styles.cardBadges}>
                {config.isActive && <span style={styles.activeBadge}>Active</span>}
                <span style={styles.versionBadge}>v{config.version}</span>
              </div>
            </div>
            <p style={styles.cardDescription}>{config.description}</p>
            {config.tags && config.tags.length > 0 && (
              <div style={styles.tagContainer}>
                {config.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button style={styles.editButton} onClick={() => openEditModal(config)}>
              Edit Configuration
            </button>
          </div>
        ))}
      </div>

      {editingConfig && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>Edit Service Config</h3>
              <button style={styles.closeButton} onClick={handleCancel}>
                ✕
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Label</label>
              <input
                type="text"
                value={formData.label || ""}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={styles.textarea}
                rows={3}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Version</label>
              <input
                type="text"
                value={formData.version || ""}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive || false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={styles.checkbox}
                />
                <span>Active</span>
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags?.join(", ") || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
                style={styles.input}
                placeholder="restroom, hygiene, core-service"
              />
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={handleCancel}>
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: "24px",
    width: "100%",
    maxWidth: "100%",
  },
  card: {
    padding: "20px",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    backgroundColor: "white",
    transition: "box-shadow 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#111",
    margin: "0 0 4px 0",
  },
  cardServiceId: {
    fontSize: "12px",
    color: "#999",
    fontFamily: "monospace",
    margin: 0,
  },
  cardBadges: {
    display: "flex",
    gap: "6px",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  activeBadge: {
    padding: "4px 8px",
    backgroundColor: "#10b981",
    color: "white",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
  },
  versionBadge: {
    padding: "4px 8px",
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "12px",
    lineHeight: "1.5",
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "16px",
  },
  tag: {
    padding: "4px 8px",
    backgroundColor: "#f0f0f0",
    color: "#666",
    borderRadius: "4px",
    fontSize: "12px",
  },
  editButton: {
    width: "100%",
    padding: "10px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
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
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "6px",
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "24px",
  },
  cancelButton: {
    padding: "10px 20px",
    border: "1px solid #ddd",
    backgroundColor: "white",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  saveButton: {
    padding: "10px 20px",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
};

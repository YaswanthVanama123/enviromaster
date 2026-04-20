
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Autoformat,
  Alignment,
  Base64UploadAdapter,
  BlockQuote,
  Bold,
  Essentials,
  Heading,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  Paragraph,
  PasteFromOffice,
  Table,
  TableColumnResize,
  TableToolbar,
  TextTransformation,
  Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { useServiceConfigs } from "../../backendservice/hooks";
import type { ServiceConfig, UpdateServiceConfigPayload, ServiceImage, ServiceLink } from "../../backendservice/types/serviceConfig.types";
import { serviceConfigApi } from "../../backendservice/api/serviceConfigApi";
import { Toast } from "./Toast";
import type { ToastType } from "./Toast";
import "./ServiceConfigManager.css";

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
  const [uploading, setUploading] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      images: config.images ?? [],
      links: config.links ?? [],
    });
    setNewLinkLabel("");
    setNewLinkUrl("");
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

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingConfig?._id || !e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { url } = await serviceConfigApi.uploadImage(editingConfig._id, e.target.files[0]);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images ?? []), { url, caption: "" }],
      }));
    } catch {
      setToastMessage({ message: "Image upload failed.", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageCaption = (idx: number, caption: string) => {
    setFormData(prev => {
      const imgs = [...(prev.images ?? [])];
      imgs[idx] = { ...imgs[idx], caption };
      return { ...prev, images: imgs };
    });
  };

  const handleImageRemove = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images ?? []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddLink = () => {
    const trimLabel = newLinkLabel.trim();
    const trimUrl = newLinkUrl.trim();
    if (!trimLabel || !trimUrl) return;
    setFormData(prev => ({
      ...prev,
      links: [...(prev.links ?? []), { label: trimLabel, url: trimUrl }],
    }));
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleLinkRemove = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      links: (prev.links ?? []).filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="scm-container" style={styles.container}>
        <div className="scm-header" style={styles.header}>
          <h2 className="scm-title" style={styles.title}>Service Config Manager</h2>
          <p className="scm-subtitle" style={styles.subtitle}>Manage pricing configurations for all services</p>
        </div>

        <div className="scm-loading-state">
          <div className="scm-spinner-inline">
            <span className="scm-sr-only">Loading service configs…</span>
          </div>
          <p className="scm-loading-text">Loading service configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scm-container" style={styles.container}>
      <div className="scm-header" style={styles.header}>
        <h2 className="scm-title" style={styles.title}>Service Config Manager</h2>
        <p className="scm-subtitle" style={styles.subtitle}>Manage pricing configurations for all services</p>
      </div>

      {error && <div className="scm-error" style={styles.error}>{error}</div>}

      <div className="scm-grid" style={styles.grid}>
        {configs.map((config) => (
          <div key={config._id} className="scm-card" style={styles.card}>
            <div className="scm-card-header" style={styles.cardHeader}>
              <div>
                <h3 className="scm-card-title" style={styles.cardTitle}>{config.label}</h3>
                <p className="scm-card-service-id" style={styles.cardServiceId}>{config.serviceId}</p>
              </div>
              <div className="scm-card-badges" style={styles.cardBadges}>
                {config.isActive && <span className="scm-active-badge" style={styles.activeBadge}>Active</span>}
                <span className="scm-version-badge" style={styles.versionBadge}>v{config.version}</span>
              </div>
            </div>
            <div
              className="scm-card-description ck-content"
              style={styles.cardDescription}
              dangerouslySetInnerHTML={{ __html: config.description ?? "" }}
            />
            {config.tags && config.tags.length > 0 && (
              <div className="scm-tag-container" style={styles.tagContainer}>
                {config.tags.map((tag) => (
                  <span key={tag} className="scm-tag" style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button className="scm-edit-button" style={styles.editButton} onClick={() => openEditModal(config)}>
              Edit Configuration
            </button>
          </div>
        ))}
      </div>

      {editingConfig && (
        <div className="scm-modal" style={styles.modal}>
          <div className="scm-modal-content" style={styles.modalContent}>
            <div className="scm-modal-header" style={styles.modalHeader}>
              <h3>Edit Service Config</h3>
              <button className="scm-close-button" style={styles.closeButton} onClick={handleCancel}>
                ✕
              </button>
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-label" style={styles.label}>Label</label>
              <input
                type="text"
                value={formData.label || ""}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="scm-input"
                style={styles.input}
              />
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-label" style={styles.label}>Description</label>
              <div style={styles.editorWrap}>
                <CKEditor
                  editor={ClassicEditor}
                  data={formData.description || ""}
                  onChange={(_event, editor) => {
                    setFormData(prev => ({ ...prev, description: editor.getData() }));
                  }}
                  onError={(error, details) => {
                    console.error("CKEditor error:", error, details);
                  }}
                  config={{
                    licenseKey: "GPL",
                    plugins: [
                      Essentials, Autoformat, Alignment,
                      Base64UploadAdapter, BlockQuote,
                      Bold, Italic, Underline,
                      Heading,
                      Image, ImageCaption, ImageStyle, ImageToolbar, ImageUpload,
                      Indent, IndentBlock,
                      Link,
                      List, ListProperties,
                      Paragraph, PasteFromOffice,
                      Table, TableColumnResize, TableToolbar,
                      TextTransformation,
                    ],
                    toolbar: {
                      items: [
                        "heading", "|",
                        "bold", "italic", "underline", "|",
                        "alignment", "|",
                        "link", "bulletedList", "numberedList", "|",
                        "outdent", "indent", "|",
                        "blockQuote", "insertTable", "|",
                        "uploadImage", "|",
                        "undo", "redo",
                      ],
                      shouldNotGroupWhenFull: true,
                    },
                    heading: {
                      options: [
                        { model: "paragraph" as const, title: "Paragraph", class: "ck-heading_paragraph" },
                        { model: "heading1" as const, view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
                        { model: "heading2" as const, view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
                        { model: "heading3" as const, view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
                      ],
                    },
                    image: {
                      toolbar: [
                        "imageStyle:inline", "imageStyle:block", "imageStyle:side", "|",
                        "toggleImageCaption", "imageTextAlternative",
                      ],
                    },
                    table: {
                      contentToolbar: [
                        "tableColumn", "tableRow", "mergeTableCells",
                        "tableProperties", "tableCellProperties",
                      ],
                    },
                  }}
                />
              </div>
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-label" style={styles.label}>Version</label>
              <input
                type="text"
                value={formData.version || ""}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="scm-input"
                style={styles.input}
              />
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-checkbox-label" style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive || false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="scm-checkbox"
                  style={styles.checkbox}
                />
                <span>Active</span>
              </label>
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-label" style={styles.label}>Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags?.join(", ") || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
                className="scm-input"
                style={styles.input}
                placeholder="restroom, hygiene, core-service"
              />
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-label" style={styles.label}>Images</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                style={{ ...styles.uploadBtn, opacity: uploading ? 0.6 : 1 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "+ Upload Image"}
              </button>
              {(formData.images ?? []).length > 0 && (
                <div style={styles.imageGrid}>
                  {(formData.images ?? []).map((img, idx) => (
                    <div key={idx} style={styles.imageCard}>
                      <img src={img.url.startsWith("/") ? `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}${img.url}` : img.url} alt={img.caption || "service"} style={styles.imageThumbnail} />
                      <input
                        type="text"
                        value={img.caption ?? ""}
                        onChange={(e) => handleImageCaption(idx, e.target.value)}
                        placeholder="Caption (optional)"
                        style={styles.captionInput}
                      />
                      <button type="button" style={styles.removeImageBtn} onClick={() => handleImageRemove(idx)} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="scm-form-group" style={styles.formGroup}>
              <label className="scm-label" style={styles.label}>Links</label>
              <div style={styles.addLinkRow}>
                <input
                  type="text"
                  value={newLinkLabel}
                  onChange={e => setNewLinkLabel(e.target.value)}
                  placeholder="Label (e.g. Product Sheet)"
                  style={{ ...styles.input, flex: 1 }}
                />
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  placeholder="https://…"
                  style={{ ...styles.input, flex: 2 }}
                  onKeyDown={e => e.key === "Enter" && handleAddLink()}
                />
                <button type="button" style={styles.addLinkBtn} onClick={handleAddLink}>Add</button>
              </div>
              {(formData.links ?? []).length > 0 && (
                <div style={styles.linkList}>
                  {(formData.links ?? []).map((link, idx) => (
                    <div key={idx} style={styles.linkItem}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={styles.linkAnchor}>{link.label}</a>
                      <span style={styles.linkUrl}>{link.url}</span>
                      <button type="button" style={styles.removeLinkBtn} onClick={() => handleLinkRemove(idx)} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="scm-modal-actions" style={styles.modalActions}>
              <button className="scm-cancel-button" style={styles.cancelButton} onClick={handleCancel}>
                Cancel
              </button>
              <button className="scm-save-button" style={styles.saveButton} onClick={handleSave} disabled={saving}>
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
    fontSize: "13px",
    color: "#666",
    marginBottom: "12px",
    lineHeight: "1.5",
    maxHeight: "80px",
    overflow: "hidden",
    WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
    maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
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
    width: "92%",
    maxWidth: "760px",
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
  editorWrap: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
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
  uploadBtn: {
    padding: "8px 14px",
    backgroundColor: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    color: "#2563eb",
    marginBottom: "10px",
  },
  imageGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "10px",
    marginTop: "4px",
  },
  imageCard: {
    position: "relative" as const,
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
    width: "140px",
    display: "flex",
    flexDirection: "column" as const,
  },
  imageThumbnail: {
    width: "100%",
    height: "90px",
    objectFit: "cover" as const,
    display: "block",
  },
  captionInput: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    padding: "4px 6px",
    fontSize: "11px",
    outline: "none",
    background: "#f9fafb",
  },
  removeImageBtn: {
    position: "absolute" as const,
    top: "4px",
    right: "4px",
    width: "20px",
    height: "20px",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    fontSize: "10px",
    cursor: "pointer",
    lineHeight: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addLinkRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
    alignItems: "center",
  },
  addLinkBtn: {
    padding: "8px 14px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  linkList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  linkItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 10px",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "13px",
  },
  linkAnchor: {
    fontWeight: "600",
    color: "#2563eb",
    textDecoration: "none",
    flexShrink: 0,
    maxWidth: "120px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  linkUrl: {
    flex: 1,
    color: "#6b7280",
    fontSize: "11px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  removeLinkBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "13px",
    padding: "2px 4px",
    flexShrink: 0,
  },
};

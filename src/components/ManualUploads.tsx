// src/components/ManualUploads.tsx
import { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faDownload, faTrash, faUpload, faCheckCircle, faTimes, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { manualUploadApi } from "../backendservice/api";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import "./ManualUploads.css";

interface ManualUpload {
  _id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  description: string;
  uploadedBy: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  zoho?: {
    bigin?: {
      fileId: string | null;
      url: string | null;
    };
    crm?: {
      fileId: string | null;
      url: string | null;
    };
  };
}

export default function ManualUploads() {
  const [uploads, setUploads] = useState<ManualUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<string | null>(null);

  // ✅ NEW: Track first mount to avoid duplicate API calls
  const isFirstMount = useRef(true);

  // ✅ OPTIMIZED: Fetch uploads ONLY on first mount
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      console.log("📤 [MANUAL-UPLOADS] Initial load");
      fetchUploads();
    }
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const data = await manualUploadApi.getManualUploads();
      setUploads(data.items || []);
    } catch (err) {
      console.error("Error fetching uploads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files one by one
      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          setUploadProgress({ current: i + 1, total: selectedFiles.length });
          await manualUploadApi.uploadFile(selectedFiles[i], description);
          successCount++;
          console.log(`Upload ${i + 1}/${selectedFiles.length} successful`);
        } catch (err) {
          console.error(`Error uploading file ${selectedFiles[i].name}:`, err);
          failCount++;
        }
      }

      // Reset form
      setSelectedFiles([]);
      setDescription("");
      setUploadProgress(null);

      if (successCount > 0) {
        setUploadSuccess(true);
        // Refresh list
        fetchUploads();
        // Clear success message after 3 seconds
        setTimeout(() => setUploadSuccess(false), 3000);
      }

      if (failCount > 0) {
        alert(`${successCount} file(s) uploaded successfully. ${failCount} file(s) failed.`);
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const blob = await manualUploadApi.downloadFile(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Failed to download file. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this upload?")) return;

    try {
      await manualUploadApi.deleteFile(id);
      fetchUploads();
    } catch (err) {
      console.error("Error deleting upload:", err);
      alert("Failed to delete upload. Please try again.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="manual-uploads">
      <div className="manual-uploads-header">
        <h2>Manual Uploads</h2>
        <p className="subtitle">Upload PDFs manually to Bigin</p>
      </div>

      {/* Upload Section */}
      <div className="upload-section-card">
        <h3>Upload New PDF(s)</h3>
        <div className="upload-form">
          <div className="form-group">
            <label>Select PDF File(s):</label>
            <div className="file-input-wrapper">
              <input
                id="file-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                multiple
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="choose-files-btn"
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={uploading}
              >
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: "10px" }} />
                Choose PDF Files
              </button>
              {selectedFiles.length === 0 && (
                <span className="no-files-text">No files selected</span>
              )}
            </div>
            {selectedFiles.length > 0 && (
              <div className="selected-files-container">
                <div className="selected-files-header">
                  Selected {selectedFiles.length} file(s):
                </div>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="selected-file-item">
                    <FontAwesomeIcon icon={faFileAlt} size="lg" style={{ color: "#2563eb" }} />
                    <span className="file-info">
                      {file.name} <span className="file-size">({formatFileSize(file.size)})</span>
                    </span>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      title="Remove file"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional):</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for these uploads..."
              rows={3}
              disabled={uploading}
            />
          </div>

          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
          >
            <FontAwesomeIcon icon={faUpload} style={{ marginRight: "8px" }} />
            {uploading
              ? `Uploading ${uploadProgress?.current || 0}/${uploadProgress?.total || 0}...`
              : `Upload ${selectedFiles.length > 0 ? `${selectedFiles.length} file(s)` : 'to Zoho'}`}
          </button>

          {uploadSuccess && (
            <div className="success-message">
              <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "8px" }} />
              Files uploaded successfully! Zoho sync in progress...
            </div>
          )}
        </div>
      </div>

      {/* Uploads List */}
      <div className="uploads-list-card">
        <h3>Uploaded Files</h3>
        {loading ? (
          <div className="loading">Loading uploads...</div>
        ) : uploads.length === 0 ? (
          <div className="empty-state">No uploads yet. Upload your first PDF above.</div>
        ) : (
          <div className="uploads-table-container">
            <table className="uploads-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Bigin Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload._id}>
                    <td>
                      <div className="file-name">
                        <FontAwesomeIcon icon={faFileAlt} className="file-icon" size="lg" style={{ color: "#2563eb" }} />
                        <div>
                          <div className="file-title">{upload.fileName}</div>
                          {upload.description && (
                            <div className="file-description">{upload.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{formatFileSize(upload.fileSize)}</td>
                    <td>
                      <span className={`status-badge status-${upload.status}`}>
                        {upload.status}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(upload.createdAt)}</td>
                    <td>
                      <div className="zoho-status">
                        {upload.zoho?.bigin?.fileId && (
                          <span className="zoho-tag zoho-bigin" title="Uploaded to Zoho Bigin">
                            Bigin <FontAwesomeIcon icon={faCheckCircle} size="xs" style={{ marginLeft: "2px" }} />
                          </span>
                        )}
                        {upload.zoho?.crm?.fileId && (
                          <span className="zoho-tag zoho-crm" title="Uploaded to Zoho CRM">
                            CRM <FontAwesomeIcon icon={faCheckCircle} size="xs" style={{ marginLeft: "2px" }} />
                          </span>
                        )}
                        {!upload.zoho?.bigin?.fileId && !upload.zoho?.crm?.fileId && (
                          <span className="zoho-tag zoho-pending">Pending</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn download-btn"
                          onClick={() => handleDownload(upload._id, upload.fileName)}
                          title="Download PDF"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(upload._id)}
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/ManualUploads.tsx
import { useEffect, useState } from "react";
import { HiDocumentText, HiDownload, HiTrash, HiUpload, HiCheckCircle } from "react-icons/hi";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/manual-upload");
      if (!res.ok) throw new Error(`Failed with status ${res.status}`);
      const data = await res.json();
      setUploads(data.items || []);
    } catch (err) {
      console.error("Error fetching uploads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    setUploading(true);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("description", description);
      formData.append("uploadedBy", "admin");

      const res = await fetch("http://localhost:5000/api/manual-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);

      const data = await res.json();
      console.log("Upload successful:", data);

      // Reset form
      setSelectedFile(null);
      setDescription("");
      setUploadSuccess(true);

      // Refresh list
      fetchUploads();

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/manual-upload/${id}/download`
      );
      if (!res.ok) throw new Error(`Download failed with status ${res.status}`);

      const blob = await res.blob();
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
      const res = await fetch(`http://localhost:5000/api/manual-upload/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Delete failed with status ${res.status}`);

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
        <p className="subtitle">Upload PDFs manually to Zoho CRM and Bigin</p>
      </div>

      {/* Upload Section */}
      <div className="upload-section-card">
        <h3>Upload New PDF</h3>
        <div className="upload-form">
          <div className="form-group">
            <label htmlFor="file-input">Select PDF File:</label>
            <input
              id="file-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {selectedFile && (
              <span className="selected-file">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (optional):</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description for this upload..."
              rows={3}
              disabled={uploading}
            />
          </div>

          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            <HiUpload size={18} style={{ marginRight: "8px" }} />
            {uploading ? "Uploading..." : "Upload to Zoho"}
          </button>

          {uploadSuccess && (
            <div className="success-message">
              <HiCheckCircle size={18} style={{ marginRight: "8px" }} />
              File uploaded successfully! Zoho sync in progress...
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
                  <th>Zoho Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload) => (
                  <tr key={upload._id}>
                    <td>
                      <div className="file-name">
                        <HiDocumentText className="file-icon" size={24} style={{ color: "#2563eb" }} />
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
                            Bigin <HiCheckCircle size={12} style={{ marginLeft: "2px" }} />
                          </span>
                        )}
                        {upload.zoho?.crm?.fileId && (
                          <span className="zoho-tag zoho-crm" title="Uploaded to Zoho CRM">
                            CRM <HiCheckCircle size={12} style={{ marginLeft: "2px" }} />
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
                          <HiDownload size={16} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(upload._id)}
                          title="Delete"
                        >
                          <HiTrash size={16} />
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

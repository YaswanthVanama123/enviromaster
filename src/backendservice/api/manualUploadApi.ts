// src/backendservice/api/manualUploadApi.ts

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface ManualUpload {
  _id: string;
  id?: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedBy?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ManualUploadsResponse {
  items: ManualUpload[];
}

/**
 * Manual Upload API Service
 * Handles file upload operations
 */
export const manualUploadApi = {
  /**
   * Get all manual uploads
   */
  async getManualUploads(): Promise<ManualUploadsResponse> {
    const res = await axios.get(`${API_BASE_URL}/api/manual-upload`);
    return res.data;
  },

  /**
   * Upload a new file
   */
  async uploadFile(file: File, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }

    const res = await axios.post(
      `${API_BASE_URL}/api/manual-upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  },

  /**
   * Download a file
   */
  async downloadFile(id: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/manual-upload/${id}/download`,
      {
        responseType: "blob",
      }
    );
    return res.data;
  },

  /**
   * Delete a file
   */
  async deleteFile(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/manual-upload/${id}`);
  },

  /**
   * Get file download URL
   */
  getFileDownloadUrl(id: string): string {
    return `${API_BASE_URL}/api/manual-upload/${id}/download`;
  },
};

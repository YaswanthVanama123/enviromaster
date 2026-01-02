// src/backendservice/api/manualUploadApi.ts

import { apiClient } from "../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface ManualUpload {
  _id: string;
  id?: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  description?: string;
  status: "uploaded" | "processing" | "completed" | "failed" | "pending_approval" | "approved_salesman" | "approved_admin";
  createdAt: string;
  updatedAt?: string;
  zoho?: {
    bigin?: { fileId: string | null; url: string | null };
    crm?: { fileId: string | null; url: string | null };
  };
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
    const res = await apiClient.get<ManualUploadsResponse>(`/api/manual-upload`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Upload a new file
   * Uses FormData for file upload - requires direct fetch since apiClient doesn't support FormData
   */
  async uploadFile(file: File, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }

    // Use fetch directly for FormData (apiClient doesn't support it yet)
    const headers: HeadersInit = {};
    const token = apiClient.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Do NOT set Content-Type for FormData - browser sets it with boundary

    const response = await fetch(
      `${API_BASE_URL}/api/manual-upload`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Download a file
   */
  async downloadFile(id: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/manual-upload/${id}/download`);
  },

  /**
   * Update manual upload status
   */
  async updateStatus(id: string, status: string): Promise<void> {
    const res = await apiClient.patch(
      `/api/manual-upload/${id}/status`,
      { status }
    );
    if (res.error) throw new Error(res.error);
  },

  /**
   * Delete a file
   */
  async deleteFile(id: string): Promise<void> {
    const res = await apiClient.delete(`/api/manual-upload/${id}`);
    if (res.error) throw new Error(res.error);
  },

  /**
   * Get file download URL
   */
  getFileDownloadUrl(id: string): string {
    return `${API_BASE_URL}/api/manual-upload/${id}/download`;
  },
};

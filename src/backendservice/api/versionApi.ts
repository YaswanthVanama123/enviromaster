// src/backendservice/api/versionApi.ts
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Types for version API responses
export interface VersionStatus {
  success: boolean;
  isFirstTime: boolean;
  hasMainPdf: boolean;
  totalVersions: number;
  latestVersionNumber: number;
  suggestedAction: 'auto_create_v1' | 'create_version' | 'suggest_replace'; // ✅ UPDATED: Added auto_create_v1
  canCreateVersion: boolean;
  canReplace: boolean;
  versions: Array<{
    id: string;
    versionNumber: number;
    versionLabel: string;
    createdAt: string;
    createdBy: string | null;
    status: string;
    sizeBytes: number;
  }>;
  agreement: {
    id: string;
    headerTitle: string;
    status: string;
    currentVersionNumber: number;
  };
}

export interface VersionItem {
  id: string;
  type: 'version'; // ✅ UPDATED: Removed 'main' type, only versions now
  versionNumber: number;
  versionLabel: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  createdBy: string | null;
  status: string;
  changeNotes: string;
  canEdit: boolean;
  canUploadToZoho: boolean;
  zohoUploadStatus?: {
    uploaded: boolean;
    dealId: string | null;
    uploadedAt: string | null;
  };
}

export interface VersionsList {
  success: boolean;
  agreementId: string;
  items: VersionItem[];
  summary: {
    totalVersions: number;
    hasMainPdf: boolean;
    agreementTitle: string;
    agreementStatus: string;
  };
}

export interface VersionCreateResult {
  success: boolean;
  message: string;
  version?: {
    id: string;
    versionNumber: number;
    versionLabel: string;
    sizeBytes: number;
    createdAt: string;
    createdBy: string | null;
    changeNotes: string;
    fileName: string;
  };
  totalVersions?: number;
  wasReplacement?: boolean;
  isFirstVersion?: boolean; // ✅ NEW: Flag indicating this was the first version
  error?: string;
}

export const versionApi = {
  /**
   * Check version status for an agreement (determines if user should create version or replace)
   */
  async checkVersionStatus(agreementId: string): Promise<VersionStatus> {
    const res = await axios.get(
      `${API_BASE_URL}/api/versions/${agreementId}/check-status`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Create a new version or replace recent version
   */
  async createVersion(
    agreementId: string,
    options: {
      changeNotes?: string;
      createdBy?: string;
      replaceRecent?: boolean;
      isFirstTime?: boolean; // ✅ NEW: Flag for auto v1 creation
    }
  ): Promise<VersionCreateResult> {
    const res = await axios.post(
      `${API_BASE_URL}/api/versions/${agreementId}/create-version`,
      options,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Replace main PDF with current form data
   */
  async replaceMainPdf(
    agreementId: string,
    options: {
      updatedBy?: string;
    } = {}
  ): Promise<VersionCreateResult> {
    const res = await axios.post(
      `${API_BASE_URL}/api/versions/${agreementId}/replace-main`,
      options,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get all versions for an agreement
   */
  async getVersionsList(
    agreementId: string,
    includeArchived = false
  ): Promise<VersionsList> {
    const params = new URLSearchParams();
    if (includeArchived) {
      params.set("includeArchived", "true");
    }

    const res = await axios.get(
      `${API_BASE_URL}/api/versions/${agreementId}/list?${params}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * View a specific version PDF (for inline display in browser)
   */
  async viewVersion(versionId: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/versions/version/${versionId}/view`,
      {
        responseType: 'blob',
      }
    );
    return res.data;
  },

  /**
   * Download a specific version PDF
   */
  async downloadVersion(versionId: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/versions/version/${versionId}/download`,
      {
        responseType: 'blob',
      }
    );
    return res.data;
  },

  /**
   * Delete or archive a version
   */
  async deleteVersion(
    versionId: string,
    permanent = false
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await axios.delete(
      `${API_BASE_URL}/api/versions/version/${versionId}`,
      {
        data: { permanent },
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get version data in edit format for FormFilling component
   */
  async getVersionForEdit(versionId: string): Promise<any> {
    const res = await axios.get(
      `${API_BASE_URL}/api/versions/version/${versionId}/edit-format`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },
};
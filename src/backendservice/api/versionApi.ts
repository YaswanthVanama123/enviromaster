// src/backendservice/api/versionApi.ts
import { apiClient } from "../utils/apiClient";

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
    const res = await apiClient.get<VersionStatus>(
      `/api/versions/${agreementId}/check-status`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.post<VersionCreateResult>(
      `/api/versions/${agreementId}/create-version`,
      options
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.post<VersionCreateResult>(
      `/api/versions/${agreementId}/replace-main`,
      options
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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

    const res = await apiClient.get<VersionsList>(
      `/api/versions/${agreementId}/list?${params}`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * View a specific version PDF (for inline display in browser)
   */
  async viewVersion(versionId: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/versions/version/${versionId}/view`);
  },

  /**
   * Download a specific version PDF
   */
  async downloadVersion(versionId: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/versions/version/${versionId}/download`);
  },

  /**
   * Delete or archive a version
   */
  async deleteVersion(
    versionId: string,
    permanent = false
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string; error?: string }>(
      `/api/versions/version/${versionId}`,
      {
        body: { permanent }
      }
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Get version data in edit format for FormFilling component
   */
  async getVersionForEdit(versionId: string): Promise<any> {
    const res = await apiClient.get(
      `/api/versions/version/${versionId}/edit-format`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },
};

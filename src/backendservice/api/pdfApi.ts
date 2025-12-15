// src/backendservice/api/pdfApi.ts

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface CustomerHeader {
  _id: string;
  id?: string;
  payload?: any;
  status: string;
  createdAt: string;
  updatedAt: string;
  // ✅ NEW: Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CustomerHeadersResponse {
  items: CustomerHeader[];
}

export interface ProductItem {
  displayName: string;
  qty: number;
  frequency?: string;
  total: number;
  unitPrice?: number;      // For small products
  warrantyRate?: number;   // For dispensers
  replacementRate?: number;// For dispensers
  amount?: number;         // For big products
}

export interface ProductsPayload {
  smallProducts: ProductItem[];
  dispensers: ProductItem[];
  bigProducts: ProductItem[];
}

export interface FormPayload {
  headerTitle: string;
  headerRows: any[];
  products: ProductsPayload;
  services: any;
  agreement: any;
}

// New interfaces for saved-files API
export interface SavedFileListItem {
  id: string;
  agreementId?: string;                 // ✅ FIX: Agreement ID (CustomerHeaderDoc._id) for Zoho upload
  fileName: string;                     // ✅ NEW: Actual file name
  fileType: 'main_pdf' | 'attached_pdf' | 'version_pdf'; // ✅ NEW: Distinguish main vs attached
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  fileSize: number;
  pdfStoredAt: string | null;
  hasPdf: boolean;
  description?: string;                 // ✅ NEW: For attached files
  versionNumber?: number;               // ✅ NEW: For version files
  zohoInfo: {
    biginDealId: string | null;
    biginFileId: string | null;
    crmDealId: string | null;
    crmFileId: string | null;
  };
  // ✅ NEW: Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface SavedFilesListResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  files: SavedFileListItem[];
  _metadata: {
    queryType: 'lightweight';
    fieldsIncluded: string[];
    fieldsExcluded: string[];
  };
}

// Grouped files interfaces (folder-like structure) - CORRECTED for single document approach
export interface SavedFileGroup {
  id: string;                    // Agreement document ID
  agreementTitle: string;        // Agreement title
  fileCount: number;             // Main PDF + attached files count
  latestUpdate: string;          // Latest update to agreement or attached files
  statuses: string[];            // Main agreement status
  hasUploads: boolean;           // Any files uploaded to Zoho
  files: SavedFileListItem[];    // Main PDF + all attached files
  // ✅ NEW: Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

// ✅ NEW: Interface for adding files to agreement
export interface AddFileToAgreementRequest {
  files: {
    fileId?: string;
    fileName: string;
    fileSize: number;
    contentType?: string;
    description?: string;
    pdfBuffer?: number[];  // ✅ NEW: Array of bytes from frontend
    externalUrl?: string;
    zoho?: {
      bigin?: { dealId?: string; fileId?: string; url?: string };
      crm?: { dealId?: string; fileId?: string; url?: string };
    };
  }[];
}

export interface AddFileToAgreementResponse {
  success: boolean;
  message: string;
  agreement: {
    id: string;
    title: string;
    attachedFilesCount: number;
  };
  addedFiles: {
    id: string;
    fileName: string;
    fileSize: number;
  }[];
}

export interface SavedFilesGroupedResponse {
  success: boolean;
  total: number;
  totalGroups: number;
  page: number;
  limit: number;
  groups: SavedFileGroup[];
  _metadata: {
    queryType: string;
    groupBy: string;
    fieldsIncluded: string[];
    fieldsExcluded: string[];
  };
}

export interface SavedFileDetails {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  payload: FormPayload;
  pdfMeta: {
    sizeBytes: number;
    contentType: string | null;
    storedAt: string | null;
    externalUrl: string | null;
  };
  zoho: {
    bigin: { dealId: string | null; fileId: string | null; url: string | null };
    crm: { dealId: string | null; fileId: string | null; url: string | null };
  };
  hasPdf: boolean;
  isEditable: boolean;
}

export interface SavedFileDetailsResponse {
  success: boolean;
  file: SavedFileDetails;
  _metadata: {
    queryType: 'full_details';
    fieldsIncluded: string[];
    fieldsExcluded: string[];
    payloadSize: number;
  };
}

/**
 * PDF API Service
 * Handles all PDF-related operations: customer headers, admin templates, downloads
 */
export const pdfApi = {
  /**
   * Get all customer headers
   */
  async getCustomerHeaders(): Promise<CustomerHeadersResponse> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * ✅ NEW: Get lightweight customer headers summary (no heavy payload data)
   * Returns only essential fields: _id, status, updatedAt, headerTitle
   * Use this for list views to avoid loading heavy form data upfront
   */
  async getCustomerHeadersSummary(): Promise<{
    items: Array<{
      _id: string;
      status: string;
      updatedAt: string;
      headerTitle?: string; // extracted from payload.headerTitle
    }>;
  }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers?fields=_id,status,updatedAt,payload.headerTitle`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get a specific customer header by ID
   */
  async getCustomerHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers/${id}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get a specific customer header by ID in edit-friendly format
   * This endpoint converts backend data structure for proper edit mode mapping
   */
  async getCustomerHeaderForEdit(id: string): Promise<{ payload: FormPayload }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers/${id}/edit-format`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get admin template header by ID
   */
  async getAdminHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/admin-headers/${id}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Create a new customer header with PDF generation
   */
  async createCustomerHeader(payload: FormPayload): Promise<{
    status: number;
    headers: any;
    data: any;
  }> {
    const res = await axios.post(
      `${API_BASE_URL}/api/pdf/customer-header`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return {
      status: res.status,
      headers: res.headers,
      data: res.data,
    };
  },

  /**
   * Update existing customer header (draft only)
   */
  async updateCustomerHeader(id: string, payload: FormPayload): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/pdf/customer-headers/${id}`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Update existing customer header and recompile PDF
   */
  async updateAndRecompileCustomerHeader(
    id: string,
    payload: FormPayload
  ): Promise<void> {
    await axios.put(
      `${API_BASE_URL}/api/pdf/customer-headers/${id}?recompile=true`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Update document status
   */
  async updateDocumentStatus(id: string, status: string): Promise<void> {
    await axios.patch(
      `${API_BASE_URL}/api/pdf/customer-headers/${id}/status`,
      { status },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },

  /**
   * Download PDF as blob
   */
  async downloadPdf(documentId: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/pdf/viewer/download/${documentId}`,
      {
        responseType: "blob",
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Download attached file from ManualUploadDocument collection
   */
  async downloadAttachedFile(fileId: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/pdf/attached-files/${fileId}/download`,
      {
        responseType: "blob",
      }
    );
    return res.data;
  },

  /**
   * Get PDF download URL
   */
  getPdfDownloadUrl(documentId: string): string {
    return `${API_BASE_URL}/api/pdf/viewer/download/${documentId}`;
  },

  // ---- NEW SAVED-FILES API (Lazy Loading) ----

  /**
   * Get saved files list with pagination (lightweight - only high-level data)
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20, max: 100)
   * @param filters Optional filters like status, search, isDeleted
   */
  async getSavedFilesList(
    page = 1,
    limit = 20,
    filters: { status?: string; search?: string; isDeleted?: boolean } = {}
  ): Promise<SavedFilesListResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());

    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.isDeleted !== undefined) {
      params.set('isDeleted', filters.isDeleted.toString());
    }

    const res = await axios.get(`${API_BASE_URL}/api/pdf/saved-files?${params}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get saved files grouped by agreement (folder-like structure)
   * @param page Page number (default: 1)
   * @param limit Groups per page (default: 20, max: 100)
   * @param filters Optional filters like status, search, isDeleted
   */
  async getSavedFilesGrouped(
    page = 1,
    limit = 20,
    filters: { status?: string; search?: string; isDeleted?: boolean } = {}
  ): Promise<SavedFilesGroupedResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());

    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.isDeleted !== undefined) {
      params.set('isDeleted', filters.isDeleted.toString());
    }

    const res = await axios.get(`${API_BASE_URL}/api/pdf/saved-files/grouped?${params}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Get full file details by ID (on-demand - includes complete payload)
   */
  async getSavedFileDetails(id: string): Promise<SavedFileDetailsResponse> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/saved-files/${id}/details`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * ✅ NEW: Add files to existing agreement's attachedFiles array
   */
  async addFilesToAgreement(
    agreementId: string,
    request: AddFileToAgreementRequest
  ): Promise<AddFileToAgreementResponse> {
    const res = await axios.post(
      `${API_BASE_URL}/api/pdf/saved-files/${agreementId}/add-files`,
      request,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Restore deleted agreement from trash
   */
  async restoreAgreement(agreementId: string): Promise<{
    success: boolean;
    message: string;
    agreement?: {
      id: string;
      title: string;
    };
  }> {
    const res = await axios.patch(
      `${API_BASE_URL}/api/pdf/agreements/${agreementId}/restore`,
      {},
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Restore deleted file from trash
   */
  async restoreFile(fileId: string): Promise<{
    success: boolean;
    message: string;
    file?: {
      id: string;
      title: string;
    };
  }> {
    const res = await axios.patch(
      `${API_BASE_URL}/api/pdf/files/${fileId}/restore`,
      {},
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Soft delete agreement (move to trash)
   */
  async deleteAgreement(agreementId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await axios.patch(
      `${API_BASE_URL}/api/pdf/agreements/${agreementId}/delete`,
      {},
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Soft delete file (move to trash)
   */
  async deleteFile(fileId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await axios.patch(
      `${API_BASE_URL}/api/pdf/files/${fileId}/delete`,
      {},
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Permanently delete agreement and all associated files
   */
  async permanentlyDeleteAgreement(agreementId: string): Promise<{
    success: boolean;
    message: string;
    deletedData?: {
      agreementId: string;
      deletedAttachedFiles: number;
      deletedZohoMappings: number;
      deletedVersions: number;
    };
  }> {
    const res = await axios.delete(
      `${API_BASE_URL}/api/pdf/agreements/${agreementId}/permanent-delete`,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Permanently delete individual file and cleanup references
   */
  async permanentlyDeleteFile(fileId: string): Promise<{
    success: boolean;
    message: string;
    deletedData?: {
      fileId: string;
      fileName: string;
      cleanedReferences: number;
    };
  }> {
    const res = await axios.delete(
      `${API_BASE_URL}/api/pdf/files/${fileId}/permanent-delete`,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },
};

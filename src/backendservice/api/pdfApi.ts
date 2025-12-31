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

export interface CustomerHeadersSummaryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CustomerHeadersAggregateOptions {
  limit?: number;
  maxPages?: number;
  search?: string;
  status?: string;
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

export interface GlobalSummary {
  contractMonths: number;
  tripCharge: number;
  tripChargeFrequency: number;
  parkingCharge: number;
  parkingChargeFrequency: number;
  serviceAgreementTotal: number;
  productMonthlyTotal: number;
  productContractTotal: number;
}

export interface FormPayload {
  headerTitle: string;
  headerRows: any[];
  products: ProductsPayload;
  services: any;
  agreement: any;
  summary?: GlobalSummary;
}

// ✅ NEW: Status types for agreements and versions
export type AgreementStatus = 'draft' | 'pending_approval' | 'approved_salesman' | 'approved_admin' | 'finalized';
export type VersionStatus = 'draft' | 'pending_approval' | 'approved_salesman' | 'approved_admin' | 'finalized' | 'archived';

// New interfaces for saved-files API
export interface SavedFileListItem {
  id: string;
  agreementId?: string;                 // ✅ FIX: Agreement ID (CustomerHeaderDoc._id) for Zoho upload
  versionId?: string;                   // ✅ NEW: Version ID for proper version mapping
  fileName: string;                     // ✅ NEW: Actual file name
  fileType: 'main_pdf' | 'attached_pdf' | 'version_pdf' | 'version_log'; // ✅ NEW: Added version_log type
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
  versionStatus?: VersionStatus;        // ✅ NEW: Status specific to this version
  isLatestVersion?: boolean;            // ✅ NEW: Flag to identify if this is the latest version
  canChangeStatus?: boolean;            // ✅ NEW: Flag to determine if status can be changed
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
  agreementStatus: AgreementStatus; // ✅ NEW: Agreement-level status
  fileCount: number;             // Main PDF + attached files count
  latestUpdate: string;          // Latest update to agreement or attached files
  statuses: string[];            // Main agreement status
  hasUploads: boolean;           // Any files uploaded to Zoho
  files: SavedFileListItem[];    // Main PDF + all attached files
  hasVersions: boolean;          // ✅ NEW: Flag if agreement has PDF versions
  isDraftOnly: boolean;          // ✅ NEW: Flag if agreement is draft-only (no PDFs generated)
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

// ✅ ENHANCED: Version logs interfaces with overwriting support
export interface VersionLogRequest {
  agreementId: string;
  versionId: string;
  versionNumber: number;
  salespersonId: string;
  salespersonName: string;
  saveAction: 'save_draft' | 'generate_pdf' | 'manual_save';
  documentTitle: string;
  // ✅ NEW: Overwriting support for smart log management
  overwriteExisting?: boolean;
  overwriteReason?: 'draft_update' | 'version_update' | 'replace_version';
  changes?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service';
    fieldType: string;
    fieldDisplayName: string;
    originalValue: number;
    newValue: number;
    changeAmount: number;
    changePercentage: number;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
}

export interface VersionLogResponse {
  success: boolean;
  message: string;
  log?: {
    logId: string;
    fileName: string;
    totalChanges: number;
    totalPriceImpact: number;
    hasSignificantChanges: boolean;
  } | null;
}

// ✅ SIMPLIFIED: Log document structure (separate collection)
export interface LogDocument {
  _id: string;
  agreementId: string;
  versionId: string;
  versionNumber: number;
  fileName: string;
  salespersonId: string;
  salespersonName: string;
  saveAction: 'save_draft' | 'generate_pdf' | 'manual_save';
  documentTitle: string;
  totalChanges: number;
  totalPriceImpact: number;
  hasSignificantChanges: boolean;
  changes: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service';
    fieldType: string;
    fieldDisplayName: string;
    originalValue: number;
    newValue: number;
    changeAmount: number;
    changePercentage: number;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// ✅ UPDATED: Helper function to map LogDocument to SavedFileListItem format
export const mapLogToSavedFileItem = (log: LogDocument, agreementTitle?: string): SavedFileListItem => {
  // ✅ IMPROVED: Generate descriptive file name with version info and date
  const customerName = agreementTitle || 'Agreement';
  const safeCustomerName = customerName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
  const logDate = new Date(log.createdAt).toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
  const versionInfo = `v${log.versionNumber}`;
  const changeCount = `${log.totalChanges}changes`;

  // Format: "Agreement_CustomerName_v2_15changes_20241216.txt"
  const descriptiveFileName = `Agreement_${safeCustomerName}_${versionInfo}_${changeCount}_${logDate}.txt`;

  return {
    id: log._id,
    agreementId: log.agreementId,
    versionId: log.versionId,
    fileName: descriptiveFileName, // ✅ NEW: Descriptive name with version info
    fileType: 'version_log',
    title: descriptiveFileName, // ✅ NEW: Use descriptive name for title too
    status: 'attached', // Logs are treated as attachments to the agreement
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    createdBy: log.salespersonId,
    updatedBy: null,
    fileSize: Math.max(1000, log.totalChanges * 200), // Estimate file size based on changes
    pdfStoredAt: null, // Logs are stored as TXT, not PDF
    hasPdf: true, // ✅ UPDATED: Can be downloaded as TXT file
    description: `Version ${log.versionNumber} changes: ${log.totalChanges} modifications ($${log.totalPriceImpact.toFixed(2)} impact)`,
    versionNumber: log.versionNumber,
    versionStatus: undefined, // Logs don't have changeable status
    isLatestVersion: false, // Logs are not versions themselves
    canChangeStatus: false, // Logs cannot have their status changed
    zohoInfo: {
      biginDealId: null,
      biginFileId: null,
      crmDealId: null,
      crmFileId: null,
    },
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  };
};

// ✅ NEW: Helper function to merge logs into agreement groups (can be used in backend or frontend)
export const mergeLogsIntoAgreements = async (
  agreements: SavedFileGroup[],
  getLogsForAgreement: (agreementId: string) => Promise<LogDocument[]>
): Promise<SavedFileGroup[]> => {
  const enrichedAgreements: SavedFileGroup[] = [];

  for (const agreement of agreements) {
    try {
      // Fetch logs for this agreement
      const logs = await getLogsForAgreement(agreement.id);

      // Map logs to SavedFileListItem format
      const logFiles = logs.map(log => mapLogToSavedFileItem(log, agreement.agreementTitle));

      // Merge logs with existing files, sorted by creation date (newest first)
      const allFiles = [...agreement.files, ...logFiles].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      enrichedAgreements.push({
        ...agreement,
        files: allFiles,
        fileCount: allFiles.length, // Update file count to include logs
      });

      console.log(`📋 [MERGE-LOGS] Agreement "${agreement.agreementTitle}": +${logFiles.length} logs (${allFiles.length} total files)`);
    } catch (error) {
      console.warn(`⚠️ [MERGE-LOGS] Failed to fetch logs for agreement ${agreement.id}:`, error);
      // Include agreement without logs if fetching fails
      enrichedAgreements.push(agreement);
    }
  }

  return enrichedAgreements;
};

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
  async getCustomerHeadersSummary(
    options: CustomerHeadersSummaryOptions = {}
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    items: Array<{
      _id: string;
      status: string;
      updatedAt: string;
      headerTitle?: string; // extracted from payload.headerTitle
    }>;
  }> {
    const params = new URLSearchParams();
    params.set('page', (options.page || 1).toString());
    params.set('limit', (options.limit || 20).toString());
    params.set('fields', '_id,status,updatedAt,payload.headerTitle');

    if (options.search) {
      params.set('search', options.search);
    }
    if (options.status) {
      params.set('status', options.status);
    }

    const res = await axios.get(`${API_BASE_URL}/api/pdf/customer-headers?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Fetch multiple pages of customer headers summary for dashboards
   */
  async getAllCustomerHeadersSummary(
    options: CustomerHeadersAggregateOptions = {}
  ): Promise<{
    items: Array<{
      _id: string;
      status: string;
      updatedAt: string;
      headerTitle?: string;
    }>;
  }> {
    const perPage = Math.max(1, Math.min(options.limit || 100, 100));
    const maxPages = Math.max(1, options.maxPages ?? 5);
    let page = 1;
    const aggregated: Array<{
      _id: string;
      status: string;
      updatedAt: string;
      headerTitle?: string;
    }> = [];

    while (page <= maxPages) {
      const result = await this.getCustomerHeadersSummary({
        page,
        limit: perPage,
        search: options.search,
        status: options.status
      });

      aggregated.push(...(result.items || []));

      if (!result.items || result.items.length < perPage) {
        break;
      }

      page += 1;
    }

    return { items: aggregated };
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
   * Get all version PDFs with pagination and filtering
   */
  async getAllVersionPdfs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    agreementId?: string;
    versionNumber?: number;
    includeDeleted?: boolean;
  }): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      agreementId: string;
      agreementTitle: string;
      versionNumber: number;
      versionLabel: string;
      fileName: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      changeNotes: string;
      fileSize: number;
      pdfStoredAt: string | null;
      hasPdf: boolean;
      zohoInfo: {
        biginDealId: string | null;
        biginFileId: string | null;
        crmDealId: string | null;
        crmFileId: string | null;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.agreementId) searchParams.set('agreementId', params.agreementId);
    if (params?.versionNumber) searchParams.set('versionNumber', params.versionNumber.toString());
    if (params?.includeDeleted) searchParams.set('includeDeleted', params.includeDeleted.toString());

    const res = await axios.get(`${API_BASE_URL}/api/versions?${searchParams}`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * Update version status (for version PDFs)
   */
  async updateVersionStatus(versionId: string, status: string): Promise<void> {
    await axios.patch(
      `${API_BASE_URL}/api/versions/${versionId}/status`,
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
   * ✅ NEW: Download version PDF as blob (with optional watermark)
   * @param versionId Version PDF ID
   * @param watermark Optional watermark flag (true = add DRAFT watermark, false = normal PDF)
   */
  async downloadVersionPdf(versionId: string, watermark = false): Promise<Blob> {
    const watermarkParam = watermark ? '?watermark=true' : '';
    const res = await axios.get(
      `${API_BASE_URL}/api/versions/${versionId}/download${watermarkParam}`,
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

  /**
   * ✅ NEW: Get version PDF view URL (with optional watermark)
   * @param versionId Version PDF ID
   * @param watermark Optional watermark flag (true = add DRAFT watermark, false = normal PDF)
   */
  getVersionPdfViewUrl(versionId: string, watermark = false): string {
    const watermarkParam = watermark ? '?watermark=true' : '';
    return `${API_BASE_URL}/api/versions/version/${versionId}/view${watermarkParam}`;
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
   * ✅ UPDATED: Now includes version logs as files within each agreement
   *
   * **BACKEND REQUIREMENTS**:
   * 1. When `includeLogs: true`, backend must include version logs in files array for each agreement
   * 2. Backend must set `isLatestVersion: true` for the newest version PDF of each agreement
   * 3. Backend must set `canChangeStatus: true` for latest version PDFs (frontend will override this)
  * 4. Log files should be mapped using mapLogToSavedFileItem format with descriptive filenames
  * 5. Trash responses expose `isDeleted`, `deletedAt`, and `deletedBy` on manual uploads, version PDFs, and version logs so the UI can surface deleted traces
   *
   * @param page Page number (default: 1)
   * @param limit Groups per page (default: 20, max: 100)
   * @param filters Optional filters like status, search, isDeleted
   */
  async getSavedFilesGrouped(
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      search?: string;
      isDeleted?: boolean;
      includeLogs?: boolean;
      includeDrafts?: boolean; // ✅ NEW: Include draft agreements without PDFs
      isTrashView?: boolean; // ✅ NEW: Include isTrashView for trash filtering
    } = {}
  ): Promise<SavedFilesGroupedResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    // ✅ NEW: Always include logs by default in grouped view
    params.set('includeLogs', (filters.includeLogs !== false).toString());

    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.isDeleted !== undefined) {
      params.set('isDeleted', filters.isDeleted.toString());
    }
    // ✅ NEW: Add includeDrafts parameter
    if (filters.includeDrafts !== undefined) {
      params.set('includeDrafts', filters.includeDrafts.toString());
    }
    // ✅ NEW: Add isTrashView parameter for frontend to control backend filtering
    if (filters.isTrashView !== undefined) {
      params.set('isTrashView', filters.isTrashView.toString());
    }

    console.log('📡 [pdfApi] getSavedFilesGrouped called with params:', params.toString());

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
   * ✅ NEW: Restore deleted manual uploads, version PDFs, and version logs from trash
   */
  async restoreFile(
    fileId: string,
    options: { fileType?: string } = {}
  ): Promise<{
    success: boolean;
    message: string;
    file?: {
      id: string;
      title: string;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.fileType) {
      params.set('fileType', options.fileType);
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/pdf/files/${fileId}/restore${queryString ? `?${queryString}` : ''}`;

    const res = await axios.patch(
      url,
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
   * ✅ NEW: Soft delete attached files, version PDFs, or version logs (moves them to trash with deleted metadata)
   */
  async deleteFile(
    fileId: string,
    options: { fileType?: string } = {}
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const params = new URLSearchParams();
    if (options?.fileType) {
      params.set('fileType', options.fileType);
    }
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/pdf/files/${fileId}/delete${queryString ? `?${queryString}` : ''}`;

    const res = await axios.patch(
      url,
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
  async permanentlyDeleteFile(
    fileId: string,
    options: { fileType?: string } = {}
  ): Promise<{
    success: boolean;
    message: string;
    deletedData?: {
      fileId: string;
      fileName: string;
      cleanedReferences: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.fileType) {
      params.set('fileType', options.fileType);
    }

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/pdf/files/${fileId}/permanent-delete${queryString ? `?${queryString}` : ''}`;

    const res = await axios.delete(
      url,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ SIMPLIFIED: Create version log (separate Logs collection, store IDs in Agreement & Version)
   */
  async createVersionLog(request: VersionLogRequest): Promise<VersionLogResponse> {
    const res = await axios.post(
      `${API_BASE_URL}/api/pdf/logs/create`,
      request,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ SIMPLIFIED: Get version logs for an agreement (from Logs collection)
   */
  async getVersionLogs(agreementId: string): Promise<{
    success: boolean;
    agreement: {
      id: string;
      title: string;
    };
    logs: LogDocument[];
  }> {
    const res = await axios.get(
      `${API_BASE_URL}/api/pdf/logs/agreement/${agreementId}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ SIMPLIFIED: Get ALL version logs (from Logs collection)
   */
  async getAllVersionLogs(params?: {
    page?: number;
    limit?: number;
    agreementId?: string;
  }): Promise<{
    success: boolean;
    logs: Array<LogDocument & {
      agreementTitle?: string;
    }>;
    pagination: {
      currentPage: number;
      totalPages: number;
      totalLogs: number;
      limit: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.agreementId) searchParams.set('agreementId', params.agreementId);

    const res = await axios.get(
      `${API_BASE_URL}/api/pdf/logs/all?${searchParams}`,
      {
        headers: { Accept: "application/json" },
      }
    );
    return res.data;
  },

  /**
   * ✅ SIMPLIFIED: Download version log (from Logs collection)
   */
  async downloadVersionLog(logId: string): Promise<Blob> {
    const res = await axios.get(
      `${API_BASE_URL}/api/pdf/logs/${logId}/download`,
      {
        responseType: "blob",
      }
    );
    return res.data;
  },

  /**
   * ✅ NEW: Get all approval documents grouped by agreement (folder structure)
   * Returns version PDFs, attached files, and main PDFs that are pending approval
   */
  async getApprovalDocumentsGrouped(): Promise<{
    success: boolean;
    totalGroups: number;
    totalFiles: number;
    groups: SavedFileGroup[];
    _metadata: {
      queryType: 'approval_documents_grouped';
      includedStatuses: string[];
      fileTypes: string[];
    };
  }> {
    const res = await axios.get(`${API_BASE_URL}/api/pdf/approval-documents/grouped`, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  },

  /**
   * ✅ NEW: Update agreement status
   */
  async updateAgreementStatus(agreementId: string, status: AgreementStatus, notes?: string): Promise<{
    success: boolean;
    message: string;
    agreement?: {
      id: string;
      title: string;
      status: AgreementStatus;
      updatedAt: string;
    };
  }> {
    const res = await axios.patch(
      `${API_BASE_URL}/api/pdf/agreements/${agreementId}/status`,
      {
        status,
        notes,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.data;
  },

  /**
   * Get admin dashboard data including recent documents and statistics
   * Uses the new admin dashboard API endpoint
   */
  async getAdminDashboardData(): Promise<{
    stats: {
      manualUploads: number;
      savedDocuments: number;
      totalDocuments: number;
    };
    recentDocuments: Array<{
      id: string;
      title: string;
      status: string;
      createdDate: string;
      uploadedOn: string;
      createdDateFormatted: string;
      uploadedOnFormatted: string;
      hasPdf: boolean;
      fileSize: number;
    }>;
    documentStatus: {
      done: number;
      pending: number;
      saved: number;
      drafts: number;
    };
  }> {
    const token = localStorage.getItem('admin_token'); // Use consistent token key

    if (!token) {
      throw new Error('No admin token found. Please log in as admin first.');
    }

    const res = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
    });
    return res.data;
  },

  /**
   * Get status counts scoped to a time filter for the admin pie chart
   */
  async getDashboardStatusCounts(params: { period?: string; from?: string; to?: string } = {}): Promise<{
    success: boolean;
    period: string;
    counts: {
      done: number;
      pending: number;
      saved: number;
      drafts: number;
      total: number;
    };
  }> {
    const token = localStorage.getItem('admin_token');

    if (!token) {
      throw new Error('No admin token found. Please log in as admin first.');
    }

    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set('period', params.period);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);

    const queryString = searchParams.toString();

    const res = await axios.get(
      `${API_BASE_URL}/api/admin/dashboard/status-counts${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
      }
    );
    return res.data;
  },

  /**
   * Get paginated recent documents for admin panel
   */
  async getAdminRecentDocuments(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    total: number;
    page: number;
    limit: number;
    documents: Array<{
      id: string;
      title: string;
      status: string;
      createdDate: string;
      uploadedOn: string;
      createdDateFormatted: string;
      uploadedOnFormatted: string;
      hasPdf: boolean;
      fileSize: number;
    }>;
  }> {
    const token = localStorage.getItem('admin_token');

    if (!token) {
      throw new Error('No admin token found. Please log in as admin first.');
    }

    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const res = await axios.get(`${API_BASE_URL}/api/admin/recent-documents?${searchParams.toString()}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
    });
    return res.data;
  },
};

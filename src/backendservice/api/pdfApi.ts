// src/backendservice/api/pdfApi.ts

import { apiClient } from "../utils/apiClient";

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
  // ✅ NEW: Agreement timeline fields for expiry tracking
  startDate?: string | null;     // Agreement start date (ISO format)
  contractMonths?: number | null; // Contract duration in months
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

// ✅ ENHANCED: Version logs interfaces with overwriting support and cumulative history
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
  // ✅ NEW: Cumulative change history support
  currentChanges?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
    // Numeric changes
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    // ✅ NEW: Text changes
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  allPreviousChanges?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
    // Numeric changes
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    // ✅ NEW: Text changes
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  // Keep for backward compatibility
  changes?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
    // Numeric changes
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    // ✅ NEW: Text changes
    originalText?: string;
    newText?: string;
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

// ✅ SIMPLIFIED: Log document structure (separate collection) with cumulative history support
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
  // ✅ NEW: Cumulative change history fields
  currentChanges?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
    // Numeric changes
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    // ✅ NEW: Text changes
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  allPreviousChanges?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
    // Numeric changes
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    // ✅ NEW: Text changes
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  // Keep for backward compatibility
  changes: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text'; // ✅ NEW: Distinguish change types
    // Numeric changes
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    // ✅ NEW: Text changes
    originalText?: string;
    newText?: string;
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
    const res = await apiClient.get<CustomerHeadersResponse>(`/api/pdf/customer-headers`);
    if (res.error) throw new Error(res.error);
    return res.data!;
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

    const res = await apiClient.get(`/api/pdf/customer-headers?${params.toString()}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
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
   * ✅ NEW: Get optimized document status counts for Home page bar graph
   * Returns only counts without loading full documents (much faster)
   */
  async getDocumentStatusCounts(options: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month' | 'year';
  } = {}): Promise<{
    success: boolean;
    counts: {
      done: number;
      pending: number;
      saved: number;
      drafts: number;
      total: number;
    };
    _metadata?: any;
  }> {
    const params = new URLSearchParams();
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.groupBy) params.append('groupBy', options.groupBy);

    const res = await apiClient.get(`/api/pdf/document-status-counts?${params.toString()}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Get a specific customer header by ID
   */
  async getCustomerHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await apiClient.get(`/api/pdf/customer-headers/${id}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Get a specific customer header by ID in edit-friendly format
   * This endpoint converts backend data structure for proper edit mode mapping
   */
  async getCustomerHeaderForEdit(id: string): Promise<{ payload: FormPayload }> {
    const res = await apiClient.get(`/api/pdf/customer-headers/${id}/edit-format`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Get admin template header by ID
   */
  async getAdminHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await apiClient.get(`/api/pdf/admin-headers/${id}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Create a new customer header with PDF generation
   */
  async createCustomerHeader(payload: FormPayload): Promise<{
    status: number;
    headers: any;
    data: any;
  }> {
    const res = await apiClient.post(
      `/api/pdf/customer-header`,
      payload
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
    await apiClient.put(
      `/api/pdf/customer-headers/${id}`,
      payload
    );
  },

  /**
   * Update existing customer header and recompile PDF
   */
  async updateAndRecompileCustomerHeader(
    id: string,
    payload: FormPayload
  ): Promise<void> {
    await apiClient.put(
      `/api/pdf/customer-headers/${id}?recompile=true`,
      payload
    );
  },

  /**
   * Update document status
   */
  async updateDocumentStatus(id: string, status: string): Promise<void> {
    const res = await apiClient.patch(
      `/api/pdf/customer-headers/${id}/status`,
      { status }
    );
    if (res.error) throw new Error(res.error);
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

    const res = await apiClient.get(`/api/versions?${searchParams}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Update version status (for version PDFs)
   */
  async updateVersionStatus(versionId: string, status: string): Promise<void> {
    const res = await apiClient.patch(
      `/api/versions/${versionId}/status`,
      { status }
    );
    if (res.error) throw new Error(res.error);
  },

  /**
   * Download PDF as blob
   */
  async downloadPdf(documentId: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/pdf/viewer/download/${documentId}`);
  },

  /**
   * ✅ NEW: Download version PDF as blob (with optional watermark)
   * @param versionId Version PDF ID
   * @param watermark Optional watermark flag (true = add DRAFT watermark, false = normal PDF)
   */
  async downloadVersionPdf(versionId: string, watermark = false): Promise<Blob> {
    const watermarkParam = watermark ? '?watermark=true' : '';
    return apiClient.downloadBlob(`/api/versions/${versionId}/download${watermarkParam}`);
  },

  /**
   * ✅ NEW: Download attached file from ManualUploadDocument collection
   */
  async downloadAttachedFile(fileId: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/pdf/attached-files/${fileId}/download`);
  },

  /**
   * Get PDF download URL
   */
  getPdfDownloadUrl(documentId: string): string {
    return `/api/pdf/viewer/download/${documentId}`;
  },

  /**
   * ✅ NEW: Get version PDF view URL (with optional watermark)
   * @param versionId Version PDF ID
   * @param watermark Optional watermark flag (true = add DRAFT watermark, false = normal PDF)
   */
  getVersionPdfViewUrl(versionId: string, watermark = false): string {
    const watermarkParam = watermark ? '?watermark=true' : '';
    return `/api/versions/version/${versionId}/view${watermarkParam}`;
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

    const res = await apiClient.get(`/api/pdf/saved-files?${params}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
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

    const res = await apiClient.get(`/api/pdf/saved-files/grouped?${params}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Get full file details by ID (on-demand - includes complete payload)
   */
  async getSavedFileDetails(id: string): Promise<SavedFileDetailsResponse> {
    const res = await apiClient.get(`/api/pdf/saved-files/${id}/details`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * ✅ NEW: Add files to existing agreement's attachedFiles array
   */
  async addFilesToAgreement(
    agreementId: string,
    request: AddFileToAgreementRequest
  ): Promise<AddFileToAgreementResponse> {
    const res = await apiClient.post(
      `/api/pdf/saved-files/${agreementId}/add-files`,
      request
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.patch(
      `/api/pdf/agreements/${agreementId}/restore`,
      {}
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const url = `/api/pdf/files/${fileId}/restore${queryString ? `?${queryString}` : ''}`;

    const res = await apiClient.patch(
      url,
      {}
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * ✅ NEW: Soft delete agreement (move to trash)
   */
  async deleteAgreement(agreementId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await apiClient.patch(
      `/api/pdf/agreements/${agreementId}/delete`,
      {}
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const url = `/api/pdf/files/${fileId}/delete${queryString ? `?${queryString}` : ''}`;

    const res = await apiClient.patch(
      url,
      {}
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.delete(
      `/api/pdf/agreements/${agreementId}/permanent-delete`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const url = `/api/pdf/files/${fileId}/permanent-delete${queryString ? `?${queryString}` : ''}`;

    const res = await apiClient.delete(
      url
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * ✅ SIMPLIFIED: Create version log (separate Logs collection, store IDs in Agreement & Version)
   */
  async createVersionLog(request: VersionLogRequest): Promise<VersionLogResponse> {
    const res = await apiClient.post(
      `/api/pdf/logs/create`,
      request
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.get(
      `/api/pdf/logs/agreement/${agreementId}`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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

    const res = await apiClient.get(
      `/api/pdf/logs/all?${searchParams}`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * ✅ SIMPLIFIED: Download version log (from Logs collection)
   */
  async downloadVersionLog(logId: string, includeDeleted = false): Promise<Blob> {
    return apiClient.downloadBlob(
      `/api/pdf/logs/${logId}/download${includeDeleted ? "?includeDeleted=true" : ""}`
    );
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
    const res = await apiClient.get(`/api/pdf/approval-documents/grouped`);
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.patch(
      `/api/pdf/agreements/${agreementId}/status`,
      {
        status,
        notes,
      }
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const res = await apiClient.get(`/api/admin/dashboard`);
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set('period', params.period);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);

    const queryString = searchParams.toString();

    const res = await apiClient.get(
      `/api/admin/dashboard/status-counts${queryString ? `?${queryString}` : ''}`
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
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
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const res = await apiClient.get(`/api/admin/recent-documents?${searchParams.toString()}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },
};

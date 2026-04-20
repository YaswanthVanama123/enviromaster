
import { apiClient } from "../utils/apiClient";

export interface CustomerHeader {
  _id: string;
  id?: string;
  payload?: any;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  unitPrice?: number;
  warrantyRate?: number;
  replacementRate?: number;
  amount?: number;
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

export type AgreementStatus = 'draft' | 'pending_approval' | 'approved_salesman' | 'approved_admin' | 'finalized';
export type VersionStatus = 'draft' | 'pending_approval' | 'approved_salesman' | 'approved_admin' | 'finalized' | 'archived';

export interface SavedFileListItem {
  id: string;
  agreementId?: string;
  versionId?: string;
  fileName: string;
  fileType: 'main_pdf' | 'attached_pdf' | 'version_pdf' | 'version_log';
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  fileSize: number;
  pdfStoredAt: string | null;
  hasPdf: boolean;
  description?: string;
  versionNumber?: number;
  versionStatus?: VersionStatus;
  isLatestVersion?: boolean;
  canChangeStatus?: boolean;
  zohoInfo: {
    biginDealId: string | null;
    biginFileId: string | null;
    crmDealId: string | null;
    crmFileId: string | null;
  };
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

export interface SavedFileGroup {
  id: string;
  agreementTitle: string;
  agreementStatus: AgreementStatus;
  fileCount: number;
  latestUpdate: string;
  statuses: string[];
  hasUploads: boolean;
  files: SavedFileListItem[];
  hasVersions: boolean;
  isDraftOnly: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  startDate?: string | null;
  contractMonths?: number | null;
}

export interface AddFileToAgreementRequest {
  files: {
    fileId?: string;
    fileName: string;
    fileSize: number;
    contentType?: string;
    description?: string;
    pdfBuffer?: number[];
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

export interface VersionLogRequest {
  agreementId: string;
  versionId: string;
  versionNumber: number;
  salespersonId: string;
  salespersonName: string;
  saveAction: 'save_draft' | 'generate_pdf' | 'manual_save';
  documentTitle: string;
  overwriteExisting?: boolean;
  overwriteReason?: 'draft_update' | 'version_update' | 'replace_version';
  currentChanges?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text';
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
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
    changeType?: 'numeric' | 'text';
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  changes?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text';
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
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
  currentChanges?: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text';
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
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
    changeType?: 'numeric' | 'text';
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  changes: Array<{
    productKey: string;
    productName: string;
    productType: 'product' | 'dispenser' | 'service' | 'agreement_text';
    fieldType: string;
    fieldDisplayName: string;
    changeType?: 'numeric' | 'text';
    originalValue?: number;
    newValue?: number;
    changeAmount?: number;
    changePercentage?: number;
    originalText?: string;
    newText?: string;
    quantity?: number;
    frequency?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const mapLogToSavedFileItem = (log: LogDocument, agreementTitle?: string): SavedFileListItem => {
  const customerName = agreementTitle || 'Agreement';
  const safeCustomerName = customerName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
  const logDate = new Date(log.createdAt).toISOString().split('T')[0].replace(/-/g, '');
  const versionInfo = `v${log.versionNumber}`;
  const changeCount = `${log.totalChanges}changes`;

  const descriptiveFileName = `Agreement_${safeCustomerName}_${versionInfo}_${changeCount}_${logDate}.txt`;

  return {
    id: log._id,
    agreementId: log.agreementId,
    versionId: log.versionId,
    fileName: descriptiveFileName,
    fileType: 'version_log',
    title: descriptiveFileName,
    status: 'attached',
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
    createdBy: log.salespersonId,
    updatedBy: null,
    fileSize: Math.max(1000, log.totalChanges * 200),
    pdfStoredAt: null,
    hasPdf: true,
    description: `Version ${log.versionNumber} changes: ${log.totalChanges} modifications ($${log.totalPriceImpact.toFixed(2)} impact)`,
    versionNumber: log.versionNumber,
    versionStatus: undefined,
    isLatestVersion: false,
    canChangeStatus: false,
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

export const mergeLogsIntoAgreements = async (
  agreements: SavedFileGroup[],
  getLogsForAgreement: (agreementId: string) => Promise<LogDocument[]>
): Promise<SavedFileGroup[]> => {
  const enrichedAgreements: SavedFileGroup[] = [];

  for (const agreement of agreements) {
    try {
      const logs = await getLogsForAgreement(agreement.id);

      const logFiles = logs.map(log => mapLogToSavedFileItem(log, agreement.agreementTitle));

      const allFiles = [...agreement.files, ...logFiles].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      enrichedAgreements.push({
        ...agreement,
        files: allFiles,
        fileCount: allFiles.length,
      });

      console.log(`📋 [MERGE-LOGS] Agreement "${agreement.agreementTitle}": +${logFiles.length} logs (${allFiles.length} total files)`);
    } catch (error) {
      console.warn(`⚠️ [MERGE-LOGS] Failed to fetch logs for agreement ${agreement.id}:`, error);
      enrichedAgreements.push(agreement);
    }
  }

  return enrichedAgreements;
};

export const pdfApi = {
  async getCustomerHeaders(): Promise<CustomerHeadersResponse> {
    const res = await apiClient.get<CustomerHeadersResponse>(`/api/pdf/customer-headers`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

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
      headerTitle?: string;
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

  async getCustomerHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await apiClient.get(`/api/pdf/customer-headers/${id}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getCustomerHeaderForEdit(id: string): Promise<{ payload: FormPayload }> {
    const res = await apiClient.get(`/api/pdf/customer-headers/${id}/edit-format`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getAdminHeaderById(id: string): Promise<{ payload: FormPayload }> {
    const res = await apiClient.get(`/api/pdf/admin-headers/${id}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

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

  async updateCustomerHeader(id: string, payload: FormPayload): Promise<void> {
    await apiClient.put(
      `/api/pdf/customer-headers/${id}`,
      payload
    );
  },

  async updateAndRecompileCustomerHeader(
    id: string,
    payload: FormPayload
  ): Promise<void> {
    await apiClient.put(
      `/api/pdf/customer-headers/${id}?recompile=true`,
      payload
    );
  },

  async updateDocumentStatus(id: string, status: string): Promise<void> {
    const res = await apiClient.patch(
      `/api/pdf/customer-headers/${id}/status`,
      { status }
    );
    if (res.error) throw new Error(res.error);
  },

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

  async updateVersionStatus(versionId: string, status: string): Promise<void> {
    const res = await apiClient.patch(
      `/api/versions/${versionId}/status`,
      { status }
    );
    if (res.error) throw new Error(res.error);
  },

  async downloadPdf(documentId: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/pdf/viewer/download/${documentId}`);
  },

  async downloadVersionPdf(versionId: string, watermark = false): Promise<Blob> {
    const watermarkParam = watermark ? '?watermark=true' : '';
    return apiClient.downloadBlob(`/api/versions/${versionId}/download${watermarkParam}`);
  },

  async downloadAttachedFile(fileId: string): Promise<Blob> {
    return apiClient.downloadBlob(`/api/pdf/attached-files/${fileId}/download`);
  },

  getPdfDownloadUrl(documentId: string): string {
    return `/api/pdf/viewer/download/${documentId}`;
  },

  getVersionPdfViewUrl(versionId: string, watermark = false): string {
    const watermarkParam = watermark ? '?watermark=true' : '';
    return `/api/versions/version/${versionId}/view${watermarkParam}`;
  },

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

  async getSavedFilesGrouped(
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      search?: string;
      isDeleted?: boolean;
      includeLogs?: boolean;
      includeDrafts?: boolean;
      isTrashView?: boolean;
    } = {}
  ): Promise<SavedFilesGroupedResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
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
    if (filters.includeDrafts !== undefined) {
      params.set('includeDrafts', filters.includeDrafts.toString());
    }
    if (filters.isTrashView !== undefined) {
      params.set('isTrashView', filters.isTrashView.toString());
    }

    console.log('📡 [pdfApi] getSavedFilesGrouped called with params:', params.toString());

    const res = await apiClient.get(`/api/pdf/saved-files/grouped?${params}`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async getSavedFileDetails(id: string): Promise<SavedFileDetailsResponse> {
    const res = await apiClient.get(`/api/pdf/saved-files/${id}/details`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

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

  async createVersionLog(request: VersionLogRequest): Promise<VersionLogResponse> {
    const res = await apiClient.post(
      `/api/pdf/logs/create`,
      request
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

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

  async downloadVersionLog(logId: string, includeDeleted = false): Promise<Blob> {
    return apiClient.downloadBlob(
      `/api/pdf/logs/${logId}/download${includeDeleted ? "?includeDeleted=true" : ""}`
    );
  },

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
